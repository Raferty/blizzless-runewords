import { computed, onBeforeUnmount, ref, shallowRef, watch } from "vue";
import { usePlannerStore } from "@/store/planner";
import type { PlannerBuild, PlannerItem } from "@/types/planner";
import {
  canMoveItem,
  inventoryItemSize,
  moveItem,
  sourceItem,
  type ItemSource,
  type ItemDestination,
} from "@/utils/planner-item-movement";
import { plannerItemDimensions } from "@/utils/planner-item-art";
import { stashSize } from "@/utils/planner-stash";

const dragging = shallowRef<{
  build: PlannerBuild;
  item: PlannerItem;
  source: ItemSource;
  size: [number, number];
  offset: [number, number];
}>();
export const plannerItemDragging = computed(() => !!dragging.value);

export function usePlannerItemDrag(owner: ItemDestination["owner"]) {
  const store = usePlannerStore();
  const grid = owner === "inventory" ? { columns: 10, rows: 4 } : stashSize;
  const preview = ref<{ x: number; y: number; valid: boolean }>();
  const active = computed(() => {
    const session = dragging.value;
    return session &&
      session.build === store.build &&
      sourceItem(store.build, session.source) === session.item
      ? session
      : undefined;
  });
  function start(event: DragEvent, source: ItemSource) {
    const item = sourceItem(store.build, source);
    const size = item && (plannerItemDimensions(item) ?? inventoryItemSize(item));
    if (!item || !size || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    dragging.value = {
      build: store.build,
      item,
      source,
      size,
      offset: [
        Math.max(
          0,
          Math.min(
            size[0] - 1,
            Math.floor(((event.clientX - rect.left) / rect.width) * size[0])
          )
        ),
        Math.max(
          0,
          Math.min(
            size[1] - 1,
            Math.floor(((event.clientY - rect.top) / rect.height) * size[1])
          )
        ),
      ],
    };
    event.dataTransfer.effectAllowed = "move";
    // A marker for native drag support; only our in-memory session can move items.
    event.dataTransfer.setData("application/x-blizzless-item", "item");
  }
  function end() {
    dragging.value = undefined;
    preview.value = undefined;
  }
  function locate(event: DragEvent) {
    const session = active.value;
    if (!session) return;
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const x =
      Math.floor(
        ((event.clientX - rect.left - element.clientLeft) / element.clientWidth) *
          grid.columns
      ) - session.offset[0];
    const y =
      Math.floor(
        ((event.clientY - rect.top - element.clientTop) / element.clientHeight) *
          grid.rows
      ) - session.offset[1];
    const inside =
      x >= 0 &&
      y >= 0 &&
      x + session.size[0] <= grid.columns &&
      y + session.size[1] <= grid.rows;
    return {
      x,
      y,
      valid:
        inside &&
        canMoveItem(store.build, session.source, {
          owner,
          position: y * grid.columns + x,
        }),
    };
  }
  function over(event: DragEvent) {
    if (!active.value) return;
    event.preventDefault();
    preview.value = locate(event);
    if (event.dataTransfer)
      event.dataTransfer.dropEffect = preview.value?.valid ? "move" : "none";
  }
  function leave(event: DragEvent) {
    if (
      !(event.relatedTarget instanceof Node) ||
      !(event.currentTarget as HTMLElement).contains(event.relatedTarget)
    )
      preview.value = undefined;
  }
  function drop(event: DragEvent) {
    if (!active.value) return;
    event.preventDefault();
    const position = locate(event);
    if (position?.valid)
      moveItem(store.build, active.value.source, {
        owner,
        position: position.y * grid.columns + position.x,
      });
    end();
  }
  const previewStyle = computed(() => {
    if (!preview.value || !active.value) return undefined;
    const { x, y } = preview.value;
    const [width, height] = active.value.size;
    // Clip the invalid preview to the grid so it never covers surrounding UI.
    return {
      left: `${(Math.max(0, x) / grid.columns) * 100}%`,
      top: `${(Math.max(0, y) / grid.rows) * 100}%`,
      width: `${(Math.max(0, Math.min(grid.columns, x + width) - Math.max(0, x)) / grid.columns) * 100}%`,
      height: `${(Math.max(0, Math.min(grid.rows, y + height) - Math.max(0, y)) / grid.rows) * 100}%`,
    };
  });
  const isSource = (source: ItemSource) => {
    const current = active.value?.source;
    return (
      current?.owner === source.owner &&
      (source.owner === "inventory"
        ? (current as Extract<ItemSource, { owner: "inventory" }>).id === source.id
        : (current as Extract<ItemSource, { owner: "stash" }>).index === source.index)
    );
  };
  watch(active, (value) => {
    if (!value) preview.value = undefined;
  });
  onBeforeUnmount(end);
  return { start, end, over, leave, drop, preview, previewStyle, isSource };
}
