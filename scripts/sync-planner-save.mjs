// Regenerate native-save tables from the same verified Blizzless launcher as the planner.
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const work = new URL("docs/audits/2026-10-27/planner-save/converter/", root);
const target = new URL("public/data/planner-save/", root);
const revision = "7d0b319c68ae31d1d4d6a5e8b4ccdffe57bb29f2";
const source = `https://raw.githubusercontent.com/TrayHard/d2r-saver/${revision}/`;
async function request(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
}
const catalog = JSON.parse(
  await readFile(new URL("src/shared/planner-catalog.json", root))
);
const manifest = await (
  await request("https://blizzless.info/api/launcher-mods/manifest")
).json();
if (manifest.version !== catalog.source.manifestVersion)
  throw new Error("Sync planner and native-save tables from the same launcher manifest");
const tableNames = [
  "skills",
  "skilldesc",
  "Armor",
  "Weapons",
  "Misc",
  "itemStatCost",
  "itemtypes",
  "uniqueItems",
  "setItems",
  "sets",
  "runes",
  "magicPrefix",
  "magicSuffix",
  "gems",
  "properties",
  "charStats",
  "hireling",
  "rarePrefix",
  "rareSuffix",
  "experience",
  "autoMagic",
  "qualityItems",
];
const provenance = {};
async function save(url, bytes) {
  await mkdir(new URL(".", url), { recursive: true });
  await writeFile(url, bytes);
}
const tables = tableNames;
for (let start = 0; start < tables.length; start += 4)
  await Promise.all(
    tables.slice(start, start + 4).map(async (name) => {
      const entry = manifest.files.find(
        (f) =>
          f.path.toLowerCase() ===
          `Blizzless/Blizzless.mpq/data/global/excel/${name}.txt`.toLowerCase()
      );
      if (!entry) {
        provenance[name] = { source: "unmodified base table from d2r-saver@0.2.0" };
        return;
      }
      const local = new URL(`data/txt/${name}.txt`, work);
      let bytes;
      try {
        bytes = await readFile(local);
      } catch {
        /* Download missing tables. */
      }
      if (!bytes || createHash("sha256").update(bytes).digest("hex") !== entry.sha256) {
        const response = await request(
          `https://blizzless.info/api/launcher-mods/blobs/${entry.sha256}`
        );
        if (!response.ok) throw new Error(`Cannot download ${name}`);
        bytes = Buffer.from(await response.arrayBuffer());
      }
      if (
        bytes.length !== entry.size ||
        createHash("sha256").update(bytes).digest("hex") !== entry.sha256
      )
        throw new Error(`Checksum mismatch: ${name}`);
      provenance[name] = { sha256: entry.sha256, size: entry.size };
      await save(
        new URL(`data/txt/${name}.txt`, work),
        bytes.toString("utf8").replace(/^\uFEFF/, "")
      );
    })
  );
const raw = JSON.parse(
  await readFile(new URL("../node_modules/d2r-saver/data/data.json", import.meta.url))
);
const stringFields =
  /^(?:name|code|index|type|equiv|skill|itype|etype|class|item|set|stat|bodyloc|namestr|invfile|normcode|ubercode|ultracode|prop\d|t1code|mod\dcode|weaponmod\dcode|helmmod\dcode|shieldmod\dcode|rune\d)/;
const normalize = (key) => key.toLowerCase().replace(/^[*]/, "").replace(/[ /-]/g, "");
function readTable(text) {
  const [header, ...lines] = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const keys = header.split("\t").map(normalize);
  return lines
    .filter((line) => line.trim() && !line.startsWith("Expansion"))
    .map((line) => {
      const values = line.split("\t");
      return Object.fromEntries(
        keys.flatMap((key, index) => {
          const value = values[index]?.trim();
          if (!key || value === undefined || value === "") return [];
          return [
            [
              key,
              !stringFields.test(key) && /^-?\d+(?:\.\d+)?$/.test(value)
                ? Number(value)
                : value,
            ],
          ];
        })
      );
    });
}
const current = {};
for (const name of tableNames) {
  if (provenance[name].sha256)
    current[name.toLowerCase()] = readTable(
      await readFile(new URL(`data/txt/${name}.txt`, work), "utf8")
    );
}
const skillIds = new Map(current.skills.map((s) => [s.skill.toLowerCase(), s.id]));
const names = {
  Armor: "armor",
  Weapons: "weapons",
  Misc: "misc",
  itemtypes: "itemTypes",
  itemStatCost: "itemStatCost",
  charStats: "charStats",
  uniqueItems: "uniqueItems",
  setItems: "setItems",
  magicPrefix: "magicPrefix",
  magicSuffix: "magicSuffix",
  autoMagic: "autoMagic",
};
for (const name of tableNames) {
  const rows = current[name.toLowerCase()];
  if (!rows) continue;
  const key = names[name] ?? name;
  const result = {};
  rows.forEach((row, index) => {
    for (const field of Object.keys(row)) {
      if (
        /^(?:t1param|par|mod\dparam)\d*$/.test(field) &&
        typeof row[field] === "string"
      ) {
        const id = skillIds.get(row[field].toLowerCase());
        if (id !== undefined) row[field] = id;
      }
    }
    let id;
    switch (key) {
      case "armor":
      case "weapons":
      case "misc":
      case "itemTypes":
      case "properties":
      case "gems":
        id = row.code;
        break;
      case "itemStatCost":
        id = row.stat;
        break;
      case "skills":
        id = row.id;
        break;
      case "skilldesc":
        id = row.skilldesc;
        break;
      case "charStats":
        id = row.class?.slice(0, 3).toLowerCase();
        break;
      case "uniqueItems":
        if (!row.index || !row.spawnable) return;
        id = `unique${String(row.id ?? index).padStart(3, "0")}`;
        row.enabled = row.spawnable;
        break;
      case "setItems":
        if (!row.index) return;
        id = `set${String(row.id ?? index).padStart(3, "0")}`;
        break;
      case "sets":
        id = row.index;
        break;
      case "runes": {
        if (
          !row.complete ||
          !row.name?.startsWith("Runeword") ||
          row.runename?.includes("(Pure)")
        )
          return;
        const number = Number(row.name.slice(8));
        id = `runeword${String(number + (number > 75 ? 25 : 26)).padStart(3, "0")}`;
        row.name = row.runename;
        break;
      }
      case "hireling":
        if (!row.hireling) return;
        (result[row.id] ??= []).push(row);
        return;
      case "magicPrefix":
      case "magicSuffix":
      case "autoMagic":
        if (!row.name) return;
        id = `${{ magicPrefix: "mp", magicSuffix: "ms", autoMagic: "am" }[key]}${String(row.id ?? index).padStart(3, "0")}`;
        break;
      default:
        id = row.id ?? index;
    }
    if (id === undefined) return;
    // Blank affix cells mean no property/restriction, not a fallback to another patch.
    result[id] =
      key === "magicPrefix" || key === "magicSuffix"
        ? { ...row }
        : { ...raw[key]?.[id], ...row };
  });
  raw[key === "skilldesc" ? "skillDesc" : key] = result;
}
// Serialization must never inherit a positional-column mismatch from a different patch.
if (
  raw.runes.runeword059?.rune1 !== "r31" ||
  raw.uniqueItems.unique000?.code !== "hax" ||
  raw.itemStatCost.strength?.csvbits !== 10
)
  throw new Error("Native save table validation failed");
await mkdir(target, { recursive: true });
await writeFile(new URL("data.json", target), JSON.stringify(raw));
await writeFile(
  new URL("strings.json", target),
  await readFile(new URL("../node_modules/d2r-saver/data/strings.json", import.meta.url))
);
await writeFile(
  new URL("source.json", target),
  JSON.stringify(
    {
      version: catalog.source.version,
      manifestVersion: manifest.version,
      characterCodec: "d2r-saver@0.2.0",
      itemCodec: "@d2runewizard/d2s@2.0.134",
      supplementalDataRevision: revision,
      files: provenance,
    },
    null,
    2
  )
);
await writeFile(
  new URL("NOTICE.md", target),
  `Item codec: @d2runewizard/d2s 2.0.134 (ISC; author: prowner). Source: https://github.com/prowner/d2s/tree/ee9c192f2c45646b895a4c93006ef995c15249a7\n\nNative save data for ${catalog.source.version}.\n\nGame tables: https://blizzless.info/api/launcher-mods/manifest\nCharacter codec and supplemental tables: https://github.com/TrayHard/d2r-saver/tree/${revision}\n\n${await (await request(`${source}LICENSE`)).text()}`
);
console.log(`Native save tables: ${fileURLToPath(target)}`);
