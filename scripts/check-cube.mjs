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
  assert.equal(cubeCatalog.recipes.length, 98);
  assert.equal(cubeCatalog.sourceVersionCount, 129);
  assert.equal(new Set(cubeCatalog.recipes.map((recipe) => recipe.key)).size, 98);
  assert.equal(cubeCatalog.ingredients.length, 153);
  assert.equal(
    cubeCatalog.recipes.filter((recipe) => recipe.status === "added").length,
    57
  );
  assert.equal(
    cubeCatalog.recipes.filter((recipe) => recipe.status === "changed").length,
    29
  );
  assert.equal(
    cubeCatalog.recipes.filter((recipe) => recipe.status === "unchanged").length,
    12
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
  assert.equal(store.filteredRecipes.length, 98);
  store.toggleStatus("added");
  assert.equal(store.filteredRecipes.length, 57);
  store.toggleStatus("changed");
  assert.equal(store.filteredRecipes.length, 86, "Statuses combine with OR");
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
    assert.equal(store.filteredRecipes.length, 98, "Toggle material off");
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
  assert.equal(store.filteredRecipes.length, 98);
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
  assert.equal(store.filteredRecipes.length, 98);

  assert.deepEqual(parseCatalogHash("#/recipes"), { section: "recipes" });
  assert.deepEqual(parseCatalogHash("#/ricepes/stacks"), {
    section: "recipes",
  });
  assert.deepEqual(parseCatalogHash("#/recipes/runes-gems"), {
    section: "recipes",
  });
  assert.deepEqual(parseCatalogHash(""), { section: "runewords" });
  console.log(
    "Cube checks passed: 98 current recipes, 31 originals, assets, filters, translations and navigation."
  );
} finally {
  await server.close();
}
