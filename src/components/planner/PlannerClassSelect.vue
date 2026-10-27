<template>
  <div class="planner-class-control">
    <UiSelect
      :model-value="store.build.classId"
      :options="plannerClasses.map((c) => ({ value: c.id, label: c.name[lang] }))"
      :aria-label="t('Класс персонажа', 'Character class')"
      dropdown-class="planner-select-dropdown planner-class-dropdown"
      @update:model-value="store.selectClass"
    >
      <template #value="{ label: className }">
        <img
          class="planner-class-portrait"
          :src="`${base}images/planner/classes/${store.build.classId}.png`"
          alt=""
          width="28"
          height="34"
        />
        <span class="planner-class-name">{{ className }}</span>
      </template>
      <template #option="{ option }">
        <span class="planner-class-option">
          <img
            :src="`${base}images/planner/classes/${option.value}.png`"
            alt=""
            width="32"
            height="36"
          />
          <span>{{ option.label }}</span>
        </span>
      </template>
    </UiSelect>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import { usePlannerStore } from "@/store/planner";
import { useInfoStore } from "@/store";
import { useText } from "@/composables/useText";
import { plannerClasses } from "@/shared/planner";
const store = usePlannerStore();
const info = useInfoStore();
const lang = computed(() => info.currentLang);
const t = useText();
const base = import.meta.env.BASE_URL;
</script>
