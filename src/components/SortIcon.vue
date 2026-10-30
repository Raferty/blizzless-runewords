<template>
  <UiIcon
    :name="direction === 'asc' ? 'arrow-up' : 'arrow-down'"
    :size="12"
    class="sort-icon"
  />
</template>
<script setup lang="ts">
import UiIcon from "@/components/ui/UiIcon.vue";
withDefaults(defineProps<{ direction?: "asc" | "desc" }>(), { direction: "desc" });
</script>
