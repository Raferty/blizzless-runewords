<template>
  <svg
    class="ui-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle v-if="name === 'search'" cx="11" cy="11" r="8" />
    <path :d="paths[name]" />
  </svg>
</template>
<script setup lang="ts">
withDefaults(
  defineProps<{
    name:
      | "search"
      | "reset"
      | "arrow-up-right"
      | "refresh"
      | "edit"
      | "close"
      | "check"
      | "star"
      | "arrow-up"
      | "arrow-down"
      | "chevron-up"
      | "chevron-down"
      | "plus"
      | "minus"
      | "quests"
      | "diamond"
      | "copy"
      | "trash";
    size?: number;
    filled?: boolean;
  }>(),
  { size: 16, filled: false }
);
const paths = {
  search: "m21 21-4.35-4.35",
  reset: "M3 3v5h5M3 12a9 9 0 1 0 2.64-6.36L3 8",
  "arrow-up-right": "M7 17 17 7M7 7h10v10",
  refresh:
    "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  edit: "m16 3 5 5M4 20l4-1L21 6a2.12 2.12 0 0 0-3-3L3 18l1 2Z",
  close: "M18 6 6 18M6 6l12 12",
  check: "m5 12 4 4L19 6",
  star: "m12 3 2.78 5.63L21 9.54l-4.5 4.39L17.56 21 12 18.08 6.44 21l1.06-7.07L3 9.54l6.22-.91L12 3Z",
  "arrow-up": "M12 20V4m-6 6 6-6 6 6",
  "arrow-down": "M12 4v16m-6-6 6 6 6-6",
  "chevron-up": "m6 15 6-6 6 6",
  "chevron-down": "m6 9 6 6 6-6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  quests: "M9 5H5v16h14V5h-4M9 3h6v4H9V3Zm-1 9 1 1 2-2m2 1h3m-8 5 1 1 2-2m2 1h3",
  diamond: "m12 3 9 9-9 9-9-9 9-9Z",
  copy: "M9 9h12v12H9V9ZM5 15H3V3h12v2",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
};
</script>
<style scoped>
.ui-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
  pointer-events: none;
}
</style>
