import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";
import { read } from "@d2runewizard/d2s";
import { constants as defaults } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const p = await server.ssrLoadModule("/src/utils/planner.ts");
  const n = await server.ssrLoadModule("/src/utils/planner-game-save.ts");
  const { inheritRunewordBase } = await server.ssrLoadModule(
    "/src/utils/planner-base-skills.ts"
  );
  const { plannerSkills } = await server.ssrLoadModule("/src/shared/planner.ts");
  const { useRunewordsStore } = await server.ssrLoadModule("/src/store/runewords.ts");
  setActivePinia(createPinia());
  const words = useRunewordsStore().sortedRunewords;
  const data = JSON.parse(await readFile("public/data/planner-save/data.json")),
    codec = n.createGameSaveExporter(
      data,
      JSON.parse(await readFile("public/data/planner-save/strings.json"))
    ),
    constants = structuredClone(defaults);
  for (const [name, s] of Object.entries(data.itemStatCost))
    constants.magical_properties[s.id] = {
      ...constants.magical_properties[s.id],
      s: name,
      sB: s.savebits,
      sA: s.saveadd,
      sP: s.saveparambits,
      cB: s.csvbits,
      e: s.encode ?? constants.magical_properties[s.id]?.e,
    };
  let cases = 0;
  for (const [classId, wordName, type, preferred, skillNames, tab] of [
    ["sorceress", "Leaf", "staf", "sst", ["Fire Ball"]],
    ["paladin", "Holy Thunder", "scep", "wsp", ["Holy Shock"]],
    ["necromancer", "White", "wand", "bwn", ["Bone Spear"]],
    ["barbarian", "Delirium", "phlm", null, ["Battle Orders", "Shout", "Battle Command"]],
    ["druid", "Metamorphosis", "pelt", null, ["Fury"]],
    ["assassin", "Chaos", "h2h2", "7ar", ["Lightning Sentry"]],
    ["amazon", "Faith", "abow", "amc", [], 0],
    ["warlock", "Rhyme", "grim", null, ["Hex: Bane"]],
  ]) {
    const word = words.find((w) => w.name.en === wordName);
    assert(word, wordName);
    const build = { ...p.createBuild(classId), charms: [] };
    let item = {
      name: wordName,
      quality: "runeword",
      runewordId: word.id,
      baseKind: ["pelt", "phlm"].includes(type)
        ? "armor"
        : type === "grim"
          ? "shield"
          : "weapon",
      requiredLevel: word.level,
      itemLevel: 99,
      bonuses: {},
      notes: "",
      propertyRoll: 1,
    };
    const choices = codec.choices({ key: "stash.0", owner: "stash", item }, build);
    const base =
      choices.find((c) => c.base === preferred) ||
      choices.find((c) => codec.gd.items[c.base].type === type);
    assert(base, `${classId} ${wordName} base`);
    item.baseCode = base.base;
    if (skillNames.length)
      item.baseSkills = Object.fromEntries(
        skillNames.map((name) => {
          const skill = plannerSkills.find(
            (s) => s.classId === classId && s.name.en === name
          );
          assert(skill, `${classId} ${name}`);
          return [skill.id, 3];
        })
      );
    if (tab !== undefined) item.baseSkillTab = { tab, value: 3 };
    const blank = { ...item, quality: "normal", ethereal: true };
    delete blank.runewordId;
    const replacement = { ...item };
    delete replacement.baseCode;
    delete replacement.baseSkills;
    delete replacement.baseSkillTab;
    inheritRunewordBase(
      replacement,
      blank,
      choices.map((row) => row.base)
    );
    assert.equal(
      replacement.baseCode,
      blank.baseCode,
      `${classId}: keeps chosen runeword base`
    );
    assert.equal(replacement.ethereal, true);
    assert.deepEqual(replacement.baseSkills, blank.baseSkills);
    assert.deepEqual(replacement.baseSkillTab, blank.baseSkillTab);
    if (blank.baseSkills) assert.notEqual(replacement.baseSkills, blank.baseSkills);
    if (blank.baseSkillTab) assert.notEqual(replacement.baseSkillTab, blank.baseSkillTab);
    const incompatible = { ...replacement };
    inheritRunewordBase(
      incompatible,
      { ...blank, baseCode: "hax" },
      choices.map((row) => row.base).filter((code) => code !== "hax")
    );
    assert.deepEqual(
      incompatible,
      replacement,
      "Unrelated bases are not carried to runewords"
    );
    Object.assign(item, codec.itemBonuses(item, classId));
    item = p.parsePlannerItem(item);
    build.stash = [item];
    assert.deepEqual(p.decodeBuild(p.encodeBuild(build)), build);
    let current = build;
    for (let cycle = 0; cycle < 3; cycle++) {
      const options = {
        name: "BaseSkills",
        choices: Object.fromEntries(
          n.gameSaveEntries(current).map((e) => [e.key, codec.defaultChoice(e, current)])
        ),
        rolls: {},
      };
      const bytes = await codec.exportCharacter(current, options);
      const raw = await read(bytes, constants, {
        disableItemEnhancements: true,
        extendedStash: true,
      });
      const actual = raw.items[0];
      assert.equal(bytes[248], 3);
      for (const [id, value] of Object.entries(item.baseSkills || {}))
        assert(
          actual.magic_attributes.some(
            (s) =>
              s.id === data.itemStatCost.item_singleskill.id &&
              s.values[0] === Number(id) &&
              s.values[1] === value
          ),
          `${classId} base skill written separately from runeword`
        );
      if (tab !== undefined)
        assert(
          actual.magic_attributes.some(
            (s) =>
              s.id === data.itemStatCost.item_addskill_tab.id &&
              s.values[0] === tab &&
              s.values.at(-1) === 3
          )
        );
      current = codec.importCharacter(bytes);
      assert.deepEqual(
        current.stash[0].baseSkills,
        item.baseSkills,
        `${classId} staff skills survive cycle ${cycle}`
      );
      assert.deepEqual(
        current.stash[0].baseSkillTab,
        item.baseSkillTab,
        `${classId} auto skill tab survives cycle ${cycle}`
      );
      cases++;
    }
    const invalid = {
      ...item,
      baseSkills: { [plannerSkills.find((s) => s.classId !== classId).id]: 3 },
    };
    assert.throws(() => p.parsePlannerItem(invalid));
    if (item.baseSkills) {
      const id = Object.keys(item.baseSkills)[0];
      assert.throws(() => p.parsePlannerItem({ ...item, baseSkills: { [id]: 4 } }));
    }
    assert.throws(() =>
      p.parsePlannerItem({ ...item, baseCode: "crs", baseSkillTab: { tab: 0, value: 3 } })
    );
  }
  console.log(
    `Base skill mods: 8 classes / ${cases} independent native roundtrips, separate runeword/base blocks and validation passed.`
  );
} finally {
  await server.close();
}
