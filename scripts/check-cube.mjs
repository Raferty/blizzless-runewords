import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { createPinia, setActivePinia } from "pinia";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const { cubeCatalog, cubeIngredients, cubeText, isCubeCraftingResult } =
    await server.ssrLoadModule("/src/utils/cube.ts");
  const { useRecipesStore } = await server.ssrLoadModule("/src/store/recipes.ts");
  const { parseCatalogHash } = await server.ssrLoadModule("/src/utils/navigation.ts");
  const { RUNES } = await server.ssrLoadModule("/src/shared/constants.ts");
  assert.equal(cubeCatalog.recipes.length, 109);
  assert.equal(cubeCatalog.sourceVersionCount, 129);
  assert.equal(new Set(cubeCatalog.recipes.map((recipe) => recipe.key)).size, 109);
  assert.equal(cubeCatalog.ingredients.length, 173);
  assert.equal(
    cubeCatalog.recipes.filter((recipe) => recipe.status === "added").length,
    59
  );
  assert.equal(
    cubeCatalog.recipes.filter((recipe) => recipe.status === "changed").length,
    29
  );
  assert.equal(
    cubeCatalog.recipes.filter((recipe) => recipe.status === "unchanged").length,
    21
  );
  assert.equal(cubeCatalog.recipes.filter((recipe) => recipe.original).length, 31);
  for (const item of cubeCatalog.ingredients.filter((item) =>
    item.tags?.includes("rune")
  )) {
    const words = item.name.en.toLowerCase().split(/[^a-z]+/);
    const rune = RUNES.find((rune) => words.includes(rune.name.en.toLowerCase()));
    assert(rune, `Unknown rune: ${item.key}`);
    assert.equal(
      item.image,
      rune.image_url.replace(/^\//, ""),
      `${item.key} must use the Runewords filter's rune image`
    );
  }
  for (const recipe of cubeCatalog.recipes.flatMap((recipe) => [
    recipe,
    ...(recipe.original ? [recipe.original] : []),
  ])) {
    assert(recipe.name.ru && recipe.name.en, recipe.key);
    assert(recipe.ingredients.length && recipe.result.length, recipe.key);
    for (const item of [...recipe.ingredients, ...recipe.result]) {
      assert(cubeIngredients.has(item.key), item.key);
      assert(Number.isFinite(item.count) && item.count > 0, item.key);
    }
  }
  for (const image of new Set(
    [...cubeIngredients.values()].map((item) => item.image).filter(Boolean)
  )) {
    assert(image.startsWith("images/"), image);
    await access(new URL(`../public/${image}`, import.meta.url));
  }
  const find = (key) => cubeCatalog.recipes.find((recipe) => recipe.key === key);
  const crafting = cubeCatalog.recipes.filter((recipe) =>
    recipe.result.some((item) => isCubeCraftingResult(item.key, recipe.ingredients))
  );
  assert.equal(crafting.length, 56, "Fresh crafts explain their random affixes");
  for (const key of ["caster_belt", "hp_helm", "weapon", "great_cast_amu"])
    assert(crafting.includes(find(key)), key);
  for (const key of [
    "upgrade_craft_normal_armor",
    "upgrade_armor_except_craft",
    "upgrade_craft_normal_weapon",
    "upgrade_crafted_exceptional_weapon",
    "mara_seraph",
  ])
    assert(!crafting.includes(find(key)), `${key} does not roll crafted affixes`);
  assert.equal(
    find("amulet").blizzlessVersion,
    2,
    "Use latest published Blizzless version"
  );
  assert.equal(
    find("amulet").ingredients.find((item) => item.key === "rune_lum").count,
    1
  );
  assert(find("caster_helm").result[0].notes.en.includes("+1 All Skills"));
  assert(!find("caster_helm").original.result[0].notes.en.includes("+1 All Skills"));
  assert.equal(
    find("mara_seraph").ingredients.find((item) => item.key === "Resplendent Spark")
      .count,
    4
  );
  assert.equal(
    find("mara_seraph").result.length,
    2,
    "Keep both probabilistic outcomes and their notes"
  );
  assert(find("mara_seraph").result.every((item) => item.notes.en === "50% Chance"));
  assert.equal(cubeText({ ru: "", en: "50% Chance" }, "ru"), "50% Chance");

  setActivePinia(createPinia());
  const store = useRecipesStore();
  assert.equal(store.filteredRecipes.length, 109);
  store.toggleStatus("added");
  assert.equal(store.filteredRecipes.length, 59);
  store.toggleStatus("changed");
  assert.equal(store.filteredRecipes.length, 88, "Statuses combine with OR");
  store.resetFilters();
  for (const [material, count, resultRecipe] of [
    ["Horadric Sphere", 27, "hora_sphere"],
    ["Resplendent Spark", 14, "resplendet_spark_rec"],
    ["blacksmith ingot", 3, "blacksmith_ingot_rec"],
  ]) {
    store.toggleMaterial(material);
    assert.equal(store.filteredRecipes.length, count, material);
    assert(
      !store.filteredRecipes.some((recipe) => recipe.key === resultRecipe),
      "Exclude recipes that only create the selected material"
    );
    assert(
      store.filteredRecipes.every((recipe) =>
        recipe.ingredients.some((item) => item.key === material)
      ),
      "Every result must require the selected material"
    );
    store.toggleMaterial(material);
    assert.equal(store.filteredRecipes.length, 109, "Toggle material off");
  }
  store.toggleMaterial("Horadric Sphere");
  store.toggleMaterial("Resplendent Spark");
  assert.equal(store.filteredRecipes.length, 41, "Materials combine with OR");
  store.toggleStatus("unchanged");
  assert.deepEqual(
    store.filteredRecipes.map((recipe) => recipe.key),
    ["Unstoppable Ring"],
    "Materials combine with version filters using AND"
  );
  store.resetFilters();
  store.toggleMaterial("Horadric Sphere");
  store.search = "Sensei";
  assert.deepEqual(
    store.filteredRecipes.map((recipe) => recipe.key),
    ["Amulet of the Sensei"]
  );
  store.addTag("recipe", "ring");
  assert.equal(
    store.filteredRecipes.length,
    0,
    "Material, search and category intersect"
  );
  store.resetFilters();
  assert.equal(store.materials.length, 0);
  assert.equal(store.filteredRecipes.length, 109);
  store.search = "caster helm";
  assert(store.filteredRecipes.some((recipe) => recipe.key === "caster_helm"));
  store.search = "шлем колдуна";
  assert(store.filteredRecipes.some((recipe) => recipe.key === "caster_helm"));
  store.search = "50% chance";
  assert(
    store.filteredRecipes.some((recipe) => recipe.key === "mara_seraph"),
    "Search result notes"
  );
  store.resetFilters();
  store.addTag("recipe", "ring");
  store.addTag("ingredient", "gem");
  assert(store.filteredRecipes.length > 0);
  assert(
    store.filteredRecipes.every(
      (recipe) =>
        recipe.tags.includes("ring") &&
        recipe.ingredients.some((item) =>
          cubeIngredients.get(item.key).tags?.includes("gem")
        )
    )
  );
  store.addTag("recipe", "ring");
  assert.equal(store.recipeTags.length, 1);
  store.addTag("recipe", "armor");
  assert.equal(store.filteredRecipes.length, 0, "Recipe tags combine with AND");
  store.resetFilters();
  assert.equal(store.filteredRecipes.length, 109);

  store.addTag("recipe", "armor");
  assert.equal(store.filteredRecipes.length, 14);
  assert(!store.filteredRecipes.some((recipe) => recipe.key === "Amulet of the Sensei"));
  store.resetFilters();
  store.addTag("recipe", "amulet");
  assert.equal(store.filteredRecipes.length, 15);
  assert(store.filteredRecipes.some((recipe) => recipe.key === "Amulet of the Sensei"));
  store.resetFilters();
  assert.deepEqual(find("Amulet of the Sensei").tags, ["amulet"]);
  store.addTag("recipe", "reroll");
  assert.equal(store.filteredRecipes.length, 10);
  assert(store.filteredRecipes.some((recipe) => recipe.key === "Mechanic's Weapon"));
  assert(store.filteredRecipes.some((recipe) => recipe.key === "reroll_unique"));
  store.resetFilters();
  store.addTag("recipe", "sockets");
  assert.equal(store.filteredRecipes.length, 10);
  assert(store.filteredRecipes.every((recipe) => recipe.tags.includes("sockets")));
  store.addTag("recipe", "weapon");
  assert.deepEqual(
    store.filteredRecipes.map((recipe) => recipe.key),
    [
      "socket_add_weapon",
      "socket_reroll_chipped",
      "socket_reroll_flawless",
      "socket_reroll_standard",
    ]
  );
  store.resetFilters();
  store.addTag("recipe", "crafted");
  assert.equal(
    store.filteredRecipes.length,
    60,
    "All crafted results, including upgrades, are discoverable"
  );
  store.addTag("recipe", "caster");
  store.addTag("recipe", "boots");
  assert.deepEqual(
    store.filteredRecipes.map((r) => r.key),
    ["caster_boots"]
  );
  store.removeTag("recipe", "crafted");
  assert.deepEqual(
    store.filteredRecipes.map((r) => r.key),
    ["caster_boots"]
  );
  store.resetFilters();

  const formula = (key) => find(key).ingredients.map((item) => [item.key, item.count]);
  assert.deepEqual(formula("socket_add_weapon"), [
    ["socket_normal_weapon", 1],
    ["rune_ral", 1],
    ["rune_amn", 1],
    ["gem_perfect_amethyst", 1],
  ]);
  assert.deepEqual(formula("socket_add_armor"), [
    ["socket_normal_armor", 1],
    ["rune_tal", 1],
    ["rune_thul", 1],
    ["gem_perfect_topaz", 1],
  ]);
  assert.deepEqual(formula("socket_add_helm"), [
    ["socket_normal_helm", 1],
    ["rune_ral", 1],
    ["rune_thul", 1],
    ["gem_perfect_sapphire", 1],
  ]);
  assert.deepEqual(formula("socket_add_shield"), [
    ["socket_normal_shield", 1],
    ["rune_tal", 1],
    ["rune_amn", 1],
    ["gem_perfect_ruby", 1],
  ]);
  assert.deepEqual(formula("socket_add_rare"), [
    ["socket_rare_item", 1],
    ["gems", 3],
    ["stone_of_jordan", 1],
  ]);
  assert.deepEqual(formula("socket_clear_hel"), [
    ["socket_any_item", 1],
    ["rune_hel", 1],
    ["misc_town_portal_scroll", 1],
  ]);
  assert.deepEqual(formula("socket_recover_um"), [
    ["socket_non_runeword", 1],
    ["rune_um", 1],
    ["misc_town_portal_scroll", 1],
  ]);
  assert(find("socket_clear_hel").notes.en.includes("destroyed"));
  assert(find("socket_recover_um").notes.en.includes("Runewords are excluded"));
  assert.equal(find("socket_recover_um").result.length, 2);
  assert.deepEqual(formula("portal_bartuc"), [
    ["bartuc_scroll", 1],
    ["bartuc_bloodstone", 1],
    ["bartuc_demon_paw", 1],
  ]);
  assert(find("portal_bartuc").notes.en.includes("Harrogath on Hell"));
  assert(cubeIngredients.get("armor_to_recharge").image);
  assert.equal(cubeIngredients.get("any_standard_gem").name.en, "Any Standard Gem");
  store.addTag("recipe", "event");
  assert.equal(store.filteredRecipes.length, 4);
  assert(store.filteredRecipes.some((recipe) => recipe.key === "portal_bartuc"));
  store.resetFilters();

  assert.deepEqual(parseCatalogHash("#/recipes"), { section: "recipes" });
  assert.deepEqual(parseCatalogHash("#/ricepes/stacks"), {
    section: "recipes",
  });
  assert.deepEqual(parseCatalogHash("#/recipes/runes-gems"), {
    section: "recipes",
  });
  assert.deepEqual(parseCatalogHash(""), { section: "runewords" });
  console.log(
    "Cube checks passed: 109 current recipes, 31 originals, assets, filters, translations and navigation."
  );
} finally {
  await server.close();
}
