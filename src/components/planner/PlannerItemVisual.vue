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
          :x="socketLayout.positions[index].x - socketImageSize(rune) / 2"
          :y="socketLayout.positions[index].y - socketImageSize(rune) / 2"
          :width="socketImageSize(rune)"
          :height="socketImageSize(rune)"
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
import { socketCategory } from "@/utils/planner-sockets";
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
const equipmentRuneword = computed(
  () => !!props.equipmentSlot && props.item.quality === "runeword"
);
const size = computed(() =>
  equipmentRuneword.value
    ? props.capacity
    : plannerItemDimensions(props.item) ||
      plannerItemDimensions(fallback.value) ||
      props.capacity
);
const imageStyle = computed(() => {
  return {
    width: `${Math.min(size.value[0] / props.capacity[0], 1) * 100}%`,
    height: `${Math.min(size.value[1] / props.capacity[1], 1) * 100}%`,
  };
});
const verticalItemSockets = computed(() => {
  const itemSize = plannerItemDimensions(props.item);
  return (
    sockets.value.length === 4 &&
    ["weapon", "shield"].includes(socketCategory(props.item)) &&
    itemSize?.[1] === 4 &&
    itemSize[0] <= 2
  );
});
const socketLayout = computed(() => {
  const width = size.value[0] * 100;
  const height = size.value[1] * 100;
  const count = sockets.value.length;
  const itemSize = plannerItemDimensions(props.item);
  const smallShieldTriangle =
    count === 3 &&
    socketCategory(props.item) === "shield" &&
    itemSize?.[0] === 2 &&
    itemSize[1] === 2;
  if (smallShieldTriangle) {
    // Square shields keep two inserts above one centred below, including in
    // the stash. Centre the triangle on the artwork in a tall equipment slot.
    const shieldHeight = Math.min(width, height);
    const top = (height - shieldHeight) / 2;
    const filledSize = Math.min(84, width * 0.38, shieldHeight * 0.38);
    return {
      viewBox: `0 0 ${width} ${height}`,
      radius: filledSize * 0.46,
      filledSize,
      positions: [
        { x: width * 0.28, y: top + shieldHeight * 0.3 },
        { x: width * 0.72, y: top + shieldHeight * 0.3 },
        { x: width * 0.5, y: top + shieldHeight * 0.7 },
      ],
    };
  }
  const compactShield =
    socketCategory(props.item) === "shield" &&
    props.equipmentSlot === "offHand" &&
    !verticalItemSockets.value &&
    count >= 3 &&
    count <= 4;
  const compactWeapon =
    count === 4 && socketCategory(props.item) === "weapon" && itemSize?.[1] === 3;
  if (compactShield || compactWeapon) {
    // D2 keeps shield inserts clustered over the centre of the shield instead
    // of placing them against the corners of the paperdoll slot.
    const positions =
      count === 3
        ? [
            { x: width * 0.5, y: height * 0.33 },
            { x: width * 0.29, y: height * 0.67 },
            { x: width * 0.71, y: height * 0.67 },
          ]
        : [
            { x: width * 0.28, y: height * 0.36 },
            { x: width * 0.72, y: height * 0.36 },
            { x: width * 0.28, y: height * 0.64 },
            { x: width * 0.72, y: height * 0.64 },
          ];
    const filledSize = Math.min(90, width * 0.42, height * 0.23);
    return {
      viewBox: `0 0 ${width} ${height}`,
      radius: filledSize * 0.46,
      filledSize,
      positions,
    };
  }
  const helmetTriangle = props.equipmentSlot === "head" && count === 3;
  // Four sockets on tall weapons and shields follow a vertical line in every view.
  const columns =
    verticalItemSockets.value
      ? 1
      : count > 3 || helmetTriangle
        ? 2
        : 1;
  const rows = Math.max(1, Math.ceil(count / columns));
  const columnWidth = (width * 0.88) / columns;
  const rowHeight = (height * 0.9) / rows;
  const radius = Math.min(40, columnWidth * 0.43, rowHeight * 0.43);
  // Equipment runewords use the slot's space; other inserts keep inventory scale.
  const filledSize = Math.min(
    equipmentRuneword.value ? 140 : 90,
    columnWidth * 0.94,
    rowHeight * 0.94
  );
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
// Headgear uses the rune scale for every insert, in equipment and in the stash.
const helmetSockets = computed(() => {
  const itemSize = plannerItemDimensions(props.item);
  return (
    props.equipmentSlot === "head" ||
    (socketCategory(props.item) === "helm" && itemSize?.[0] === 2 && itemSize[1] === 2)
  );
});
// Keep jewels compact on the other item shapes.
const socketImageSize = (socket: (typeof sockets.value)[number] | undefined) => {
  if (helmetSockets.value || !socket || !("group" in socket))
    return socketLayout.value.filledSize;
  if (socket.group === "jewel") return socketLayout.value.filledSize * 0.75;
  const compactFacetShield =
    socket.group === "facet" &&
    socketCategory(props.item) === "shield" &&
    props.equipmentSlot === "offHand" &&
    !verticalItemSockets.value &&
    sockets.value.length >= 3 &&
    sockets.value.length <= 4;
  return compactFacetShield
    ? socketLayout.value.filledSize * 1.6
    : socket.group === "facet"
      ? socketLayout.value.filledSize * 0.65
      : socketLayout.value.filledSize;
};
</script>
