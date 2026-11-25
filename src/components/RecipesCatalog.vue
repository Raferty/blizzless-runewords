<template>
  <main class="recipes-page" :aria-label="t('Рецепты Куба', 'Cube recipes')">
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
        <button class="recipes-reset" @click="reset">
          <UiIcon name="reset" />{{ t("Сбросить всё", "Reset all") }}
        </button>
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
      <div
        class="recipe-category-group"
        role="group"
        :aria-label="t('Ингредиенты', 'Ingredients')"
      >
        <span class="recipe-category-group__label">{{
          t("Ингредиенты", "Ingredients")
        }}</span>
        <div class="recipe-category-group__options">
          <button
            :aria-pressed="!recipes.materials.length"
            @click="recipes.materials = []"
          >
            {{ t("Все", "All") }}
          </button>
          <button
            v-for="material in cubeMaterials"
            :key="material.key"
            :aria-pressed="recipes.materials.includes(material.key)"
            :title="`${text(cubeIngredients.get(material.key)?.name ?? material.name)} · ${t('Рецептов в каталоге', 'Recipes in catalog')}: ${materialCounts[material.key]}`"
            @click="recipes.toggleMaterial(material.key)"
          >
            <img
              :src="`${base}${cubeIngredients.get(material.key)?.image}`"
              alt=""
              width="24"
              height="28"
            />
            <span>{{ text(material.name) }}</span
            ><b>{{ materialCounts[material.key] }}</b>
            <UiIcon
              v-if="recipes.materials.includes(material.key)"
              name="check"
              :size="14"
            />
          </button>
        </div>
      </div>
    </section>
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
import type { CubeRecipe } from "@/types/cube";
import type { LocalizedName } from "@/types/runeword";
import CubeRecipeCard from "@/components/CubeRecipeCard.vue";
import TheFooter from "@/components/TheFooter.vue";
import UiModal from "@/components/ui/UiModal.vue";
const props = defineProps<{ search: string }>();
const emit = defineEmits<{ (event: "update:search", value: string): void }>();
const info = useInfoStore();
const recipes = useRecipesStore();
const t = useText();
const selected = ref<CubeRecipe | null>(null);
const text = (value: LocalizedName) => cubeText(value, info.currentLang);
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
  rare: { ru: "Редкие", en: "Rare" },
  crafted: { ru: "Крафт", en: "Crafted" },
  event: { ru: "Квесты", en: "Quests" },
  materials: { ru: "Создание материалов", en: "Create materials" },
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
        "rare",
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
const materialCounts = Object.fromEntries(
  cubeMaterials.map((material) => [
    material.key,
    cubeCatalog.recipes.filter((recipe) =>
      recipe.ingredients.some((item) => item.key === material.key)
    ).length,
  ])
);
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
.recipe-category-group img {
  flex-shrink: 0;
  object-fit: contain;
}
.recipes-reset {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 6px 10px;
  margin-left: auto;
  font-size: 12px;
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
}
</style>
