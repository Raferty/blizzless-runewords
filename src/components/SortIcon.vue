<template>
  <svg
    width="0.5em"
    height="1em"
    viewBox="0 0 256 512"
    class="ux-icon ux-icon--fw sort-icon"
  >
    <!-- Arrow up (asc) -->
    <path
      v-if="direction === 'asc'"
      d="M88 166.059V468c0 6.627 5.373 12 12 12h56c6.627 0 12-5.373 12-12V166.059h46.059c21.382 0 32.09-25.851 16.971-40.971l-86.059-86.059c-9.373-9.373-24.569-9.373-33.941 0L41.941 125.088c-15.119 15.119-4.411 40.971 16.971 40.971H88z"
      fill="currentColor"
    />
    <!-- Arrow down (desc) -->
    <path
      v-else
      d="M168 345.941V44c0-6.627-5.373-12-12-12h-56c-6.627 0-12 5.373-12 12v301.941H41.941c-21.382 0-32.09 25.851-16.971 40.971l86.059 86.059c9.373 9.373 24.569 9.373 33.941 0l86.059-86.059c15.119-15.119 4.411-40.971-16.971-40.971H168z"
      fill="currentColor"
    />
  </svg>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    direction?: "asc" | "desc";
  }>(),
  { direction: "desc" }
);
</script>
