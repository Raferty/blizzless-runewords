<template>
  <PlannerPanel class="planner-mercenary-panel" :title="t('Наёмник', 'Mercenary')">
    <template #actions>
      <button
        :aria-label="t('Настроить наёмника', 'Configure mercenary')"
        @click="$emit('configure')"
      >
        <UiIcon name="arrow-up-right" />
      </button>
      <button
        v-if="store.build.mercenary.type !== 'none'"
        type="button"
        :disabled="!hasEquipment"
        :aria-label="t('Сбросить экипировку наёмника', 'Reset mercenary equipment')"
        :title="t('Сбросить экипировку', 'Reset equipment')"
        @click="store.build.mercenary.equipment = {}"
      >
        <UiIcon name="reset" />
      </button>
    </template>
    <div class="planner-mercenary-controls">
      <PlannerMercenarySelect
        :model-value="store.build.mercenary.type"
        :label="t('Тип наёмника', 'Mercenary type')"
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
import { computed } from "vue";
import PlannerPanel from "./PlannerPanel.vue";
import PlannerMercenarySelect from "./PlannerMercenarySelect.vue";
import UiIcon from "@/components/ui/UiIcon.vue";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
defineEmits<{ configure: []; type: [value: string] }>();
const store = usePlannerStore();
const t = useText();
const hasEquipment = computed(() =>
  Object.values(store.build.mercenary.equipment).some(Boolean)
);
function setMercLevel(event: Event) {
  const input = event.target as HTMLInputElement;
  store.setMercenaryLevel(Number(input.value));
  input.value = String(store.build.mercenary.level);
}
</script>
