<template>
  <svg
    class="planner-tree-branches"
    viewBox="0 0 740 1046"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <svg
      v-for="(part, index) in [...art.arrows, ...art.sockets]"
      :key="index"
      :x="part.x"
      :y="part.y"
      :width="part.width"
      :height="part.height"
      :viewBox="part.viewBox"
      preserveAspectRatio="none"
    >
      <image :href="`${base}${part.image}`" width="740" height="1046" />
    </svg>
  </svg>
</template>
<script setup lang="ts">
import type { NativeSkillTreeArtwork } from "@/utils/planner-native-skill-art";

defineProps<{ art: NativeSkillTreeArtwork }>();
const base = import.meta.env.BASE_URL;
</script>
