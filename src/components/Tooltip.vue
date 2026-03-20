<template>
  <div
    v-if="modalOpen"
    ref="modalEl"
    class="modal"
    role="dialog"
    aria-modal="true"
    :aria-labelledby="titleId"
    :style="{ left: `${left}px`, top: `${resolvedTop}px` }"
    tabindex="-1"
    @keydown="handleModalKeydown"
    @focusout="handleFocusOut"
  >
    <h3 :id="titleId" class="sr-only">
      {{ item.name[store.currentLang] }}
    </h3>

    <RuneWordCard :runeword="item" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useInfoStore } from "@/store";
import type { RunewordTableItem } from "@/types";
import RuneWordCard from "@/components/RuneWordCard.vue";

defineOptions({ name: "RunewordTooltipPanel" });

const props = defineProps<{
  show: boolean;
  item: RunewordTableItem | null;
  left: number;
  top: number;
  titleId: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const store = useInfoStore();

const modalEl = ref<HTMLElement | null>(null);
defineExpose({ modalEl });

const modalOpen = computed(() => props.show && props.item !== null);
const item = computed(() => props.item as RunewordTableItem);

// Keep the dialog inside the viewport: if there isn't enough space below,
// position it above the cursor/anchor.
const resolvedTop = ref(props.top);
const lastFocusedEl = ref<HTMLElement | null>(null);
const VIEWPORT_PADDING = 12;

const repositionTop = (): void => {
  const el = modalEl.value;
  if (!el) return;

  const height = el.getBoundingClientRect().height;
  if (!height) return;

  const desiredTop = props.top;
  const viewportTop = window.scrollY;
  const viewportBottom = window.scrollY + window.innerHeight;

  const spaceBelow = viewportBottom - desiredTop - VIEWPORT_PADDING;
  if (spaceBelow >= height) {
    resolvedTop.value = desiredTop;
    return;
  }

  const desiredAboveTop = desiredTop - height - VIEWPORT_PADDING;
  const minTop = viewportTop + VIEWPORT_PADDING;
  const maxTop = viewportBottom - height - VIEWPORT_PADDING;

  // Prefer above; clamp to viewport if it's still too tall.
  resolvedTop.value = Math.min(Math.max(desiredAboveTop, minTop), maxTop);
};

let isMounted = true;
let openSeq = 0;
const onReposition = (): void => {
  if (!modalOpen.value) return;
  repositionTop();
};

const handleOutsidePointerDown = (e: PointerEvent): void => {
  if (!modalOpen.value) return;
  const modal = modalEl.value;
  if (!modal) return;

  const target = e.target as Node | null;
  if (target && modal.contains(target)) return;

  // Don't auto-close when the user clicks the tooltip trigger itself.
  const targetNode = target instanceof Element ? target : target?.parentElement;
  const triggerEl = (targetNode as HTMLElement | null)?.closest?.(
    '[data-tooltip-trigger="rune-name"]'
  );
  if (triggerEl) return;

  close();
};

watch(modalOpen, async (isOpen) => {
  if (!isMounted) return;

  if (isOpen) {
    const seq = ++openSeq;
    lastFocusedEl.value = document.activeElement as HTMLElement | null;

    await nextTick();

    // Tooltip might have been closed in-between (e.g. outside click).
    if (!isMounted || !modalOpen.value || openSeq !== seq) return;

    resolvedTop.value = props.top;
    repositionTop();

    modalEl.value?.focus();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, { passive: true });
    window.addEventListener("pointerdown", handleOutsidePointerDown, true);
  } else {
    window.removeEventListener("resize", onReposition);
    window.removeEventListener("scroll", onReposition);
    window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    const el = lastFocusedEl.value;
    if (el && document.contains(el)) {
      el.focus();
    }
  }
});

watch(
  () => props.top,
  async () => {
    if (!modalOpen.value) return;
    await nextTick();
    onReposition();
  }
);

onBeforeUnmount(() => {
  isMounted = false;
  window.removeEventListener("resize", onReposition);
  window.removeEventListener("scroll", onReposition);
  window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
});

const getFocusableElements = (): HTMLElement[] => {
  if (!modalEl.value) return [];

  const selector = [
    'a[href]:not([tabindex="-1"])',
    "button:not([disabled]):not([tabindex='-1'])",
    "input:not([disabled]):not([tabindex='-1'])",
    "select:not([disabled]):not([tabindex='-1'])",
    "textarea:not([disabled]):not([tabindex='-1'])",
    "[tabindex]:not([tabindex='-1'])",
  ].join(",");

  return Array.from(modalEl.value.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
  );
};

const close = (): void => {
  emit("close");
};

const handleFocusOut = (e: FocusEvent): void => {
  // Close when focus leaves the dialog (e.g. click elsewhere).
  const modal = modalEl.value;
  const nextTarget = e.relatedTarget as Node | null;

  if (!modal) return;

  if (nextTarget && modal.contains(nextTarget)) return;

  close();
};

const handleModalKeydown = (e: KeyboardEvent): void => {
  if (!modalOpen.value) return;

  if (e.key === "Escape") {
    e.preventDefault();
    e.stopPropagation();
    close();
    return;
  }

  if (e.key !== "Tab") return;

  const focusables = getFocusableElements();
  if (focusables.length === 0) {
    e.preventDefault();
    modalEl.value?.focus();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const activeEl = document.activeElement as HTMLElement | null;

  if (e.shiftKey) {
    if (activeEl === first || (activeEl && !modalEl.value?.contains(activeEl))) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (activeEl === last || (activeEl && !modalEl.value?.contains(activeEl))) {
      e.preventDefault();
      first.focus();
    }
  }
};
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
