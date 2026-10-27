// Public Blizzless launcher tables are the source of truth, with SHA-256 verification.
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

const origin = "https://blizzless.info";
const api = `${origin}/api`;
const root = new URL("../", import.meta.url);
const presentation = JSON.parse(
  await readFile(new URL("src/shared/planner-presentation.json", root), "utf8")
).classes;
const audit = new URL(
  `docs/audits/${new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Moscow" }).format(new Date())}/planner-server/`,
  root
);
await mkdir(audit, { recursive: true });
async function request(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
}
async function json(url) {
  const response = await request(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}
function table(text) {
  const [headers, ...rows] = text
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .map((row) => row.split("\t"));
  return rows.map((row) =>
    Object.fromEntries(headers.map((key, i) => [key, row[i] ?? ""]))
  );
}
const [manifest, dataset] = await Promise.all([
  json(`${api}/launcher-mods/manifest`),
  json(`${api}/skills/default-dataset`),
]);
if (dataset.source !== "blizzless") throw new Error("Default dataset must be Blizzless");
const files = {};
async function blob(relative) {
  const entry = manifest.files.find(
    (file) => file.path === `Blizzless/Blizzless.mpq/data/${relative}`
  );
  if (!entry) throw new Error(`Missing launcher file: ${relative}`);
  const response = await request(`${api}/launcher-mods/blobs/${entry.sha256}`);
  if (!response.ok) throw new Error(`${relative}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (
    bytes.length !== entry.size ||
    createHash("sha256").update(bytes).digest("hex") !== entry.sha256
  )
    throw new Error(`Checksum mismatch: ${relative}`);
  files[relative] = { sha256: entry.sha256, size: entry.size };
  await writeFile(new URL(relative.replaceAll("/", "__"), audit), bytes);
  return bytes.toString("utf8").replace(/^\uFEFF/, "");
}
const names = [
  "skills",
  "skilldesc",
  "charstats",
  "base/skills",
  "base/skilldesc",
  "runes",
  "gems",
  "difficultylevels",
  "inventory",
];
const texts = await Promise.all(names.map((name) => blob(`global/excel/${name}.txt`)));
const [
  skills,
  desc,
  classes,
  baseline,
  baseDesc,
  runeRows,
  gems,
  difficulties,
  inventories,
] = texts.map(table);
const strings = new Map(
  JSON.parse(await blob("local/lng/strings/skills.json")).map((row) => [row.Key, row])
);
const list = await json(
  `${api}/skills/list?datasetId=${encodeURIComponent(dataset.datasetId)}`
);
const selected = list.filter(
  (s) => presentation.some((c) => c.id === s.charClass) && s.tree.page > 0
);
if (selected.length !== 240)
  throw new Error(`Expected 240 skills, received ${selected.length}`);
const localize = (key, fallback = {}) => {
  const text = strings.get(key);
  return {
    ru: text?.ruRU?.trim() || fallback.ru || text?.enUS?.trim() || fallback.en || "",
    en: text?.enUS?.trim() || fallback.en || "",
  };
};
const source = {
  version: `Blizzless ${dataset.patch}`,
  patch: dataset.patch,
  datasetId: dataset.datasetId,
  manifestVersion: manifest.version,
  updatedAt: new Date(manifest.version).toISOString(),
  url: `${origin}/ru/skills`,
  files,
};
const catalog = {
  source,
  classes: [],
  skills: [],
  rules: {
    difficulties: difficulties.map((r) => ({
      id: r.Name.toLowerCase(),
      penalty: +r.ResistPenalty,
      floor: +r.ResistFloor,
    })),
    inventory: { columns: 10, rows: 4 },
  },
};
for (const meta of presentation) {
  const c = classes.find((c) => c.class === meta.name.en);
  if (!c || +c.StatPerLevel !== 5)
    throw new Error(`Unsupported class attributes: ${meta.id}`);
  catalog.classes.push({
    ...meta,
    base: { strength: +c.str, dexterity: +c.dex, vitality: +c.vit, energy: +c.int },
    life: +c.vit + +c.hpadd,
    mana: +c.int,
    stamina: +c.stamina,
    lifePerLevel: +c.LifePerLevel / 4,
    manaPerLevel: +c.ManaPerLevel / 4,
    staminaPerLevel: +c.StaminaPerLevel / 4,
    lifePerVitality: +c.LifePerVitality / 4,
    manaPerEnergy: +c.ManaPerMagic / 4,
    staminaPerVitality: +c.StaminaPerVitality / 4,
  });
  const inventory = inventories.find((r) => r.class === meta.name.en);
  if (inventory && (+inventory.gridX !== 10 || +inventory.gridY !== 4))
    throw new Error(`Unsupported inventory size: ${meta.id}`);
}
const meaningfulDiff = (a, b) =>
  Object.keys(a).some((key) => !key.startsWith("*") && a[key] !== (b?.[key] ?? ""));
for (const entry of selected) {
  const raw = skills.find((r) => +r["*Id"] === entry.gameId);
  const d = desc.find((r) => r.skilldesc === raw?.skilldesc);
  if (
    !raw ||
    !d ||
    +raw.reqlevel !== entry.reqLevel ||
    +d.SkillPage !== entry.tree.page ||
    +d.SkillRow !== entry.tree.row ||
    +d.SkillColumn !== entry.tree.column
  )
    throw new Error(`Launcher and dataset disagree: ${entry.key}`);
  const old = baseline.find((r) => r["*Id"] === raw["*Id"]);
  const oldDesc = baseDesc.find((r) => r.skilldesc === old?.skilldesc);
  const resolve = (name) => {
    const parent = selected.find(
      (s) => s.internalName === name && s.charClass === entry.charClass
    );
    if (!parent) throw new Error(`Missing prerequisite ${name}`);
    return parent.gameId;
  };
  const synergyNames = [
    ...new Set(
      [raw.DmgSymPerCalc, raw.EDmgSymPerCalc, raw.ELenSymPerCalc].flatMap((value) =>
        [...(value ?? "").matchAll(/skill\(['"]([^'"]+)['"]\.(?:blvl|lvl)\)/g)].map(
          (m) => m[1]
        )
      )
    ),
  ];
  catalog.skills.push({
    id: entry.gameId,
    key: entry.key,
    classId: entry.charClass,
    name: localize(d["str name"], entry.strings.name),
    description: localize(d["str long"], entry.strings.long),
    icon: `images/skills/${entry.iconKey.split("/").at(-1)}`,
    tree: +d.SkillPage - 1,
    row: +d.SkillRow,
    column: +d.SkillColumn,
    requiredLevel: +raw.reqlevel,
    maxPoints: +raw.maxlvl,
    requires: [raw.reqskill1, raw.reqskill2, raw.reqskill3].filter(Boolean).map(resolve),
    modified: meaningfulDiff(raw, old) || meaningfulDiff(d, oldDesc),
    synergies: synergyNames.flatMap((name) =>
      selected
        .filter((s) => s.internalName === name && s.charClass === entry.charClass)
        .map((s) => s.gameId)
    ),
  });
}
catalog.skills.sort((a, b) => a.id - b.id);
await mkdir(new URL("public/images/skills/", root), { recursive: true });
const pending = [...new Map(selected.map((entry) => [entry.iconKey, entry])).values()];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let entry; (entry = pending.shift());) {
      if (!entry.iconKey || entry.iconKey.includes(".."))
        throw new Error(`Invalid icon path: ${entry.key}`);
      const destination = new URL(
        `public/images/skills/${entry.iconKey.split("/").at(-1)}`,
        root
      );
      try {
        await access(destination);
        continue;
      } catch {
        /* Download missing assets. */
      }
      const response = await request(`${origin}/media/${entry.iconKey}`);
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/"))
        throw new Error(`Icon unavailable: ${entry.key}`);
      await writeFile(destination, Buffer.from(await response.arrayBuffer()));
    }
  })
);
const propertyMap = {
  str: ["strength"],
  dex: ["dexterity"],
  vit: ["vitality"],
  enr: ["energy"],
  hp: ["life"],
  mana: ["mana"],
  allskills: ["allSkills"],
  "res-fire": ["fireResist"],
  "res-cold": ["coldResist"],
  "res-ltng": ["lightningResist"],
  "res-pois": ["poisonResist"],
  "res-all": ["fireResist", "coldResist", "lightningResist", "poisonResist"],
  "all-stats": ["strength", "dexterity", "vitality", "energy"],
  cast1: ["fcr"],
  cast2: ["fcr"],
  cast3: ["fcr"],
  balance1: ["fhr"],
  balance2: ["fhr"],
  balance3: ["fhr"],
  swing1: ["ias"],
  swing2: ["ias"],
  swing3: ["ias"],
  move1: ["frw"],
  move2: ["frw"],
  move3: ["frw"],
  "mag%": ["magicFind"],
};
const classCodes = {
  ama: "amazon",
  sor: "sorceress",
  nec: "necromancer",
  pal: "paladin",
  bar: "barbarian",
  dru: "druid",
  ass: "assassin",
  war: "warlock",
};
const runewords = [];
for (const word of runeRows.filter((r) => r.complete === "1")) {
  const types = Array.from({ length: 6 }, (_, i) => word[`itype${i + 1}`]).filter(
    Boolean
  );
  const kinds = [
    ...new Set(
      types.map((type) =>
        ["shld", "pala", "head", "grim", "ashd"].includes(type)
          ? "shield"
          : ["tors", "helm", "pelt"].includes(type)
            ? "armor"
            : "weapon"
      )
    ),
  ];
  for (const kind of kinds) {
    const ranges = {},
      classRanges = {};
    let unsupported = 0;
    function add(code, min, max) {
      if (!code) return;
      const keys = propertyMap[code];
      const range = classCodes[code] ? classRanges : ranges;
      for (const key of keys ?? (classCodes[code] ? [classCodes[code]] : [])) {
        const old = range[key] ?? [0, 0];
        range[key] = [old[0] + (+min || 0), old[1] + (+max || 0)];
      }
      if (!keys && !classCodes[code]) unsupported++;
    }
    for (let i = 1; i <= 7; i++)
      add(word[`T1Code${i}`], word[`T1Min${i}`], word[`T1Max${i}`]);
    for (let i = 1; i <= 6; i++) {
      if (!word[`Rune${i}`]) continue;
      const gem = gems.find((r) => r.code === word[`Rune${i}`]);
      if (!gem) throw new Error(`Missing rune: ${word[`Rune${i}`]}`);
      const prefix =
        kind === "weapon" ? "weaponMod" : kind === "shield" ? "shieldMod" : "helmMod";
      for (let n = 1; n <= 3; n++)
        add(gem[`${prefix}${n}Code`], gem[`${prefix}${n}Min`], gem[`${prefix}${n}Max`]);
    }
    runewords.push({ name: word["*Rune Name"], kind, ranges, classRanges, unsupported });
  }
}
await writeFile(
  new URL("src/shared/planner-catalog.json", root),
  JSON.stringify(catalog, null, 2) + "\n"
);
await writeFile(
  new URL("src/shared/planner-runewords.json", root),
  JSON.stringify({ source, items: runewords }, null, 2) + "\n"
);
await writeFile(
  new URL("manifest.json", audit),
  JSON.stringify({ manifestVersion: manifest.version, dataset, files }, null, 2)
);
console.log(
  `${source.version}: ${catalog.classes.length} classes, ${catalog.skills.length} skills, ${catalog.skills.filter((s) => s.modified).length} modified skills, ${runewords.length} runeword/base combinations.`
);
