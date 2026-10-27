<template>
  <span v-if="image" class="planner-item-visual" :style="imageStyle">
    <img
      class="planner-item-image"
      :class="{ 'planner-ethereal-image': item.ethereal }"
      :src="base + image"
      alt=""
      draggable="false"
    />
    <svg
      v-if="showSockets && sockets.length"
      class="planner-paperdoll-sockets"
      :viewBox="socketLayout.viewBox"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <g v-for="(rune, index) in sockets" :key="index" class="planner-paperdoll-socket">
        <circle
          v-if="!rune"
          :cx="socketLayout.positions[index].x"
          :cy="socketLayout.positions[index].y"
          :r="socketLayout.radius"
        />
        <image
          v-if="rune"
          :href="base + rune.image_url.slice(1)"
          :x="socketLayout.positions[index].x - socketLayout.filledSize / 2"
          :y="socketLayout.positions[index].y - socketLayout.filledSize / 2"
          :width="socketLayout.filledSize"
          :height="socketLayout.filledSize"
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    </svg>
  </span>
  <span v-else class="planner-item-name" :data-quality="item.quality">{{
    compact ? item.name.slice(0, 2) : item.name
  }}</span>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { plannerItemDimensions, plannerItemImage } from "@/utils/planner-item-art";
import { itemSockets } from "@/utils/planner-item-presentation";
import { useRunewordsStore } from "@/store";
import type { EquipmentSlot, PlannerItem } from "@/types/planner";

const props = defineProps<{
  item: PlannerItem;
  capacity: readonly [number, number];
  equipmentSlot?: EquipmentSlot;
  fallbackBase?: string;
  compact?: boolean;
  showSockets?: boolean;
}>();
const words = useRunewordsStore();
const sockets = computed(() => itemSockets(props.item, words.sortedRunewords));
const base = import.meta.env.BASE_URL;
const fallback = computed(() => ({
  baseCode: props.item.baseCode ? undefined : props.fallbackBase,
  quality: "normal" as const,
}));
const image = computed(
  () => plannerItemImage(props.item) || plannerItemImage(fallback.value)
);
const size = computed(
  () =>
    plannerItemDimensions(props.item) ||
    plannerItemDimensions(fallback.value) ||
    props.capacity
);
const imageStyle = computed(() => {
  return {
    width: `${Math.min(size.value[0] / props.capacity[0], 1) * 100}%`,
    height: `${Math.min(size.value[1] / props.capacity[1], 1) * 100}%`,
  };
});
const socketLayout = computed(() => {
  const width = size.value[0] * 100;
  const height = size.value[1] * 100;
  const count = sockets.value.length;
  const helmetTriangle = props.equipmentSlot === "head" && count === 3;
  const columns = count > 3 || helmetTriangle ? 2 : 1;
  const rows = Math.max(1, Math.ceil(count / columns));
  const columnWidth = (width * 0.88) / columns;
  const rowHeight = (height * 0.9) / rows;
  const radius = Math.min(40, columnWidth * 0.43, rowHeight * 0.43);
  // Filled sockets use almost one inventory cell, independent of the empty hole.
  const filledSize = Math.min(90, columnWidth * 0.94, rowHeight * 0.94);
  const positions = Array.from({ length: count }, (_, index) => {
    if (helmetTriangle && index === 2)
      return { x: width / 2, y: height * 0.05 + rowHeight * 1.5 };
    if (count === 5 && index === 2) return { x: width / 2, y: height / 2 };
    const cell = count === 5 && index > 2 ? index + 1 : index;
    return {
      x: width * 0.06 + ((cell % columns) + 0.5) * columnWidth,
      y: height * 0.05 + (Math.floor(cell / columns) + 0.5) * rowHeight,
    };
  });
  return { viewBox: `0 0 ${width} ${height}`, radius, filledSize, positions };
});
</script>
