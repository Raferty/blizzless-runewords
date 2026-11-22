<template>
  <button type="button" :disabled="materialsEmpty" @click="setAllMaterials(0)">
    {{ t("Очистить панель", "Clear panel") }}
  </button>
  <button
    type="button"
    :disabled="materialsFull"
    @click="setAllMaterials(materialSlotLimit)"
  >
    {{ t("Заполнить панель", "Fill panel") }}
  </button>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useText } from "@/composables/useText";
import { usePlannerStore } from "@/store/planner";
import { materialSlotLimit } from "@/shared/planner";
import slots from "@/shared/planner-material-slots.json";
const t = useText();
const store = usePlannerStore();
const materialsEmpty = computed(() =>
  slots.every(({ code }) => store.build.materials[code] === 0)
);
const materialsFull = computed(() =>
  slots.every(({ code }) => store.build.materials[code] === materialSlotLimit)
);
function setAllMaterials(count: number) {
  store.build.materials = Object.fromEntries(slots.map(({ code }) => [code, count]));
}
</script>
