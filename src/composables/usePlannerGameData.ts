import { onMounted, shallowRef } from "vue";
import type { GameSaveExporter } from "@/utils/planner-game-save";

const native = shallowRef<GameSaveExporter>();
let loading: Promise<void> | undefined;

export function usePlannerGameData() {
  onMounted(() => {
    if (!native.value)
      loading ??= import("@/utils/planner-game-save")
        .then((module) => module.loadGameSaveExporter())
        .then((value) => {
          native.value = value;
        })
        .catch(() => {
          loading = undefined;
        });
  });
  return native;
}
