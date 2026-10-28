<template>
  <div
    class="planner-property-editor"
    :class="{ 'planner-property-editor--runeword': item.quality === 'runeword' }"
  >
    <div v-for="row in rows" :key="row.index" class="planner-property-line">
      <UiSelect
        v-if="row.options.length"
        class="planner-property-choice"
        dropdown-class="planner-select-dropdown"
        :model-value="String(item.propertyChoices?.[row.index] ?? row.options[0].value)"
        :options="row.options"
        :aria-label="t('Вариант бонуса', 'Bonus variant')"
        @update:model-value="
          emit('choices', { ...item.propertyChoices, [row.index]: Number($event) })
        "
      />
      <template v-if="row.range">
        <span>{{ row.before }}</span>
        <input
          type="number"
          :value="row.value"
          :min="row.range.min"
          :max="row.range.max"
          :style="{
            '--property-digits': Math.max(
              String(row.range.min).length,
              String(row.range.max).length
            ),
          }"
          step="1"
          required
          :aria-label="row.label"
          :title="`${row.range.min}–${row.range.max}`"
          @change="change(row.index, $event, row.range)"
        />
        <span>{{ row.after }}</span>
        <small>{{ row.range.min }}–{{ row.range.max }}</small>
      </template>
      <template v-else>{{ row.label }}</template>
      <UiSelect
        v-if="row.classSkill"
        class="planner-property-class"
        dropdown-class="planner-select-dropdown"
        :model-value="itemSkillClass(item, characterClass)"
        :options="
          plannerClasses.map((c) => ({ value: c.id, label: t(c.name.ru, c.name.en) }))
        "
        :aria-label="t('Класс для бонуса навыков', 'Class skill bonus')"
        @update:model-value="$emit('class', $event as ClassId)"
      />
    </div>
    <p v-for="(line, index) in socketLines" :key="`socket-${index}`">{{ line }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import { useText } from "@/composables/useText";
import { plannerClasses } from "@/shared/planner";
import {
  definitionPropertyLines,
  socketPropertyLines,
} from "@/utils/planner-item-catalog";
import {
  propertyRange,
  itemSkillClass,
  propertyGroupOptions,
  resolvePropertyGroups,
} from "@/utils/planner-properties";
import { socketCategory } from "@/utils/planner-sockets";
import type { GameSaveExporter } from "@/utils/planner-game-save";
import type { ClassId, PlannerItem } from "@/types/planner";

const props = defineProps<{
  item: PlannerItem;
  native: GameSaveExporter;
  characterLevel: number;
  characterClass: ClassId;
}>();
const emit = defineEmits<{
  values: [values: Record<string, number>];
  choices: [choices: Record<string, number>];
  class: [classId: ClassId];
}>();
const t = useText();
const rows = computed(() => {
  const raw = props.native.itemDefinition(props.item) ?? {};
  const definition = resolvePropertyGroups(
    raw,
    props.native.gd.propertyGroups,
    props.item.propertyChoices
  );
  return Array.from({ length: 12 }, (_, n) => {
    const index = n + 1;
    const property = props.native.gd.properties[String(definition[`prop${index}`] ?? "")];
    if (!property) return [];
    const range = propertyRange(definition, property, index);
    const value =
      props.item.propertyValues?.[index] ??
      Number(definition[`${props.item.propertyRoll ? "max" : "min"}${index}`] ?? 0);
    const single: Record<string, unknown> = {
      prop1: definition[`prop${index}`],
      par1: definition[`par${index}`],
      min1: range ? value : definition[`min${index}`],
      max1: range ? value : definition[`max${index}`],
    };
    const label = definitionPropertyLines(
      props.native,
      single,
      props.item.propertyRoll ?? 0,
      props.characterLevel,
      {},
      itemSkillClass(props.item, props.characterClass)
    ).join(" · ");
    if (!label) return [];
    // Replace the numeric value in the rendered property; fixed damage endpoints
    // and chance-to-cast parameters never become editable roll fields.
    const offset = range ? label.indexOf(String(value)) : -1;
    return [
      {
        index,
        value,
        label,
        range: offset >= 0 ? range : undefined,
        before: offset >= 0 ? label.slice(0, offset) : "",
        after: offset >= 0 ? label.slice(offset + String(value).length) : "",
        classSkill: property.func1 === 36,
        options: propertyGroupOptions(
          props.native.gd.propertyGroups?.[String(raw[`prop${index}`])]
        ).map((choice) => ({
          value: String(choice),
          label: definitionPropertyLines(
            props.native,
            {
              prop1: raw[`prop${index}`],
            },
            1,
            props.characterLevel,
            {},
            props.characterClass,
            { 1: choice }
          ).join(" · "),
        })),
      },
    ];
  }).flat();
});
const socketLines = computed(() =>
  props.native
    .itemRunes(props.item)
    .flatMap((code) =>
      socketPropertyLines(
        props.native,
        code,
        socketCategory(props.item),
        props.characterLevel
      )
    )
);
function change(index: number, event: Event, range: { min: number; max: number }) {
  const input = event.target as HTMLInputElement;
  const value = Math.max(
    range.min,
    Math.min(range.max, Math.round(Number(input.value) || range.min))
  );
  input.value = String(value);
  emit("values", { ...props.item.propertyValues, [index]: value });
}
</script>
