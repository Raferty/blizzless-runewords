<template>
  <div class="cube-formula">
    <div
      class="cube-formula__items"
      :aria-label="t('Ингредиенты', 'Ingredients')"
      :style="{
        '--ingredient-columns': Math.min(ingredients.length, 4),
        '--ingredient-columns-small': Math.min(ingredients.length, 2),
      }"
    >
      <div
        v-for="(item, index) in ingredients"
        :key="`${item.key}-${index}`"
        class="cube-ingredient"
      >
        <img
          v-if="ingredient(item.key)?.image"
          :src="`${base}${ingredient(item.key)?.image}`"
          alt=""
          width="28"
          height="32"
          loading="lazy"
        />
        <span v-else class="cube-ingredient__placeholder" aria-hidden="true">◆</span>
        <div>
          <p>
            <b v-if="item.count !== 1" class="cube-ingredient__count"
              >{{ item.count }} × </b
            >{{ label(item.key) }}
          </p>
          <p v-if="text(item.notes)" class="cube-ingredient__note">
            {{ text(item.notes) }}
          </p>
        </div>
      </div>
    </div>
    <div class="cube-formula__arrow" :aria-label="t('Получается', 'Creates')">↓</div>
    <div class="cube-formula__results" :aria-label="t('Результат', 'Result')">
      <div
        v-for="(item, index) in result"
        :key="`${item.key}-${index}`"
        class="cube-ingredient cube-ingredient--result"
        :class="`cube-ingredient--${cubeResultQuality(item.key)}`"
      >
        <img
          v-if="ingredient(item.key)?.image"
          :src="`${base}${ingredient(item.key)?.image}`"
          alt=""
          width="42"
          height="48"
          loading="lazy"
        />
        <span v-else class="cube-ingredient__placeholder" aria-hidden="true">◆</span>
        <div>
          <p>
            <b v-if="item.count !== 1" class="cube-ingredient__count"
              >{{ item.count }} × </b
            >{{ label(item.key) }}
          </p>
          <p v-if="text(item.notes)" class="cube-ingredient__note">
            {{ text(item.notes) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useInfoStore } from "@/store";
import { useText } from "@/composables/useText";
import { cubeIngredients, cubeResultQuality, cubeText } from "@/utils/cube";
import type { CubeRecipeItem } from "@/types/cube";
import type { LocalizedName } from "@/types/runeword";
defineProps<{ ingredients: CubeRecipeItem[]; result: CubeRecipeItem[] }>();
const info = useInfoStore();
const t = useText();
const base = import.meta.env.BASE_URL;
const ingredient = (key: string) => cubeIngredients.get(key);
const text = (value: LocalizedName) => cubeText(value, info.currentLang);
function label(key: string) {
  if (key === "regular_shield") return t("Обычный щит", "Regular Shield");
  return ingredient(key)
    ? cubeText(ingredient(key)!.name, info.currentLang, key.replace(/_/g, " "))
    : key.replace(/_/g, " ");
}
</script>
<style scoped lang="scss">
.cube-formula {
  display: flex;
  flex-direction: column;
  min-width: 0;
  container-type: inline-size;
}
.cube-formula__items {
  display: grid;
  grid-template-columns: repeat(var(--ingredient-columns), minmax(0, 1fr));
  gap: 12px;
  align-items: start;
  padding: 17px 8px;
  background: #11181e;
  border: 1px var(--border-style) var(--color-border);
  border-radius: 4px;
}
.cube-ingredient {
  display: flex;
  gap: 8px;
  align-items: center;
  max-width: 100%;
  padding: 6px 8px;
  font-size: 12px;
  text-align: left;
  overflow-wrap: anywhere;
  background: #151d24;
  border: 1px var(--border-style) var(--color-border);
  border-radius: 4px;
}
.cube-formula__items > .cube-ingredient {
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 0;
  text-align: center;
  background: transparent;
  border: 0;
}
.cube-formula__items .cube-ingredient img,
.cube-formula__items .cube-ingredient__placeholder {
  width: 40px;
  height: 46px;
}
.cube-formula__items .cube-ingredient__placeholder {
  display: grid;
  place-items: center;
  font-size: 26px;
}
.cube-ingredient > div {
  min-width: 0;
}
.cube-ingredient img {
  flex-shrink: 0;
  width: 28px;
  height: 32px;
  object-fit: contain;
}
.cube-ingredient__placeholder {
  flex-shrink: 0;
  width: 28px;
  color: var(--color-accent);
  text-align: center;
}
.cube-ingredient__count {
  color: #ffe866;
  white-space: nowrap;
}
.cube-ingredient__note {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.6;
  white-space: pre-line;
}
.cube-formula__arrow {
  padding: 7px;
  margin-top: auto;
  font-size: 20px;
  color: var(--color-accent);
  text-align: center;
}
.cube-formula__results {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cube-ingredient--result {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 8px;
  color: var(--result-color, var(--color-text));
  background: var(--result-background, #151d24);
  border-color: var(--result-border, var(--color-border));
}
.cube-ingredient--result > img,
.cube-ingredient--result > .cube-ingredient__placeholder {
  width: 42px;
  height: 48px;
}
.cube-ingredient--result > .cube-ingredient__placeholder {
  display: grid;
  place-items: center;
  font-size: 18px;
}
.cube-ingredient--crafted {
  --result-color: #ffa800;
  --result-background: #2b2116;
  --result-border: #72501f;
}
.cube-ingredient--rare {
  --result-color: #ffff64;
  --result-background: #272715;
  --result-border: #60602c;
}
.cube-ingredient--magic {
  --result-color: #8f8fff;
  --result-background: #191925;
  --result-border: #48486e;
}
.cube-ingredient--unique {
  --result-color: #c7b377;
  --result-background: #252219;
  --result-border: #645a3c;
}
@container (max-width: 380px) {
  .cube-formula__items {
    grid-template-columns: repeat(var(--ingredient-columns-small), minmax(0, 1fr));
  }
  .cube-formula__items > .cube-ingredient:last-child:nth-child(odd):not(:first-child) {
    grid-column: 1 / -1;
  }
}
</style>
