// Boss-only uniques have no random-drop flag. Import their verified definitions
// and four new stat encodings without replacing unrelated planner game tables.
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../public/data/planner-save/", import.meta.url);
const data = JSON.parse(await readFile(new URL("data.json", target)));
const strings = new Map(JSON.parse(await readFile(new URL("strings.json", target))));
const source = JSON.parse(await readFile(new URL("source.json", target)));
const blobs = {
  uniqueItems: "c2509c81fd0655ba0e015adfea9934db28aa85b272d7391b4db3f530372733eb",
  properties: "84cbc6ed62186da1c7720fb3bdab7b1689fd08f549a59579bb660b55d959f3aa",
  itemStatCost: "6975bb81a533025fcbcd836216c4960ca759d5dec5c7a9273b6e145ed490c1e4",
  monstats: "cbd17fe08e35f5fe5ad6261748ed791b4753780a18e7b1638f6ba8a3a0a21c1f",
};
const stringFields = /^(?:index|code|stat|prop|par|tooltip|parameter|namestr|id$)/;
async function table(hash) {
  const response = await fetch("https://blizzless.info/api/launcher-mods/blobs/" + hash, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw Error(`Bartuc table: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== hash)
    throw Error("Bartuc table checksum");
  const [header, ...lines] = bytes
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/);
  const keys = header
    .split("\t")
    .map((k) => k.toLowerCase().replace(/^\*/, "").replace(/[ /-]/g, ""));
  return lines
    .filter((l) => l.trim() && !l.startsWith("Expansion"))
    .map((line) => {
      const cells = line.split("\t");
      return Object.fromEntries(
        keys.flatMap((key, i) => {
          const v = cells[i]?.trim();
          if (!key || !v) return [];
          return [[key, !stringFields.test(key) && /^-?\d+$/.test(v) ? Number(v) : v]];
        })
      );
    });
}
const tables = Object.fromEntries(
  await Promise.all(
    Object.entries(blobs).map(async ([key, hash]) => [key, await table(hash)])
  )
);
const names = {
  BloodforgedHelm: "Bartuc's Crimson Visage",
  BloodforgedArmor: "Bartuc's Crimson Vessel",
};
const ids = [];
tables.uniqueItems.forEach((row, index) => {
  if (!names[row.index]) return;
  const id = `unique${row.id}`;
  for (let i = 1; i <= 12; i++) {
    const skill = Object.entries(data.skills).find(([, s]) => s.skill === row[`par${i}`]);
    if (skill) row[`par${i}`] = Number(skill[0]);
    else if (/^\d+$/.test(row[`par${i}`] ?? "")) row[`par${i}`] = Number(row[`par${i}`]);
  }
  data.uniqueItems[id] = { ...row, id: Number(row.id), saveId: index, enabled: 1 };
  strings.set(row.index, names[row.index]);
  ids.push(id);
});
if (ids.join(",") !== "unique694,unique695")
  throw Error("Bartuc unique record IDs changed");
const codes = ["abyss-nocd", "apoc-dot", "miasma-chain", "demon-max"];
for (const code of codes) {
  const property = tables.properties.find((p) => p.code === code);
  if (!property) throw Error(`Missing Bartuc property ${code}`);
  property.id = Number(property.id);
  property.tooltip = property.tooltip.replace(/%\+d/g, "+#").replace(/%d/g, "#");
  data.properties[code] = property;
  const stat = tables.itemStatCost.find((s) => s.stat === property.stat1);
  if (!stat) throw Error(`Missing Bartuc stat ${property.stat1}`);
  stat.id = Number(stat.id);
  // No stale alias may shadow the new stat's numeric ID in either codec.
  for (const [key, old] of Object.entries(data.itemStatCost))
    if (Number(old.id) === stat.id && key !== stat.stat) delete data.itemStatCost[key];
  data.itemStatCost[stat.stat] = stat;
}
const monster = tables.monstats.find((row) => row.hcidx === 950);
if (!monster) throw Error("Missing Bartuc helm reanimation target");
data.monsters[monster.id] = {
  id: monster.id,
  hcidx: monster.hcidx,
  namestr: monster.namestr,
};
strings.set(monster.namestr, "Blood Maiden");
source.plannerOverrides.bartucRewards = {
  checkedAt: "2026-11-20",
  manifestVersion: 1795131992295,
  source: "https://blizzless.info/ru/changelogs/patch-2026-11",
  catalogIds: ids,
  files: blobs,
};
await writeFile(new URL("data.json", target), JSON.stringify(data));
await writeFile(new URL("strings.json", target), JSON.stringify([...strings]));
await writeFile(new URL("source.json", target), JSON.stringify(source, null, 2) + "\n");
console.log(
  `Bartuc: ${ids.join(", ")}, four native stat encodings, original game properties.`
);
