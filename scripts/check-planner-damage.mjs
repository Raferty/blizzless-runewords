import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const { createBuild } = await server.ssrLoadModule("/src/utils/planner.ts");
  const { plannerSkills, plannerClasses } = await server.ssrLoadModule(
    "/src/shared/planner.ts"
  );
  const { createGameSaveExporter } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const { calculateBuildDamage, animationFrames, skillDamageByLevel, combatItemStats } =
    await server.ssrLoadModule("/src/utils/planner-damage.ts");
  const { evaluateSkillFormula } = await server.ssrLoadModule(
    "/src/utils/planner-skill-formula.ts"
  );
  const native = createGameSaveExporter(
    JSON.parse(await readFile("public/data/planner-save/data.json")),
    JSON.parse(await readFile("public/data/planner-save/strings.json"))
  );
  const item = (baseCode, bonuses = {}) => ({
    name: baseCode,
    baseCode,
    bonuses,
    quality: "normal",
    requiredLevel: 1,
    notes: "",
  });
  const row = (build, id, options) =>
    calculateBuildDamage(native, build, options).rows.find((r) => r.id === id);
  const damage = (result) => [result.min, result.max];
  const context = {
    variable: (name) => ({ lvl: 7, par1: 3 })[name] ?? 0,
    reference: (kind, name, field) =>
      kind === "skill" && name === "Fire Bolt" && field === "blvl" ? 20 : 0,
  };
  assert.equal(
    evaluateSkillFormula(
      "(lvl > 4) ? min(3*par1, skill('Fire Bolt'.blvl)) : 1/0",
      context
    ),
    9
  );
  assert.equal(evaluateSkillFormula("-7/2 + 4*2", context), 5);
  for (const expression of [
    "globalThis.process.exit()",
    "constructor(1)",
    "1;2",
    "1/0",
    "1 +",
  ])
    assert.throws(() => evaluateSkillFormula(expression, context));
  assert.equal(skillDamageByLevel(1, [1, 2, 3, 4, 5], 1), 1);
  assert.equal(skillDamageByLevel(1, [1, 2, 3, 4, 5], 8), 8);
  assert.equal(skillDamageByLevel(1, [1, 2, 3, 4, 5], 9), 10);
  assert.equal(skillDamageByLevel(1, [1, 2, 3, 4, 5], 29), 71);
  assert.equal(animationFrames("paladin", "SC", "hth", 75), 10);
  assert.equal(animationFrames("sorceress", "SC", "hth", 105), 8);
  assert.equal(animationFrames("druid", "SC", "hth", 0), 18);
  assert.equal(animationFrames("warlock", "SC", "hth", 0), 15);

  const sorc = createBuild("sorceress");
  sorc.skills = { 36: 1 };
  assert.deepEqual(damage(row(sorc, 36)), [3, 6]);
  assert.equal(row(sorc, 36).mana, 2.5);
  sorc.skills = { 36: 20 };
  assert.deepEqual(damage(row(sorc, 36)), [45, 60]);
  sorc.skills[47] = 20;
  sorc.skills[56] = 20;
  assert.deepEqual(damage(row(sorc, 36)), [336, 447]);
  sorc.skills[61] = 20;
  assert.deepEqual(damage(row(sorc, 36)), [885, 1177]);
  sorc.equipment.mainHand = item("ssd", { allSkills: 1, fcr: 105 });
  const boosted = row(sorc, 36);
  assert.equal(boosted.level, 21);
  assert.equal(
    boosted.parts[0].synergy,
    640,
    "soft points never increase hard-point synergy"
  );
  assert.equal(boosted.frames, 8);
  assert.equal(boosted.dps, (((boosted.min + boosted.max) / 2) * 25) / 8);
  assert.deepEqual(damage(row(sorc, 36, { resistance: { fire: 100 } })), [0, 0]);
  assert.deepEqual(damage(row(sorc, 36, { resistance: { fire: 50 } })), [
    Math.floor(boosted.min / 2),
    Math.floor(boosted.max / 2),
  ]);
  const before = JSON.stringify(sorc);
  sorc.stash.push(item("ssd", { allSkills: 99 }));
  assert.deepEqual(damage(row(sorc, 36)), damage(boosted));
  sorc.stash.pop();
  assert.equal(JSON.stringify(sorc), before);
  sorc.weaponSet = 1;
  assert.equal(row(sorc, 36).level, 20);
  assert.equal(row(sorc, 36).frames, 13);
  sorc.skills = { 49: 20, 53: 20, 38: 20 };
  const lightning = row(sorc, 49);
  assert.equal(lightning.min, 1, "fixed lightning minimum is not synergized");
  assert.equal(lightning.frames, 19);

  const necro = createBuild("necromancer");
  necro.skills = { 70: 20, 69: 20 };
  assert.deepEqual(damage(row(necro, 70)), [124, 127]);
  assert.equal(row(necro, 70).count, 8);
  assert.equal(row(necro, 70).dps, undefined, "no fabricated summon attack rate");
  necro.mercenary.type = "desert-might";
  necro.mercenary.level = 98;
  assert.deepEqual(
    damage(row(necro, 70)),
    [255, 260],
    "level 20 Might from an expansion mercenary benefits skeletons"
  );
  necro.skills = { 74: 1, 67: 1 };
  const explosion = row(necro, 74, { corpseLife: 1000 });
  assert.deepEqual(damage(explosion), [780, 1280]);
  assert.equal(explosion.parts.length, 2);
  assert.deepEqual(damage(row(necro, 74, { corpseLife: 2000 })), [1560, 2560]);
  necro.skills = { 92: 20 };
  const poison = row(necro, 92);
  assert.equal(poison.duration, 2);
  assert.equal(poison.dps, (poison.min + poison.max) / 4);

  const pal = createBuild("paladin");
  pal.skills = { 112: 20, 113: 20, 108: 20, 115: 20, 97: 1 };
  const hammer = row(pal, 112);
  assert.deepEqual(damage(hammer), [3518, 3590]);
  assert(row(pal, 112, { auraId: null }).max < hammer.max);
  assert.equal(row(pal, 97).requires, "shield");
  pal.equipment.offHand = item("buc");
  assert.equal(row(pal, 97).requires, undefined);
  assert(row(pal, 97).max > 0);
  pal.equipment.mainHand = item("ssd");
  assert(row(pal, 0).max > 0);

  // All eight classes, every learned skill: safe formulas, stable output and no mutation.
  for (const character of plannerClasses) {
    const build = createBuild(character.id);
    build.level = 99;
    build.skills = Object.fromEntries(
      plannerSkills.filter((s) => s.classId === character.id).map((s) => [s.id, 20])
    );
    build.equipment.mainHand = item("7cr");
    const original = JSON.stringify(build);
    const result = calculateBuildDamage(native, build);
    assert.equal(result.rows.length, 31, character.id);
    assert.equal(JSON.stringify(build), original);
    for (const value of result.rows) {
      assert(
        Number.isFinite(value.min) &&
          Number.isFinite(value.max) &&
          value.min <= value.max,
        `${character.id} ${value.skill?.name.en}`
      );
      if (value.dps !== undefined) assert(Number.isFinite(value.dps) && value.dps >= 0);
      if (value.note === "unsupported") assert.equal(value.parts.length, 0);
    }
  }
  const unique = Object.entries(native.gd.uniqueItems).find(([, d]) =>
    Object.values(d).includes("Griffon's Eye")
  );
  assert(unique, "variable mastery item must exist in the server snapshot");
  {
    const test = {
      ...item("ci3"),
      quality: "unique",
      catalogId: unique[0],
      propertyRoll: 0,
    };
    const low = combatItemStats(native, test, "sorceress");
    const high = combatItemStats(native, { ...test, propertyRoll: 1 }, "sorceress");
    assert(
      high.passive_ltng_mastery > low.passive_ltng_mastery,
      "actual variable equipment rolls affect damage"
    );
  }
  const socketed = { ...item("ci3"), sockets: 1, socketedItems: ["unique392"] };
  const facet = combatItemStats(native, socketed, "sorceress");
  assert.equal(facet.passive_ltng_mastery, 5);
  assert.equal(facet.passive_ltng_pierce, 5);
  const socketRoll = combatItemStats(
    native,
    { ...socketed, socketPropertyValues: { 0: { 2: 3, 3: 3 } } },
    "sorceress"
  );
  assert.equal(socketRoll.passive_ltng_mastery, 3);
  assert.equal(socketRoll.passive_ltng_pierce, 3);
  const dual = createBuild("barbarian");
  dual.equipment.mainHand = item("ssd");
  const oneHand = row(dual, 0);
  dual.equipment.offHand = item("7cr");
  assert.deepEqual(damage(row(dual, 0)), damage(oneHand));
  assert.equal(row(dual, 0).dps, undefined);
  console.log(
    "Planner damage: formulas, 8 classes, 240 skills, synergy, mastery, equipment, target resistances, auras, poison and cast breakpoints passed"
  );
} finally {
  await server.close();
}
