<template>
  <button
    ref="trigger"
    :aria-describedby="open && item ? uid : undefined"
    :aria-haspopup="item ? 'menu' : undefined"
    :aria-expanded="item ? menuOpen : undefined"
    :aria-controls="menuOpen ? `${uid}-menu` : undefined"
    @pointerenter="enter"
    @pointerleave="leave"
    @focus="focus"
    @blur="close"
    @click="click"
    @contextmenu="contextmenu"
    @keydown="slotKeydown"
  >
    <PlannerItemVisual
      v-if="item"
      :item="item"
      :capacity="capacity"
      :equipment-slot="equipmentSlot"
      :fallback-base="fallbackBase"
      :compact="compact"
      :show-sockets="open || menuOpen"
    />
    <PlannerItemContextMenu
      v-if="menuOpen && item"
      :id="`${uid}-menu`"
      :name="item.name"
      :x="menuPoint.x"
      :y="menuPoint.y"
      @edit="editFromMenu"
      @remove="removeFromMenu"
      @close="closeMenu"
    />
    <PlannerItemTooltip
      v-if="open && item"
      :id="uid"
      :item="item"
      :anchor="anchor"
      @pointerenter="keep"
      @pointerleave="leave"
    />
  </button>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, useId, watch } from "vue";
import type { EquipmentSlot, PlannerItem } from "@/types/planner";
import PlannerItemVisual from "./PlannerItemVisual.vue";
import PlannerItemTooltip from "./PlannerItemTooltip.vue";
import PlannerItemContextMenu from "./PlannerItemContextMenu.vue";
import { plannerItemDragging } from "@/composables/usePlannerItemDrag";

const props = defineProps<{
  item?: PlannerItem;
  capacity: readonly [number, number];
  equipmentSlot?: EquipmentSlot;
  fallbackBase?: string;
  compact?: boolean;
}>();
const emit = defineEmits<{ click: [event: MouseEvent]; remove: [] }>();
const uid = useId();
const trigger = ref<HTMLButtonElement>();
const menuOpen = ref(false);
const menuPoint = ref({ x: 0, y: 0 });
let restoringFocus = false;
const open = ref(false);
const anchor = ref({ left: 0, right: 0, top: 0, bottom: 0 });
let timer: ReturnType<typeof setTimeout> | undefined;
function keep() {
  clearTimeout(timer);
}
function close() {
  keep();
  open.value = false;
}
function show(target: HTMLElement) {
  if (!props.item || menuOpen.value || plannerItemDragging.value) return;
  keep();
  const { left, right, top, bottom } = target.getBoundingClientRect();
  anchor.value = { left, right, top, bottom };
  open.value = true;
}
function enter(event: PointerEvent) {
  if (event.pointerType !== "touch") show(event.currentTarget as HTMLElement);
}
function focus(event: FocusEvent) {
  if (menuOpen.value || restoringFocus) return;
  const target = event.currentTarget as HTMLElement;
  if (target.matches(":focus-visible"))
    requestAnimationFrame(() => {
      if (target.isConnected && document.activeElement === target && !menuOpen.value)
        show(target);
    });
}
function leave() {
  keep();
  timer = setTimeout(close, 100);
}
function click(event: MouseEvent) {
  if (event.button > 0 || plannerItemDragging.value) return;
  close();
  closeMenu();
  emit("click", event);
}
function contextmenu(event: MouseEvent) {
  if (!props.item) return;
  event.preventDefault();
  close();
  const rect = trigger.value!.getBoundingClientRect();
  menuPoint.value =
    event.clientX || event.clientY
      ? { x: event.clientX, y: event.clientY }
      : { x: rect.left, y: rect.bottom };
  menuOpen.value = true;
}
function slotKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") close();
  if (
    props.item &&
    (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))
  ) {
    event.preventDefault();
    close();
    const rect = trigger.value!.getBoundingClientRect();
    menuPoint.value = { x: rect.left, y: rect.bottom };
    menuOpen.value = true;
  }
}
function closeMenu(restoreFocus = false) {
  menuOpen.value = false;
  if (restoreFocus && trigger.value?.isConnected) {
    restoringFocus = true;
    trigger.value.focus({ preventScroll: true });
    restoringFocus = false;
  }
}
function editFromMenu(event: MouseEvent) {
  closeMenu(true);
  close();
  emit("click", event);
}
function removeFromMenu() {
  closeMenu(true);
  close();
  emit("remove");
}
function scroll(event: Event) {
  if (
    !(event.target instanceof Element) ||
    !event.target.closest(".planner-item-tooltip")
  )
    close();
}
function keydown(event: Event) {
  if (event instanceof KeyboardEvent && event.key === "Escape") close();
}
watch(
  () => props.item,
  () => {
    close();
    closeMenu();
  }
);
watch(plannerItemDragging, (value) => {
  if (value) {
    close();
    closeMenu();
  }
});
watch(open, (value) => {
  const method = value ? "addEventListener" : "removeEventListener";
  window[method]("scroll", scroll, true);
  window[method]("resize", close);
  window[method]("keydown", keydown);
});
onBeforeUnmount(() => {
  keep();
  window.removeEventListener("scroll", scroll, true);
  window.removeEventListener("resize", close);
  window.removeEventListener("keydown", keydown);
});
</script>
