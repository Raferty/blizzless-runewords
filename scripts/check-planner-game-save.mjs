import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { read as readIndependent } from "@d2runewizard/d2s";
import { constants as defaults } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
try {
  const native = await server.ssrLoadModule("/src/utils/planner-game-save.ts");
  const planner = await server.ssrLoadModule("/src/utils/planner.ts");
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
    assertions++;
    return { bytes, read, raw: codec.saver.readD2S(bytes) };
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
    const { raw } = await verify(build);
    assert.equal(raw.profile.mercLevel, 90, merc.value);
    assert(raw.profile.merc, merc.value);
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
      .map((a) => Number(a.id.slice(2)));
    const suffixes = modItem.affixes
      .filter((a) => a.id.startsWith("ms"))
      .map((a) => Number(a.id.slice(2)));
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
