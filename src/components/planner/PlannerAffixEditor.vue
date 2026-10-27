<template>
  <section class="planner-affix-editor" @keydown.esc="escape">
    <header>
      <h3 :data-quality="item.quality">{{ t("Свойства", "Regular Mods") }}</h3>
      <span class="planner-muted"
        >{{ t("Префиксы", "Prefixes") }} {{ counts.prefix }}/{{ limit }} ·
        {{ t("Суффиксы", "Suffixes") }} {{ counts.suffix }}/{{ limit }}</span
      >
    </header>
    <div
      v-for="(selected, index) in item.affixes"
      :key="selected.id"
      class="planner-affix-row"
    >
      <div class="planner-affix-row-heading">
        <span
          >{{ affixById.get(selected.id)!.name }}
          <small>{{
            affixById.get(selected.id)!.kind === "prefix"
              ? t("Префикс", "Prefix")
              : t("Суффикс", "Suffix")
          }}</small></span
        >
        <button
          type="button"
          :aria-label="`${t('Удалить свойство', 'Remove mod')} ${affixById.get(selected.id)!.name}`"
          @click="remove(index)"
        >
          ×
        </button>
      </div>
      <div
        v-for="(mod, modIndex) in affixById.get(selected.id)!.mods"
        :key="modIndex"
        class="planner-affix-value"
      >
        <label :for="`${uid}-${index}-${modIndex}`">{{
          modLines(selected, modIndex).join(" · ")
        }}</label>
        <input
          v-if="mod.variable"
          :id="`${uid}-${index}-${modIndex}`"
          :value="selected.values[modIndex]"
          type="number"
          :min="mod.min"
          :max="mod.max"
          step="1"
          required
          @change="changeValue(index, modIndex, $event)"
        />
        <small v-if="mod.variable">{{ mod.min }}–{{ mod.max }}</small>
      </div>
    </div>
    <button
      ref="trigger"
      type="button"
      class="planner-affix-add"
      :aria-expanded="opened"
      :aria-controls="uid + '-picker'"
      :disabled="counts.prefix >= limit && counts.suffix >= limit"
      @click="toggle"
    >
      {{ t("Добавить свойство", "Add Mod") }}
      <span aria-hidden="true">{{ opened ? "⌃" : "⌄" }}</span>
    </button>
    <div v-if="opened" :id="uid + '-picker'" class="planner-affix-picker">
      <input
        ref="searchInput"
        v-model="search"
        type="search"
        :placeholder="t('Поиск по названию или свойству…', 'Search names or properties…')"
        :aria-label="t('Поиск свойств', 'Search mods')"
      />
      <div class="planner-affix-options">
        <template v-for="kind in ['prefix', 'suffix'] as const" :key="kind">
          <h4 v-if="options.some((a) => a.kind === kind)">
            {{
              kind === "prefix" ? t("Префиксы", "Prefixes") : t("Суффиксы", "Suffixes")
            }}
          </h4>
          <button
            v-for="affix in options.filter((a) => a.kind === kind)"
            :key="affix.id"
            type="button"
            @click="add(affix)"
          >
            <span>{{ rangeLines(affix).join(" · ") }}</span>
            <small
              >{{ affix.name }} · {{ t("Уровень", "Level") }}
              {{ affix.requiredLevel }}</small
            >
          </button>
        </template>
        <p v-if="!options.length" class="planner-muted">
          {{
            t(
              "Нет доступных свойств. Проверьте поиск, уровень и качество вещи.",
              "No available mods. Check the search, item level and quality."
            )
          }}
        </p>
      </div>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, useId } from "vue";
import { bonusFields, plannerClasses } from "@/shared/planner";
import { affixBonuses } from "@/utils/planner-affixes";
import { useText } from "@/composables/useText";
import {
  itemAffixes,
  affixById,
  canAddAffix,
  newAffix,
  affixDefinition,
  type ItemAffix,
} from "@/utils/planner-affixes";
import { definitionPropertyLines } from "@/utils/planner-item-catalog";
import type { GameSaveExporter } from "@/utils/planner-game-save";
import type { PlannerAffix, PlannerItem } from "@/types/planner";
const props = defineProps<{
  item: PlannerItem;
  native: GameSaveExporter;
  characterLevel: number;
}>();
const emit = defineEmits<{ "update:affixes": [value: PlannerAffix[]] }>();
const t = useText();
const uid = useId();
const opened = ref(false),
  search = ref("");
const trigger = ref<HTMLButtonElement>(),
  searchInput = ref<HTMLInputElement>();
const limit = computed(() => (props.item.quality === "magic" ? 1 : 3));
const counts = computed(() => ({
  prefix: (props.item.affixes ?? []).filter((a) => affixById.get(a.id)?.kind === "prefix")
    .length,
  suffix: (props.item.affixes ?? []).filter((a) => affixById.get(a.id)?.kind === "suffix")
    .length,
}));
const lines = (affix: ItemAffix, values?: number[], roll: 0 | 1 = 1) =>
  definitionPropertyLines(
    props.native,
    affixDefinition(affix, values),
    roll,
    props.characterLevel
  );
function rangeLines(affix: ItemAffix) {
  const low = lines(affix, undefined, 0),
    high = lines(affix);
  return high.map((text, i) => (text === low[i] ? text : `${low[i]} → ${text}`));
}
function searchText(affix: ItemAffix) {
  const effects = affixBonuses(
    { ...props.item, affixes: [newAffix(affix)] },
    props.characterLevel
  );
  return [
    affix.name,
    ...rangeLines(affix),
    ...bonusFields
      .filter((field) => effects.bonuses[field.key])
      .flatMap((field) => [field.ru, field.en]),
    ...plannerClasses
      .filter(
        (character) =>
          effects.classBonuses[character.id] ||
          effects.treeBonuses[character.id].some(Boolean)
      )
      .flatMap((character) => [
        character.name.ru,
        character.name.en,
        ...character.trees.flatMap((tree) => [tree.ru, tree.en]),
      ]),
  ].join(" ");
}
const options = computed(() =>
  itemAffixes
    .filter((a) => canAddAffix(a, props.item))
    .filter((a) =>
      searchText(a).toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name) || a.level - b.level)
);
function modLines(selected: PlannerAffix, index: number) {
  const affix = affixById.get(selected.id)!;
  return lines({ ...affix, mods: [affix.mods[index]] }, [selected.values[index]]);
}
function close() {
  opened.value = false;
  nextTick(() => trigger.value?.focus());
}
function toggle() {
  opened.value = !opened.value;
  search.value = "";
  if (opened.value) nextTick(() => searchInput.value?.focus());
}
function escape(event: KeyboardEvent) {
  if (opened.value) {
    event.preventDefault();
    event.stopPropagation();
    close();
  }
}
function add(affix: ItemAffix) {
  if (!canAddAffix(affix, props.item)) return;
  emit("update:affixes", [...(props.item.affixes ?? []), newAffix(affix)]);
  close();
}
function remove(index: number) {
  emit(
    "update:affixes",
    (props.item.affixes ?? []).filter((_, i) => i !== index)
  );
}
function changeValue(index: number, modIndex: number, event: Event) {
  const input = event.target as HTMLInputElement;
  const entries = (props.item.affixes ?? []).map((row) => ({
    ...row,
    values: [...row.values],
  }));
  const mod = affixById.get(entries[index].id)!.mods[modIndex];
  entries[index].values[modIndex] = Math.max(
    mod.min,
    Math.min(mod.max, Math.round(Number(input.value) || mod.min))
  );
  input.value = String(entries[index].values[modIndex]);
  emit("update:affixes", entries);
}
</script>
