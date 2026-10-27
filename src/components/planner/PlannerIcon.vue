<template>
  <svg
    viewBox="0 0 48 48"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name] ?? paths.spark" />
  </svg>
</template>
<script setup lang="ts">
defineProps<{ name: string }>();
const paths: Record<string, string> = {
  sigil:
    "M24 3 45 19 37 43H11L3 19 24 3Zm0 5v32M8 20l32 16M40 20 8 36M14 12l20 27M34 12 14 39",
  bow: "M13 5c23 6 23 32 0 38l7-19-7-19Zm7 19h22m-7-6 7 6-7 6M12 24H6",
  spark: "m27 3-5 16H10l11 9-4 17 20-24H25l2-18ZM7 8l4 4m27 24 4 4M6 37l5-5m27-21 4-4",
  skull:
    "M12 29c-4-3-6-8-4-14C13 1 36 3 40 17c1 6-2 10-5 12v9H13v-9Zm5 2v12m7-12v12m7-12v12M14 20l7 3-7 2v-5Zm20 0-7 3 7 2v-5ZM24 26l-2 4h4l-2-4Z",
  shield: "m24 4 16 7v13c0 10-16 20-16 20S8 34 8 24V11L24 4Zm0 7v25M14 20h20",
  axes: "M9 6 39 42M39 6 9 42M13 6 4 17l9 7 7-12-7-6ZM35 6l9 11-9 7-7-12 7-6Z",
  leaf: "M8 40 34 14M9 32C2 10 25 6 41 6c0 18-8 38-27 30M21 26V15m1 11h12",
  claw: "M8 8 20 35l5 7 1-10L8 8Zm14-4 9 28 5 7 1-10L22 4Zm13 2 6 21 4 7 1-9L35 6Z",
  helm: "M8 35V22a16 16 0 0 1 32 0v13l-10 6V26H18v15L8 35Zm16-29v14M8 22l10 4m22-4-10 4",
  amulet: "M10 6c-1 13 4 24 14 24S39 19 38 6M24 25l9 10-9 10-9-10 9-10Zm0 8v4",
  sword: "m10 38 5-5m0 0 22-27 5 1-1 6-26 25-5-5Zm-7-7 14 14M6 42l4-4",
  armor: "m16 7-10 9 7 8v18h22V24l7-8-10-9c-1 9-15 9-16 0Zm-3 17 11 6 11-6M24 30v12",
  gloves:
    "M15 21V8a3 3 0 0 1 6 0v12-15a3 3 0 0 1 6 0v15-12a3 3 0 0 1 6 0v14-9a3 3 0 0 1 6 0v16l-6 14H17L8 27a3 3 0 0 1 5-3l4 5",
  belt: "M5 17h38v16H5V17Zm14-4h12v24H19V13Zm5 12h10M9 22v6m5-6v6",
  boots: "M16 5h17v23l9 7v7H9V31l7-6V5Zm0 8h17M9 36h33",
  ring: "M13 20a15 15 0 1 0 22 0M16 10l8-7 8 7-8 12-8-12Zm0 0h16m-8-7v19",
  charm: "m24 5 12 11-3 22-9 6-9-6-3-22L24 5Zm0 9 6 8-6 14-6-14 6-8Z",
};
</script>
