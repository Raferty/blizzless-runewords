<template>
  <section class="planner-skill-workspace">
    <div
      class="planner-skill-tabs"
      role="tablist"
      :aria-label="t('Навыки и урон', 'Skills and damage')"
    >
      <button
        v-for="(tab, index) in tabs"
        :id="`${uid}-tab-${tab}`"
        :key="tab"
        :ref="
          (element) => {
            buttons[index] = element as HTMLButtonElement;
          }
        "
        role="tab"
        :aria-selected="selected === tab"
        :aria-controls="`${uid}-panel-${tab}`"
        :tabindex="selected === tab ? 0 : -1"
        @click="select(index)"
        @keydown.right.prevent="select((index + 1) % 2, true)"
        @keydown.left.prevent="select((index + 1) % 2, true)"
        @keydown.home.prevent="select(0, true)"
        @keydown.end.prevent="select(1, true)"
      >
        {{
          tab === "tree"
            ? t("Дерево навыков", "Skill tree")
            : t("Расчёты", "Calculations")
        }}
      </button>
    </div>
    <div
      v-for="tab in tabs"
      v-show="selected === tab"
      :id="`${uid}-panel-${tab}`"
      :key="tab"
      role="tabpanel"
      :aria-labelledby="`${uid}-tab-${tab}`"
    >
      <PlannerSkills v-if="tab === 'tree'" />
      <PlannerCalculations v-else-if="calculationsOpened" />
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref, useId } from "vue";
import { useText } from "@/composables/useText";
import PlannerSkills from "./PlannerSkills.vue";
import PlannerCalculations from "./PlannerCalculations.vue";
const t = useText();
const uid = useId();
const tabs = ["tree", "calculations"] as const;
const selected = ref<(typeof tabs)[number]>("tree");
const calculationsOpened = ref(false);
const buttons: HTMLButtonElement[] = [];
function select(index: number, focus = false) {
  selected.value = tabs[index];
  if (selected.value === "calculations") calculationsOpened.value = true;
  if (focus) buttons[index]?.focus();
}
</script>
<style scoped lang="scss">
.planner-skill-workspace {
  min-width: 0;
}
.planner-skill-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 14px;
  border-bottom: 1px solid #383631;
  > button {
    min-height: 48px;
    padding: 12px;
    font-weight: 700;
    color: #999;
    text-transform: uppercase;
    background: #101010;
    border: 1px solid transparent;
    border-radius: 0;
    &[aria-selected="true"] {
      color: #dfcd95;
      background: #1a1916;
      border-color: #383631;
      border-bottom-color: #c0a76b;
    }
  }
}
</style>
