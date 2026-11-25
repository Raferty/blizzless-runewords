import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

function parse(bytes) {
  const [header, ...lines] = bytes
    .toString()
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.split("\t"));
  return lines.map((cells) =>
    Object.fromEntries(header.map((key, index) => [key, cells[index] || ""]))
  );
}

export async function checkCubeUpgradeCoverage(catalog, ingredients, quality) {
  const currentBytes = gunzipSync(
    await readFile(new URL("./fixtures/cube/cubemain.txt.gz", import.meta.url))
  );
  assert.equal(
    createHash("sha256").update(currentBytes).digest("hex"),
    "8082915196bba2d5885836d484a2e6372f92e29330cfa5a2550db8f5e03134b8"
  );
  const current = parse(currentBytes);
  const pinned = parse(
    gunzipSync(
      await readFile(new URL("./fixtures/planner/cubemain.txt.gz", import.meta.url))
    )
  );
  const find = (key) => {
    const entry = catalog.recipes.find((recipe) => recipe.key === key);
    assert(entry, key);
    return entry;
  };
  const fields = [
    "enabled",
    "numinputs",
    ...Array.from({ length: 7 }, (_, i) => `input ${i + 1}`),
    "output",
    "output b",
    "output c",
    ...Array.from({ length: 5 }, (_, i) => [
      `mod ${i + 1}`,
      `mod ${i + 1} min`,
      `mod ${i + 1} max`,
    ]).flat(),
  ];
  const covered = new Set();
  for (const [key, ids] of Object.entries(catalog.nativeRecipeSource.rows)) {
    if (!key.startsWith("upgrade_")) continue;
    for (const id of ids) {
      covered.add(id);
      assert.deepEqual(
        fields.map((field) => current[id][field]),
        fields.map((field) => pinned[id][field]),
        `Upgrade ${key} must match the current launcher table at row ${id}`
      );
    }
  }
  for (const [row, source] of current.entries()) {
    if (source.enabled !== "1") continue;
    const tier = /(?:^|,)(?:exc|eli)(?:,|$)/.test(source.output);
    const runeInput = /^r(\d{2}),qty=(\d+)$/.exec(source["input 1"]);
    const runeOutput = /^r(\d{2})$/.exec(source.output);
    const rune =
      runeInput && runeOutput && Number(runeInput[1]) + 1 === Number(runeOutput[1]);
    const gem =
      /^(?:g[a-z]{2}|sk[a-z]),qty=(?:3|6|9)$/.test(source["input 1"]) &&
      /^(?:g[a-z]{2}|sk[a-z])$/.test(source.output);
    if (tier || rune || gem)
      assert(
        covered.has(row),
        `Missing enabled upgrade: row ${row}: ${source.description}`
      );
  }
  const expected = [
    ["upgrade_rare_normal_weapon", ["Ort Rune", "Amn Rune", "Perfect Sapphire"], "rare"],
    [
      "upgrade_rare_exceptional_weapon",
      ["Fal Rune", "Um Rune", "Perfect Sapphire"],
      "rare",
    ],
    ["upgrade_rare_normal_armor", ["Ral Rune", "Thul Rune", "Perfect Amethyst"], "rare"],
    [
      "upgrade_rare_exceptional_armor",
      ["Ko Rune", "Pul Rune", "Perfect Amethyst"],
      "rare",
    ],
    ["upgrade_set_normal_weapon", ["Ral Rune", "Sol Rune", "Perfect Emerald"], "set"],
    [
      "upgrade_set_exceptional_weapon",
      ["Lum Rune", "Pul Rune", "Perfect Emerald"],
      "set",
    ],
    ["upgrade_set_normal_armor", ["Tal Rune", "Shael Rune", "Perfect Diamond"], "set"],
    ["upgrade_set_exceptional_armor", ["Ko Rune", "Lem Rune", "Perfect Diamond"], "set"],
  ];
  for (const [key, names, color] of expected) {
    const entry = find(key);
    assert.deepEqual(
      entry.ingredients.slice(1).map((item) => ingredients.get(item.key).name.en),
      names
    );
    assert(entry.ingredients.every((item) => item.count === 1));
    assert.equal(quality(entry.result[0].key), color);
  }
  for (const [prefix, count] of [
    ["upgrade_rune_", 32],
    ["upgrade_gem_", 28],
  ]) {
    const entries = catalog.recipes.filter((recipe) => recipe.key.startsWith(prefix));
    assert.equal(entries.length, count);
    for (const entry of entries) {
      assert.equal(entry.ingredients.length, 1);
      assert.equal(entry.result.length, 1);
      assert.equal(entry.result[0].count, 1);
      assert.equal(catalog.nativeRecipeSource.rows[entry.key].length, 3);
      const amount = entry.ingredients[0].count;
      assert(entry.notes.en.includes(`${amount * 2} → 2; ${amount * 3} → 3`));
    }
  }
  for (const key of ["upgrade_rune_el", "upgrade_rune_lem"])
    assert.equal(find(key).ingredients[0].count, 3);
  for (const key of ["upgrade_rune_pul", "upgrade_rune_cham"])
    assert.equal(find(key).ingredients[0].count, 2);
  for (const key of ["upgrade_rune_thul", "upgrade_rune_cham"]) {
    assert.equal(find(key).status, "changed");
    assert.equal(find(key).original.ingredients.length, 2);
    assert(ingredients.get(find(key).original.ingredients[1].key).tags.includes("gem"));
  }
  assert.equal(find("upgrade_rune_el").original, undefined);
  const armorFix = find("fix_quality_armor");
  assert.equal(ingredients.get(armorFix.ingredients[1].key).name.en, "El Rune");
  for (const key of ["fix_quality_armor", "fix_quality_weapon"])
    assert(find(key).tags.includes("upgrade_u"));
  for (const key of ["upgrade_craft_normal_armor", "upgrade_armor_except_craft"]) {
    for (const tag of ["belt", "helm", "gloves", "boots", "shields"])
      assert(find(key).tags.includes(tag), `${key}: ${tag}`);
  }
}
