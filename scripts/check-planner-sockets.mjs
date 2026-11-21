import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { createServer } from "vite";
import { read } from "@d2runewizard/d2s";
import { constants as defaults } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const planner = await server.ssrLoadModule("/src/utils/planner.ts");
  const { createGameSaveExporter, gameSaveEntries } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const { socketInserts, socketInsertByCode, socketInsertItem, socketedBonuses } =
    await server.ssrLoadModule("/src/utils/planner-sockets.ts");
  const { createItemCatalog, socketPropertyLines } = await server.ssrLoadModule(
    "/src/utils/planner-item-catalog.ts"
  );
  const { combatItemStats } = await server.ssrLoadModule("/src/utils/planner-damage.ts");
  const data = JSON.parse(await readFile("public/data/planner-save/data.json"));
  const codec = createGameSaveExporter(
    data,
    JSON.parse(await readFile("public/data/planner-save/strings.json"))
  );
  const jewelryBuild = planner.createBuild("paladin");
  jewelryBuild.charms = [];
  const jewelryCatalog = createItemCatalog(
    codec,
    jewelryBuild,
    { owner: "stash", key: "stash:0" },
    []
  );
  for (const [baseCode, catalogId] of [
    ["rin", "unique275"],
    ["amu", "unique276"],
  ]) {
    assert.equal(jewelryCatalog.bases.get(baseCode).maxSockets, 0);
    for (const quality of ["normal", "magic", "rare", "unique"]) {
      jewelryBuild.stash = [
        {
          name: "Jewelry",
          baseCode,
          ...(quality === "unique" ? { catalogId } : {}),
          quality,
          requiredLevel: 1,
          notes: "",
          bonuses: {},
          stashPosition: 0,
          sockets: 1,
          socketedItems: ["r24"],
        },
      ];
      const choices = Object.fromEntries(
        gameSaveEntries(jewelryBuild).map((entry) => [
          entry.key,
          codec.defaultChoice(entry, jewelryBuild),
        ])
      );
      await assert.rejects(
        codec.exportCharacter(jewelryBuild, { name: "NoSockets", choices, rolls: {} }),
        (error) => error.code === "base"
      );
      jewelryBuild.stash[0].sockets = 0;
      jewelryBuild.stash[0].socketedItems = [];
      await codec.exportCharacter(jewelryBuild, {
        name: "NoSockets",
        choices,
        rolls: {},
      });
    }
  }
  const constants = structuredClone(defaults);
  for (const [name, stat] of Object.entries(data.itemStatCost))
    constants.magical_properties[stat.id] = {
      ...constants.magical_properties[stat.id],
      s: name,
      sB: stat.savebits,
      sA: stat.saveadd,
      sP: stat.saveparambits,
      cB: stat.csvbits,
      // Assert decoded numbers; vanilla description strings omit Blizzless stats.
      dF: 0,
      e: Number(stat.encode ?? constants.magical_properties[stat.id]?.e ?? 0),
    };
  const jewels = socketInserts.filter((i) => i.ranges);
  assert.equal(jewels.length, 14);
  for (const insert of jewels) {
    await access(`public${insert.image_url}`);
    const values = Object.fromEntries(
      Object.entries(insert.ranges).map(([key, range]) => [
        key,
        Math.floor((range.min + range.max) / 2),
      ])
    );
    const item = {
      name: "Bone Visage",
      baseCode: "uh9",
      quality: "normal",
      requiredLevel: 63,
      notes: "",
      bonuses: {},
      sockets: 3,
      socketedItems: [null, insert.code, "r22"],
      socketPropertyValues: { 1: values },
    };
    const build = planner.createBuild("sorceress");
    build.equipment.head = item;
    assert.deepEqual(planner.decodeBuild(planner.encodeBuild(build)), build);
    const effect = socketedBonuses(item);
    const native = codec.socketBonuses(insert.code, "helm", values);
    assert.equal(effect.bonuses.magicFind ?? 0, native.bonuses.magicFind ?? 0);
    assert.deepEqual(effect.skillBonuses, native.skillBonuses);
    assert(socketPropertyLines(codec, insert.code, "helm", 90, values).length >= 4);
    if (insert.group === "jewel") assert.equal(effect.bonuses.magicFind, 25);
    const key = Object.keys(values)[0];
    assert.throws(() =>
      planner.parsePlannerItem({
        ...item,
        socketPropertyValues: { 1: { [key]: insert.ranges[key].max + 1 } },
      })
    );
    const options = { name: "SocketTest", choices: {}, rolls: {} };
    for (const entry of gameSaveEntries(build)) {
      options.choices[entry.key] = codec.defaultChoice(entry, build);
      options.rolls[entry.key] = "planned";
    }
    const bytes = await codec.exportCharacter(build, options);
    const saved = await read(bytes, constants, {
      disableItemEnhancements: true,
      extendedStash: true,
    });
    const parent = saved.items.find((i) => i.type === "uh9");
    assert.equal(parent.total_nr_of_sockets, 3);
    assert.equal(parent.socketed_items.length, 2);
    const [child, rune] = parent.socketed_items;
    assert.equal(child.type, insert.baseCode);
    assert.equal(child.quality, 7);
    assert.equal(child.unique_id, data.uniqueItems[insert.code].saveId);
    assert.equal(child.simple_item, 0);
    assert(child.magic_attributes.length >= 4);
    assert.equal(rune.type, "r22");
    const restored = codec.importCharacter(bytes);
    assert.deepEqual(
      restored.equipment.head.socketPropertyValues,
      { 0: values },
      insert.code
    );
    const reexported = await codec.exportCharacter(restored, {
      ...options,
      choices: Object.fromEntries(
        gameSaveEntries(restored).map((entry) => [
          entry.key,
          codec.defaultChoice(entry, restored),
        ])
      ),
    });
    const roundTrip = await read(reexported, constants, {
      disableItemEnhancements: true,
      extendedStash: true,
    });
    const sockets = roundTrip.items.find((i) => i.type === "uh9").socketed_items;
    assert.deepEqual(
      sockets.map((i) => i.type),
      [insert.baseCode, "r22"]
    );
    assert.deepEqual(sockets[0].magic_attributes, child.magic_attributes);
    if (insert.group === "jewel") {
      const mf = child.magic_attributes.find(
        (s) => s.id === data.itemStatCost.item_magicbonus.id
      );
      assert.deepEqual(mf.values, [25]);
    }
  }
  assert(
    socketPropertyLines(codec, "unique395", "helm").includes(
      "Adds 37 Poison Damage Over 2 Seconds"
    )
  );
  for (const [code, line, stat, value] of [
    ["j15ar", "+100 to Attack Rating", "tohit", 100],
    ["j15fr", "Fire Resist +30%", "fireresist", 30],
  ]) {
    const insert = socketInsertByCode.get(code);
    assert.equal(insert.baseCode, "jew");
    assert(!insert.image_url.includes("colossal"));
    assert.equal(socketInsertItem(code), undefined);
    assert.deepEqual(socketPropertyLines(codec, code, "weapon"), [
      "+15% Increased Attack Speed",
      line,
    ]);
    assert.deepEqual(codec.propertyStats(codec.socketJewelDefinition(code), "jew", 1), {
      item_fasterattackrate: 15,
      [stat]: value,
    });
    const build = planner.createBuild("barbarian");
    build.charms = [];
    const sword = {
      name: "Crystal Sword",
      quality: "normal",
      baseCode: "crs",
      requiredLevel: 1,
      notes: "",
      bonuses: {},
      sockets: 1,
      socketedItems: [code],
    };
    build.equipment.mainHand = sword;
    assert.deepEqual(combatItemStats(codec, sword, build.classId), {
      item_fasterattackrate: 15,
      [stat]: value,
    });
    const bytes = await codec.exportCharacter(build, {
      name: "JewelTest",
      choices: { "hero.mainHand": "crs" },
      rolls: {},
    });
    const saved = await read(bytes, constants, {
      disableItemEnhancements: true,
      extendedStash: true,
    });
    const child = saved.items[0].socketed_items[0];
    assert.equal(child.type, "jew");
    assert.equal(child.quality, 4);
    for (const [name, amount] of Object.entries({
      item_fasterattackrate: 15,
      [stat]: value,
    }))
      assert.deepEqual(
        child.magic_attributes.find(
          (property) => property.id === data.itemStatCost[name].id
        ).values,
        [amount]
      );
    assert.deepEqual(codec.importCharacter(bytes).equipment.mainHand.socketedItems, [
      code,
    ]);
  }
  const variantBuild = planner.createBuild("druid");
  variantBuild.charms = [];
  variantBuild.stash = Array.from({ length: 6 }, (_, iconIndex) => ({
    name: "Jewel of Fervor",
    quality: "magic",
    baseCode: "jew",
    iconIndex,
    requiredLevel: 31,
    itemLevel: 99,
    propertyRoll: 1,
    notes: "",
    bonuses: {},
    affixes: [{ id: "ms170", values: [0] }],
    stashPosition: iconIndex,
  }));
  assert.deepEqual(planner.decodeBuild(planner.encodeBuild(variantBuild)), variantBuild);
  const variantChoices = Object.fromEntries(
    gameSaveEntries(variantBuild).map((entry) => [
      entry.key,
      codec.defaultChoice(entry, variantBuild),
    ])
  );
  const variantBytes = await codec.exportCharacter(variantBuild, {
    name: "JewelArts",
    choices: variantChoices,
    rolls: {},
  });
  const variantSaved = await read(variantBytes, constants, {
    disableItemEnhancements: true,
    extendedStash: true,
  });
  assert.deepEqual(
    variantSaved.items.map((item) => item.picture_id),
    [0, 1, 2, 3, 4, 5]
  );
  assert(variantSaved.items.every((item) => item.multiple_pictures === 1));
  assert.deepEqual(
    codec.importCharacter(variantBytes).stash.map((item) => item.iconIndex),
    [0, 1, 2, 3, 4, 5]
  );
  const invalidVariant = structuredClone(variantBuild);
  invalidVariant.stash[0].iconIndex = 6;
  await assert.rejects(
    codec.exportCharacter(invalidVariant, {
      name: "JewelArts",
      choices: variantChoices,
      rolls: {},
    }),
    (error) => error.code === "base"
  );
  const socketVariantBuild = planner.createBuild("paladin");
  socketVariantBuild.charms = [];
  socketVariantBuild.stash = Array.from({ length: 6 }, (_, iconIndex) => ({
    name: "Harlequin Crest",
    quality: "unique",
    catalogId: "unique248",
    baseCode: "uap",
    requiredLevel: 62,
    itemLevel: 99,
    notes: "",
    bonuses: {},
    sockets: 1,
    socketedItems: [iconIndex % 2 ? "j15ar" : "j15fr"],
    socketIconIndices: { 0: iconIndex },
    stashPosition: iconIndex * 2,
  }));
  assert.deepEqual(
    planner.decodeBuild(planner.encodeBuild(socketVariantBuild)),
    socketVariantBuild
  );
  const socketVariantChoices = Object.fromEntries(
    gameSaveEntries(socketVariantBuild).map((entry) => [
      entry.key,
      codec.defaultChoice(entry, socketVariantBuild),
    ])
  );
  const socketVariantBytes = await codec.exportCharacter(socketVariantBuild, {
    name: "SocketArts",
    choices: socketVariantChoices,
    rolls: {},
  });
  const socketVariantSaved = await read(socketVariantBytes, constants, {
    disableItemEnhancements: true,
    extendedStash: true,
  });
  assert.deepEqual(
    socketVariantSaved.items.map((item) => item.socketed_items[0].picture_id),
    [0, 1, 2, 3, 4, 5]
  );
  assert(
    socketVariantSaved.items.every(
      (item) => item.socketed_items[0].multiple_pictures === 1
    )
  );
  assert.deepEqual(
    codec
      .importCharacter(socketVariantBytes)
      .stash.map((item) => item.socketIconIndices?.[0]),
    [0, 1, 2, 3, 4, 5]
  );
  const { itemSockets } = await server.ssrLoadModule(
    "/src/utils/planner-item-presentation.ts"
  );
  for (const [index, item] of socketVariantBuild.stash.entries()) {
    assert.equal(
      itemSockets(item, [])[0].image_url,
      `/images/planner/items/misc/gem/perfect_diamond${index + 1}.webp`
    );
    assert.throws(() =>
      planner.parsePlannerItem({ ...item, socketIconIndices: { 0: 6 } })
    );
    assert.throws(() => planner.parsePlannerItem({ ...item, socketedItems: ["r01"] }));
  }
  console.log(
    "14 unique jewels, 2 magic presets and 6 loose/socketed graphics: images, properties, JSON and independent .d2s readback passed."
  );
} finally {
  await server.close();
}
