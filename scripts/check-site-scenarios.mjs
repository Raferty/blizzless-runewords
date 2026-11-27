import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import process from "node:process";
import { createHash } from "node:crypto";
import { createServer } from "vite";

const audit = process.argv[2] ?? "docs/audits/site-scenarios";
await mkdir(`${audit}/fixtures`, { recursive: true });
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
const report = {
  cases: [],
  failures: [],
  exports: 0,
  repeatedImports: 0,
  classes: [],
  mercenaries: [],
};
try {
  const planner = await server.ssrLoadModule("/src/utils/planner.ts");
  const shared = await server.ssrLoadModule("/src/shared/planner.ts");
  const native = await server.ssrLoadModule("/src/utils/planner-game-save.ts");
  const sharing = await server.ssrLoadModule("/src/utils/planner-share.ts");
  const catalog = await server.ssrLoadModule("/src/utils/planner-item-catalog.ts");
  const affixes = await server.ssrLoadModule("/src/utils/planner-affixes.ts");
  const damage = await server.ssrLoadModule("/src/utils/planner-damage.ts");
  const data = JSON.parse(await readFile("public/data/planner-save/data.json"));
  const codec = native.createGameSaveExporter(
    data,
    JSON.parse(await readFile("public/data/planner-save/strings.json"))
  );
  const item = (name, quality, baseCode, extra = {}) => ({
    name,
    quality,
    baseCode,
    requiredLevel: 1,
    itemLevel: 99,
    propertyRoll: 1,
    notes: "",
    bonuses: {},
    ...extra,
  });
  const unique = (name) => {
    const [catalogId, def] = Object.entries(data.uniqueItems).find(
      ([, def]) => def.index === name
    );
    return item(name, "unique", def.code, { catalogId, requiredLevel: def.lvlreq });
  };
  const setItem = (name) => {
    const [catalogId, def] = Object.entries(data.setItems).find(
      ([, def]) => def.index === name
    );
    return item(name, "set", def.item, { catalogId, requiredLevel: def.lvlreq });
  };
  const word = (name, runewordId, baseKind, baseCode, sockets) =>
    item(name, "runeword", baseCode, { runewordId, baseKind, sockets });
  const magic = (baseCode, quality = "magic") => {
    const value = item(`QA ${quality}`, quality, baseCode);
    for (const kind of ["prefix", "suffix"]) {
      const selected = affixes.itemAffixes.find(
        (affix) => affix.kind === kind && affixes.canAddAffix(affix, value)
      );
      if (selected) (value.affixes ??= []).push(affixes.newAffix(selected));
    }
    return value;
  };
  const options = (build, mode) => ({
    name: `QA${build.classId}`,
    gameMode: mode,
    rolls: {},
    choices: Object.fromEntries(
      native
        .gameSaveEntries(build)
        .map((entry) => [entry.key, codec.defaultChoice(entry, build)])
    ),
  });
  const snapshot = (bytes) => {
    const parsed = codec.readCharacter(bytes);
    assert.equal(parsed.warnings.length, 0);
    const expand = (id) => {
      if (typeof id !== "number") return id ?? null;
      const value = parsed.items[id];
      return {
        base: value.base,
        quality: value.quality,
        unique: value.unique ?? null,
        ethereal: !!value.ethereal,
        sockets: value.sockets,
        quantity: value.quantity ?? null,
        stats: Object.fromEntries(
          Object.entries(value.stats)
            .filter(([, amount]) => amount)
            .sort()
        ),
        socketedItems: value.socketedItems.map(expand),
      };
    };
    return {
      equipment: Object.fromEntries(
        Object.entries(parsed.profile.items).map(([slot, id]) => [slot, expand(id)])
      ),
      mercenary: Object.fromEntries(
        Object.entries(parsed.profile.mercItems).map(([slot, id]) => [slot, expand(id)])
      ),
      inventory: parsed.profile.inventory.map(expand),
      stash: parsed.profile.stash.map(expand),
      belt: parsed.profile.belt.map(expand),
    };
  };
  async function check(label, operation) {
    try {
      await operation();
      report.cases.push(label);
    } catch (error) {
      report.failures.push({
        label,
        error: String(error),
        stack: error.stack?.split("\n").slice(0, 8),
      });
      console.error(label, String(error));
    }
  }
  const mercenaries = shared.mercenaries.filter((merc) => merc.act);
  let index = 0;
  for (const character of shared.plannerClasses) {
    report.classes.push(character.id);
    for (const level of [1, 12, 30, 62, 92, 99])
      for (const allocation of ["unspent", "allocated"]) {
        const label = `${character.id}/${level}/${allocation}`;
        index++;
        await check(label, async () => {
          const build = planner.createBuild(character.id);
          build.name = `QA ${character.id} ${level} ${allocation}`;
          build.level = level;
          build.hardcore = index % 2 === 0;
          build.difficulty = shared.difficulties[index % 3].value;
          build.materials = Object.fromEntries(
            Object.keys(build.materials).map((key) => [key, 0])
          );
          for (const [difficulty, rewards] of Object.entries(build.quests))
            for (const key of Object.keys(rewards))
              rewards[key] = level >= 62 || (level >= 12 && difficulty === "normal");
          const budget = planner.attributeBudget(build);
          if (allocation === "allocated") {
            build.attributes = {
              strength: Math.floor(budget * 0.2),
              dexterity: Math.floor(budget * 0.15),
              energy: Math.floor(budget * 0.1),
              vitality: 0,
            };
            build.attributes.vitality = budget - planner.spentAttributes(build);
          }
          build.gold = level * 10000;
          build.stashGold = 2500000;
          const skills = shared.plannerSkills.filter(
            (skill) => skill.classId === character.id
          );
          const preferred = [
            skills[(index * 7) % skills.length],
            ...skills.slice().reverse(),
          ];
          for (const skill of preferred) {
            let plan;
            while ((plan = planner.skillPlan(build, skill)))
              for (const id of plan) build.skills[id] = (build.skills[id] ?? 0) + 1;
          }
          assert.equal(planner.spentSkills(build), planner.skillBudget(build));
          build.primarySkills = [
            ...new Set(
              preferred.filter((skill) => build.skills[skill.id]).map((skill) => skill.id)
            ),
          ].slice(0, 3);
          const helms = [
            item("Cap", "normal", "cap", { sockets: 1, socketedItems: ["r03"] }),
            magic("cap"),
            magic("cap", "rare"),
            setItem("Sigon's Visor"),
            unique("Harlequin Crest"),
            word("Lore", 16, "armor", "cap", 2),
          ];
          build.equipment = {
            head: helms[[1, 12, 30, 62, 92, 99].indexOf(level)],
            armor:
              level >= 62
                ? word("Enigma", 77, "armor", "xtp", 3)
                : item("Quilted Armor", "normal", "qui"),
            mainHand:
              level >= 30
                ? word("Heart of the Oak", 60, "weapon", "fla", 4)
                : item("Short Sword", "normal", "ssd"),
            offHand:
              level >= 30
                ? word("Spirit", 13, "shield", "uit", 4)
                : item("Buckler", "normal", "buc"),
            ringLeft: magic("rin", "rare"),
            ringRight: unique("The Stone of Jordan"),
            amulet: level >= 62 ? unique("Mara's Kaleidoscope") : magic("amu"),
            gloves: unique("Magefist"),
            belt: level >= 92 ? unique("Arachnid Mesh") : setItem("Sigon's Wrap"),
            boots: unique("Sandstorm Trek"),
            swapMain: word("Call to Arms", 63, "weapon", "crs", 5),
            swapOff: word("Spirit", 13, "shield", "uit", 4),
          };
          const merc = mercenaries[index % mercenaries.length];
          if (level >= 30) {
            build.mercenary = {
              type: merc.value,
              level: Math.min(98, level - 1),
              equipment: {
                head: unique("Andariel's Visage"),
                armor: word("Fortitude", 66, "armor", "utp", 4),
                mainHand: item(
                  "QA mercenary weapon",
                  "normal",
                  merc.act === 1
                    ? "sbw"
                    : merc.act === 2
                      ? "scy"
                      : merc.value.endsWith("axes")
                        ? "hax"
                        : "crs"
                ),
              },
            };
            build.mercenary.equipment.head.ethereal = true;
            build.mercenary.equipment.head.sockets = 1;
            build.mercenary.equipment.head.socketedItems = ["j15fr"];
            build.mercenary.equipment.armor.ethereal = true;
            if (merc.act === 3 || merc.value.startsWith("barbarian-frenzy"))
              build.mercenary.equipment.offHand = item(
                "QA offhand",
                "normal",
                merc.act === 3 ? "buc" : merc.value.endsWith("axes") ? "hax" : "crs"
              );
            if (!report.mercenaries.includes(merc.value))
              report.mercenaries.push(merc.value);
          } else build.mercenary = { type: "none", level, equipment: {} };
          build.stash = [
            magic("rin"),
            magic("rin", "rare"),
            unique("Raven Frost"),
            setItem("Sigon's Gage"),
            item("Full Rejuvenation Potion", "normal", "rvl"),
            item("Tome of Identify", "normal", "ibk", { quantity: 17 }),
          ];
          for (const entry of native.gameSaveEntries(build))
            if (codec.itemDefinition(entry.item))
              catalog.applyItemRoll(codec, entry.item, index % 2, character.id);
          const parsed = planner.parseBuild(build);
          assert.deepEqual(planner.decodeBuild(planner.encodeBuild(parsed)), parsed);
          assert.deepEqual(
            await sharing.decodeSharedBuild(await sharing.encodeSharedBuild(parsed)),
            parsed
          );
          const projected = planner.buildStats(parsed, codec);
          assert(Object.values(projected.attributes).every(Number.isFinite));
          const calculations = damage.calculateBuildDamage(codec, parsed);
          for (const row of calculations.rows)
            for (const key of ["min", "max", "mana"])
              assert(Number.isFinite(row[key]), `${row.id} ${key}`);
          for (const target of [1, 12, 30, 92, 99]) {
            const changed = planner.buildAtLevel(parsed, target);
            assert.equal(changed.level, target);
            assert(planner.spentAttributes(changed) <= planner.attributeBudget(changed));
            assert(planner.spentSkills(changed) <= planner.skillBudget(changed));
            assert(changed.mercenary.level <= Math.min(98, target));
          }
          for (const mode of character.id === "warlock"
            ? ["rotw"]
            : ["rotw", "expansion"]) {
            const bytes = await codec.exportCharacter(parsed, options(parsed, mode));
            report.exports++;
            assert.equal(
              new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
                12,
                true
              ),
              native.saveChecksum(bytes)
            );
            const imported = codec.importCharacter(bytes);
            assert.equal(imported.classId, character.id);
            assert.equal(imported.level, level);
            assert.equal(imported.hardcore, parsed.hardcore);
            assert.deepEqual(imported.attributes, parsed.attributes);
            assert.deepEqual(imported.skills, parsed.skills);
            assert.deepEqual(imported.quests, parsed.quests);
            assert.deepEqual(imported.waypoints, parsed.waypoints);
            assert.equal(imported.mercenary.type, parsed.mercenary.type);
            const readback = codec.readCharacter(bytes);
            assert.equal(
              readback.profile.attributes.statpts,
              budget - planner.spentAttributes(parsed)
            );
            assert.equal(readback.profile.attributes.newskills, 0);
            const second = await codec.exportCharacter(imported, options(imported, mode));
            assert.deepEqual(
              snapshot(second),
              snapshot(bytes),
              "Item state survives repeated export/import"
            );
            report.repeatedImports++;
            if (level === 92 && allocation === "allocated" && mode === "rotw") {
              await writeFile(
                `${audit}/fixtures/${character.id}.json`,
                JSON.stringify(parsed, null, 2)
              );
              await writeFile(`${audit}/fixtures/${character.id}.d2s`, bytes);
              await writeFile(
                `${audit}/fixtures/${character.id}.sha256`,
                createHash("sha256").update(bytes).digest("hex")
              );
            }
          }
        });
      }
  }
  await check("per-level equipment summary", async () => {
    const build = planner.createBuild("druid");
    build.level = 92;
    build.charms = [];
    build.attributes.strength = 40;
    build.equipment.armor = word("Enigma", 77, "armor", "xtp", 3);
    catalog.applyItemRoll(codec, build.equipment.armor, 1, "druid");
    assert.equal(
      planner.buildStats(build, codec).attributes.strength,
      124,
      "15 base + 40 allocated + 69 Enigma"
    );
    for (const level of [65, 80, 92, 99]) {
      build.level = level;
      assert.equal(
        planner.buildStats(build, codec).bonuses.magicFind,
        Math.floor(level),
        "Enigma's MF scales with level"
      );
    }
  });
} finally {
  await server.close();
  await writeFile(`${audit}/scenarios.json`, JSON.stringify(report, null, 2));
}
console.log(
  JSON.stringify({
    cases: report.cases.length,
    failures: report.failures.length,
    exports: report.exports,
    repeatedImports: report.repeatedImports,
    classes: report.classes,
    mercenaries: report.mercenaries,
  })
);
if (report.failures.length) process.exitCode = 1;
