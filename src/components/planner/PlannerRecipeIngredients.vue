<template>
  <div v-if="variants.length" class="planner-recipe-add">
    <button type="button" :disabled="loading" @click="open">
      {{
        loading
          ? t("Загрузка…", "Loading…")
          : t("Добавить ингредиенты", "Add ingredients")
      }}
    </button>
    <p v-if="!visible && message" role="status">{{ message }}</p>
    <UiModal
      :model-value="visible"
      closable
      :label="t('Ингредиенты рецепта', 'Recipe ingredients')"
      @close="visible = false"
    >
      <div class="planner-recipe-add__dialog">
        <div class="planner-recipe-add__heading">
          <h3>{{ recipe.name[info.currentLang] || recipe.name.en }}</h3>
          <button
            type="button"
            :aria-label="t('Закрыть', 'Close')"
            @click="visible = false"
          >
            <UiIcon name="close" />
          </button>
        </div>
        <p>
          {{ t("В сундук билда", "Into the stash of") }} «{{
            store.build.name || store.character.name[info.currentLang]
          }}»
        </p>
        <label v-if="variants.length > 1" class="planner-label">
          {{ t("Вариант рецепта", "Recipe variant") }}
          <UiSelect
            :model-value="variantIndex"
            :options="variantOptions"
            :aria-label="t('Вариант рецепта', 'Recipe variant')"
            @update:model-value="selectVariant(Number($event))"
          />
        </label>
        <ul v-if="variant && native" class="planner-recipe-add__list">
          <li v-for="(part, index) in variant.parts" :key="index">
            <img
              v-if="baseItemImage(codes[index])"
              :src="baseUrl + baseItemImage(codes[index])"
              alt=""
            />
            <div>
              <span
                >{{ part.count }} ×
                {{
                  part.quality === "magic"
                    ? t("Магический предмет", "Magic item")
                    : t("Предмет", "Item")
                }}<template v-if="part.ethereal">
                  · {{ t("Эфирный", "Ethereal") }}</template
                ></span
              >
              <UiSelect
                v-if="part.codes.length > 1"
                v-model="codes[index]"
                :options="partOptions(part)"
                :aria-label="t('Ингредиент', 'Ingredient') + ' ' + (index + 1)"
              />
              <strong v-else>{{ itemName(codes[index]) }}</strong>
            </div>
          </li>
        </ul>
        <p v-if="!fits" role="status">
          {{
            t(
              "В сундуке недостаточно свободного места для всех ингредиентов.",
              "There is not enough room in the stash for all ingredients."
            )
          }}
        </p>
        <p v-if="message" role="status">{{ message }}</p>
        <button type="button" :disabled="!fits" @click="add">
          {{ t("Добавить в сундук", "Add to stash") }} · {{ items.length }}
        </button>
      </div>
    </UiModal>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, shallowRef } from "vue";
import UiModal from "@/components/ui/UiModal.vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import UiIcon from "@/components/ui/UiIcon.vue";
import { useInfoStore } from "@/store";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
import type { GameSaveExporter } from "@/utils/planner-game-save";
import {
  recipeInputs,
  createRecipeIngredients,
  type RecipeInput,
} from "@/utils/planner-supplies";
import { stageStashItems } from "@/utils/planner-stash";
import { baseItemImage } from "@/utils/planner-item-art";
import type { CubeRecipe } from "@/types/cube";

const props = defineProps<{
  recipe: CubeRecipe;
  baseCode?: string;
  ethereal?: boolean;
}>();
const t = useText();
const info = useInfoStore();
const store = usePlannerStore();
const baseUrl = import.meta.env.BASE_URL;
const native = shallowRef<GameSaveExporter>();
const loading = ref(false);
const visible = ref(false);
const message = ref("");
const variantIndex = ref(0);
const codes = ref<string[]>([]);
const variants = computed(() =>
  (recipeInputs[props.recipe.key] ?? [])
    .map((row, index) => ({ ...row, index }))
    .filter(
      (row) =>
        !props.baseCode ||
        (row.parts[0].codes.includes(props.baseCode) &&
          row.outputEthereal === !!props.ethereal)
    )
);
const variant = computed(() =>
  variants.value.find((row) => row.index === variantIndex.value)
);
function itemName(code: string) {
  const base = native.value?.gd.items[code];
  return base ? native.value?.gd.locale.strings[base.namestr] || base.name : code;
}
function partOptions(part: RecipeInput) {
  return part.codes
    .map((value) => ({ value, label: itemName(value) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
const variantOptions = computed(() =>
  variants.value.map((row) => ({
    value: row.index,
    label: `${row.parts[0].ethereal ? t("Эфирная основа", "Ethereal base") : t("Обычная основа", "Non-ethereal base")} · ${
      row.parts
        .slice(1)
        .map((part) => `${part.count} × ${itemName(part.codes[0])}`)
        .join(" + ") || itemName(row.parts[0].codes[0])
    }`,
  }))
);
function selectVariant(index: number) {
  variantIndex.value = index;
  codes.value =
    variant.value?.parts.map((part) =>
      props.baseCode && part.codes.includes(props.baseCode)
        ? props.baseCode
        : [...part.codes].sort(
            (a, b) =>
              (native.value?.gd.items[a].levelreq || 0) -
                (native.value?.gd.items[b].levelreq || 0) ||
              itemName(a).localeCompare(itemName(b))
          )[0]
    ) ?? [];
  message.value = "";
}
const items = computed(() =>
  native.value &&
  variant.value &&
  codes.value.every((code, i) => variant.value!.parts[i].codes.includes(code)) &&
  codes.value.length === variant.value.parts.length
    ? createRecipeIngredients(
        native.value,
        props.recipe.key,
        variantIndex.value,
        codes.value
      )
    : []
);
const fits = computed(() => !!stageStashItems(store.build, items.value));
async function open() {
  loading.value = true;
  message.value = "";
  try {
    native.value = await (
      await import("@/utils/planner-game-save")
    ).loadGameSaveExporter();
    selectVariant(variants.value[0].index);
    visible.value = true;
  } catch {
    message.value = t("Не удалось загрузить ингредиенты.", "Could not load ingredients.");
  } finally {
    loading.value = false;
  }
}
function add() {
  if (!store.addStashItems(items.value)) return;
  message.value = t(
    `Добавлено предметов: ${items.value.length}.`,
    `Added ${items.value.length} items.`
  );
}
</script>
<style scoped lang="scss">
.planner-recipe-add {
  margin-top: 12px;
}
.planner-recipe-add button {
  padding: 9px 12px;
  color: var(--color-title);
  cursor: pointer;
  background: var(--color-panel);
  border: 1px var(--border-style) var(--color-border);
  border-radius: 4px;
}
.planner-recipe-add button:disabled {
  cursor: default;
  opacity: 0.45;
}
.planner-recipe-add__dialog {
  display: grid;
  gap: 16px;
  padding: 20px;
}
.planner-recipe-add__heading {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
.planner-recipe-add__heading h3 {
  color: var(--color-title);
}
.planner-recipe-add__list {
  display: grid;
  gap: 14px;
  padding: 0;
  list-style: none;
}
.planner-recipe-add__list li {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
}
.planner-recipe-add__list img {
  width: 40px;
  height: 48px;
  object-fit: contain;
}
.planner-recipe-add__list li > div {
  display: grid;
  flex: 1;
  gap: 5px;
  min-width: 0;
}
.planner-recipe-add__list span {
  font-size: 12px;
  color: var(--color-muted);
}
</style>
