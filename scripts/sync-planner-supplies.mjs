import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";

const sha256 = "50fe8aa45f6d3ce2b7fc2cec48ed5c6bee11662e28476544f80beadc0c71785d";
const url = "https://blizzless.info/api/launcher-mods/blobs/" + sha256;
const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw Error("Cannot load cube ingredients");
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash("sha256").update(bytes).digest("hex") !== sha256)
  throw Error("Cube source checksum mismatch");
const lines = bytes
  .toString("utf8")
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .map((x) => x.split("\t"));
const header = lines.shift();
const rows = lines
  .map((cells, sourceRow) => ({
    ...Object.fromEntries(header.map((key, i) => [key, cells[i] || ""])),
    sourceRow,
  }))
  .filter((row) => row.enabled === "1");
const dataBytes = await readFile("public/data/planner-save/data.json");
const data = JSON.parse(dataBytes);
const strings = new Map(
  JSON.parse(await readFile("public/data/planner-save/strings.json"))
);
const cube = JSON.parse(await readFile("src/shared/cube-catalog.json"));
const all = { ...data.weapons, ...data.armor, ...data.misc };
function types(code) {
  const result = new Set();
  function visit(type) {
    if (!type || result.has(type)) return;
    result.add(type);
    visit(data.itemTypes[type]?.equiv1);
    visit(data.itemTypes[type]?.equiv2);
  }
  visit(all[code]?.type);
  return result;
}
const name = (code) => strings.get(all[code].namestr) || all[code].name;
const supplies = {};
for (const code of Object.keys(data.misc)) {
  const t = types(code);
  const category = t.has("rune")
    ? "rune"
    : t.has("gem")
      ? "gem"
      : /^(?:cr[123]|jwd)$/.test(code)
        ? "material"
        : /^(?:toa|tes|ceh|bet|fed|dhn|bey|mbr|qey|qhr|qbr|ua[1-5]|pk[1-3])$/.test(code)
          ? "ques"
          : /^rv[sl]$/.test(code)
            ? "rpot"
            : t.has("poti") && data.misc[code].spawnable
              ? "poti"
              : ["tsc", "isc"].includes(code)
                ? "scro"
                : ["aqv", "cqv"].includes(code)
                  ? "ammo"
                  : undefined;
  if (category) supplies[code] = { name: name(code), category };
}
// Quest equipment really uses UniqueItems rows, including the completed weapons.
for (const code of ["msf", "vip", "hst", "qf1", "qf2"]) {
  const definition = Object.entries(data.uniqueItems).find(
    ([, r]) => r.code === code && r.enabled === 1
  );
  if (!definition) throw Error(`Missing quest equipment ${code}`);
  supplies[code] = { name: name(code), category: "ques", catalogId: definition[0] };
}
function inputPart(value) {
  const [key, ...flags] = value.split(",");
  if (!flags.every((flag) => /^(?:mag|noe|eth|upg|eli|qty=\d+)$/.test(flag))) return;
  const quality = flags.includes("mag") || key === "jew" ? "magic" : "normal";
  const codes = Object.keys(all).filter((code) => {
    const base = all[code];
    const fits = data.itemTypes[key]
      ? types(code).has(key)
      : code === key ||
        (flags.includes("upg") &&
          [base.normcode, base.ubercode, base.ultracode].includes(key));
    return (
      fits &&
      !supplies[code]?.catalogId &&
      (base.spawnable || supplies[code]) &&
      (!flags.includes("eli") || base.ultracode === code) &&
      (!flags.includes("eth") || (base.durability && !base.nodurability)) &&
      (quality !== "magic" ||
        (!supplies[code] && !types(code).has("gem") && !types(code).has("rune")))
    );
  });
  if (!codes.length) return;
  return {
    codes,
    quality,
    ...(flags.includes("eth") ? { ethereal: true } : {}),
    count: Number(flags.find((x) => x.startsWith("qty="))?.slice(4) || 1),
  };
}
const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
const recipes = {};
for (const recipe of cube.recipes) {
  const matching = rows.filter(
    (row) =>
      normalize(row.description.split("->").at(-1)) === normalize(recipe.name.en) ||
      (recipe.key === "hora_sphere" &&
        row.output === "cr2" &&
        row["input 1"] === "cr1,qty=12") ||
      (recipe.key === "resplendet_spark_rec" &&
        row.output === "cr3" &&
        row["input 1"] === "cr2,qty=12")
  );
  const variants = new Map();
  for (const row of matching) {
    const inputs = Array.from({ length: 7 }, (_, i) => row[`input ${i + 1}`]).filter(
      Boolean
    );
    const parts = inputs.map(inputPart);
    if (
      !parts.length ||
      parts.some((x) => !x) ||
      parts.reduce((n, p) => n + p.count, 0) !== Number(row.numinputs)
    )
      continue;
    // Rows for different bases may share the same formula; retain their full union.
    const outputEthereal = row.output.split(",").includes("eth");
    const signature = JSON.stringify({
      outputEthereal,
      parts: parts.map((p, i) => ({ ...p, codes: i ? p.codes : [] })),
    });
    if (!variants.has(signature))
      variants.set(signature, { parts, outputEthereal, sourceRows: [] });
    const variant = variants.get(signature);
    variant.parts[0].codes = [...new Set([...variant.parts[0].codes, ...parts[0].codes])];
    variant.sourceRows.push(row.sourceRow);
  }
  if (variants.size) recipes[recipe.key] = [...variants.values()];
}
const crafts = JSON.parse(await readFile("src/shared/planner-crafts.json"));
for (const craft of crafts.templates)
  if (!recipes[craft.id]) throw Error(`Missing ingredients for ${craft.id}`);
await writeFile(
  "src/shared/planner-supplies.json",
  JSON.stringify(
    {
      source: {
        url,
        sha256,
        gameDataSha256: createHash("sha256").update(dataBytes).digest("hex"),
      },
      supplies,
      recipes,
    },
    null,
    2
  ) + "\n"
);
console.log(
  `Supplies: ${Object.keys(supplies).length} bases; native ingredients for ${Object.keys(recipes).length} recipes`
);
