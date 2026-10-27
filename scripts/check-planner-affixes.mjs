import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createServer } from "vite";
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const a = await server.ssrLoadModule("/src/utils/planner-affixes.ts");
  const p = await server.ssrLoadModule("/src/utils/planner.ts");
  const { itemRequiredLevel } = await server.ssrLoadModule(
    "/src/utils/planner-sockets.ts"
  );
  const { createGameSaveExporter } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const { definitionPropertyLines } = await server.ssrLoadModule(
    "/src/utils/planner-item-catalog.ts"
  );
  const bytes = await readFile(
    new URL("../public/data/planner-save/data.json", import.meta.url)
  );
  const data = JSON.parse(bytes),
    locale = JSON.parse(
      await readFile(new URL("../public/data/planner-save/strings.json", import.meta.url))
    );
  const generated = JSON.parse(
    await readFile(new URL("../src/shared/planner-affixes.json", import.meta.url))
  );
  assert.equal(
    generated.gameDataSha256,
    createHash("sha256").update(bytes).digest("hex")
  );
  assert.equal(
    data.magicPrefix.mp420.rare,
    undefined,
    "Blank Blizzless cells must not inherit vanilla flags"
  );
  assert.equal(
    data.magicPrefix.mp420.mod1min,
    undefined,
    "Socket param must not inherit a vanilla roll"
  );
  assert.equal(data.magicPrefix.mp667.itype2, undefined, "No inherited item types");
  const native = createGameSaveExporter(data, locale);
  const base = {
    name: "Bone Visage",
    quality: "magic",
    baseCode: "uh9",
    itemLevel: 99,
    requiredLevel: 63,
    sockets: 0,
    notes: "",
    bonuses: {},
  };
  let cases = 0;
  for (const affix of a.itemAffixes) {
    for (const roll of [0, 0.5, 1]) {
      const row = {
        id: affix.id,
        values: affix.mods.map((m) =>
          m.variable ? Math.floor(m.min + (m.max - m.min) * roll) : 0
        ),
      };
      const stats = a.affixStats({ ...base, affixes: [row] });
      assert.deepEqual(
        stats,
        native.propertyStats(a.affixDefinition(affix, row.values), "", 1),
        affix.id
      );
      assert(
        definitionPropertyLines(native, a.affixDefinition(affix, row.values), 1, 90)
          .length,
        affix.id
      );
      cases++;
    }
  }
  const choose = (code, kind, item = base) =>
    a.itemAffixes.find(
      (f) =>
        f.kind === kind && a.canAddAffix(f, item) && f.mods.some((m) => m.code === code)
    );
  const defense = choose("ac%", "prefix"),
    life = choose("hp", "suffix");
  assert(defense && life);
  const magic = { ...base, affixes: [a.newAffix(defense), a.newAffix(life)] };
  assert.deepEqual(p.parsePlannerItem(magic).affixes, magic.affixes);
  assert.equal(a.itemAffixes.filter((f) => a.canAddAffix(f, magic)).length, 0);
  assert.throws(() =>
    p.parsePlannerItem({ ...magic, affixes: [...magic.affixes, a.newAffix(defense)] })
  );
  assert.throws(() => p.parsePlannerItem({ ...magic, quality: "normal" }));
  assert.throws(() =>
    p.parsePlannerItem({ ...magic, affixes: [{ id: "mp9999", values: [] }] })
  );
  for (const v of [-9999, 999999, 1.1, null, "1"])
    assert.throws(() =>
      p.parsePlannerItem({ ...magic, affixes: [{ id: defense.id, values: [v] }] })
    );
  assert.equal(a.affixLevel({ ...base, itemLevel: 1 }), 69);
  assert.equal(a.affixLevel({ ...base, baseCode: "ci3", itemLevel: 1 }), 99);
  assert(!a.canBeRare("cm3"));
  const six = { ...base, quality: "rare", affixes: [] };
  for (const kind of ["prefix", "suffix"])
    for (let i = 0; i < 3; i++) {
      const next = a.itemAffixes.find(
        (f) =>
          a.canAddAffix(f, six) &&
          f.kind === kind &&
          !f.mods.some((m) => m.code === "sock")
      );
      assert(next);
      six.affixes.push(a.newAffix(next));
    }
  assert.equal(p.parsePlannerItem(six).affixes.length, 6);
  assert(!a.itemAffixes.some((f) => a.canAddAffix(f, six)));
  const build = p.createBuild("paladin");
  build.equipment.head = magic;
  const blank = p.createBuild("paladin");
  assert.equal(
    p.buildStats(build).life - p.buildStats(blank).life,
    a.affixStats(magic).maxhp
  );
  build.mercenary.equipment.head = magic;
  build.stash = [magic];
  assert.equal(
    p.buildStats(build).life - p.buildStats(blank).life,
    a.affixStats(magic).maxhp,
    "Merc/stash excluded"
  );
  assert.deepEqual(p.decodeBuild(p.encodeBuild(build)), p.parseBuild(build));
  assert.equal(
    itemRequiredLevel(magic),
    Math.max(63, defense.requiredLevel, life.requiredLevel)
  );
  const skiller = {
    name: "Grand Charm",
    quality: "magic",
    baseCode: "cm3",
    itemLevel: 99,
    requiredLevel: 1,
    bonuses: {},
    notes: "",
    sockets: 0,
  };
  const skillAffix = a.itemAffixes.find(
    (f) =>
      a.affixFits(f, skiller) &&
      f.mods.some((m) => m.code === "skilltab" && m.param === 11)
  );
  assert(skillAffix);
  skiller.affixes = [a.newAffix(skillAffix)];
  build.equipment = {};
  build.charms = [{ ...skiller, id: "test", height: 3, position: 0 }];
  assert.equal(p.buildStats(build).treeBonuses[2], 1);
  assert.equal(p.buildStats(build).treeBonuses[0], 0);
  const sockets = a.itemAffixes.find(
    (f) => a.affixFits(f, base) && f.mods.some((m) => m.code === "sock" && m.max === 3)
  );
  assert(sockets);
  assert.throws(() => p.parsePlannerItem({ ...base, affixes: [a.newAffix(sockets)] }));
  assert.equal(
    p.parsePlannerItem({ ...base, sockets: 3, affixes: [a.newAffix(sockets)] }).sockets,
    3
  );
  console.log(
    `Affixes: ${a.itemAffixes.length} definitions, ${cases} property rolls; quality/type/group/count, level, sockets, JSON, summary and skill-tree bonuses passed.`
  );
} finally {
  await server.close();
}
