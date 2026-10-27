import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createServer } from "vite";

const bytes = await readFile(
  new URL("../public/data/planner-save/data.json", import.meta.url)
);
const locale = JSON.parse(
  await readFile(new URL("../public/data/planner-save/strings.json", import.meta.url))
);
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const { createGameSaveExporter } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const native = createGameSaveExporter(JSON.parse(bytes), locale);
  const gd = native.gd;
  const affixes = [];
  for (const [kind, table] of [
    ["prefix", gd.magicPrefix],
    ["suffix", gd.magicSuffix],
  ]) {
    for (const [id, row] of Object.entries(table)) {
      if (!row.spawnable || !row.frequency || row.level > 99) continue;
      const mods = [];
      for (let i = 1; i <= 3; i++) {
        const code = row[`mod${i}code`];
        if (!code) continue;
        const property = gd.properties[code];
        if (!property) throw new Error(`${id}: unknown property ${code}`);
        let min = Number(row[`mod${i}min`] ?? 0),
          max = Number(row[`mod${i}max`] ?? min);
        let param = row[`mod${i}param`] ?? "";
        if (code === "sock" && Number(param) > 0) {
          min = max = Number(param);
          param = "";
        }
        // These functions encode a damage pair, chance + skill level, or charges.
        // Their min/max are distinct parameters, not a scalar roll interval.
        const paired = [1, 2, 3, 4, 5, 6, 7].some((n) =>
          [11, 15, 16, 19].includes(property[`func${n}`])
        );
        const variable = !paired && min < max;
        const definition = { prop1: code, par1: param, min1: min, max1: max };
        mods.push({
          code,
          param,
          min,
          max,
          variable,
          low: native.propertyStats(definition, "", 0),
          high: native.propertyStats(definition, "", 1),
        });
      }
      if (!mods.length) continue;
      affixes.push({
        id,
        kind,
        name: gd.locale.strings[row.name] || row.name,
        group: row.group,
        rare: !!row.rare,
        level: row.level || 1,
        requiredLevel: row.levelreq || 1,
        maxLevel: row.maxlevel || 0,
        types: [1, 2, 3, 4, 5, 6, 7].map((i) => row[`itype${i}`]).filter(Boolean),
        exclude: [1, 2, 3, 4, 5].map((i) => row[`etype${i}`]).filter(Boolean),
        classSpecific: row.classspecific || "",
        mods,
      });
    }
  }
  const bases = {};
  for (const [code, row] of Object.entries(gd.items)) {
    const types = new Set();
    const visit = (type) => {
      if (!type || types.has(type)) return;
      types.add(type);
      visit(gd.itemTypes[type]?.equiv1);
      visit(gd.itemTypes[type]?.equiv2);
    };
    visit(row.type);
    bases[code] = {
      level: row.level || 1,
      magicLevel: row.magiclvl || row.magiclevel || 0,
      types: [...types],
      classSpecific: gd.itemTypes[row.type]?.class || "",
      rare: !!gd.itemTypes[row.type]?.rare,
      maxSockets: row.gemsockets || 0,
    };
  }
  await writeFile(
    new URL("../src/shared/planner-affixes.json", import.meta.url),
    JSON.stringify(
      {
        gameDataSha256: createHash("sha256").update(bytes).digest("hex"),
        affixes,
        bases,
      },
      null,
      2
    ) + "\n"
  );
  console.log(
    `Affix catalog: ${affixes.length} affixes, ${Object.keys(bases).length} bases.`
  );
} finally {
  await server.close();
}
