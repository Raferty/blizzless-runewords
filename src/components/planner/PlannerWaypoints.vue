<template>
  <PlannerPanel
    v-model:open="open"
    class="planner-waypoints"
    :title="t('Вейпоинты', 'Waypoints')"
    :aria-label="t('Вейпоинты', 'Waypoints')"
  >
    <template #actions>
      <button type="button" @click="setAll(true)">
        {{ t("Отметить все", "Mark all") }}
      </button>
      <button type="button" @click="setAll(false)">
        {{ t("Снять все", "Unmark all") }}
      </button>
    </template>
    <p class="planner-muted planner-waypoints-count">
      {{ t("Открыто", "Unlocked") }} {{ total }} /
      {{ waypoints.length * difficulties.length }}
    </p>
    <div class="planner-quest-table">
      <div class="planner-quest-row planner-quest-row--heading">
        <span>{{ t("Вейпоинт", "Waypoint") }}</span>
        <span v-for="difficulty in difficulties" :key="difficulty.value">
          {{ t(difficulty.ru, difficulty.en) }}
        </span>
      </div>
      <section v-for="act in waypointActs" :key="act.act" class="planner-waypoint-act">
        <h4>{{ t("Акт", "Act") }} {{ act.act }}</h4>
        <div
          v-for="waypoint in act.waypoints"
          :key="waypoint.key"
          class="planner-quest-row"
        >
          <span>{{ t(waypoint.ru, waypoint.en) }}</span>
          <label v-for="difficulty in difficulties" :key="difficulty.value">
            <input
              v-model="store.build.waypoints[difficulty.value][waypoint.key]"
              type="checkbox"
              :aria-label="`${t(waypoint.ru, waypoint.en)} · ${t(difficulty.ru, difficulty.en)}`"
            />
          </label>
        </div>
      </section>
    </div>
  </PlannerPanel>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import PlannerPanel from "./PlannerPanel.vue";
import { useText } from "@/composables/useText";
import { usePlannerStore } from "@/store/planner";
import { difficulties } from "@/shared/planner";
import { waypointActs, waypoints } from "@/shared/planner-waypoints";
import type { Difficulty } from "@/types/planner";

const t = useText();
const store = usePlannerStore();
const open = ref(false);
const count = (difficulty: Difficulty) =>
  waypoints.filter(({ key }) => store.build.waypoints[difficulty][key]).length;
const total = computed(() =>
  difficulties.reduce((sum, { value }) => sum + count(value), 0)
);
function setAll(checked: boolean) {
  for (const { value } of difficulties)
    for (const { key } of waypoints) store.build.waypoints[value][key] = checked;
}
</script>

<style scoped lang="scss">
.planner-waypoints {
  min-width: 0;
  .planner-waypoints-count {
    padding: 4px 12px 8px;
    font-size: 12px;
  }
  .planner-quest-row {
    > span:first-child {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    label {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 28px;
      cursor: pointer;
    }
    input {
      margin: 0;
    }
  }
}
.planner-waypoint-act {
  h4 {
    margin: 16px 0 4px;
    font-size: 12px;
    color: #c5bb83;
    text-transform: uppercase;
  }
}
</style>
