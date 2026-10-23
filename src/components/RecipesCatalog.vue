<template>
  <main class="recipes-page" :aria-label="t('Рецепты Куба', 'Cube recipes')">
    <div class="recipes-filters">
      <div
        class="recipes-filters__status"
        :aria-label="t('Версия рецепта', 'Recipe version')"
      >
        <button :aria-pressed="!recipes.statuses.length" @click="recipes.statuses = []">
          {{ t("Все", "All") }}</button
        ><button
          v-for="status in statuses"
          :key="status.key"
          :aria-pressed="recipes.statuses.includes(status.key)"
          @click="recipes.toggleStatus(status.key)"
        >
          {{ status.label }}
        </button>
      </div>
      <UiSelect
        v-model="recipeTagToAdd"
        class="recipes-filters__select"
        :options="recipeTagOptions"
        :aria-label="t('Категория рецепта', 'Recipe category')"
        @change="addTag('recipe', $event)"
      />
      <UiSelect
        v-model="ingredientTagToAdd"
        class="recipes-filters__select"
        :options="ingredientTagOptions"
        :aria-label="t('Тип ингредиента', 'Ingredient type')"
        @change="addTag('ingredient', $event)"
      />
      <button class="recipes-reset" @click="reset">
        {{ t("Сбросить всё", "Reset all") }}
      </button>
    </div>
    <div v-if="activeTags.length" class="recipes-active">
      <button
        v-for="tag in activeTags"
        :key="`${tag.kind}-${tag.key}`"
        :aria-label="`${t('Убрать фильтр', 'Remove filter')}: ${tag.label}`"
        @click="recipes.removeTag(tag.kind, tag.key)"
      >
        {{ tag.label }} ×
      </button>
    </div>
    <p class="recipes-count" role="status">
      {{ t("Найдено", "Found") }} <b>{{ visibleRecipes.length }}</b> /
      {{ cubeCatalog.recipes.length }}
    </p>
    <div v-if="visibleRecipes.length" class="recipes-grid">
      <CubeRecipeCard
        v-for="recipe in visibleRecipes"
        :key="recipe.key"
        :recipe="recipe"
        @select="selected = recipe"
      />
    </div>
    <div v-else class="recipes-empty">
      <h3>{{ t("Рецепты не найдены", "No recipes found") }}</h3>
      <p>
        {{
          t(
            "Измените запрос или сбросьте фильтры.",
            "Try another search or reset the filters."
          )
        }}
      </p>
      <button @click="reset">{{ t("Сбросить фильтры", "Reset filters") }}</button>
    </div>
    <TheFooter :source-url="cubeCatalog.source" />
  </main>
  <UiModal
    :model-value="selected !== null"
    :closable="true"
    :label="selected ? text(selected.name) : undefined"
    @close="selected = null"
    ><template v-if="selected"
      ><div class="recipe-modal-bar">
        <span>{{ t("Рецепт Куба", "Cube recipe") }}</span
        ><button autofocus :aria-label="t('Закрыть', 'Close')" @click="selected = null">
          ×
        </button>
      </div>
      <CubeRecipeCard :recipe="selected" detailed /></template
  ></UiModal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useInfoStore } from "@/store";
import { useRecipesStore } from "@/store/recipes";
import { useText } from "@/composables/useText";
import { cubeCatalog, cubeText } from "@/utils/cube";
import type { CubeRecipe, CubeStatus, CubeTag } from "@/types/cube";
import type { LocalizedName } from "@/types/runeword";
import type { SelectOption } from "@/types/select";
import CubeRecipeCard from "@/components/CubeRecipeCard.vue";
import TheFooter from "@/components/TheFooter.vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import UiModal from "@/components/ui/UiModal.vue";
const props = defineProps<{ search: string }>();
const emit = defineEmits<{ (event: "update:search", value: string): void }>();
const info = useInfoStore();
const recipes = useRecipesStore();
const t = useText();
const selected = ref<CubeRecipe | null>(null);
const text = (value: LocalizedName) => cubeText(value, info.currentLang);
const statuses = computed<{ key: CubeStatus; label: string }[]>(() => [
  { key: "added", label: t("Новые", "Added") },
  { key: "changed", label: t("Переработанные", "Reworked") },
  { key: "unchanged", label: t("Без изменений", "Unchanged") },
]);
watch(
  () => props.search,
  (value) => {
    recipes.search = value;
  },
  { immediate: true }
);
const visibleRecipes = computed(() =>
  [...recipes.filteredRecipes].sort((a, b) =>
    text(a.name).localeCompare(text(b.name), info.currentLang)
  )
);
const recipeTagToAdd = ref<string | null>(null);
const ingredientTagToAdd = ref<string | null>(null);
const tagOptions = (
  tags: CubeTag[],
  selectedTags: string[],
  placeholder: string
): SelectOption<string | null>[] => [
  { value: null, label: placeholder },
  ...tags
    .filter((tag) => !selectedTags.includes(tag.key))
    .map((tag) => ({
      value: tag.key,
      label: cubeText(tag.name, info.currentLang, t("Прочее", "Other")),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, info.currentLang)),
];
const recipeTagOptions = computed(() =>
  tagOptions(
    cubeCatalog.recipeTags,
    recipes.recipeTags,
    t("Категория рецепта", "Recipe category")
  )
);
const ingredientTagOptions = computed(() =>
  tagOptions(
    cubeCatalog.ingredientTags,
    recipes.ingredientTags,
    t("Тип ингредиента", "Ingredient type")
  )
);
const activeTags = computed(() => [
  ...recipes.recipeTags.map((key) => ({
    key,
    kind: "recipe" as const,
    label: text(cubeCatalog.recipeTags.find((tag) => tag.key === key)!.name),
  })),
  ...recipes.ingredientTags.map((key) => ({
    key,
    kind: "ingredient" as const,
    label: cubeText(
      cubeCatalog.ingredientTags.find((tag) => tag.key === key)!.name,
      info.currentLang,
      t("Прочее", "Other")
    ),
  })),
]);
function addTag(kind: "recipe" | "ingredient", key: string | null) {
  recipes.addTag(kind, key);
  recipeTagToAdd.value = null;
  ingredientTagToAdd.value = null;
}
function reset() {
  recipes.resetFilters();
  emit("update:search", "");
}
</script>
<style scoped lang="scss">
.recipes-page {
  max-width: 1800px;
  min-height: calc(100svh - 60px);
  padding: 0 18px;
  margin: 0 auto;
}
.recipes-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px var(--border-style) var(--color-border);
}
.recipes-filters button {
  padding: 5px 9px;
  font-size: 11px;
}
.recipes-filters__status {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.recipes-filters__select {
  width: 180px;
}
.recipes-filters .recipes-reset {
  margin-left: auto;
  color: var(--color-muted);
  background: transparent;
  border: 0;
}
.recipes-active {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.recipes-active button {
  padding: 3px 7px;
  font-size: 11px;
  color: #ffe866;
  border-color: #756b1f;
}
.recipes-count {
  padding: 12px 0;
  font-size: 12px;
  color: var(--color-muted);
}
.recipes-count b {
  color: var(--color-text);
}
.recipes-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}
.recipes-empty {
  padding: 70px 16px;
  color: var(--color-muted);
  text-align: center;
}
.recipes-empty h3 {
  margin-bottom: 8px;
  color: var(--color-title);
}
.recipes-empty button {
  padding: 6px 12px;
  margin-top: 16px;
}
.recipe-modal-bar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 11px;
  color: var(--color-muted);
  background: #243039;
  border-bottom: 1px var(--border-style) var(--color-border);
}
.recipe-modal-bar button {
  width: 28px;
  height: 28px;
  font-size: 20px;
  background: transparent;
  border: 0;
}
@media (min-width: 720px) {
  .recipes-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1150px) {
  .recipes-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1600px) {
  .recipes-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .recipes-page {
    padding: 0 12px;
  }
  .recipes-filters__select {
    width: calc(50% - 4px);
    min-width: 135px;
  }
}
</style>
