<template>
  <UiSelect
    class="planner-mercenary-select"
    dropdown-class="planner-select-dropdown planner-class-dropdown planner-mercenary-dropdown"
    :model-value="modelValue"
    :options="mercenaries.map((m) => ({ value: m.value, label: t(m.ru, m.en) }))"
    :aria-label="label"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #value="{ label: selectedLabel }">
      <PlannerMercenaryIdentity :type="modelValue" :label="selectedLabel" />
    </template>
    <template #option="{ option }">
      <PlannerMercenaryIdentity :type="option.value" :label="option.label" />
    </template>
  </UiSelect>
</template>
<script setup lang="ts">
import UiSelect from "@/components/ui/UiSelect.vue";
import PlannerMercenaryIdentity from "./PlannerMercenaryIdentity.vue";
import { useText } from "@/composables/useText";
import { mercenaries } from "@/shared/planner";

defineProps<{ modelValue: string; label: string }>();
defineEmits<{ "update:modelValue": [value: string] }>();
const t = useText();
</script>
