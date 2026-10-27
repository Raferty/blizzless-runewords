<template>
  <PlannerPanel class="planner-mercenary-panel" :title="t('Наёмник', 'Mercenary')">
    <template #actions>
      <button
        :aria-label="t('Настроить наёмника', 'Configure mercenary')"
        @click="$emit('configure')"
      >
        ↗
      </button>
    </template>
    <div class="planner-mercenary-controls">
      <UiSelect
        dropdown-class="planner-select-dropdown"
        :model-value="store.build.mercenary.type"
        :options="mercenaries.map((m) => ({ value: m.value, label: t(m.ru, m.en) }))"
        :aria-label="t('Тип наёмника', 'Mercenary type')"
        @update:model-value="$emit('type', $event)"
      /><input
        :value="store.build.mercenary.level"
        type="number"
        min="1"
        :max="store.mercenaryLevelLimit"
        :aria-label="t('Уровень наёмника', 'Mercenary level')"
        :title="
          t(
            'Не выше уровня персонажа; общий предел — 98.',
            'Cannot exceed character level; maximum level is 98.'
          )
        "
        @change="setMercLevel"
      />
    </div>
    <slot />
  </PlannerPanel>
</template>
<script setup lang="ts">
import PlannerPanel from "./PlannerPanel.vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
import { mercenaries } from "@/shared/planner";
defineEmits<{ configure: []; type: [value: string] }>();
const store = usePlannerStore();
const t = useText();
function setMercLevel(event: Event) {
  const input = event.target as HTMLInputElement;
  store.setMercenaryLevel(Number(input.value));
  input.value = String(store.build.mercenary.level);
}
</script>
