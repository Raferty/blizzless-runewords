import { defineStore } from "pinia";
import {
  cubeCatalog,
  cubeIngredients,
  matchesCubeSearch,
  recipeSearchText,
  type CubeMaterialKey,
} from "@/utils/cube";
import type { CubeStatus } from "@/types/cube";

const searchable = new Map(
  cubeCatalog.recipes.map((recipe) => [recipe.key, recipeSearchText(recipe)])
);
export const useRecipesStore = defineStore("recipes", {
  state: () => ({
    search: "",
    statuses: [] as CubeStatus[],
    materials: [] as CubeMaterialKey[],
    recipeTags: [] as string[],
    ingredientTags: [] as string[],
  }),
  getters: {
    filteredRecipes(state) {
      return cubeCatalog.recipes.filter((recipe) => {
        const tags = new Set(
          recipe.ingredients.flatMap((item) => cubeIngredients.get(item.key)?.tags ?? [])
        );
        return (
          (!state.statuses.length || state.statuses.includes(recipe.status)) &&
          (!state.materials.length ||
            recipe.ingredients.some((item) =>
              state.materials.some((key) => item.key === key)
            )) &&
          state.recipeTags.every((tag) => recipe.tags.includes(tag)) &&
          state.ingredientTags.every((tag) => tags.has(tag)) &&
          matchesCubeSearch(searchable.get(recipe.key) ?? "", state.search)
        );
      });
    },
  },
  actions: {
    toggleStatus(status: CubeStatus) {
      this.statuses = this.statuses.includes(status)
        ? this.statuses.filter((value) => value !== status)
        : [...this.statuses, status];
    },
    toggleMaterial(key: CubeMaterialKey) {
      this.materials = this.materials.includes(key)
        ? this.materials.filter((value) => value !== key)
        : [...this.materials, key];
    },
    addTag(kind: "recipe" | "ingredient", key: string | null) {
      const tags = kind === "recipe" ? this.recipeTags : this.ingredientTags;
      if (key && !tags.includes(key)) tags.push(key);
    },
    removeTag(kind: "recipe" | "ingredient", key: string) {
      if (kind === "recipe")
        this.recipeTags = this.recipeTags.filter((value) => value !== key);
      else this.ingredientTags = this.ingredientTags.filter((value) => value !== key);
    },
    resetFilters() {
      this.search = "";
      this.statuses = [];
      this.materials = [];
      this.recipeTags = [];
      this.ingredientTags = [];
    },
  },
});
