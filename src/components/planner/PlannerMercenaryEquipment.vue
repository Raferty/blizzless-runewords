<template>
  <div v-if="showReset" class="planner-inventory-actions">
    <button
      type="button"
      :disabled="!hasEquipment"
      :aria-label="t('Сбросить экипировку наёмника', 'Reset mercenary equipment')"
      @click="store.build.mercenary.equipment = {}"
    >
      <UiIcon name="reset" /> {{ t("Сбросить экипировку", "Reset equipment") }}
    </button>
  </div>
  <div
    class="planner-equipment-art planner-mercenary-art"
    :aria-label="t('Экипировка наёмника', 'Mercenary equipment')"
  >
    <svg viewBox="0 90 1036 626" class="planner-mercenary-background" aria-hidden="true">
      <image :href="texture" width="1036" height="790" />
    </svg>
    <PlannerItemSlot
      v-for="slot in visibleSlots"
      :key="slot.key"
      class="planner-gear-slot"
      :class="{
        'planner-gear-slot--equipped': store.build.mercenary.equipment[slot.key],
        'planner-gear-slot--warning':
          (store.build.mercenary.equipment[slot.key]?.requiredLevel ?? 0) >
          store.build.mercenary.level,
      }"
      :style="{
        left: (slot.x / 1036) * 100 + '%',
        top: (slot.y / 626) * 100 + '%',
        width: (slot.width / 1036) * 100 + '%',
        height: (slot.height / 626) * 100 + '%',
        '--planner-slot-inset': slotBackgroundInset(slot.width, slot.height, slot.insets),
      }"
      :item="store.build.mercenary.equipment[slot.key]"
      :capacity="paperdollCapacity[slot.key]"
      :equipment-slot="slot.key"
      :aria-label="`${t(slot.ru, slot.en)}: ${store.build.mercenary.equipment[slot.key]?.name || t('пусто, выбрать предмет', 'empty, choose an item')}`"
      @click="$emit('equip', slot.key)"
      @remove="delete store.build.mercenary.equipment[slot.key]"
    />
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
import { paperdollCapacity, slotBackgroundInset } from "@/shared/planner-art";
import { mercenaryUsesOffHand } from "@/shared/planner";
import PlannerItemSlot from "./PlannerItemSlot.vue";
import UiIcon from "@/components/ui/UiIcon.vue";
withDefaults(defineProps<{ showReset?: boolean }>(), { showReset: true });
defineEmits<{ equip: [slot: "head" | "mainHand" | "offHand" | "armor"] }>();
const store = usePlannerStore();
const t = useText();
const hasEquipment = computed(() =>
  Object.values(store.build.mercenary.equipment).some(Boolean)
);
const texture = import.meta.env.BASE_URL + "images/planner/mercenary.webp";
const slots = [
  {
    key: "head",
    ru: "Шлем",
    en: "Helm",
    x: 402,
    y: 30,
    width: 232,
    height: 230,
    insets: [18, 17, 17, 18],
  },
  {
    key: "mainHand",
    ru: "Оружие",
    en: "Weapon",
    x: 28,
    y: 174,
    width: 230,
    height: 430,
    insets: [24, 18, 22, 20],
  },
  {
    key: "armor",
    ru: "Доспех",
    en: "Body armor",
    x: 403,
    y: 269,
    width: 232,
    height: 333,
    insets: [20, 18, 19, 17],
  },
  {
    key: "offHand",
    ru: "Левая рука",
    en: "Off-hand",
    x: 776,
    y: 174,
    width: 230,
    height: 430,
    insets: [24, 20, 22, 18],
  },
] as const;
const visibleSlots = computed(() =>
  slots.filter(
    (slot) =>
      slot.key !== "offHand" ||
      mercenaryUsesOffHand(store.build.mercenary.type) ||
      store.build.mercenary.equipment.offHand
  )
);
</script>
