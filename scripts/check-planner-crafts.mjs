import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createServer } from "vite";
import { read } from "@d2runewizard/d2s";
import { constants as defaults } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const {
    plannerCrafts,
    unavailableCrafts,
    craftById,
    createCraftedItem,
    craftAffixMinimum,
  } = await server.ssrLoadModule("/src/utils/planner-crafts.ts");
  const { itemAffixes, canAddAffix, newAffix, affixStats, affixRequiredLevel } =
    await server.ssrLoadModule("/src/utils/planner-affixes.ts");
  const { createGameSaveExporter, gameSaveEntries } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const { createItemCatalog, itemPropertyLines } = await server.ssrLoadModule(
    "/src/utils/planner-item-catalog.ts"
  );
  const { createBuild, parsePlannerItem, encodeBuild, decodeBuild, buildStats } =
    await server.ssrLoadModule("/src/utils/planner.ts");
  const { itemRequiredLevel } = await server.ssrLoadModule(
    "/src/utils/planner-sockets.ts"
  );
  const bytes = await readFile("public/data/planner-save/data.json");
  const data = JSON.parse(bytes);
  const snapshot = JSON.parse(await readFile("src/shared/planner-crafts.json"));
  assert.equal(
    snapshot.source.gameDataSha256,
    createHash("sha256").update(bytes).digest("hex")
  );
  const native = createGameSaveExporter(
    data,
    JSON.parse(await readFile("public/data/planner-save/strings.json"))
  );
  assert.equal(plannerCrafts.length, 54);
  assert.deepEqual(
    unavailableCrafts.map((row) => [row.recipeKey, row.reason]),
    [["Envenomed Dagger", "disabled"]]
  );
  assert(
    !craftById.has("upgrade_craft_normal_armor"),
    "upgrades do not create new crafts"
  );
  const complete = (item) => {
    while (item.affixes.length < craftAffixMinimum(item.itemLevel)) {
      const affix = itemAffixes.find((a) => canAddAffix(a, item));
      assert(affix, `${item.name} has enough legal affixes`);
      item.affixes.push(newAffix(affix));
    }
    return item;
  };
  const amulet = createCraftedItem(native, "caster_amulet", "amu", 90, "sorceress");
  assert.equal(amulet.itemLevel, 94);
  assert.equal(amulet.bonuses.fcr, 5);
  assert.equal(amulet.bonuses.mana, 10);
  const max = { ...amulet, propertyRoll: 1 };
  assert.equal(native.itemBonuses(max, "sorceress").bonuses.fcr, 10);
  const exact = { ...amulet, propertyValues: { 3: 7 } };
  assert.equal(native.itemBonuses(exact, "sorceress").bonuses.fcr, 7);
  assert(
    itemPropertyLines(native, exact, 90, "sorceress").some((line) => line.includes("7%"))
  );
  const greater = createCraftedItem(native, "great_cast_amu", "amu", 90, "sorceress");
  assert(
    greater.affixes.some((affix) => affix.id === "ms173"),
    "one-based cube preference resolves to Apprentice, not Magus"
  );
  assert.equal(
    (greater.bonuses.fcr ?? 0) + (affixStats(greater).item_fastercastrate ?? 0),
    20
  );
  for (const patch of [
    { craftId: "missing" },
    { baseCode: "hax" },
    { quality: "rare" },
    { ethereal: true },
  ])
    assert.throws(() => parsePlannerItem({ ...amulet, ...patch }));
  const ready = complete(amulet);
  assert.equal(ready.affixes.length, 4);
  assert(
    !itemAffixes.some((affix) => canAddAffix(affix, ready)),
    "four affixes fill a crafted item"
  );
  assert.throws(() =>
    parsePlannerItem({ ...ready, affixes: [...ready.affixes, ready.affixes[0]] })
  );
  assert.equal(
    affixRequiredLevel(ready),
    Math.min(
      98,
      Math.max(
        ...ready.affixes.map(
          (row) => itemAffixes.find((a) => a.id === row.id).requiredLevel
        )
      ) + 22
    )
  );
  const build = createBuild("sorceress");
  build.equipment.amulet = ready;
  assert.deepEqual(decodeBuild(encodeBuild(build)), build);
  assert.equal(
    buildStats(build).bonuses.fcr,
    (ready.bonuses.fcr ?? 0) + (affixStats(ready).item_fastercastrate ?? 0)
  );
  const catalog = createItemCatalog(
    native,
    build,
    { key: "hero.amulet", owner: "hero", slot: "amulet" },
    []
  );
  assert(catalog.items.some((row) => row.craftId === "caster_amulet"));
  assert(
    !catalog.items.some((row) => row.craftId === "caster_belt"),
    "slot restrictions apply to recipes"
  );
  const constants = structuredClone(defaults);
  for (const [name, stat] of Object.entries(data.itemStatCost))
    constants.magical_properties[stat.id] = {
      ...constants.magical_properties[stat.id],
      s: name,
      sB: stat.savebits,
      sA: stat.saveadd,
      sP: stat.saveparambits,
      cB: stat.csvbits,
      dF: 0,
      e: Number(stat.encode ?? constants.magical_properties[stat.id]?.e ?? 0),
    };
  let exports = 0;
  for (const craft of plannerCrafts) {
    for (const roll of [0, 1]) {
      const variant = craft.variants.find((v) => !v.ethereal) ?? craft.variants[0];
      const code = variant.bases[0];
      const value = createCraftedItem(native, craft.id, code, 99, "sorceress");
      value.propertyRoll = roll;
      Object.assign(value, native.itemBonuses(value, "sorceress"));
      complete(value);
      assert.deepEqual(parsePlannerItem(value), value);
      const test = createBuild("sorceress");
      test.stash = [value];
      const options = { name: "CraftTest", choices: {}, rolls: {} };
      for (const entry of gameSaveEntries(test)) {
        options.choices[entry.key] = native.defaultChoice(entry, test);
        options.rolls[entry.key] = "planned";
      }
      const expected = native.propertyStats(native.itemDefinition(value), code, roll);
      for (const [key, n] of Object.entries(affixStats(value)))
        expected[key] = (expected[key] ?? 0) + n;
      const original = JSON.stringify(test);
      const result = await native.exportCharacter(test, options);
      const saved = await read(result, constants, {
        disableItemEnhancements: true,
        extendedStash: true,
      });
      const item = saved.items.find((item) => item.alt_position_id === 5);
      assert(item, craft.id);
      assert.equal(item.quality, 8, craft.id);
      assert.equal(item.type, code);
      const actual = new Map(item.magic_attributes.map((row) => [row.id, row.values]));
      for (const stat of [
        "item_fastercastrate",
        "maxmana",
        "maxhp",
        "strength",
        "dexterity",
        "item_allskills",
        "passive_fire_mastery",
        "passive_ltng_mastery",
      ])
        if (expected[stat])
          assert.equal(
            actual.get(data.itemStatCost[stat].id)?.[0],
            expected[stat],
            `${craft.id} ${stat}`
          );
      assert.equal(JSON.stringify(test), original, "export does not mutate a craft");
      assert(itemRequiredLevel(value) >= value.requiredLevel);
      exports++;
    }
  }
  console.log(
    `Crafts: ${plannerCrafts.length} recipes, ${exports} independent crafted .d2s readbacks, fixed rolls, preferred affixes, limits, JSON/share and slot filters passed`
  );
} finally {
  await server.close();
}
