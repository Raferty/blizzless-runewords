// Compare binary identities against the launcher's actual record order, not *ID.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { createServer } from "vite";
import { read } from "@d2runewizard/d2s";
import { constants as defaults } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";

const data = JSON.parse(await readFile("public/data/planner-save/data.json"));
// Launcher tables captured November 18 (sets) and November 20 (uniques).
const hashes = {
  runes: "1dd06c6a49404da9ba0eb660732f4e171d4ecff6c8d8f2ac168d4909c0a037e7",
  uniqueItems: "c2509c81fd0655ba0e015adfea9934db28aa85b272d7391b4db3f530372733eb",
  setItems: "cb0f07f436d1b9a28b55c560e7f98d6768603150d7ab93d00d06c668e2572008",
};
async function table(name) {
  const bytes = gunzipSync(
    await readFile(new URL(`./fixtures/planner/${name}.txt.gz`, import.meta.url))
  );
  assert.equal(createHash("sha256").update(bytes).digest("hex"), hashes[name]);
  const [header, ...lines] = bytes
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/);
  const fields = header.split("\t");
  return lines
    .filter((line) => line.trim() && line.split("\t")[0] !== "Expansion")
    .map((line) => {
      const cells = line.split("\t");
      return Object.fromEntries(fields.map((field, i) => [field, cells[i] || ""]));
    });
}
const tables = await Promise.all(["uniqueItems", "setItems"].map(table));
const skillIds = new Map(
  Object.entries(data.skills).map(([id, row]) => [row.skill.toLowerCase(), id])
);
for (const [index, kind] of ["uniqueItems", "setItems"].entries()) {
  const rows = tables[index];
  const catalogNames = new Set(Object.values(data[kind]).map((row) => row.index));
  for (const row of rows)
    if (row.spawnable === "1" && row.disabled !== "1")
      assert(catalogNames.has(row.index), `Missing ${kind}: ${row.index}`);
  for (const [id, def] of Object.entries(data[kind])) {
    const expected = rows.findIndex((row) => row.index === def.index);
    assert(expected >= 0, `${id}: missing source identity`);
    assert.equal(def.saveId, expected, `${id}: game record index`);
    assert.equal(
      def.code ?? def.item,
      rows[expected].code ?? rows[expected].item,
      `${id}: base`
    );
    for (let i = 1; i <= 12; i++) {
      const row = rows[expected];
      // The launcher references a missing group on Renewed Cold Rupture.
      const disabledGroup =
        row[`prop${i}`] === "Gelid-Affix5" && !data.propertyGroups["Gelid-Affix5"];
      for (const field of ["prop", "par", "min", "max"]) {
        const key = field + i;
        let value = disabledGroup ? "" : row[key] || "";
        if (field === "par") value = skillIds.get(value.toLowerCase()) ?? value;
        if (field === "prop" && row.code === "cjw") value = value.toLowerCase();
        assert.equal(String(def[key] ?? ""), value, `${id} (${def.index}): ${key}`);
      }
    }
  }
}
assert.equal(data.uniqueItems.unique492.saveId, 493);
assert.equal(tables[0][492].index, "Gheed's Wager");
assert.equal(tables[0][493].index, "Unique Warlock Helm");
assert.equal(data.uniqueItems.unique494.saveId, 495);

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
try {
  const { createGameSaveExporter, gameSaveEntries } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const {
    createBuild: createStarterBuild,
    encodeBuild,
    decodeBuild,
  } = await server.ssrLoadModule("/src/utils/planner.ts");
  const createBuild = (classId) => ({ ...createStarterBuild(classId), charms: [] });
  const { createUberKeySet } = await server.ssrLoadModule("/src/utils/planner-stash.ts");
  const codec = createGameSaveExporter(
    data,
    JSON.parse(await readFile("public/data/planner-save/strings.json"))
  );
  const constants = structuredClone(defaults);
  for (const [name, s] of Object.entries(data.itemStatCost))
    constants.magical_properties[s.id] = {
      ...constants.magical_properties[s.id],
      s: name,
      sB: s.savebits,
      sA: s.saveadd,
      sP: s.saveparambits,
      cB: s.csvbits,
      dF: 0,
      e: Number(s.encode ?? constants.magical_properties[s.id]?.e ?? 0),
    };
  // Teach the independent decoder the mod's base layouts (including its custom
  // Player equipment), rather than interpreting unknown armor as miscellaneous.
  for (const [kind, target, category] of [
    ["armor", "armor_items", "Any Armor"],
    ["weapons", "weapon_items", "Weapon"],
    ["misc", "other_items", "Miscellaneous"],
  ])
    for (const [code, base] of Object.entries(data[kind])) {
      constants[target][code] = {
        ...constants[target][code],
        n: base.name,
        iw: base.invwidth,
        ih: base.invheight,
        // Quest difficulty is stored only by the compact-item layout.
        c: [
          category,
          ...(base.compactsave && base.quest && base.questdiffcheck ? ["Quest"] : []),
        ],
      };
      constants.stackables[code] = base.stackable ? 1 : 0;
    }
  async function exportBuild(build, rolls = {}) {
    const choices = Object.fromEntries(
      gameSaveEntries(build).map((e) => [e.key, codec.defaultChoice(e, build)])
    );
    assert(Object.values(choices).every(Boolean), JSON.stringify(choices));
    const bytes = await codec.exportCharacter(build, {
      name: "ItemAudit",
      choices,
      rolls,
    });
    const saved = await read(bytes, constants, {
      disableItemEnhancements: true,
      extendedStash: true,
    });
    return { saved, bytes };
  }
  const pureRecipes = JSON.parse(
    await readFile("src/shared/planner-pure-runewords.json")
  );
  const sourceVariants = {};
  const sourceRunes = (row) =>
    [1, 2, 3, 4, 5, 6].map((i) => row["Rune" + i]).filter(Boolean);
  for (const row of (await table("runes")).filter((row) => row.complete === "1")) {
    const number = Number(row.Name.slice(8));
    const id = "runeword" + String(number + (number > 75 ? 25 : 26)).padStart(3, "0");
    const canonical = data.runes[id];
    assert(canonical, row.Name);
    const pure = row["*Rune Name"].includes("(Pure)");
    for (const [field, value] of Object.entries(row)) {
      const key = field.toLowerCase();
      if (!/^(?:t1(?:code|param|min|max)|itype|etype|rune)\d+$/.test(key)) continue;
      if (pure && key.startsWith("rune")) continue;
      const expected = key.startsWith("t1param")
        ? (skillIds.get(value.toLowerCase()) ?? value)
        : value;
      assert.equal(
        String(canonical[key] ?? "").toLowerCase(),
        String(expected).toLowerCase(),
        id + " " + key
      );
    }
    if (pure) {
      const normal = [1, 2, 3, 4, 5, 6].map((i) => canonical["rune" + i]).filter(Boolean);
      (sourceVariants[normal.join(",")] ??= []).push(sourceRunes(row));
    }
  }
  assert.deepEqual(pureRecipes, sourceVariants);
  let checkedVariants = 0;
  for (const [normal, variants] of Object.entries(pureRecipes)) {
    const def = Object.values(data.runes).find(
      (row) =>
        [1, 2, 3, 4, 5, 6]
          .map((i) => row["rune" + i])
          .filter(Boolean)
          .join(",") === normal
    );
    assert(def, normal);
    const build = createBuild("paladin");
    const item = {
      name: def.name,
      quality: "runeword",
      requiredLevel: 1,
      notes: "",
      bonuses: {},
      stashPosition: 0,
    };
    const entry = { owner: "stash", key: "recipe", item };
    const baseCode = codec.choices(entry, build)[0]?.base;
    assert(baseCode, def.name);
    item.baseCode = baseCode;
    build.stash = [item];
    item.runewordRunes = ["r01"];
    assert.throws(() => decodeBuild(encodeBuild(build)), /Invalid rune sequence/);
    for (const codes of variants) {
      item.runewordRunes = codes;
      assert.deepEqual(codec.itemRunes(item), codes, def.name);
      assert.deepEqual(decodeBuild(encodeBuild(build)).stash[0].runewordRunes, codes);
      const { saved, bytes } = await exportBuild(build, { "stash.0": 0 });
      assert.deepEqual(
        saved.items[0].socketed_items.map((child) => child.type),
        codes
      );
      assert.deepEqual(codec.importCharacter(bytes).stash[0].runewordRunes, codes);
      const imported = codec.importCharacter(bytes);
      const again = await exportBuild(imported, { "stash.0": "planned" });
      assert.deepEqual(
        again.saved.items[0].socketed_items.map((child) => child.type),
        codes
      );
      assert.equal(again.saved.items[0].runeword_id, saved.items[0].runeword_id);
      checkedVariants++;
    }
  }
  assert.equal(checkedVariants, 34);
  console.log(
    "Pure runewords: 34 native socket sequences survived JSON and binary round trips."
  );
  const failures = [];
  const stat = (item, name) =>
    item.magic_attributes.find((a) => a.id === data.itemStatCost[name].id)?.values;
  let passed = 0;
  for (const [kind, quality] of [
    ["uniqueItems", "unique"],
    ["setItems", "set"],
  ]) {
    for (const [id, def] of Object.entries(data[kind])) {
      const build = createBuild("paladin");
      build.stash = [
        {
          name: def.index,
          quality,
          catalogId: id,
          baseCode: def.code ?? def.item,
          itemLevel: 99,
          requiredLevel: 1,
          bonuses: {},
          notes: "",
          propertyRoll: 1,
        },
      ];
      try {
        if (id === "unique333") {
          // Ghostflame's source allows 300 mana, but the mod's 8-bit field with
          // Save Add=32 can retain only 223. Reject overflow instead of wrapping.
          await assert.rejects(exportBuild(build), (e) => e.detail === "maxmana");
          build.stash[0].propertyValues = { 3: 223 };
        }
        const { saved } = await exportBuild(build, { "stash.0": "planned" });
        const [item] = saved.items;
        assert.equal(saved.items.length, 1);
        assert.equal(item.type, def.code ?? def.item);
        assert.equal(item.quality, quality === "unique" ? 7 : 5);
        assert.equal(item[quality === "unique" ? "unique_id" : "set_id"], def.saveId);
        assert.equal(item.alt_position_id, 5);
        const minimum = (await exportBuild(build, { "stash.0": 0 })).saved.items[0];
        assert.equal(minimum[quality === "unique" ? "unique_id" : "set_id"], def.saveId);
        passed++;
      } catch (e) {
        failures.push({ id, name: def.index, error: e.detail || e.message });
      }
    }
  }
  console.log("Binary unique/set audit:", passed, "passed;", failures.length, "failed");
  console.log(
    "Ghostflame: verified overflow rejection and highest encodable mana value (223)."
  );
  if (failures.length) console.log(JSON.stringify(failures, null, 2));
  const helmet = {
    name: "Hellwarden's Will",
    quality: "unique",
    catalogId: "unique492",
    baseCode: "xsk",
    requiredLevel: 50,
    bonuses: {},
    notes: "",
    sockets: 1,
    socketedItems: ["unique494"],
    propertyRoll: 1,
  };
  for (const roll of [undefined, 0, 1]) {
    const build = createBuild("paladin");
    build.equipment.head = helmet;
    const { saved } = await exportBuild(
      build,
      roll === undefined ? {} : { "hero.head": roll }
    );
    const parent = saved.items[0],
      jewel = parent.socketed_items[0];
    assert.equal(parent.unique_id, 493);
    assert.equal(parent.type, "xsk");
    assert.equal(parent.total_nr_of_sockets, 1);
    assert.equal(parent.nr_of_items_in_sockets, 1);
    assert.equal(jewel.unique_id, 495);
    assert.equal(jewel.type, "cjw");
    assert.equal(jewel.location_id, 6);
    assert.deepEqual(stat(parent, "item_armor_percent"), [roll === 0 ? 150 : 215]);
    assert.deepEqual(stat(parent, "passive_fire_mastery"), [roll === 0 ? 10 : 15]);
    assert.deepEqual(stat(jewel, "item_magicbonus"), [roll === 0 ? 15 : 35]);
  }
  for (const [id, propertyChoices, name, expected] of [
    ["unique358", { 7: 25 }, "item_singleskill", [60, 3]],
    ["unique486", { 1: 3 }, "item_addskill_tab", [58, 1]],
    ["unique489", { 2: 6 }, "passive_pois_mastery", [5]],
  ]) {
    const build = createBuild("paladin"),
      def = data.uniqueItems[id];
    build.stash = [
      {
        name: def.index,
        quality: "unique",
        catalogId: id,
        baseCode: def.code,
        requiredLevel: 1,
        bonuses: {},
        notes: "",
        propertyChoices,
        propertyRoll: 1,
      },
    ];
    assert.deepEqual(decodeBuild(encodeBuild(build)), build);
    assert.deepEqual(stat((await exportBuild(build)).saved.items[0], name), expected);
  }
  const upgraded = createBuild("paladin");
  upgraded.equipment.head = {
    ...helmet,
    baseCode: "usk",
    socketPropertyValues: { 0: { 2: 7 } },
  };
  const upgradedItem = (await exportBuild(upgraded)).saved.items[0];
  assert.equal(upgradedItem.type, "usk");
  assert.equal(upgradedItem.unique_id, 493);
  assert.deepEqual(stat(upgradedItem.socketed_items[0], "passive_ltng_mastery"), [7]);
  const build = createBuild("paladin");
  build.stash = createUberKeySet(new Set([0, 1, 16, 17]));
  assert.equal(build.stash.length, 9);
  assert.equal(
    createUberKeySet(new Set(Array.from({ length: 208 }, (_, i) => i))),
    undefined
  );
  const { saved } = await exportBuild(build);
  assert.equal(saved.items.length, 9);
  for (const code of ["pk1", "pk2", "pk3"])
    assert.equal(saved.items.filter((i) => i.type === code).length, 3);
  assert(
    saved.items.every((i) => i.quality === 2 && i.alt_position_id === 5 && !i.unique_id)
  );
  console.log(
    "Hellwarden + Guardian jewel (planned/min/max) and 3×3 actual keys: passed."
  );
  assert.equal(
    failures.length,
    0,
    "Every catalog unique/set must export without substitution"
  );
} finally {
  await server.close();
}
