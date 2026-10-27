import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const dataBytes = await readFile(new URL("public/data/planner-save/data.json", root));
const data = JSON.parse(dataBytes);
// HD names are an artwork lookup only. Positional unique/set IDs can differ
// between Blizzless and the upstream client, so resolve the actual inventory file.
const artData = JSON.parse(
  await readFile(new URL("node_modules/d2r-saver/data/data.json", root))
);
const origin = "https://lootcube.net/images/items/";
const destination = new URL("public/images/planner/items/", root);
const bases = {
  ...Object.fromEntries(
    Object.entries(data.weapons).map(([code, row]) => [code, { row, group: "weapon" }])
  ),
  ...Object.fromEntries(
    Object.entries(data.armor).map(([code, row]) => [code, { row, group: "armor" }])
  ),
};
function hasType(type, wanted, seen = new Set()) {
  if (!type || seen.has(type)) return false;
  if (wanted.includes(type)) return true;
  seen.add(type);
  return [data.itemTypes[type]?.equiv1, data.itemTypes[type]?.equiv2].some((parent) =>
    hasType(parent, wanted, seen)
  );
}
for (const [code, row] of Object.entries(data.misc))
  if (hasType(row.type, ["ring", "amul", "char"])) bases[code] = { row, group: "misc" };
const tier = (row, code) => {
  return row?.ultracode === code ? 2 : row?.ubercode === code ? 1 : 0;
};
const hdAt = (row, index) =>
  Array.isArray(row?.hd) ? row.hd[index] || row.hd[0] : row?.hd;
const aliases = new Map();
function remember(file, group, hd) {
  if (typeof file === "string" && typeof hd === "string" && hd)
    if (!aliases.has(file.toLowerCase()))
      aliases.set(file.toLowerCase(), `${group}/${hd}`);
}
const originalBases = {};
for (const [table, group] of [
  ["weapons", "weapon"],
  ["armor", "armor"],
  ["misc", "misc"],
])
  for (const [code, row] of Object.entries(artData[table]))
    originalBases[code] = { row, group };
for (const { row, group } of Object.values(originalBases))
  remember(row.invfile, group, row.hd);
// These inventory variants are selected explicitly by several unique jewelry items.
for (const [type, code] of [
  ["ring", "rin"],
  ["amul", "amu"],
]) {
  for (let index = 1; index <= (data.itemTypes[type]?.varinvgfx || 0); index++) {
    const file = data.itemTypes[type][`invgfx${index}`];
    if (file) aliases.set(file.toLowerCase(), `misc/${data.misc[code].hd}${index}`);
  }
}
for (const code of ["cm1", "cm2", "cm3"]) {
  const firstGraphic = data.itemTypes[data.misc[code].type]?.invgfx1;
  if (firstGraphic)
    aliases.set(firstGraphic.toLowerCase(), `misc/${artData.misc[code].hd}`);
}
const defaultInventoryFile = (row) => {
  const type = data.itemTypes[row.type];
  return type?.varinvgfx && type.invgfx1 ? type.invgfx1 : row.invfile;
};
for (const [quality, definitions] of [
  ["unique", artData.uniqueItems],
  ["set", artData.setItems],
]) {
  for (const definition of Object.values(definitions)) {
    const code = definition.code || definition.item;
    const base = originalBases[code];
    if (!base) continue;
    const hd = hdAt(definition, tier(base.row, code));
    remember(definition.invfile, base.group, hd);
    ["normcode", "ubercode", "ultracode"].forEach((field, index) => {
      const upgraded = originalBases[base.row[field]] || base;
      remember(
        upgraded.row[quality + "invfile"],
        upgraded.group,
        hdAt(definition, index)
      );
    });
  }
}
const baseKeys = {};
for (const [code, { row }] of Object.entries(bases))
  baseKeys[code] = aliases.get(defaultInventoryFile(row)?.toLowerCase()) || null;
const qualityKeys = { unique: {}, set: {} };
const names = { unique: {}, set: {} };
const catalogBases = {};
const strings = new Map(
  JSON.parse(await readFile(new URL("public/data/planner-save/strings.json", root)))
);
const normalizedName = (name) =>
  name.normalize("NFKC").replace(/[’‘]/g, "'").trim().toLowerCase();
for (const [quality, definitions] of [
  ["unique", data.uniqueItems],
  ["set", data.setItems],
]) {
  for (const [id, definition] of Object.entries(definitions)) {
    const code = definition.code || definition.item;
    const base = bases[code];
    if (!base) continue;
    catalogBases[id] = code;
    for (const name of [definition.index, strings.get(definition.index)])
      if (name) names[quality][normalizedName(name)] = id;
    qualityKeys[quality][id] = [0, 1, 2].map((index) => {
      const upgradedCode = base.row[["normcode", "ubercode", "ultracode"][index]] || code;
      const upgraded = bases[upgradedCode] || base;
      const file =
        definition.invfile ||
        upgraded.row[quality + "invfile"] ||
        defaultInventoryFile(upgraded.row);
      return aliases.get(file?.toLowerCase()) || null;
    });
  }
}
const keys = [
  ...new Set(
    [
      ...Object.values(baseKeys),
      ...Object.values(qualityKeys.unique).flat(),
      ...Object.values(qualityKeys.set).flat(),
    ].filter(Boolean)
  ),
].sort();
const images = new Map();
const missing = [];
const classicFallbacks = {
  "weapon/axe/butchers_cleaver": {
    url: "https://classic.battle.net/images/battle/diablo2exp/images/items/uniques/thegnasher.gif",
    file: "classic/invhaxu.gif",
  },
  "armor/helmet/leorics_crown": {
    url: "https://classic.battle.net/images/battle/diablo2exp/images/items/sets/ondalsalmighty.gif",
    file: "classic/invuhms.gif",
  },
};
let cursor = 0;
const isWebp = (bytes) =>
  bytes.length > 12 &&
  bytes.toString("ascii", 0, 4) === "RIFF" &&
  bytes.toString("ascii", 8, 12) === "WEBP";
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (cursor < keys.length) {
      const key = keys[cursor++];
      if (!/^(weapon|armor|misc)\/[a-z0-9_/-]+$/.test(key))
        throw new Error(`Invalid item image key: ${key}`);
      const file = new URL(key + ".webp", destination);
      let localPath = "images/planner/items/" + key + ".webp";
      let bytes;
      try {
        bytes = await readFile(file);
        if (!isWebp(bytes)) bytes = undefined;
      } catch {
        /* Download uncached artwork. */
      }
      if (!bytes) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await fetch(origin + key + ".webp", {
              signal: AbortSignal.timeout(20000),
            });
            if (!response.ok) {
              if (response.status === 404) break;
              throw new Error(`HTTP ${response.status}`);
            }
            const downloaded = Buffer.from(await response.arrayBuffer());
            if (!isWebp(downloaded)) throw new Error("Not a WebP image");
            bytes = downloaded;
            await mkdir(new URL(".", file), { recursive: true });
            await writeFile(file, bytes);
            break;
          } catch (error) {
            if (attempt === 1) missing.push({ key, reason: String(error.message) });
          }
        }
      }
      const fallback = classicFallbacks[key];
      if (!bytes && fallback) {
        const fallbackFile = new URL(fallback.file, destination);
        try {
          let gif;
          try {
            gif = await readFile(fallbackFile);
          } catch {
            /* Not cached yet. */
          }
          if (!gif) {
            const response = await fetch(fallback.url, {
              signal: AbortSignal.timeout(20000),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            gif = Buffer.from(await response.arrayBuffer());
          }
          if (!/^GIF8[79]a$/.test(gif.toString("ascii", 0, 6)))
            throw new Error("Not a GIF image");
          await mkdir(new URL(".", fallbackFile), { recursive: true });
          await writeFile(fallbackFile, gif);
          bytes = gif;
          localPath = "images/planner/items/" + fallback.file;
          const previousFailure = missing.findIndex((entry) => entry.key === key);
          if (previousFailure !== -1) missing.splice(previousFailure, 1);
        } catch (error) {
          missing.push({ key, reason: String(error.message) });
        }
      }
      if (bytes) images.set(key, localPath);
      else if (!missing.some((entry) => entry.key === key))
        missing.push({ key, reason: "HTTP 404" });
    }
  })
);
const image = (key) => images.get(key) || null;
const manifest = {
  checkedAt: new Date().toISOString().slice(0, 10),
  source: origin,
  gameDataSha256: createHash("sha256").update(dataBytes).digest("hex"),
  bases: Object.fromEntries(
    Object.entries(baseKeys).map(([code, key]) => [code, image(key)])
  ),
  tiers: Object.fromEntries(
    Object.entries(bases).map(([code, { row }]) => [code, tier(row, code)])
  ),
  dimensions: Object.fromEntries(
    Object.entries(bases).map(([code, { row }]) => [
      code,
      [Math.max(1, row.invwidth || 1), Math.max(1, row.invheight || 1)],
    ])
  ),
  catalogBases,
  names,
  unresolvedBaseFiles: Object.fromEntries(
    Object.entries(bases)
      .filter(([code]) => !baseKeys[code])
      .map(([code, { row }]) => [code, defaultInventoryFile(row)])
  ),
  unique: Object.fromEntries(
    Object.entries(qualityKeys.unique).map(([id, keys]) => [id, keys.map(image)])
  ),
  set: Object.fromEntries(
    Object.entries(qualityKeys.set).map(([id, keys]) => [id, keys.map(image)])
  ),
  missing: missing.sort((a, b) => a.key.localeCompare(b.key)),
};
await writeFile(
  new URL("src/shared/planner-item-art.json", root),
  JSON.stringify(manifest, null, 2) + "\n"
);
console.log(
  `Item artwork: ${images.size}/${keys.length} images, ${Object.keys(baseKeys).length} bases, ${Object.keys(manifest.unique).length} uniques, ${Object.keys(manifest.set).length} set items.`
);
if (missing.length)
  console.log("Unavailable artwork:", missing.map((entry) => entry.key).join(", "));
