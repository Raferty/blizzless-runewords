import { computed } from "vue";
import { usePlannerStore } from "@/store/planner";
import { buildStats } from "@/utils/planner";
import { itemRequirements } from "@/utils/planner-item-requirements";
import { usePlannerGameData } from "./usePlannerGameData";
import type { PlannerItem } from "@/types/planner";

export function useItemRequirements() {
  const store = usePlannerStore();
  const native = usePlannerGameData();
  const stats = computed(() => buildStats(store.build, native.value));
  return (item?: PlannerItem) => {
    if (!item) return undefined;
    const { attributes, itemBonuses } = stats.value;
    const own = itemBonuses.get(item);
    return itemRequirements(
      native.value,
      item,
      store.build.classId,
      {
        ...attributes,
        strength: attributes.strength - (own?.strength ?? 0),
        dexterity: attributes.dexterity - (own?.dexterity ?? 0),
      },
      store.build.level
    );
  };
}
