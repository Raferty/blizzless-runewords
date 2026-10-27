<template>
  <Teleport to="body">
    <div
      :id="id"
      ref="menu"
      role="menu"
      tabindex="-1"
      :aria-label="`${t('Действия с предметом', 'Item actions')}: ${name}`"
      class="planner-item-context-menu"
      :style="position"
      @contextmenu.prevent
      @keydown="keydown"
    >
      <button type="button" role="menuitem" tabindex="-1" @click="$emit('edit', $event)">
        {{ t("Редактировать", "Edit") }}
      </button>
      <button
        type="button"
        role="menuitem"
        tabindex="-1"
        class="planner-danger"
        @click="$emit('remove')"
      >
        {{ t("Удалить", "Delete") }}
      </button>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type CSSProperties,
} from "vue";
import { useText } from "@/composables/useText";

const props = defineProps<{ id: string; name: string; x: number; y: number }>();
const emit = defineEmits<{
  edit: [event: MouseEvent];
  remove: [];
  close: [restoreFocus: boolean];
}>();
const t = useText();
const menu = ref<HTMLElement>();
const position = ref<CSSProperties>({ left: "0px", top: "0px", visibility: "hidden" });
function place() {
  if (!menu.value) return;
  const { width, height } = menu.value.getBoundingClientRect();
  position.value = {
    left: `${Math.max(8, Math.min(props.x, innerWidth - width - 8))}px`,
    top: `${Math.max(8, Math.min(props.y, innerHeight - height - 8))}px`,
    visibility: "visible",
  };
}
function keydown(event: KeyboardEvent) {
  const buttons = Array.from(
    menu.value?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []
  );
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
  let next: number;
  if (event.key === "ArrowDown") next = (current + 1) % buttons.length;
  else if (event.key === "ArrowUp")
    next = current <= 0 ? buttons.length - 1 : current - 1;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = buttons.length - 1;
  else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    emit("close", true);
    return;
  } else if (event.key === "Tab") {
    emit("close", true);
    return;
  } else return;
  event.preventDefault();
  buttons[next]?.focus({ preventScroll: true });
}
function outside(event: Event) {
  if (!(event.target instanceof Node) || !menu.value?.contains(event.target))
    emit("close", false);
}
function close() {
  emit("close", false);
}
function escape(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  emit("close", true);
}
watch(
  () => [props.x, props.y],
  () => nextTick(place)
);
onMounted(async () => {
  place();
  window.addEventListener("pointerdown", outside, true);
  window.addEventListener("scroll", close, true);
  window.addEventListener("resize", close);
  window.addEventListener("keydown", escape);
  await nextTick();
  menu.value
    ?.querySelector<HTMLButtonElement>('[role="menuitem"]')
    ?.focus({ preventScroll: true });
});
onBeforeUnmount(() => {
  window.removeEventListener("pointerdown", outside, true);
  window.removeEventListener("scroll", close, true);
  window.removeEventListener("resize", close);
  window.removeEventListener("keydown", escape);
});
</script>
