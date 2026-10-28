<template>
  <section class="planner-panel planner-waypoints" :aria-label="t('Вейпоинты', 'Waypoints')">
    <div class="planner-waypoints-toolbar">
      <div>
        <h3>{{ t("Вейпоинты", "Waypoints") }}</h3>
        <span class="planner-muted">
          {{ t("Открыто", "Unlocked") }} {{ total }} /
          {{ waypoints.length * difficulties.length }}
        </span>
      </div>
      <div class="planner-waypoints-actions">
        <button type="button" @click="setAll(true)">
          {{ t("Отметить все", "Mark all") }}
        </button>
        <button type="button" @click="setAll(false)">
          {{ t("Снять все", "Unmark all") }}
        </button>
      </div>
    </div>
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
          <label
            v-for="difficulty in difficulties"
            :key="difficulty.value"
          >
            <input
              v-model="store.build.waypoints[difficulty.value][waypoint.key]"
              type="checkbox"
              :aria-label="`${t(waypoint.ru, waypoint.en)} · ${t(difficulty.ru, difficulty.en)}`"
            />
          </label>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useText } from "@/composables/useText";
import { usePlannerStore } from "@/store/planner";
import { difficulties } from "@/shared/planner";
import { waypointActs, waypoints } from "@/shared/planner-waypoints";
import type { Difficulty } from "@/types/planner";

const t = useText();
const store = usePlannerStore();
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
  .planner-quest-table {
    margin-top: 12px;
  }
  .planner-quest-row {
    padding: 6px 0;
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
.planner-waypoints-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  h3 {
    margin: 0 0 4px;
    font-size: 14px;
    text-transform: uppercase;
  }
}
.planner-waypoints-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
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
