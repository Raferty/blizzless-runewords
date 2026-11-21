import { onMounted, onBeforeUnmount, shallowRef } from "vue";
import type { GameSaveExporter } from "@/utils/planner-game-save";

export function usePlannerGameData() {
  const native = shallowRef<GameSaveExporter>();
  let disposed = false;
  onMounted(async () => {
    try {
      const value = await (
        await import("@/utils/planner-game-save")
      ).loadGameSaveExporter();
      if (!disposed) native.value = value;
    } catch {
      // Components can render their basic values while game data is unavailable.
    }
  });
  onBeforeUnmount(() => {
    disposed = true;
  });
  return native;
}
