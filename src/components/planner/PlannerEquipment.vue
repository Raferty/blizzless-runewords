<template>
  <div class="planner-equipment-column">
    <section
      class="planner-panel planner-equipment-panel"
      :aria-label="t('Экипировка', 'Equipment')"
    >
      <div class="planner-equipment-art">
        <div
          v-for="side in ['left', 'right']"
          :key="side"
          class="planner-weapon-tabs"
          :class="`planner-weapon-tabs--${side}`"
        >
          <button
            v-for="set in [0, 1] as const"
            :key="set"
            :aria-pressed="store.build.weaponSet === set"
            :aria-label="`${t('Комплект оружия', 'Weapon set')} ${set + 1} · ${side}`"
            @click="store.build.weaponSet = set"
          >
            {{ set === 0 ? "I" : "II" }}
          </button>
        </div>
        <PlannerItemSlot
          v-for="slot in equipmentSlots"
          :key="slot.key"
          class="planner-gear-slot"
          :class="{
            'planner-gear-slot--equipped': itemAt(slot.key),
            'planner-gear-slot--warning': requiredLevelAt(slot.key) > store.build.level,
          }"
          :style="paperdollStyle(slot.key)"
          :item="itemAt(slot.key)"
          :capacity="paperdollCapacity[slot.key]"
          :equipment-slot="slot.key"
          :aria-label="`${t(slot.ru, slot.en)}: ${itemAt(slot.key)?.name || t('пусто, выбрать предмет', 'empty, choose an item')}`"
          @click="$emit('equip', activeSlot(slot.key))"
          @remove="removeEquipment(slot.key)"
        />
        <div
          class="planner-charm-grid"
          :aria-label="t('Инвентарь, 10 на 4', 'Inventory, 10 by 4')"
          @dragover="over"
          @dragleave="leave"
          @drop="drop"
        >
          <button
            v-for="cell in emptyCells"
            :key="`cell-${cell}`"
            class="planner-charm-cell"
            :style="{ gridColumn: (cell % 10) + 1, gridRow: Math.floor(cell / 10) + 1 }"
            :aria-label="`${t('Добавить предмет в ячейку', 'Add inventory item at cell')} ${cell + 1}`"
            @click="$emit('charm', cell)"
          />
          <PlannerItemSlot
            v-for="charm in store.build.charms"
            :key="charm.id"
            class="planner-charm-item"
            :class="{
              'planner-item-dragging': isSource({ owner: 'inventory', id: charm.id }),
            }"
            draggable="true"
            :style="{
              gridColumn: `${(charm.position % 10) + 1} / span ${inventoryWidth(charm)}`,
              gridRow: `${Math.floor(charm.position / 10) + 1} / span ${charm.height}`,
            }"
            :item="charm"
            :capacity="[inventoryWidth(charm), charm.height]"
            :fallback-base="`cm${charm.height}`"
            compact
            :aria-label="charm.name"
            @click="$emit('charm', charm.position, charm.id)"
            @remove="removeCharm(charm.id)"
            @dragstart="start($event, { owner: 'inventory', id: charm.id })"
            @dragend="end"
          />
          <div
            v-if="preview"
            class="planner-drop-preview"
            :class="{ 'planner-drop-preview--invalid': !preview.valid }"
            :style="previewStyle"
            aria-hidden="true"
          />
        </div>
      </div>
      <div class="planner-gold">
        <label>
          <span>{{ t("Золото", "Gold") }}</span>
          <input
            :value="store.build.gold ?? 0"
            type="number"
            inputmode="numeric"
            min="0"
            :max="maxGold"
            step="1"
            :title="`${t('Максимум', 'Maximum')}: ${maxGold.toLocaleString()}`"
            @change="setGold"
          />
        </label>
        <button
          type="button"
          :disabled="store.build.gold === maxGold"
          @click="store.build.gold = maxGold"
        >
          {{ t("Максимум", "Max Gold") }}
        </button>
      </div>
    </section>
    <slot />
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import PlannerItemSlot from "./PlannerItemSlot.vue";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
import { equipmentSlots } from "@/shared/planner";
import { paperdollCapacity, paperdollStyle } from "@/shared/planner-art";
import type { EquipmentSlot } from "@/types/planner";
import { itemRequiredLevel } from "@/utils/planner-sockets";
import { goldCapacity, inventoryWidth, inventoryCells } from "@/utils/planner";
import { usePlannerItemDrag } from "@/composables/usePlannerItemDrag";
defineEmits<{
  equip: [slot: EquipmentSlot];
  charm: [position: number, id?: string];
}>();
const store = usePlannerStore();
const t = useText();
const maxGold = computed(() => goldCapacity(store.build.level));
function setGold(event: Event) {
  const input = event.target as HTMLInputElement;
  const value = input.valueAsNumber;
  store.build.gold = Number.isFinite(value)
    ? Math.max(0, Math.min(maxGold.value, Math.trunc(value)))
    : 0;
  input.value = String(store.build.gold);
}
const { start, end, over, leave, drop, preview, previewStyle, isSource } =
  usePlannerItemDrag("inventory");
const activeSlot = (key: EquipmentSlot): EquipmentSlot =>
  store.build.weaponSet && key === "mainHand"
    ? "swapMain"
    : store.build.weaponSet && key === "offHand"
      ? "swapOff"
      : key;
const itemAt = (key: EquipmentSlot) => store.build.equipment[activeSlot(key)];
const requiredLevelAt = (key: EquipmentSlot) => {
  const item = itemAt(key);
  return item ? itemRequiredLevel(item) : 0;
};
function removeEquipment(key: EquipmentSlot) {
  delete store.build.equipment[activeSlot(key)];
}
function removeCharm(id: string) {
  store.build.charms = store.build.charms.filter((charm) => charm.id !== id);
}
const emptyCells = computed(() => {
  const occupied = new Set(store.build.charms.flatMap(inventoryCells));
  return Array.from({ length: 40 }, (_, i) => i).filter((i) => !occupied.has(i));
});
</script>
<style scoped lang="scss">
@use "../../assets/planner-controls" as controls;

.planner-gold {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px;
  border-top: 1px solid #292929;
  label {
    display: flex;
    flex: 1;
    gap: 6px;
    align-items: center;
    min-width: 120px;
  }
  span {
    color: #c7b377;
  }
  input {
    @include controls.field;
    width: 100%;
    min-width: 64px;
    font-variant-numeric: tabular-nums;
    color: var(--color-text);
    text-align: center;
    background: #0c0c0c;
    border: 1px solid #383838;
  }
  button {
    flex-shrink: 0;
  }
}
</style>
