import { computed, onMounted, onBeforeUnmount, shallowRef } from "vue";
import { usePlannerStore } from "@/store/planner";
import { buildStats } from "@/utils/planner";
import { itemRequirements } from "@/utils/planner-item-requirements";
import type { GameSaveExporter } from "@/utils/planner-game-save";
import type { PlannerItem } from "@/types/planner";

export function useItemRequirements() {
  const store = usePlannerStore();
  const native = shallowRef<GameSaveExporter>();
  const attributes = computed(() => buildStats(store.build).attributes);
  let disposed = false;
  onMounted(async () => {
    try {
      const value = await (
        await import("@/utils/planner-game-save")
      ).loadGameSaveExporter();
      if (!disposed) native.value = value;
    } catch {
      // Level warnings still work while the native requirement tables are unavailable.
    }
  });
  onBeforeUnmount(() => {
    disposed = true;
  });
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
