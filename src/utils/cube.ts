import data from "@/shared/cube-catalog.json";
import type {
  CubeCatalog,
  CubeIngredient,
  CubeRecipe,
  CubeRecipeItem,
} from "@/types/cube";
import type { Lang } from "@/types";
import type { LocalizedName } from "@/types/runeword";

export const cubeCatalog = data as CubeCatalog;
export const cubeIngredients = new Map<string, CubeIngredient>([
  ...cubeCatalog.ingredients.map((item): [string, CubeIngredient] => [item.key, item]),
]);
export const cubeMaterials = [
  { key: "Horadric Sphere", name: { ru: "Сферы", en: "Spheres" } },
  { key: "Resplendent Spark", name: { ru: "Осколки", en: "Sparks" } },
  { key: "blacksmith ingot", name: { ru: "Инготы", en: "Ingots" } },
] as const;
export type CubeMaterialKey = (typeof cubeMaterials)[number]["key"];
const uniqueResultKeys = new Set([
  "griffon",
  "arach_mesh",
  "andy_vis",
  "mara_k",
  "seraph_hymn",
  "shako",
  "Nightwing",
  "lich_tal",
  "bonelord_tal",
  "any_unique_item",
]);
/** Quality is independent of the current interface language. */
export function cubeResultQuality(
  key: string
): "crafted" | "rare" | "magic" | "unique" | "normal" {
  const name = cubeIngredients.get(key)?.name.en ?? "";
  if (/\bcrafted\b/i.test(name)) return "crafted";
  if (/\brare\b/i.test(name)) return "rare";
  if (/\b(?:blue|magic|magical)\b/i.test(name)) return "magic";
  if (uniqueResultKeys.has(key)) return "unique";
  return "normal";
}
export function cubeText(value: LocalizedName, lang: Lang, fallback = ""): string {
  return value[lang] || value.en || value.ru || fallback;
}
/** Creating a crafted item rolls affixes; upgrading one preserves its affixes. */
export function isCubeCraftingResult(
  key: string,
  ingredients: CubeRecipeItem[]
): boolean {
  return (
    cubeResultQuality(key) === "crafted" &&
    !ingredients.some((item) => cubeResultQuality(item.key) === "crafted")
  );
}
export const normalizeCubeSearch = (text: string) =>
  text.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
export function recipeSearchText(recipe: CubeRecipe): string {
  return normalizeCubeSearch(
    [
      recipe.key,
      ...Object.values(recipe.name),
      ...Object.values(recipe.notes),
      ...recipe.tags.flatMap((key) =>
        Object.values(cubeCatalog.recipeTags.find((tag) => tag.key === key)?.name ?? {})
      ),
      ...[...recipe.ingredients, ...recipe.result].flatMap((item) => [
        item.key,
        ...Object.values(item.notes),
        ...Object.values(cubeIngredients.get(item.key)?.name ?? {}),
      ]),
    ].join(" ")
  );
}
export function matchesCubeSearch(text: string, query: string): boolean {
  return normalizeCubeSearch(query)
    .split(" ")
    .filter(Boolean)
    .every((word) => text.includes(word));
}
