import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import {
  read as readIndependent,
  write as writeIndependent,
  writeItem,
} from "@d2runewizard/d2s";
import { constants as defaults } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
try {
  const native = await server.ssrLoadModule("/src/utils/planner-game-save.ts");
  const plannerModule = await server.ssrLoadModule("/src/utils/planner.ts");
  // Each save fixture specifies its own items and native base choices.
  const planner = {
    ...plannerModule,
    createBuild: (classId) => ({ ...plannerModule.createBuild(classId), charms: [] }),
  };
  const { plannerClasses, plannerSkills, mercenaries } = await server.ssrLoadModule(
    "/src/shared/planner.ts"
  );
  const data = JSON.parse(
    await readFile(new URL("../public/data/planner-save/data.json", import.meta.url))
  );
  const locale = JSON.parse(
    await readFile(new URL("../public/data/planner-save/strings.json", import.meta.url))
  );
  const codec = native.createGameSaveExporter(data, locale);
  // An independent reader uses the mod's bit widths rather than vanilla data.
  const constants = structuredClone(defaults);
  for (const [name, s] of Object.entries(data.itemStatCost))
    constants.magical_properties[s.id] = {
      ...constants.magical_properties[s.id],
      s: name,
      sB: s.savebits,
      sA: s.saveadd,
      sP: s.saveparambits,
      cB: s.csvbits,
      dF: s.descfunc,
      e: s.encode ?? constants.magical_properties[s.id]?.e,
    };
  const opts = { name: "NativeTest", choices: {}, rolls: {} };
  let assertions = 0;
  async function verify(build, options = opts) {
    const original = JSON.stringify(build);
    const bytes = await codec.exportCharacter(build, options);
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    assert.equal(header.getUint32(0, true), 0xaa55aa55);
    assert.equal(header.getUint32(4, true), 105);
    assert.equal(header.getUint32(8, true), bytes.length);
    assert.equal(header.getUint32(12, true), native.saveChecksum(bytes));
    const read = await readIndependent(bytes, constants, {
      disableItemEnhancements: true,
      extendedStash: true,
    });
    assert.equal(read.header.name, options.name);
    assert.equal(
      read.header.class,
      plannerClasses.find((c) => c.id === build.classId).name.en
    );
    assert.equal(read.header.level, build.level);
    assert.equal(read.header.status.hardcore, build.hardcore);
    assert.equal(read.header.status.expansion, true);
    assert.equal(
      bytes[248],
      (options.gameMode ?? native.defaultGameSaveMode(build.classId)) === "rotw" ? 3 : 2
    );
    assert.equal(read.attributes.gold, build.gold);
    assert.equal(
      read.attributes.unused_stats,
      planner.attributeBudget(build) - planner.spentAttributes(build)
    );
    assert.equal(
      read.attributes.unused_skill_points,
      planner.skillBudget(build) - planner.spentSkills(build)
    );
    assert.equal(JSON.stringify(build), original, "Export must not mutate the planner");
    const imported = codec.importCharacter(bytes);
    assert.equal(imported.classId, build.classId, "Native import keeps class");
    assert.equal(imported.level, build.level, "Native import keeps level");
    assert.equal(imported.name, options.name, "Native import keeps character name");
    assertions++;
    return { bytes, read, raw: codec.readCharacter(bytes) };
  }
  {
    const { unpackMaterialArchive } = await server.ssrLoadModule(
      "/src/utils/planner-material-save.ts"
    );
    const hero = planner.createBuild("paladin");
    const { bytes } = await verify(hero);
    let original;
    for (const state of ["full", "partial", "empty"]) {
      if (state === "partial") Object.assign(hero.materials, { r01: 0, p22: 7 });
      if (state === "empty")
        for (const code of Object.keys(hero.materials)) hero.materials[code] = 0;
      const archive = await codec.makeArchive(hero, opts.name, bytes, original);
      const { character, stash } = unpackMaterialArchive(archive);
      assert.deepEqual(character, Uint8Array.from(bytes));
      assert.deepEqual(await codec.readMaterials(stash, hero.hardcore), hero.materials);
      if (original) {
        // Five empty 68-byte grid pages and the gold stored in their headers survive edits.
        assert.deepEqual(stash.slice(0, 5 * 68), original.slice(0, 5 * 68));
      }
      original = stash;
      new DataView(original.buffer, original.byteOffset).setUint32(12, 12345, true);
    }
  }
  {
    const hero = planner.createBuild("barbarian");
    hero.stash = [
      {
        name: "Key",
        baseCode: "key",
        quality: "normal",
        quantity: 7,
        requiredLevel: 1,
        bonuses: {},
        notes: "",
        stashPosition: 3,
      },
    ];
    const { read: old } = await verify(hero, { ...opts, choices: { "stash.0": "key" } });
    old.header.version = 99;
    const bytes = await writeIndependent(old, constants, { extendedStash: true });
    const { build, converted } = await codec.importGameFile(bytes);
    assert.equal(bytes[4], 99);
    assert.equal(converted[4], 105);
    assert.deepEqual((await codec.importGameFile(converted)).build, build);
    assert.equal(build.stash[0].quantity, 7);
    assert.equal(build.stash[0].stashPosition, 3);
    const damaged = bytes.slice();
    damaged[12] ^= 1;
    await assert.rejects(codec.importGameFile(damaged), /validation/);
  }
  {
    const build = planner.createBuild("paladin");
    const shield = {
      name: "Vortex Shield",
      baseCode: "paf",
      quality: "normal",
      baseKind: "shield",
      requiredLevel: 66,
      itemLevel: 99,
      notes: "",
      bonuses: {},
      sockets: 4,
      automod: { id: "am069", values: [45, 10, 0] },
    };
    const options = { ...opts, choices: { "hero.offHand": "paf" } };
    build.equipment.offHand = shield;
    assert.deepEqual(codec.baseModifierStats(shield), {
      fireresist: 45,
      coldresist: 45,
      lightresist: 45,
      poisonresist: 45,
      damageresist: 10,
    });
    for (const baseCode of ["sbw", "lxb", "amc"]) {
      const rows = codec.baseModifierOptions(
        { ...shield, baseCode, quality: "superior" },
        "superiorMod"
      );
      assert(rows.some(({ definition }) => definition.prop1 === "dmg%"));
      assert(
        rows.every(
          ({ definition }) => ![definition.prop1, definition.prop2].includes("dur%")
        )
      );
    }
    // A pre-existing manually socketed Sacred Targe should become the same
    // Spirit as the catalog item, including its native runeword save flags.
    const { assembleSocketedRuneword } = await server.ssrLoadModule(
      "/src/utils/planner-item-catalog.ts"
    );
    const { RUNEWORDS } = await server.ssrLoadModule("/src/shared/runewords.ts");
    const targe = {
      ...shield,
      name: "Sacred Targe",
      baseCode: "pab",
      requiredLevel: 47,
      socketedItems: ["r07", "r10", "r09", "r11"],
    };
    const resist = codec
      .baseModifierOptions(targe, "automod")
      .find((row) => row.definition.prop1 === "res-all" && row.definition.max1 === 45);
    targe.automod = { id: resist.id, values: resist.ranges.map((row) => row.max) };
    assert.equal(
      assembleSocketedRuneword(codec, { ...targe, quality: "magic" }, build, RUNEWORDS),
      false
    );
    assert.equal(
      assembleSocketedRuneword(
        codec,
        { ...targe, socketedItems: ["r10", "r07", "r09", "r11"] },
        build,
        RUNEWORDS
      ),
      false
    );
    assert(assembleSocketedRuneword(codec, targe, build, RUNEWORDS));
    assert.equal(targe.name, "Spirit");
    assert.equal(targe.bonuses.allSkills, 2);
    assert.equal(targe.bonuses.fcr, 35);
    assert.equal(targe.bonuses.coldResist, 35);
    assert.equal(targe.socketedItems, undefined);
    assert.equal(assembleSocketedRuneword(codec, targe, build, RUNEWORDS), false);
    build.equipment.offHand = targe;
    const spiritTarge = await verify(build, {
      ...options,
      choices: { "hero.offHand": "pab" },
    });
    const roundTripped = codec.importCharacter(spiritTarge.bytes).equipment.offHand;
    assert.equal(roundTripped.runewordId, targe.runewordId);
    assert.deepEqual(roundTripped.automod, targe.automod);
    build.equipment.offHand = shield;
    const normal = await verify(build, options);
    assert.equal(normal.read.items[0].quality, 2);
    assert.equal(normal.read.items[0].auto_affix_id, 70);
    assert.deepEqual(
      codec.importCharacter(normal.bytes).equipment.offHand.automod,
      shield.automod
    );
    assert.equal(planner.buildStats(build, codec).bonuses.fireResist, 45);
    for (const quality of ["magic", "rare"]) {
      const magic = {
        ...shield,
        quality,
        automod: { id: "am074", values: [109, 52, 10] },
      };
      assert.equal(codec.baseModifierOptions(magic, "superiorMod").length, 0);
      assert.equal(
        codec.baseModifierOptions(magic, "automod").some((row) => row.id === "am069"),
        quality === "magic"
      );
      build.equipment.offHand = magic;
      const saved = await verify(build, options);
      assert.equal(saved.read.items[0].auto_affix_id, 75);
      assert.deepEqual(
        codec.importCharacter(saved.bytes).equipment.offHand.automod,
        magic.automod
      );
    }
    const stacked = { ...shield, quality: "magic", bonuses: { fireResist: 10 } };
    build.equipment.offHand = stacked;
    const saved = await verify(build, options);
    const restoredMagic = codec.importCharacter(saved.bytes).equipment.offHand;
    assert.deepEqual(restoredMagic.automod, shield.automod);
    assert.equal(restoredMagic.bonuses.fireResist, 10);
    const superior = {
      ...shield,
      quality: "superior",
      superiorMod: { id: "qm007", values: [15, 12, 0] },
    };
    build.equipment.offHand = superior;
    const result = await verify(build, options);
    assert.equal(result.read.items[0].quality, 3);
    assert.equal(result.read.items[0].file_index, 7);
    assert.equal(result.read.items[0].defense_rating, 226);
    const imported = codec.importCharacter(result.bytes).equipment.offHand;
    assert.equal(imported.quality, "superior");
    assert.deepEqual(imported.automod, superior.automod);
    assert.deepEqual(imported.superiorMod, superior.superiorMod);
    const spirit = { ...superior, name: "Spirit", quality: "runeword" };
    build.equipment.offHand = spirit;
    const runeword = await verify(build, options);
    const restored = codec.importCharacter(runeword.bytes).equipment.offHand;
    assert.equal(restored.quality, "runeword");
    assert.deepEqual(restored.automod, superior.automod);
    assert.deepEqual(restored.superiorMod, superior.superiorMod);
  }
  {
    const build = planner.createBuild("paladin");
    const names = ["Raven Turn", "Entropy Clasp"];
    build.stash = names.map((name, index) => ({
      name,
      baseCode: index ? "amu" : "rin",
      quality: index ? "crafted" : "rare",
      requiredLevel: 1,
      itemLevel: 99,
      notes: "",
      bonuses: {},
    }));
    const { bytes, read } = await verify(build, {
      ...opts,
      choices: Object.fromEntries(
        native.gameSaveEntries(build).map((e) => [e.key, codec.defaultChoice(e, build)])
      ),
    });
    assert.deepEqual(
      read.items.map((i) => [i.rare_name_id, i.rare_name_id2]),
      [
        [158, 125],
        [195, 111],
      ]
    );
    assert.deepEqual(
      codec.importCharacter(bytes).stash.map((i) => i.name),
      names
    );
    // Placeholder jewelry names must get a legal in-game suffix for their base.
    for (const item of build.stash)
      item.name = item.baseCode === "rin" ? "Ring" : "Amulet";
    const rolled = await verify(build, {
      ...opts,
      choices: { "stash.0": "rin", "stash.1": "amu" },
    });
    for (const item of rolled.read.items) {
      const suffix = data.rareSuffix[item.rare_name_id2 - 1];
      const allowed = Object.entries(suffix)
        .filter(([k]) => k.startsWith("itype"))
        .map(([, type]) => type);
      assert(
        allowed.includes(codec.gd.items[item.type].type) || allowed.includes("misc")
      );
    }
  }
  {
    const build = planner.createBuild("paladin");
    const affixes = [
      { id: "mp321", values: [5] },
      { id: "ms290", values: [7] },
    ];
    build.stash = [
      {
        name: "Small Charm",
        baseCode: "cm1",
        quality: "magic",
        requiredLevel: 1,
        itemLevel: 99,
        notes: "",
        bonuses: {},
        affixes,
      },
    ];
    const options = { ...opts, choices: { "stash.0": "cm1" } };
    let current = build;
    for (let i = 0; i < 2; i++) {
      const { bytes, read } = await verify(current, options);
      const [charm] = read.items;
      assert.equal(charm.magic_prefix, 322);
      assert.equal(charm.magic_suffix, 291);
      assert.equal(constants.magic_prefixes[charm.magic_prefix].n, "Shimmering");
      assert.equal(constants.magic_suffixes[charm.magic_suffix].n, "of Good Luck");
      current = codec.importCharacter(bytes);
      assert.equal(current.stash[0].name, "Shimmering Small Charm of Good Luck");
      assert.deepEqual(current.stash[0].affixes, affixes);
    }
  }
  for (const roll of [0, 1]) {
    const build = planner.createBuild("paladin");
    build.level = 99;
    build.stash = ["unique694", "unique695"].map((catalogId) => ({
      name: codec.gd.locale.strings[data.uniqueItems[catalogId].index],
      quality: "unique",
      catalogId,
      baseCode: data.uniqueItems[catalogId].code,
      requiredLevel: 80,
      itemLevel: 99,
      propertyRoll: roll,
      bonuses: {},
      notes: "",
    }));
    const { read, bytes } = await verify(build, {
      ...opts,
      choices: Object.fromEntries(
        native.gameSaveEntries(build).map((e) => [e.key, codec.defaultChoice(e, build)])
      ),
    });
    const helm = read.items.find((i) => i.unique_id === 695);
    const armor = read.items.find((i) => i.unique_id === 696);
    assert(helm && armor, "Bartuc boss rewards retain their actual binary record IDs");
    const stat = (item, id) => item.magic_attributes.find((p) => p.id === id)?.values;
    assert.deepEqual(stat(helm, 476), [10]);
    assert.deepEqual(stat(helm, 477), [1]);
    assert.deepEqual(stat(helm, 107), [387, 20]);
    assert.deepEqual(stat(armor, 474), [1]);
    assert.deepEqual(stat(armor, 475), [1]);
    assert.deepEqual(stat(armor, 477), [1]);
    assert.deepEqual(stat(armor, 39), [roll ? 30 : 15]);
    const imported = codec.importCharacter(bytes);
    assert.deepEqual(imported.stash.map((i) => i.catalogId).sort(), [
      "unique694",
      "unique695",
    ]);
  }
  {
    const build = planner.createBuild("paladin");
    for (const [index, baseCode] of ["cm1", "cm2", "cm3"].entries())
      for (let iconIndex = 0; iconIndex < 3; iconIndex++)
        build.charms.push({
          id: `skin-${baseCode}-${iconIndex}`,
          name: "Charm",
          quality: "magic",
          baseCode,
          iconIndex,
          position: index * 3 + iconIndex,
          height: index + 1,
          requiredLevel: 1,
          notes: "",
          bonuses: { mana: 5 },
        });
    const { bytes } = await verify(build, {
      ...opts,
      choices: Object.fromEntries(
        native.gameSaveEntries(build).map((entry) => [entry.key, entry.item.baseCode])
      ),
    });
    const restored = codec.importCharacter(bytes);
    for (const [index, charm] of build.charms.entries()) {
      assert.equal(restored.charms[index].iconIndex, charm.iconIndex);
      assert.equal(restored.charms[index].baseCode, charm.baseCode);
      assert.equal(restored.charms[index].bonuses.mana, 5);
    }
  }
  {
    const { createItemCatalog } = await server.ssrLoadModule(
      "/src/utils/planner-item-catalog.ts"
    );
    const { plannerItemImage, plannerItemDimensions } = await server.ssrLoadModule(
      "/src/utils/planner-item-art.ts"
    );
    const { inventoryItemSize, canMoveItem, moveItem } = await server.ssrLoadModule(
      "/src/utils/planner-item-movement.ts"
    );
    for (const quantity of [undefined, 0, 7, 20]) {
      const build = planner.createBuild("sorceress");
      const catalog = createItemCatalog(
        codec,
        build,
        { key: "inventory", owner: "charm", height: 2 },
        []
      );
      for (const [index, code] of ["tbk", "ibk"].entries()) {
        const entry = catalog.items.find((item) => item.id === `base:${code}`);
        assert(entry, `${code} is selectable in inventory`);
        assert.equal(catalog.bases.get(code).category, "book");
        const item = {
          name: entry.name,
          quality: "normal",
          baseCode: code,
          requiredLevel: 1,
          bonuses: {},
          notes: "",
          ...(quantity === undefined ? {} : { quantity }),
        };
        assert(plannerItemImage(item));
        assert.deepEqual(plannerItemDimensions(item), [1, 2]);
        assert.deepEqual(inventoryItemSize(item), [1, 2]);
        assert(
          !codec
            .choices(
              { key: "hero.mainHand", owner: "hero", slot: "mainHand", item },
              build
            )
            .some((row) => row.base === code)
        );
        assert(
          !codec
            .choices(
              { key: "stash", owner: "stash", item: { ...item, quality: "magic" } },
              build
            )
            .some((row) => row.base === code)
        );
        for (const invalid of [-1, 21, 1.5])
          assert.throws(() => planner.parsePlannerItem({ ...item, quantity: invalid }));
        build.charms.push({ ...item, id: `tome-${code}`, height: 2, position: index });
        build.stash.push({ ...item, stashPosition: index });
      }
      const restored = planner.decodeBuild(planner.encodeBuild(build));
      assert.deepEqual(restored, build);
      assert.throws(() =>
        planner.parseBuild({ ...build, charms: [{ ...build.charms[0], height: 1 }] })
      );
      assert.throws(() =>
        planner.parseBuild({ ...build, charms: [{ ...build.charms[0], position: 30 }] })
      );
      const choices = Object.fromEntries(
        native
          .gameSaveEntries(restored)
          .map((entry) => [entry.key, codec.defaultChoice(entry, restored)])
      );
      const { read } = await verify(restored, { ...opts, choices });
      assert.equal(read.items.length, 4);
      for (const item of read.items) {
        assert(["ibk", "tbk"].includes(item.type));
        assert.equal(item.quality, 2);
        assert.equal(item.quantity, quantity ?? 20);
      }
      const moved = structuredClone(build);
      assert(
        !canMoveItem(
          moved,
          { owner: "stash", index: 0 },
          { owner: "inventory", position: 30 }
        )
      );
      assert(
        moveItem(moved, { owner: "stash", index: 0 }, { owner: "inventory", position: 2 })
      );
      assert.equal(moved.charms.at(-1).quantity, quantity);
      assert.equal(moved.charms.at(-1).height, 2);
      assert.equal(moved.charms.at(-1).baseCode, "tbk");
    }
  }
  {
    const { createItemCatalog } = await server.ssrLoadModule(
      "/src/utils/planner-item-catalog.ts"
    );
    const { plannerItemImage, plannerItemDimensions } = await server.ssrLoadModule(
      "/src/utils/planner-item-art.ts"
    );
    const build = planner.createBuild("paladin");
    const catalog = createItemCatalog(codec, build, { key: "stash", owner: "stash" }, []);
    for (const [index, code] of ["rvs", "rvl"].entries()) {
      const entry = catalog.items.find((item) => item.id === `base:${code}`);
      assert(entry, `${code} is available in the stash catalog`);
      assert.equal(catalog.bases.get(code).category, "rpot");
      const item = {
        name: entry.name,
        quality: "normal",
        baseCode: code,
        requiredLevel: 1,
        bonuses: {},
        notes: "",
        stashPosition: index * 17,
      };
      assert(plannerItemImage(item), `${code} has inventory artwork`);
      assert.deepEqual(plannerItemDimensions(item), [1, 1]);
      assert(
        !codec
          .choices({ key: "charm", owner: "charm", item }, build)
          .some((choice) => choice.base === code),
        "Potions cannot occupy charm slots"
      );
      assert(
        !codec
          .choices(
            { key: "stash", owner: "stash", item: { ...item, quality: "magic" } },
            build
          )
          .some((choice) => choice.base === code),
        "Potions retain normal quality"
      );
      build.stash.push(item);
    }
    const restored = planner.decodeBuild(planner.encodeBuild(build));
    assert.deepEqual(
      restored.stash.map((item) => item.baseCode),
      ["rvs", "rvl"]
    );
    const choices = Object.fromEntries(
      native
        .gameSaveEntries(restored)
        .map((entry) => [entry.key, codec.defaultChoice(entry, restored)])
    );
    const { read } = await verify(restored, { ...opts, choices });
    assert.deepEqual(
      read.items.map((item) => item.type),
      ["rvs", "rvl"]
    );
    read.items.forEach((item, index) => {
      assert.equal(item.simple_item, 1);
      assert.equal(item.alt_position_id, 5);
      assert.equal(item.position_x, index);
      assert.equal(item.position_y, index);
    });
  }
  {
    const { createFullRejuvenationContainer } = await server.ssrLoadModule(
      "/src/utils/planner-stash.ts"
    );
    const { itemPropertyLines } = await server.ssrLoadModule(
      "/src/utils/planner-item-catalog.ts"
    );
    const { plannerItemImage, plannerItemDimensions } = await server.ssrLoadModule(
      "/src/utils/planner-item-art.ts"
    );
    const occupied = new Set([0, 1]);
    const container = createFullRejuvenationContainer(occupied);
    assert.equal(occupied.size, 2, "Availability checks must not reserve stash space");
    assert.equal(container.stashPosition, 2);
    assert.equal(container.containerQuantity, 100);
    assert.deepEqual(plannerItemDimensions(container), [1, 1]);
    assert(plannerItemImage(container)?.endsWith("/quest/cont_rvl.png"));
    assert.equal(
      createFullRejuvenationContainer(new Set(Array.from({ length: 208 }, (_, i) => i))),
      undefined,
      "A full stash cannot receive a container"
    );
    for (const invalid of [-1, 1.5, 2038])
      assert.throws(() =>
        planner.parsePlannerItem({ ...container, containerQuantity: invalid })
      );
    assert.throws(() => planner.parsePlannerItem({ ...container, baseCode: "rvl" }));
    const build = planner.createBuild("paladin");
    build.stash = [container];
    const restored = planner.decodeBuild(planner.encodeBuild(build));
    assert.equal(restored.stash[0].containerQuantity, 100);
    assert.equal(data.uniqueItems[container.catalogId].index, "cont_rvl");
    const key = native.gameSaveEntries(restored)[0].key;
    const choices = {
      [key]: codec.defaultChoice(native.gameSaveEntries(restored)[0], restored),
    };
    assert.equal(choices[key], "unique456");
    for (const roll of ["planned", 0, 1]) {
      const { read, bytes } = await verify(restored, {
        ...opts,
        choices,
        rolls: { [key]: roll },
      });
      assert.equal(read.items.length, 1, "The kit adds one container");
      const item = read.items[0];
      assert.equal(item.type, "bg1");
      assert.equal(item.quality, 7);
      assert.equal(item.unique_id, data.uniqueItems.unique456.saveId);
      assert.equal(item.alt_position_id, 5);
      assert.equal(item.position_x, 2);
      assert.deepEqual(
        item.magic_attributes.find((stat) => stat.id === data.itemStatCost.Add_one.id)
          .values,
        [100],
        "All export roll modes preserve the 100 potions inside"
      );
      const imported = codec.importCharacter(bytes);
      assert.equal(imported.stash[0].containerQuantity, 100);
      const roundTrip = await verify(imported, {
        ...opts,
        choices,
        rolls: { [key]: roll },
      });
      assert.deepEqual(
        roundTrip.read.items[0].magic_attributes.find(
          (stat) => stat.id === data.itemStatCost.Add_one.id
        )?.values,
        [100]
      );
    }
    assert(
      itemPropertyLines(codec, container, build.level, build.classId).includes(
        "Items inside: 100"
      )
    );
  }
  for (const c of plannerClasses)
    for (const level of [1, 2, 90, 99]) {
      const build = planner.createBuild(c.id);
      build.level = level;
      build.gold = level === 1 ? 0 : level === 90 ? 123456 : planner.goldCapacity(level);
      build.mercenary.level = Math.min(98, level);
      build.hardcore = level % 2 === 1;
      const { read } = await verify(build);
      assert.equal(read.attributes.strength, c.base.strength);
      assert.equal(
        read.attributes.max_hp,
        Math.floor(c.life + (level - 1) * c.lifePerLevel + 60)
      );
    }
  {
    const build = planner.createBuild("paladin");
    const item = (name, baseCode, extra = {}) => ({
      name,
      baseCode,
      quality: "normal",
      requiredLevel: 1,
      notes: "",
      bonuses: {},
      ...extra,
    });
    const ring = item("Raven Frost", "rin", {
      quality: "unique",
      catalogId: "unique275",
      propertyRoll: 1,
      bonuses: { dexterity: 20 },
    });
    const pike = item("Pike", "pik");
    build.charms = [
      { ...ring, id: "ring", height: 1, position: 39 },
      { ...pike, id: "pike", height: 4, position: 0 },
    ];
    const planned = (b) => ({
      ...opts,
      choices: Object.fromEntries(
        native.gameSaveEntries(b).map((e) => [e.key, codec.defaultChoice(e, b)])
      ),
    });
    {
      const hero = planner.createBuild("barbarian");
      hero.equipment.amulet = item("The Mahim-Oak Curio", "amu", {
        quality: "unique",
        catalogId: "unique119",
      });
      hero.equipment.gloves = item("Venom Grip", "xlg", {
        quality: "unique",
        catalogId: "unique232",
      });
      hero.equipment.mainHand = item("Javelin", "jav", { quantity: 42 });
      hero.stash = [
        item("Tome", "tbk", { quantity: 0 }),
        item("Tome", "tbk", { quantity: 17 }),
      ];
      const resists = (b) => planner.buildStats(b, codec).resists.map((s) => s.value);
      const plain = resists(planner.createBuild("barbarian"));
      const expected = plain.map((value, index) => value + (index === 3 ? 40 : 10));
      assert.deepEqual(resists(hero), expected);
      hero.equipment.amulet.bonuses.fireResist = 0;
      assert.equal(resists(hero)[0], plain[0]);
      delete hero.equipment.amulet.bonuses.fireResist;
      const restored = codec.importCharacter((await verify(hero, planned(hero))).bytes);
      assert.deepEqual(resists(restored), expected);
      const { read } = await verify(restored, planned(restored));
      assert.equal(read.items.find((i) => i.type === "jav").quantity, 42);
      assert.deepEqual(
        read.items.filter((i) => i.type === "tbk").map((i) => i.quantity),
        [0, 17]
      );
      for (const [main, off] of [
        ["mainHand", "offHand"],
        ["swapMain", "swapOff"],
      ]) {
        const warrior = planner.createBuild("barbarian");
        const pair = (a, b) => {
          warrior.equipment[main] = item(a, a);
          warrior.equipment[off] = item(b, b);
        };
        for (const [a, b] of [
          ["pik", "pik"],
          ["pik", "buc"],
          ["sbw", "cqv"],
        ]) {
          pair(a, b);
          await assert.rejects(
            () => codec.exportCharacter(warrior, planned(warrior)),
            (e) => e.code === "base"
          );
        }
        for (const [a, b] of [
          ["2hs", "2hs"],
          ["sbw", "aqv"],
        ]) {
          pair(a, b);
          const { read } = await verify(warrior, planned(warrior));
          assert.deepEqual(read.items.map((i) => i.type).sort(), [a, b].sort());
        }
      }
    }
    {
      const hero = planner.createBuild("paladin");
      hero.charms = [
        { ...item("Horadric Cube", "box"), id: "cube", height: 2, position: 0 },
      ];
      hero.stash = [
        item("Helm", "uh9", { sockets: 1, socketedItems: ["r22"] }),
        item("Rejuvenation", "rvl"),
        item("Rejuvenation", "rvl"),
      ];
      const { bytes, read, raw } = await verify(hero, planned(hero));
      const config = { disableItemEnhancements: true, extendedStash: true };
      let offset = raw.items[raw.profile.inventory[0]].binaryOffset.start / 8;
      const expected = [];
      for (const [index, record] of read.items.entries()) {
        const original = await writeItem(record, 105, constants, config);
        assert.deepEqual(bytes.slice(offset, offset + original.length), original);
        if (record.type !== "box") {
          const cube = record.type === "uh9";
          record.location_id = cube ? 0 : 2;
          record.alt_position_id = cube ? 4 : 0;
          record.position_x = cube ? 1 : index + 8;
          record.position_y = cube ? 2 : 0;
          const encoded = await writeItem(record, 105, constants, config);
          bytes.set(encoded, offset);
          expected.push([
            cube ? "cube" : "belt",
            cube ? 7 : record.position_x,
            Buffer.from(encoded).toString("hex"),
          ]);
        }
        offset += original.length;
      }
      new DataView(bytes.buffer, bytes.byteOffset).setUint32(
        12,
        native.saveChecksum(bytes),
        true
      );
      const restored = planner.decodeBuild(
        planner.encodeBuild(codec.importCharacter(bytes))
      );
      assert.deepEqual(
        restored.storedItems.map((i) => [i.location, i.position, i.hex]),
        expected
      );
      const saved = (await verify(restored, planned(restored))).read;
      assert.deepEqual(
        saved.items.map((i) => [
          i.type,
          i.location_id,
          i.alt_position_id,
          i.position_x,
          i.position_y,
        ]),
        read.items.map((i) => [
          i.type,
          i.location_id,
          i.alt_position_id,
          i.position_x,
          i.position_y,
        ])
      );
      assert.equal(
        saved.items.find((i) => i.type === "uh9").socketed_items[0].type,
        "r22"
      );
    }
    let restored = build;
    for (let round = 0; round < 2; round++) {
      const { bytes, read } = await verify(restored, planned(restored));
      assert.deepEqual(
        read.items
          .map((i) => [i.type, i.alt_position_id, i.position_x, i.position_y])
          .sort(),
        [
          ["pik", 1, 0, 0],
          ["rin", 1, 9, 3],
        ]
      );
      restored = codec.importCharacter(bytes);
      assert.equal(planner.buildStats(restored).bonuses.dexterity, 0);
      assert.equal(
        restored.charms.find((i) => i.baseCode === "rin").bonuses.dexterity,
        20
      );
      assert.equal(restored.charms.find((i) => i.baseCode === "pik").height, 4);
    }
    const { fitsStashCell } = await server.ssrLoadModule(
      "/src/utils/planner-item-movement.ts"
    );
    assert(fitsStashCell(build, ring, 207));
    build.stash = [{ ...ring, stashPosition: 207 }];
    assert(!fitsStashCell(build, ring, 207));
    assert(!fitsStashCell(build, pike, 206));
    assert.equal(
      codec.importCharacter((await verify(build, planned(build))).bytes).stash[0]
        .stashPosition,
      207
    );
    const slot = (item, slot) =>
      codec.permitted(item.baseCode, { key: "test", owner: "hero", slot, item }, build);
    assert(!slot(item("Shard", "xa1"), "head"));
    assert(!slot(ring, "head"));
    assert(slot(ring, "ringLeft"));

    build.equipment.armor = item("Guardian Angel", "xlt", {
      quality: "unique",
      catalogId: "unique218",
      bonuses: {
        fireResist: 250,
        lightningResist: 250,
        coldResist: 250,
        poisonResist: 250,
      },
    });
    const caps = () =>
      planner.buildStats(build, codec).resists.map((r) => [r.cap, r.value]);
    assert.deepEqual(caps(), Array(4).fill([90, 90]));
    build.skills[100] = 20;
    assert.deepEqual(caps(), [
      [95, 95],
      [90, 90],
      [90, 90],
      [90, 90],
    ]);
    build.charms = [{ ...build.equipment.armor, id: "carried", position: 0, height: 3 }];
    delete build.equipment.armor;
    assert.deepEqual(
      caps().map(([cap]) => cap),
      [85, 75, 75, 75]
    );
    build.equipment.offHand = item("Shield with Vex", "buc", {
      sockets: 1,
      socketedItems: ["r26"],
    });
    assert.equal(caps()[0][0], 90);
    build.weaponSet = 1;
    assert.equal(caps()[0][0], 85);
  }
  const rewards = planner.createBuild("paladin");
  for (const difficulty of Object.values(rewards.quests))
    for (const key of Object.keys(difficulty)) difficulty[key] = false;
  rewards.quests.normal = {
    den: true,
    radament: true,
    izual: true,
    lamEsen: true,
    anya: true,
    goldenBird: true,
  };
  rewards.attributes.vitality = 100;
  for (const skill of plannerSkills.filter((s) => s.classId === "paladin").slice(0, 3)) {
    const plan = planner.skillPlan(rewards, skill);
    if (plan) for (const id of plan) rewards.skills[id] = (rewards.skills[id] ?? 0) + 1;
  }
  const rewardSave = await verify(rewards);
  assert.equal(
    rewardSave.read.header.quests_normal.act_iii.lam_esens_tome.is_completed,
    true
  );
  assert.equal(
    rewardSave.read.header.quests_normal.act_iii.the_golden_bird.is_completed,
    true
  );
  assert.equal(
    rewardSave.read.header.quests_hell.act_iii.the_golden_bird.is_completed,
    false
  );
  assert.equal(
    rewardSave.read.header.quests_hell.act_v.eve_of_destruction.is_completed,
    true
  );
  assert.equal(rewardSave.read.header.quests_hell.act_v.introduced, true);
  assert.equal(
    rewardSave.raw.profile.attributes.maxhp,
    (55 + 89 * 2 + 100 * 3 + 20) * 256
  );
  for (const [id, rank] of Object.entries(rewards.skills))
    assert(rewardSave.read.skills.some((s) => s.id === Number(id) && s.points === rank));
  for (const merc of mercenaries.filter((m) => m.value !== "none")) {
    const build = planner.createBuild();
    build.mercenary.type = merc.value;
    const { raw, bytes } = await verify(build);
    assert.equal(raw.profile.mercLevel, 90, merc.value);
    assert(raw.profile.merc, merc.value);
    assert.equal(codec.importCharacter(bytes).mercenary.type, merc.value);
  }
  for (const [type, base, other, nativeClass] of [
    ["barbarian-frenzy", "7cr", "7wa", 560],
    ["barbarian-frenzy-axes", "7wa", "7cr", 953],
  ]) {
    const build = planner.createBuild("druid");
    build.mercenary.type = type;
    const weapon = {
      name: "Mercenary weapon",
      quality: "normal",
      baseCode: base,
      requiredLevel: 1,
      notes: "",
      bonuses: {},
    };
    build.mercenary.equipment = {
      head: {
        name: "Arreat's Face",
        quality: "unique",
        baseCode: "baa",
        catalogId: "unique279",
        requiredLevel: 42,
        notes: "",
        bonuses: {},
      },
      mainHand: weapon,
      offHand: { ...weapon },
    };
    const choices = Object.fromEntries(
      native
        .gameSaveEntries(build)
        .map((entry) => [entry.key, codec.defaultChoice(entry, build)])
    );
    assert(
      Object.values(choices).every(Boolean),
      "Barbarian helm and both weapons are selectable"
    );
    const entry = {
      key: "mercenary.offHand",
      owner: "mercenary",
      slot: "offHand",
      item: { ...weapon, baseCode: undefined },
    };
    const bases = codec.choices(entry, build).map((choice) => choice.base);
    assert(bases.includes(base), `${type}: matching one-handed weapon`);
    assert(!bases.includes(other), `${type}: rejects the other weapon family`);
    assert(!bases.includes("7bt"), `${type}: rejects two-handed axes`);
    const { raw, read, bytes } = await verify(build, { ...opts, choices });
    assert.equal(Number(data.hireling[raw.profile.merc][0].class), nativeClass);
    assert.equal(read.merc_items.length, 3);
    assert.equal(read.merc_items.filter((item) => item.type === base).length, 2);
    const imported = codec.importCharacter(bytes);
    assert.equal(imported.mercenary.type, type);
    assert.equal(imported.mercenary.equipment.mainHand.baseCode, base);
    assert.equal(imported.mercenary.equipment.offHand.baseCode, base);
    assert.equal(
      planner.parseBuild(JSON.parse(JSON.stringify(build))).mercenary.type,
      type
    );
  }
  const modules = await Promise.all(
    ["runewords", "reworked-runewords", "custom-runewords", "rotw-runewords"].map(
      (name) => server.ssrLoadModule(`/src/shared/${name}.ts`)
    )
  );
  const words = modules.flatMap((module) => Object.values(module)[0]);
  const { runewordTemplates, runewordBonuses } = await server.ssrLoadModule(
    "/src/utils/planner-runewords.ts"
  );
  const { itemRuneword } = await server.ssrLoadModule(
    "/src/utils/planner-item-presentation.ts"
  );
  for (const [id, name, base, nativeId, aliases, kind] of [
    [
      33,
      "Hysteria",
      "utp",
      "runeword196",
      ["Hustle (Armor)", "Переполох (броня)"],
      "armor",
    ],
    [
      99,
      "Mania",
      "crs",
      "runeword197",
      ["Hustle (Weapons)", "Hustle (Weapon)", "Переполох (оружие)"],
      "weapon",
    ],
  ]) {
    assert.deepEqual(
      runewordTemplates(name).map((r) => r.kind),
      [kind]
    );
    for (const label of [name, ...aliases]) {
      const build = planner.createBuild("paladin");
      // Legacy JSON can have a name without a planner ID or an explicit base kind.
      build.stash = [
        {
          name: label,
          quality: "runeword",
          requiredLevel: 39,
          notes: "",
          bonuses: {},
          baseCode: base,
        },
      ];
      assert.equal(itemRuneword(build.stash[0], words).id, id);
      const { raw, bytes } = await verify(build, {
        ...opts,
        choices: { "stash.0": base },
      });
      const item = raw.items[raw.profile.stash.find((i) => i !== undefined)];
      assert.equal(item.unique, nativeId, `${label}: preserve armor/weapon identity`);
      const restored = codec.importCharacter(bytes).stash[0];
      assert.equal(restored.runewordId, id);
      assert.equal(restored.name, name);
    }
  }
  for (const word of words) {
    let build, entry, choices;
    for (const c of plannerClasses) {
      build = planner.createBuild(c.id);
      build.stash = [
        {
          name: word.name.en,
          quality: "runeword",
          runewordId: word.id,
          requiredLevel: word.level,
          notes: "",
          bonuses: {},
        },
      ];
      entry = native.gameSaveEntries(build)[0];
      choices = codec
        .choices(entry, build)
        .filter(
          (c) =>
            constants.armor_items[c.base] ||
            constants.weapon_items[c.base] ||
            constants.other_items[c.base]
        );
      if (choices.length) break;
    }
    assert(choices.length, `No export base for ${word.name.en}`);
    for (const roll of [0, 1]) {
      if (word.name.en === "Lightning" && roll === 1) {
        await assert.rejects(
          () =>
            codec.exportCharacter(build, {
              ...opts,
              choices: { [entry.key]: choices[0].value },
              rolls: { [entry.key]: roll },
            }),
          (error) => error.code === "statRange" && error.detail === "maxmana"
        );
        continue;
      }
      let result;
      try {
        result = await verify(build, {
          ...opts,
          choices: { [entry.key]: choices[0].value },
          rolls: { [entry.key]: roll },
        });
      } catch (error) {
        error.message = `${word.name.en}, roll ${roll}: ${error.message} ${error.detail ?? ""}`;
        throw error;
      }
      const { raw } = result;
      assert.equal(
        codec.importCharacter(result.bytes).stash[0].runewordId,
        word.id,
        `${word.name.en}: preserve the native runeword variant`
      );
      const item = raw.items[raw.profile.stash.find((id) => id !== undefined)];
      assert.equal(item.quality, 9, word.name.en);
      assert.equal(item.socketedItems.length, word.runes.length, word.name.en);
      if (word.name.en === "Grief") {
        const nativeItem = result.read.items.find((item) => item.given_runeword);
        const venom = nativeItem.runeword_attributes.find(
          (p) => constants.magical_properties[p.id].s === "item_skillonhit"
        );
        assert.deepEqual(
          venom.values,
          [15, 278, 35],
          "Grief: 35% chance to cast level 15 Venom; chance and level must not be swapped"
        );
      }
    }
    const template = runewordTemplates(word.name.en).find((template) =>
      codec
        .choices({ ...entry, item: { ...entry.item, baseKind: template.kind } }, build)
        .some((c) => c.value === choices[0].value)
    );
    if (template) {
      build.stash[0] = {
        ...build.stash[0],
        baseKind: template.kind,
        ...runewordBonuses(template, word.name.en === "Lightning" ? 0 : 1),
      };
      await verify(build, {
        ...opts,
        choices: { [entry.key]: choices[0].value },
        rolls: { [entry.key]: "planned" },
      });
    }
  }
  const gear = planner.createBuild("paladin");
  const planned = planner.createBuild("paladin");
  planned.equipment.mainHand = {
    name: "Spirit",
    quality: "runeword",
    requiredLevel: 25,
    baseKind: "weapon",
    notes: "",
    bonuses: { fcr: 30, mana: 100 },
  };
  planned.equipment.head = {
    name: "Bulwark",
    quality: "runeword",
    requiredLevel: 35,
    baseKind: "armor",
    notes: "",
    bonuses: { vitality: 10 },
  };
  const manual = await verify(planned, {
    ...opts,
    choices: { "hero.mainHand": "crs", "hero.head": "crn" },
    rolls: {},
  });
  assert.equal(
    manual.raw.items[manual.raw.profile.items.rarm].stats.item_fastercastrate,
    30,
    "Preserve a manually entered intermediate roll"
  );
  assert.equal(manual.raw.items[manual.raw.profile.items.rarm].stats.maxmana, 100);
  assert.equal(
    manual.raw.items[manual.raw.profile.items.head].stats.vitality ?? 0,
    0,
    "Io already supplies the planned +10 vitality; do not double-count it"
  );
  gear.equipment.head = {
    name: "Harlequin Crest",
    quality: "unique",
    requiredLevel: 62,
    notes: "",
    bonuses: { strength: 2, allSkills: 2 },
  };
  gear.equipment.armor = {
    name: "Native armor",
    quality: "magic",
    requiredLevel: 1,
    notes: "",
    bonuses: { vitality: 20, life: 35, fcr: 20 },
  };
  gear.charms = [
    {
      id: "nativecharm",
      position: 0,
      height: 1,
      name: "Native charm",
      quality: "magic",
      requiredLevel: 1,
      notes: "",
      bonuses: { mana: 20 },
    },
  ];
  const entries = native.gameSaveEntries(gear),
    selections = Object.fromEntries(
      entries.map((e) => [
        e.key,
        codec.defaultChoice(e, gear) ||
          codec.choices(e, gear).find((c) => ["cap", "qui", "cm1"].includes(c.base))
            ?.value,
      ])
    );
  const equipped = await verify(gear, { ...opts, choices: selections });
  assert.equal(
    equipped.raw.profile.attributes.strength,
    25,
    "Item attributes must not be baked into base stats"
  );
  assert.equal(Object.keys(equipped.raw.profile.items).length, 2);
  assert.equal(equipped.raw.profile.inventory.filter((i) => i !== undefined).length, 1);
  assert.equal(equipped.raw.items[equipped.raw.profile.items.tors].stats.vitality, 20);
  await assert.rejects(
    () => codec.exportCharacter(gear, opts),
    (error) => error.code === "base"
  );
  for (const name of ["", "A", "123Hero", "LongCharacterName", "Two--Names", "Герой"])
    await assert.rejects(
      () => codec.exportCharacter(planner.createBuild(), { ...opts, name }),
      (error) => error.code === "name"
    );
  gear.equipment.armor.bonuses.strength = 10000;
  await assert.rejects(
    () => codec.exportCharacter(gear, { ...opts, choices: selections }),
    (error) => error.code === "statRange"
  );
  const browserBuild = planner.createBuild("paladin");
  browserBuild.equipment.armor = {
    name: "Custom craft",
    quality: "crafted",
    requiredLevel: 1,
    notes: "",
    bonuses: { vitality: 12 },
    baseCode: "qui",
    itemLevel: 87,
    sockets: 1,
    ethereal: true,
  };
  const browserEntries = native.gameSaveEntries(browserBuild);
  const browserOptions = {
    ...opts,
    choices: Object.fromEntries(
      browserEntries.map((entry) => [entry.key, codec.defaultChoice(entry, browserBuild)])
    ),
  };
  const browserSave = await verify(browserBuild, browserOptions);
  const browserItem = browserSave.raw.items[browserSave.raw.profile.items.tors];
  assert.equal(browserItem.quality, 8);
  assert.equal(browserItem.ilvl, 87);
  assert.equal(browserItem.sockets, 1);
  assert.equal(browserItem.ethereal, true);
  assert.equal(browserItem.stats.vitality, 12);
  const aldurChoice = codec
    .choices(
      {
        key: "hero.mainHand",
        owner: "hero",
        slot: "mainHand",
        item: { ...browserBuild.equipment.armor, quality: "set" },
      },
      browserBuild
    )
    .find((c) => c.label.startsWith("Aldur's Rhythm ·"));
  assert(aldurChoice);
  browserBuild.equipment = {
    mainHand: {
      name: "Aldur's Rhythm",
      quality: "set",
      requiredLevel: 42,
      notes: "",
      baseCode: aldurChoice.base,
      catalogId: aldurChoice.value,
      itemLevel: 87,
      ...codec.catalogBonuses(aldurChoice.value, "set", 1),
    },
  };
  const aldurEntry = native.gameSaveEntries(browserBuild)[0];
  const aldurSave = await verify(browserBuild, {
    ...opts,
    choices: { [aldurEntry.key]: codec.defaultChoice(aldurEntry, browserBuild) },
  });
  assert.equal(aldurSave.raw.items[aldurSave.raw.profile.items.rarm].sockets, 5);
  const socketBuild = planner.createBuild("paladin");
  socketBuild.equipment.head = {
    name: "Bone Visage",
    quality: "normal",
    baseCode: "uh9",
    requiredLevel: 63,
    notes: "",
    bonuses: {},
    sockets: 3,
    socketedItems: ["r24", null, "gpr"],
    ethereal: true,
  };
  const socketOptions = (build) => ({
    ...opts,
    choices: Object.fromEntries(
      native
        .gameSaveEntries(build)
        .map((entry) => [entry.key, codec.defaultChoice(entry, build)])
    ),
  });
  const mixed = await verify(socketBuild, socketOptions(socketBuild));
  const helm = mixed.read.items.find((item) => item.type === "uh9");
  assert.equal(helm.total_nr_of_sockets, 3);
  assert.equal(helm.nr_of_items_in_sockets, 2);
  assert.deepEqual(
    helm.socketed_items.map((item) => item.type),
    ["r24", "gpr"]
  );
  assert.deepEqual(
    helm.magic_attributes,
    [],
    "Socket effects are not duplicated on the parent"
  );
  assert(
    helm.socketed_items.every(
      (item) => item.simple_item === 1 && item.location_id === 6 && !item.ethereal
    )
  );
  const rawHelm = mixed.raw.items[mixed.raw.profile.items.head];
  assert.equal(
    rawHelm.socketedItems.length,
    2,
    "Both independent codecs read manual children"
  );
  for (const code of Object.keys(data.gems)) {
    socketBuild.equipment.head.socketedItems = [code];
    const result = await verify(socketBuild, socketOptions(socketBuild));
    assert.equal(result.read.items[0].socketed_items[0].type, code);
  }
  socketBuild.equipment.head.socketedItems = ["gpr", "gpr", "gpr"];
  socketBuild.equipment.offHand = {
    ...socketBuild.equipment.head,
    name: "Monarch",
    baseCode: "uit",
    sockets: 4,
    socketedItems: ["r22", "gpb", null, "r22"],
  };
  socketBuild.mercenary.type = mercenaries.find((merc) => merc.act === 2).value;
  socketBuild.mercenary.equipment.head = {
    ...socketBuild.equipment.head,
    socketedItems: ["r13", "gpr"],
  };
  const repeats = await verify(socketBuild, socketOptions(socketBuild));
  assert.deepEqual(
    repeats.read.items
      .find((item) => item.type === "uh9")
      .socketed_items.map((item) => item.type),
    ["gpr", "gpr", "gpr"]
  );
  assert.deepEqual(
    repeats.read.items
      .find((item) => item.type === "uit")
      .socketed_items.map((item) => item.type),
    ["r22", "gpb", "r22"]
  );
  assert.deepEqual(
    repeats.read.merc_items[0].socketed_items.map((item) => item.type),
    ["r13", "gpr"]
  );
  const affix = await server.ssrLoadModule("/src/utils/planner-affixes.ts");
  const affixBuild = planner.createBuild("paladin");
  const modItem = {
    name: "Bone Visage",
    baseCode: "uh9",
    quality: "magic",
    itemLevel: 99,
    requiredLevel: 63,
    notes: "",
    bonuses: {},
    sockets: 0,
    affixes: [],
  };
  const addMod = (item, code, kind) => {
    const found = affix.itemAffixes.find(
      (a) =>
        a.kind === kind &&
        affix.canAddAffix(a, item) &&
        a.mods.some((m) => m.code === code)
    );
    assert(found, code);
    item.affixes.push(affix.newAffix(found));
    item.sockets = Math.max(item.sockets, affix.affixSockets(item));
  };
  addMod(modItem, "ac%", "prefix");
  addMod(modItem, "hp", "suffix");
  affixBuild.equipment.head = modItem;
  const affixOptions = { ...opts, choices: { "hero.head": "uh9" }, rolls: {} };
  for (const quality of ["magic", "rare"]) {
    modItem.quality = quality;
    if (quality === "rare") {
      addMod(modItem, "mana", "prefix");
      addMod(modItem, "res-all", "prefix");
      addMod(modItem, "str", "suffix");
      addMod(modItem, "balance2", "suffix");
    }
    const result = await verify(affixBuild, affixOptions);
    const item = result.read.items[0];
    const expected = affix.affixStats(modItem);
    const raw = result.raw.items[result.raw.profile.items.head];
    for (const [stat, value] of Object.entries(expected))
      assert.equal(raw.stats[stat], value, stat);
    const prefixes = modItem.affixes
      .filter((a) => a.id.startsWith("mp"))
      .map((a) => Number(a.id.slice(2)) + 1);
    const suffixes = modItem.affixes
      .filter((a) => a.id.startsWith("ms"))
      .map((a) => Number(a.id.slice(2)) + 1);
    if (quality === "magic") {
      assert.equal(item.magic_prefix, prefixes[0]);
      assert.equal(item.magic_suffix, suffixes[0]);
    } else
      assert.deepEqual(item.magical_name_ids, [
        prefixes[0],
        suffixes[0],
        prefixes[1],
        suffixes[1],
        prefixes[2],
        suffixes[2],
      ]);
  }
  // A socket affix and an actual insert must remain separate parent/child stats.
  modItem.quality = "magic";
  modItem.affixes = [];
  modItem.sockets = 0;
  addMod(modItem, "sock", "prefix");
  modItem.socketedItems = ["gpr"];
  const socketModResult = await verify(affixBuild, affixOptions);
  assert.equal(socketModResult.read.items[0].total_nr_of_sockets, modItem.sockets);
  assert.equal(socketModResult.read.items[0].socketed_items[0].type, "gpr");
  assert(!socketModResult.raw.items[socketModResult.raw.profile.items.head].stats.maxhp);
  const artifact = new URL("../docs/audits/2026-10-27/planner-save/", import.meta.url);
  await mkdir(artifact, { recursive: true });
  await writeFile(new URL("NativeTest.d2s", artifact), rewardSave.bytes);
  console.log(
    `Native Blizzless v105 export: ${assertions} saves checked, all ${words.length} runewords covered; independent parser passed. Lightning +300 mana is correctly rejected (native field maximum: 223).`
  );
} finally {
  await server.close();
}
