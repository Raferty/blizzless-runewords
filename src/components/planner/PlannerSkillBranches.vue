<template>
  <svg
    v-if="art.adaptation"
    class="planner-tree-branches"
    viewBox="0 0 740 1046"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs v-if="preservedRegions.length">
      <clipPath :id="clipId">
        <rect v-for="(region, index) in preservedRegions" :key="index" v-bind="region" />
      </clipPath>
    </defs>
    <image
      :href="source"
      width="740"
      height="1046"
      :clip-path="preservedRegions.length ? `url(#${clipId})` : undefined"
    />
    <!-- Reuse native sockets and arrows at the positions from the Blizzless tree. -->
    <svg
      v-for="(patch, index) in patches"
      :key="index"
      v-bind="patch"
      preserveAspectRatio="none"
    >
      <image :href="source" width="740" height="1046" />
    </svg>
  </svg>
  <img v-else class="planner-tree-branches" :src="source" alt="" />
</template>
<script setup lang="ts">
import { computed, useId } from "vue";
import type { WowheadTreeArtwork } from "@/utils/planner-skill-art";

const props = defineProps<{ art: WowheadTreeArtwork }>();
const source = computed(() => `${import.meta.env.BASE_URL}${props.art.image}`);
const clipId = `skill-branches-${useId().replace(/[^a-z0-9]/gi, "")}`;
const preservedRegions = computed(() => {
  switch (props.art.adaptation) {
    case "necromancer-curses":
      return [
        { x: 0, y: 0, width: 740, height: 690 },
        { x: 216, y: 690, width: 524, height: 356 },
      ];
    case "druid-summoning":
      return [
        { x: 0, y: 0, width: 520, height: 1046 },
        { x: 520, y: 0, width: 220, height: 154 },
        { x: 520, y: 720, width: 220, height: 154 },
      ];
    default:
      return [];
  }
});
const patches = computed(() => {
  switch (props.art.adaptation) {
    case "necromancer-curses":
      return [
        { x: 0, y: 690, width: 150, height: 206, viewBox: "0 332 150 206" },
        { x: 0, y: 900, width: 216, height: 146, viewBox: "0 720 216 146" },
      ];
    case "druid-summoning":
      // Stretch only the shaft; keep the native arrowhead at its original size.
      return [
        { x: 520, y: 154, width: 150, height: 526, viewBox: "520 154 150 166" },
        { x: 520, y: 680, width: 150, height: 38, viewBox: "520 320 150 38" },
      ];
    case "druid-shapeshifting":
      return [
        { x: 520, y: 870, width: 150, height: 28, viewBox: "0 510 150 28" },
        { x: 520, y: 900, width: 216, height: 146, viewBox: "0 900 216 146" },
      ];
    default:
      return [];
  }
});
</script>
