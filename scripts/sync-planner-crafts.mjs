import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

const sha256 = "50fe8aa45f6d3ce2b7fc2cec48ed5c6bee11662e28476544f80beadc0c71785d";
const url = "https://blizzless.info/api/launcher-mods/blobs/" + sha256;
const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw Error("Cannot load native crafting recipes");
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash("sha256").update(bytes).digest("hex") !== sha256)
  throw Error("Crafting source checksum mismatch");
const lines = bytes
  .toString("utf8")
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .map((row) => row.split("\t"));
const header = lines.shift();
const rows = lines.map((cells, sourceRow) => ({
  ...Object.fromEntries(header.map((key, i) => [key, cells[i] ?? ""])),
  sourceRow,
}));
const cube = JSON.parse(await readFile("src/shared/cube-catalog.json"));
const dataBytes = await readFile("public/data/planner-save/data.json");
const data = JSON.parse(dataBytes);
const affixes = JSON.parse(await readFile("src/shared/planner-affixes.json"));
const ingredients = new Map(cube.ingredients.map((row) => [row.key, row]));
const crafted = (item) => /\bcrafted\b/i.test(ingredients.get(item.key)?.name.en ?? "");
const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const allBases = { ...data.weapons, ...data.armor, ...data.misc };
const templates = [],
  unavailable = [],
  seen = new Set();
for (const recipe of cube.recipes.filter(
  (row) => row.result.some(crafted) && !row.ingredients.some(crafted)
)) {
  const key = normalize(recipe.name.en);
  if (seen.has(key)) continue;
  seen.add(key);
  const matches = rows.filter(
    (row) =>
      normalize(row.description.split("->").at(-1)) === key && /\bcrf\b/.test(row.output)
  );
  const active = matches.filter((row) => row.enabled === "1");
  if (!active.length) {
    unavailable.push({
      recipeKey: recipe.key,
      name: recipe.name,
      reason: matches.length ? "disabled" : "missing",
    });
    continue;
  }
  const variants = new Map();
  for (const row of active) {
    const input = row["input 1"].split(",");
    if (!input.includes("mag") || !row.output.startsWith("usetype,crf"))
      throw Error(`Unsupported craft: ${recipe.key}`);
    const ethereal = row.output.split(",").includes("eth");
    const definition = {};
    for (let i = 1; i <= 12; i++)
      if (row[`mod ${i}`]) {
        if (row[`mod ${i} chance`] && row[`mod ${i} chance`] !== "100")
          throw Error("Conditional craft mod");
        definition[`prop${i}`] = row[`mod ${i}`];
        definition[`par${i}`] = row[`mod ${i} param`] || "";
        definition[`min${i}`] = Number(row[`mod ${i} min`] || 0);
        definition[`max${i}`] = Number(row[`mod ${i} max`] || row[`mod ${i} min`] || 0);
        if (!data.properties[definition[`prop${i}`]])
          throw Error(`Unknown craft property ${definition[`prop${i}`]}`);
      }
    // Cube preferred affix numbers are one-based; the existing planner IDs are zero-based.
    const preferredAffixes = [...row.output.matchAll(/\b(pre|suf)=(\d+)/g)].map(
      ([, kind, id]) =>
        `${kind === "pre" ? "mp" : "ms"}${String(Number(id) - 1).padStart(3, "0")}`
    );
    const levels = {
      level: Number(row.lvl || 0),
      character: Number(row.plvl || 0),
      input: Number(row.ilvl || 0),
    };
    const signature = JSON.stringify({ ethereal, definition, preferredAffixes, levels });
    if (!variants.has(signature))
      variants.set(signature, {
        ethereal,
        definition,
        preferredAffixes,
        levels,
        bases: [],
        sourceRows: [],
      });
    const variant = variants.get(signature);
    variant.sourceRows.push(row.sourceRow);
    for (const [code, base] of Object.entries(allBases)) {
      if (
        !base.spawnable ||
        !affixes.bases[code]?.rare ||
        (ethereal && (!base.durability || base.nodurability))
      )
        continue;
      const fits = data.itemTypes[input[0]]
        ? affixes.bases[code].types.includes(input[0])
        : code === input[0] ||
          (input.includes("upg") &&
            [base.normcode, base.ubercode, base.ultracode].includes(input[0]));
      if (fits && !variant.bases.includes(code)) variant.bases.push(code);
    }
  }
  const usable = [...variants.values()].filter((row) => row.bases.length);
  if (!usable.length) throw Error(`Craft has no usable bases: ${recipe.key}`);
  templates.push({ id: recipe.key, name: recipe.name, variants: usable });
}
if (templates.length !== 54 || unavailable.length !== 1)
  throw Error(`Unexpected craft coverage: ${templates.length}/${unavailable.length}`);
await writeFile(
  "src/shared/planner-crafts.json",
  JSON.stringify(
    {
      source: {
        url,
        sha256,
        gameDataSha256: createHash("sha256").update(dataBytes).digest("hex"),
      },
      templates,
      unavailable,
    },
    null,
    2
  ) + "\n"
);
console.log(
  `Crafting catalog: ${templates.length} recipes, ${unavailable.length} disabled/missing; ${templates.reduce((n, t) => n + t.variants.length, 0)} native variants`
);
