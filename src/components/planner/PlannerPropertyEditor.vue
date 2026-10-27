<template>
  <div
    class="planner-property-editor"
    :class="{ 'planner-property-editor--runeword': item.quality === 'runeword' }"
  >
    <div v-for="row in rows" :key="row.index" class="planner-property-line">
      <template v-if="row.range">
        <span>{{ row.before }}</span>
        <input
          type="number"
          :value="row.value"
          :min="row.range.min"
          :max="row.range.max"
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
import { propertyRange, itemSkillClass } from "@/utils/planner-properties";
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
  class: [classId: ClassId];
}>();
const t = useText();
const rows = computed(() => {
  const definition = props.native.itemDefinition(props.item) ?? {};
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
