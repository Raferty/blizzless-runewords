import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
try {
  const { createBuild } = await server.ssrLoadModule("/src/utils/planner.ts");
  const { createGameSaveExporter } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const { advancedBuildStats } = await server.ssrLoadModule(
    "/src/utils/planner-advanced-stats.ts"
  );
  const { applyItemRoll } = await server.ssrLoadModule(
    "/src/utils/planner-item-catalog.ts"
  );
  const { nativeStatsSignature } = await server.ssrLoadModule(
    "/src/utils/planner-properties.ts"
  );
  const data = JSON.parse(await readFile("public/data/planner-save/data.json"));
  const codec = createGameSaveExporter(
    data,
    JSON.parse(await readFile("public/data/planner-save/strings.json"))
  );
  const build = () => ({
    ...createBuild("paladin"),
    level: 92,
    charms: [],
    attributes: { strength: 200, dexterity: 200, vitality: 0, energy: 0 },
  });
  const item = (baseCode, extra = {}) => ({
    name: baseCode,
    baseCode,
    quality: "normal",
    requiredLevel: 1,
    bonuses: {},
    notes: "",
    itemLevel: 99,
    ...extra,
  });
  const unique = (name, extra = {}) => {
    const [catalogId, def] = Object.entries(data.uniqueItems).find(
      ([, row]) => row.index === name
    );
    const result = item(def.code, { name, quality: "unique", catalogId, ...extra });
    applyItemRoll(codec, result, 1, "paladin");
    return result;
  };
  const set = (catalogId) => {
    const def = data.setItems[catalogId];
    const result = item(def.item, { name: def.index, quality: "set", catalogId });
    applyItemRoll(codec, result, 1, "paladin");
    return result;
  };
  const calculate = (b, lang = "en") => advancedBuildStats(b, codec, lang);
  const rows = (result) => result.groups.flatMap((group) => group.rows);

  // Values visible in the supplied Advanced Stats screenshot, read from native
  // imported properties rather than guessed from a known unique template.
  const imported = build();
  const armor = item("utp", {
    quality: "crafted",
    bonuses: { fcr: 127, fhr: 72, ias: 20, frw: 36, magicFind: 194 },
  });
  armor.importedStats = {
    signature: nativeStatsSignature(armor),
    values: {
      manarecoverybonus: 34,
      item_attackertakesdamage: 19,
      item_goldbonus: 309,
      item_reducedprices: 15,
      item_lightradius: 8,
      item_undeaddamage_percent: 50,
      item_manaafterkill: 5,
      item_deadlystrike: 30,
      item_absorbmagic: 6,
    },
  };
  imported.equipment.armor = armor;
  const screenshot = calculate(imported);
  assert.deepEqual(screenshot.warnings, []);
  for (const [stat, value] of Object.entries(armor.importedStats.values)) {
    assert.equal(screenshot.stats[stat], value, stat);
    assert(
      rows(screenshot).some((row) => row.key === stat && row.amount === value),
      stat + " displayed"
    );
  }
  assert.equal(screenshot.stats.item_magicbonus, 194);
  assert.equal(screenshot.stats.item_fastercastrate, 127);
  assert(
    rows(calculate(imported, "ru")).some(
      (row) => row.label === "Регенерация маны" && row.value === "34%"
    )
  );
  const changed = structuredClone(imported);
  changed.equipment.armor.propertyRoll = 1;
  assert.equal(
    calculate(changed).stats.manarecoverybonus,
    undefined,
    "stale native values are not retained after template edits"
  );

  const gear = build();
  gear.equipment.head = unique("Harlequin Crest", { sockets: 1, socketedItems: ["r13"] });
  gear.equipment.gloves = unique("Magefist");
  gear.equipment.ringRight = unique("Wisp");
  gear.equipment.mainHand = unique("Hiram's Treason");
  gear.equipment.armor = item("utp", {
    name: "Enigma",
    quality: "runeword",
    runewordId: 64,
    baseKind: "armor",
    sockets: 3,
  });
  // Find the catalogue ID, avoiding an accidental association with a different word.
  const { plannerRunewords } = await server.ssrLoadModule(
    "/src/utils/planner-runeword-recipes.ts"
  );
  gear.equipment.armor.runewordId = plannerRunewords.find(
    (word) => word.name.en === "Enigma"
  ).id;
  applyItemRoll(codec, gear.equipment.armor, 1, "paladin");
  let result = calculate(gear);
  assert.equal(result.stats.item_magicbonus, 162, "92 Enigma +50 Shako +20 Wisp MF");
  assert.equal(result.stats.maxhp, 138, "Shako per-level life is counted once");
  assert.equal(result.stats.strength, 71, "69 Enigma +2 Shako strength");
  assert.equal(result.stats.manarecoverybonus, 25);
  assert.equal(result.stats.item_absorblight_percent, 20);
  assert.equal(result.stats.item_fastergethitrate, 20, "Shael in helm");
  assert.equal(result.stats.item_deadlystrike, 30);
  assert.equal(
    result.stats.item_maxdamage_percent,
    undefined,
    "weapon ED is not a character-wide multiplier"
  );
  assert(
    rows(result).some(
      (row) => row.key.startsWith("item_maxdamage_percent@") && row.amount === 350
    )
  );
  assert(
    rows(result).some(
      (row) => row.key.startsWith("item_replenish_quantity@") && row.value === "1 / 5 s"
    )
  );
  gear.level = 80;
  assert.equal(calculate(gear).stats.maxhp, 120);
  gear.level = 92;
  gear.stash.push(unique("Goldwrap"));
  gear.mercenary = {
    type: "barbarian-frenzy",
    level: 91,
    equipment: { head: unique("Andariel's Visage") },
  };
  assert.equal(
    calculate(gear).stats.item_fasterattackrate,
    0,
    "stash and mercenary gear excluded"
  );

  gear.equipment.swapMain = unique("Wizardspike");
  gear.weaponSet = 1;
  assert.equal(calculate(gear).stats.item_deadlystrike, undefined);
  assert.equal(calculate(gear).stats.item_fastercastrate, 70, "swap weapon +Magefist");
  gear.weaponSet = 0;
  const blocked = structuredClone(gear);
  blocked.level = 1;
  assert.equal(
    calculate(blocked).stats.item_deadlystrike,
    undefined,
    "unusable item excluded"
  );

  const socketed = build();
  socketed.equipment.head = unique("Griffon's Eye", {
    sockets: 1,
    socketedItems: ["unique392"],
    socketPropertyValues: { 0: { 2: 3, 3: 3 } },
  });
  result = calculate(socketed);
  assert.equal(result.stats.passive_ltng_pierce, 23);
  assert.equal(result.stats.passive_ltng_mastery, 18);
  const snapshot = JSON.stringify(socketed);
  const bytes = await codec.exportCharacter(socketed, {
    name: "AdvancedStats",
    gameMode: "rotw",
    rolls: {},
    choices: Object.fromEntries(
      (await server.ssrLoadModule("/src/utils/planner-game-save.ts"))
        .gameSaveEntries(socketed)
        .map((entry) => [entry.key, codec.defaultChoice(entry, socketed)])
    ),
  });
  const restored = codec.importCharacter(bytes);
  assert.equal(
    calculate(restored).stats.passive_ltng_pierce,
    23,
    "imported facet is not counted twice"
  );
  assert.equal(calculate(restored).stats.passive_ltng_mastery, 18);
  assert.equal(
    JSON.stringify(socketed),
    snapshot,
    "summary calculation does not mutate a build"
  );

  const angelic = build();
  angelic.equipment.ringLeft = set("set052");
  angelic.equipment.ringRight = set("set052");
  assert.equal(
    calculate(angelic).stats.tohit,
    undefined,
    "duplicate rings alone do not activate a two-piece set"
  );
  angelic.equipment.amulet = set("set053");
  result = calculate(angelic);
  assert.equal(result.stats.tohit, 2208, "two rings each gain 12 AR per level");
  assert.equal(result.stats.maxhp, 115, "2×20 ring life plus75 amulet partial bonus");
  assert.equal(
    result.stats.item_allskills,
    0,
    "duplicate rings do not unlock a third piece"
  );
  angelic.equipment.armor = set("set051");
  assert.equal(calculate(angelic).stats.item_allskills, 1);
  assert.equal(calculate(angelic).stats.item_magicbonus, 100);

  const barb = { ...build(), classId: "barbarian" };
  barb.equipment.mainHand = unique("The Grandfather");
  barb.equipment.offHand = unique("Bloodletter");
  result = calculate(barb);
  assert.equal(
    result.stats.lifedrainmindam,
    undefined,
    "weapon-local leech is not transferred to the other hand"
  );
  assert(rows(result).some((row) => row.key.startsWith("lifedrainmindam@")));
  assert.equal(result.warnings.length, 0);
  console.log(
    "Advanced stats: screenshot properties, native rolls, per-level rounding, sockets, weapon swaps, requirements, sets, dual wield and binary roundtrip passed."
  );
} finally {
  await server.close();
}
