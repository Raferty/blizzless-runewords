import { computed } from "vue";
import { usePlannerStore } from "@/store/planner";
import { buildStats } from "@/utils/planner";
import { itemRequirements } from "@/utils/planner-item-requirements";
import { usePlannerGameData } from "./usePlannerGameData";
import type { PlannerItem } from "@/types/planner";

export function useItemRequirements() {
  const store = usePlannerStore();
  const native = usePlannerGameData();
  const attributes = computed(() => buildStats(store.build).attributes);
  return (item?: PlannerItem) =>
    item
      ? itemRequirements(
          native.value,
          item,
          store.build.classId,
          attributes.value,
          store.build.level
        )
      : undefined;
}
