<template>
  <section class="planner-waypoints" :aria-label="t('Вейпоинты', 'Waypoints')">
    <div class="planner-waypoints-toolbar">
      <span class="planner-muted">
        {{ t("Открыто", "Unlocked") }} {{ total }} /
        {{ waypoints.length * difficulties.length }}
      </span>
      <div>
        <button type="button" @click="setAll(true)">
          {{ t("Отметить все", "Mark all") }}
        </button>
        <button type="button" @click="setAll(false)">
          {{ t("Снять все", "Unmark all") }}
        </button>
      </div>
    </div>
    <PlannerPanel
      v-for="difficulty in difficulties"
      :key="difficulty.value"
      v-model:open="expanded[difficulty.value]"
      :title="t(difficulty.ru, difficulty.en)"
    >
      <template #actions>
        <span class="planner-waypoints-count"
          >{{ count(difficulty.value) }} / {{ waypoints.length }}</span
        >
      </template>
      <div class="planner-waypoint-acts">
        <section v-for="act in waypointActs" :key="act.act" class="planner-waypoint-act">
          <h4>{{ t("Акт", "Act") }} {{ act.act }}</h4>
          <label
            v-for="waypoint in act.waypoints"
            :key="waypoint.key"
            class="planner-waypoint"
          >
            <input
              v-model="store.build.waypoints[difficulty.value][waypoint.key]"
              type="checkbox"
              :aria-label="`${t(waypoint.ru, waypoint.en)} · ${t(difficulty.ru, difficulty.en)}`"
            />
            <span>{{ t(waypoint.ru, waypoint.en) }}</span>
          </label>
        </section>
      </div>
    </PlannerPanel>
  </section>
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
const expanded = ref({ normal: true, nightmare: false, hell: false });
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
  display: grid;
  gap: 8px;
  min-width: 0;
}
.planner-waypoints-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
  > div {
    display: flex;
    gap: 6px;
  }
}
.planner-waypoints-count {
  padding-right: 8px;
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}
.planner-waypoint-acts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 155px), 1fr));
  gap: 8px;
  align-items: start;
  padding: 0 10px 10px;
}
.planner-waypoint-act {
  min-width: 0;
  padding: 8px;
  background: #0c0c0c;
  border: 1px solid #242424;
  border-radius: 5px;
  h4 {
    margin: 0 0 6px;
    font-size: 12px;
    text-transform: uppercase;
  }
}
.planner-waypoint {
  display: flex;
  gap: 7px;
  align-items: center;
  min-height: 40px;
  padding: 5px 2px;
  font-size: 12px;
  line-height: 1.35;
  cursor: pointer;
  border-radius: 3px;
  &:hover {
    background: #1c1c1c;
  }
  input {
    flex-shrink: 0;
    margin: 0;
  }
  span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
}
</style>
