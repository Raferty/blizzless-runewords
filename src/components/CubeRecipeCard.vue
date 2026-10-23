<template>
  <article class="cube-card" :class="{ 'cube-card--detail': detailed }">
    <h3>
      <button
        v-if="!detailed"
        class="cube-card__open"
        aria-haspopup="dialog"
        @click="$emit('select')"
      >
        {{ text(recipe.name) }}
      </button>
      <template v-else>{{ text(recipe.name) }}</template>
    </h3>
    <p
      v-if="recipe.status !== 'unchanged'"
      class="cube-card__status"
      :class="`cube-card__status--${recipe.status}`"
    >
      {{
        recipe.status === "added"
          ? t("Добавлен в Blizzless", "Added in Blizzless")
          : t("Переработан", "Reworked")
      }}
    </p>
    <ul class="cube-card__tags" :aria-label="t('Категории', 'Categories')">
      <li v-for="tag in recipe.tags" :key="tag">{{ tagName(tag) }}</li>
    </ul>
    <p v-if="text(recipe.notes)" class="cube-card__notes">{{ text(recipe.notes) }}</p>
    <CubeFormula :ingredients="recipe.ingredients" :result="recipe.result" />
    <div v-if="recipe.original && detailed" class="cube-card__original">
      <h4>{{ t("Оригинальная версия", "Original version") }}</h4>
      <p v-if="text(recipe.original.notes)" class="cube-card__notes">
        {{ text(recipe.original.notes) }}
      </p>
      <CubeFormula
        :ingredients="recipe.original.ingredients"
        :result="recipe.original.result"
      />
    </div>
    <div v-if="!detailed" class="cube-card__footer">
      <span>{{ t("Рецепт Куба", "Cube recipe") }}</span
      ><span>{{ t("Подробнее", "Details") }} ↗</span>
    </div>
  </article>
</template>
<script setup lang="ts">
import { useInfoStore } from "@/store";
import { useText } from "@/composables/useText";
import { cubeCatalog, cubeText } from "@/utils/cube";
import type { CubeRecipe } from "@/types/cube";
import type { LocalizedName } from "@/types/runeword";
import CubeFormula from "@/components/CubeFormula.vue";
withDefaults(defineProps<{ recipe: CubeRecipe; detailed?: boolean }>(), {
  detailed: false,
});
defineEmits<{ (event: "select"): void }>();
const info = useInfoStore();
const t = useText();
const text = (value: LocalizedName) => cubeText(value, info.currentLang);
const tagName = (key: string) =>
  cubeText(
    cubeCatalog.recipeTags.find((tag) => tag.key === key)?.name ?? { ru: "", en: "" },
    info.currentLang,
    key
  );
</script>
<style scoped lang="scss">
.cube-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 18px;
  background: var(--color-panel);
  border: 1px var(--border-style) var(--color-border);
  border-radius: 5px;
}
.cube-card:hover {
  border-color: #668393;
}
h3 {
  margin-bottom: 8px;
  font-size: 18px;
  line-height: 1.3;
  color: var(--color-title);
  text-align: center;
}
.cube-card__open {
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
}
.cube-card__open::after {
  position: absolute;
  inset: 0;
  content: "";
  border-radius: 4px;
}
.cube-card__open:focus-visible {
  outline: 0;
}
.cube-card__open:focus-visible::after {
  outline: 2px var(--border-style) var(--color-accent);
  outline-offset: 3px;
}
.cube-card__status {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  padding: 2px 6px;
  font-size: 9px;
  color: #fff;
  text-transform: uppercase;
  pointer-events: none;
  background: var(--color-reworked-bg);
  border-radius: 0 4px 0 4px;
}
.cube-card__status--added {
  background: #246a46;
}
.cube-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  margin-bottom: 14px;
}
.cube-card__tags li {
  padding: 2px 5px;
  font-size: 10px;
  color: var(--color-muted);
  border: 1px var(--border-style) var(--color-border);
  border-radius: 3px;
}
.cube-card__notes {
  margin-bottom: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-muted);
  white-space: pre-line;
}
.cube-card > :deep(.cube-formula) {
  flex: 1;
}
.cube-card:not(.cube-card--detail) :deep(.cube-ingredient__note) {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 7;
  -webkit-box-orient: vertical;
}
.cube-card__original {
  padding-top: 14px;
  margin-top: 18px;
  border-top: 1px var(--border-style) var(--color-border);
}
h4 {
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--color-muted);
}
.cube-card__original :deep(.cube-formula) {
  opacity: 0.7;
}
.cube-card__footer {
  display: flex;
  justify-content: space-between;
  padding-top: 14px;
  font-size: 10px;
  color: var(--color-muted);
}
.cube-card--detail {
  border: 0;
}
.cube-card--detail h3 {
  font-size: 23px;
}
</style>
