import type { LocalizedName } from "./runeword";

export type CubeStatus = "added" | "changed" | "unchanged";
export interface CubeRecipeItem {
  key: string;
  count: number;
  notes: LocalizedName;
}
export interface CubeRecipeVersion {
  key: string;
  name: LocalizedName;
  notes: LocalizedName;
  status: CubeStatus;
  tags: string[];
  officialVersion: number | null;
  blizzlessVersion: number | null;
  ingredients: CubeRecipeItem[];
  result: CubeRecipeItem[];
}
export interface CubeRecipe extends CubeRecipeVersion {
  original?: CubeRecipeVersion;
}
export interface CubeIngredient {
  key: string;
  name: LocalizedName;
  tags?: string[];
  image: string | null;
}
export interface CubeTag {
  key: string;
  name: LocalizedName;
}
export interface CubeCatalog {
  source: string;
  checkedAt: string;
  sourceVersionCount: number;
  recipes: CubeRecipe[];
  ingredients: CubeIngredient[];
  recipeTags: CubeTag[];
  ingredientTags: CubeTag[];
  missingImages: string[];
}
