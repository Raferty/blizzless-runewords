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
      <div class="recipes-filters__materials">
        <span>{{ t("Материалы", "Materials") }}</span>
        <div
          class="recipes-filters__material-options"
          role="group"
          :aria-label="t('Материалы', 'Materials')"
        >
          <button
            v-for="material in cubeMaterials"
            :key="material.key"
            :aria-pressed="recipes.materials.includes(material.key)"
            :title="text(cubeIngredients.get(material.key)?.name ?? material.name)"
            @click="recipes.toggleMaterial(material.key)"
          >
            <img
              :src="`${base}${cubeIngredients.get(material.key)?.image}`"
              alt=""
              width="22"
              height="26"
            />
            {{ text(material.name) }}
          </button>
        </div>
      </div>
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
    <section
      class="recipe-categories"
      :aria-label="t('Категории рецептов', 'Recipe categories')"
    >
      <div class="recipe-categories__heading">
        <h2>{{ t("Фильтры рецептов", "Recipe filters") }}</h2>
        <span>{{
          t(
            "Можно сочетать фильтры. Повторный клик снимает выбор.",
            "Combine filters. Click again to deselect."
          )
        }}</span>
      </div>
      <div
        v-for="group in categoryGroups"
        :key="group.key"
        class="recipe-category-group"
        role="group"
        :aria-label="text(group.name)"
      >
        <span class="recipe-category-group__label">{{ text(group.name) }}</span>
        <div class="recipe-category-group__options">
          <button
            :aria-pressed="
              !group.tags.some((tag) => recipes.recipeTags.includes(tag.key))
            "
            @click="clearGroup(group.tags.map((tag) => tag.key))"
          >
            {{ t("Все", "All") }}
          </button>
          <button
            v-for="tag in group.tags"
            :key="tag.key"
            :aria-pressed="recipes.recipeTags.includes(tag.key)"
            :title="`${text(tag.name)} · ${t('Рецептов в каталоге', 'Recipes in catalog')}: ${tag.count}`"
            @click="toggleCategory(tag.key)"
          >
            <img
              v-if="tag.image"
              :src="`${base}${tag.image}`"
              alt=""
              width="24"
              height="28"
            />
            <UiIcon v-else :name="tag.icon" :size="20" />
            <span>{{ text(tag.name) }}</span
            ><b>{{ tag.count }}</b>
            <UiIcon v-if="recipes.recipeTags.includes(tag.key)" name="check" :size="14" />
          </button>
        </div>
      </div>
    </section>
    <div v-if="activeTags.length" class="recipes-active">
      <button
        v-for="tag in activeTags"
        :key="`${tag.kind}-${tag.key}`"
        :aria-label="`${t('Убрать фильтр', 'Remove filter')}: ${tag.label}`"
        @click="recipes.removeTag(tag.kind, tag.key)"
      >
        {{ tag.label }} <UiIcon name="close" :size="12" />
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
          <UiIcon name="close" />
        </button>
      </div>
      <CubeRecipeCard :recipe="selected" detailed /></template
  ></UiModal>
</template>
<script setup lang="ts">
import UiIcon from "@/components/ui/UiIcon.vue";
import { computed, ref, watch } from "vue";
import { useInfoStore } from "@/store";
import { useRecipesStore } from "@/store/recipes";
import { useText } from "@/composables/useText";
import {
  cubeCatalog,
  cubeIngredients,
  cubeMaterials,
  cubeText,
  matchesRecipeTag,
} from "@/utils/cube";
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
const base = import.meta.env.BASE_URL;
const categoryNames: Record<string, LocalizedName> = {
  reroll: { ru: "Реролл", en: "Reroll" },
  sockets: { ru: "Сокеты", en: "Sockets" },
  weapon: { ru: "Оружие", en: "Weapons" },
  uniques: { ru: "Уникальные", en: "Uniques" },
  crafted: { ru: "Крафт", en: "Crafted" },
  event: { ru: "Квесты", en: "Quests" },
  recharge: { ru: "Перезарядка", en: "Recharge" },
};
const categoryImages: Record<string, string> = {
  weapon: "images/planner/items/weapon/sword/crystal_sword.webp",
  armor: "images/planner/items/armor/armor/plate_mail.webp",
  helm: "images/planner/items/armor/helmet/cap_hat.webp",
  gloves: "images/planner/items/armor/glove/gloves_l.webp",
  boots: "images/planner/items/armor/boot/leather_boots.webp",
  belt: "images/planner/items/armor/belt/sash_l.webp",
  shields: "images/planner/items/armor/shield/buckler.webp",
  amulet: "images/planner/items/misc/amulet/amulet1.webp",
  ring: "images/planner/items/misc/ring/ring1.webp",
  base: "images/planner/items/weapon/sword/broad_sword.webp",
  crafted: "images/planner/items/misc/gem/perfect_diamond1.webp",
  event: "images/planner/items/misc/shard/cont_ua1.png",
  materials: "images/planner/items/misc/quest/parts_2.png",
  runes_pur: "images/planner/items/misc/rune/zod_rune.webp",
  blood: "images/planner/items/misc/gem/perfect_ruby.webp",
  caster: "images/planner/items/misc/gem/perfect_amethyst.webp",
  hitpower: "images/planner/items/misc/gem/perfect_saphire.webp",
  safety: "images/planner/items/misc/gem/perfect_emerald.webp",
};
const categoryIcons = {
  uniques: "star",
  reroll: "refresh",
  sockets: "diamond",
  upgrade_u: "arrow-up",
  repair: "edit",
  recharge: "refresh",
} as const;
const categoryGroups = computed(() =>
  [
    {
      key: "recipe",
      name: { ru: "Рецепт", en: "Recipe" },
      keys: [
        "upgrade_u",
        "reroll",
        "sockets",
        "repair",
        "recharge",
        "uniques",
        "set_items",
        "base",
        "crafted",
        "event",
        "materials",
        "runes_pur",
      ],
    },
    {
      key: "item",
      name: { ru: "Предмет", en: "Item" },
      keys: [
        "weapon",
        "armor",
        "helm",
        "gloves",
        "boots",
        "belt",
        "shields",
        "amulet",
        "ring",
      ],
    },
    {
      key: "craft",
      name: { ru: "Тип крафта", en: "Craft type" },
      keys: ["caster", "blood", "hitpower", "safety"],
    },
  ].map((group) => ({
    ...group,
    tags: group.keys
      .map((key) => ({
        key,
        name:
          categoryNames[key] ||
          cubeCatalog.recipeTags.find((tag) => tag.key === key)!.name,
        image: categoryImages[key],
        icon: categoryIcons[key as keyof typeof categoryIcons] || "diamond",
        count: cubeCatalog.recipes.filter((recipe) => matchesRecipeTag(recipe, key))
          .length,
      }))
      .filter((tag) => tag.count > 0),
  }))
);
function toggleCategory(key: string) {
  if (recipes.recipeTags.includes(key)) recipes.removeTag("recipe", key);
  else recipes.addTag("recipe", key);
}
function clearGroup(keys: string[]) {
  recipes.recipeTags = recipes.recipeTags.filter((key) => !keys.includes(key));
}
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
const ingredientTagOptions = computed(() =>
  tagOptions(
    cubeCatalog.ingredientTags,
    recipes.ingredientTags,
    t("Тип ингредиента", "Ingredient type")
  )
);
const activeTags = computed(() => [
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
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-height: 34px;
  padding: 5px 9px;
  font-size: 11px;
}
.recipes-filters__status,
.recipes-filters__material-options {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.recipes-filters__materials {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: var(--color-muted);
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
.recipes-filters img,
.recipe-category-group img {
  flex-shrink: 0;
  object-fit: contain;
}
.recipe-categories {
  padding: 16px 0;
  border-bottom: 1px var(--border-style) var(--color-border);
}
.recipe-categories__heading {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: baseline;
  margin-bottom: 12px;
}
.recipe-categories__heading h2 {
  font-size: 14px;
  color: var(--color-title);
}
.recipe-categories__heading span {
  font-size: 11px;
  color: var(--color-muted);
}
.recipe-category-group {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-top: 8px;
}
.recipe-category-group__label {
  flex: 0 0 80px;
  font-size: 11px;
  color: var(--color-muted);
}
.recipe-category-group__options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}
.recipe-category-group button {
  display: inline-flex;
  gap: 7px;
  align-items: center;
  min-height: 40px;
  padding: 5px 10px;
  font-size: 12px;
  text-align: left;
}
.recipe-category-group button[aria-pressed="true"] {
  color: #ffe866;
  background: #332e17;
  border-color: #c7b377;
  box-shadow: inset 0 -2px #c7b377;
}
.recipe-category-group button b {
  min-width: 18px;
  padding: 2px 4px;
  font-size: 10px;
  font-weight: 400;
  color: var(--color-muted);
  text-align: center;
  background: rgb(0 0 0 / 25%);
  border-radius: 3px;
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
  .recipe-category-group {
    flex-direction: column;
    gap: 6px;
  }
  .recipe-category-group__label {
    flex-basis: auto;
  }
  .recipes-filters__select {
    width: calc(50% - 4px);
    min-width: 135px;
  }
}
</style>
