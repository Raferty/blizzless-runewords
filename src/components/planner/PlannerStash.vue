<template>
  <PlannerPanel class="planner-stash-panel" :title="t('Сундук', 'Stash')">
    <template #actions>
      <span class="planner-muted">{{ store.build.stash.length }} / 100</span>
      <button
        :aria-label="t('Управление сундуком', 'Manage stash')"
        @click="$emit('manage')"
      >
        <UiIcon name="arrow-up-right" />
      </button>
      <button
        type="button"
        :disabled="!store.build.stash.length"
        :aria-label="t('Очистить сундук', 'Clear stash')"
        :title="t('Очистить сундук', 'Clear stash')"
        @click="store.build.stash = []"
      >
        <UiIcon name="reset" />
      </button>
    </template>
    <div class="planner-stash-body">
      <div
        class="planner-stash-grid"
        :style="{
          gridTemplateColumns: `repeat(${stashSize.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${stashSize.rows}, minmax(0, 1fr))`,
          aspectRatio: `${stashSize.columns} / ${stashSize.rows}`,
          backgroundSize: `${100 / stashSize.columns}% ${100 / stashSize.rows}%`,
        }"
        :aria-label="t('Личный сундук', 'Personal stash')"
        @dragover="over"
        @dragleave="leave"
        @drop="drop"
      >
        <button
          v-for="cell in layout.emptyCells"
          :key="`cell-${cell}`"
          class="planner-stash-cell"
          :style="{
            gridColumn: (cell % stashSize.columns) + 1,
            gridRow: Math.floor(cell / stashSize.columns) + 1,
          }"
          :aria-disabled="store.build.stash.length >= 100"
          :aria-label="t('Добавить предмет в сундук', 'Add item to stash')"
          tabindex="-1"
          @click="store.build.stash.length < 100 && $emit('edit', -1)"
        />
        <PlannerItemSlot
          v-for="entry in layout.placed"
          :key="entry.index"
          class="planner-stash-slot"
          :class="{
            'planner-item-dragging': isSource({ owner: 'stash', index: entry.index }),
          }"
          draggable="true"
          :style="{
            gridColumn: `${entry.x + 1} / span ${entry.size[0]}`,
            gridRow: `${entry.y + 1} / span ${entry.size[1]}`,
          }"
          :item="entry.item"
          :capacity="entry.size"
          :aria-label="entry.item.name"
          @click="$emit('edit', entry.index)"
          @remove="remove(entry.index)"
          @dragstart="start($event, { owner: 'stash', index: entry.index })"
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
      <template v-if="layout.unplaced.length">
        <p class="planner-help">
          {{
            t(
              "Эти вещи требуют выбора базы или свободного места в сундуке:",
              "These items need a base or more space in the stash:"
            )
          }}
        </p>
        <div
          v-for="entry in layout.unplaced"
          :key="entry.index"
          class="planner-stash-item"
        >
          <button
            class="planner-item-name"
            :data-quality="entry.item.quality"
            @click="$emit('edit', entry.index)"
          >
            {{ entry.item.name }}
          </button>
          <button
            :aria-label="t('Удалить предмет', 'Delete item')"
            @click="remove(entry.index)"
          >
            <UiIcon name="trash" />
          </button>
        </div>
      </template>
      <div class="planner-stash-kits">
        <button
          :disabled="!keySetItems"
          :title="
            keySetItems
              ? t(
                  'Добавить по 3 ключа Hate, Terror и Destruction',
                  'Add 3 keys each of Hate, Terror and Destruction'
                )
              : t('Недостаточно места для 9 ключей', 'Not enough room for 9 keys')
          "
          @click="addKeySet"
        >
          3x3 key set
        </button>
        <button
          :disabled="!ancientsSetItems"
          :title="
            ancientsSetItems
              ? t(
                  'Добавить 5 статуэток для вызова Древних',
                  'Add all 5 statues to summon the Ancients'
                )
              : t('Недостаточно места для 5 статуэток', 'Not enough room for 5 statues')
          "
          @click="addAncientsSet"
        >
          Ancients set
        </button>
        <button
          :disabled="!rejuvenationContainer"
          :title="
            rejuvenationContainer
              ? t(
                  'Добавить контейнер со 100 Full Rejuvenation Potion',
                  'Add a container with 100 Full Rejuvenation Potions'
                )
              : t('В сундуке нет места', 'No room in the stash')
          "
          @click="addRejuvenationContainer"
        >
          {{ t("Добавить реджувы ×100", "Add rejuvs ×100") }}
        </button>
        <button
          v-for="kit in supplyKits"
          :key="kit.id"
          type="button"
          :disabled="!kit.fits"
          :title="
            kit.fits
              ? kit.items.map((item) => item.name).join(' + ')
              : t(
                  'В сундуке нет места для всего набора',
                  'No room for the full set in the stash'
                )
          "
          @click="addSupplyKit(kit.items)"
        >
          {{ t(kit.ru, kit.en) }}
        </button>
      </div>
      <p v-if="supplyMessage" class="planner-help" role="status">{{ supplyMessage }}</p>
      <p class="planner-help">
        {{
          t(
            "При экспорте персонажа эти вещи попадут в личный сундук в игре.",
            "These items go into your personal in-game stash when you export the character."
          )
        }}
      </p>
    </div>
  </PlannerPanel>
</template>
<script setup lang="ts">
import { computed, onMounted, shallowRef, ref } from "vue";
import PlannerPanel from "./PlannerPanel.vue";
import PlannerItemSlot from "./PlannerItemSlot.vue";
import UiIcon from "@/components/ui/UiIcon.vue";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
import { plannerItemDimensions } from "@/utils/planner-item-art";
import {
  createFullRejuvenationContainer,
  createUberKeySet,
  placeStashItem,
  stashSize,
  stageStashItems,
} from "@/utils/planner-stash";
import { stashKits, createStashSupply } from "@/utils/planner-supplies";
import type { GameSaveExporter } from "@/utils/planner-game-save";
import { inventoryItemSize, stashItemLayout } from "@/utils/planner-item-movement";
import { usePlannerItemDrag } from "@/composables/usePlannerItemDrag";
import type { PlannerItem } from "@/types/planner";

defineEmits<{ edit: [index: number]; manage: [] }>();
const store = usePlannerStore();
const t = useText();
const native = shallowRef<GameSaveExporter>();
const supplyMessage = ref("");
onMounted(async () => {
  try {
    native.value = await (
      await import("@/utils/planner-game-save")
    ).loadGameSaveExporter();
  } catch {
    supplyMessage.value = t("Не удалось загрузить наборы.", "Could not load sets.");
  }
});
const supplyKits = computed(() =>
  stashKits.map((kit) => {
    const items = native.value
      ? kit.codes.map((code) => createStashSupply(native.value!, code))
      : [];
    return { ...kit, items, fits: !!stageStashItems(store.build, items) };
  })
);
function addSupplyKit(items: PlannerItem[]) {
  if (store.addStashItems(items))
    supplyMessage.value = t(
      `Добавлено предметов: ${items.length}.`,
      `Added ${items.length} items.`
    );
}
const { start, end, over, leave, drop, preview, previewStyle, isSource } =
  usePlannerItemDrag("stash");
const layout = computed(() => {
  const { occupied, positions } = stashItemLayout(store.build);
  const placed: {
    item: PlannerItem;
    index: number;
    size: [number, number];
    x: number;
    y: number;
  }[] = [];
  const unplaced: { item: PlannerItem; index: number }[] = [];
  store.build.stash.forEach((item, index) => {
    const size = plannerItemDimensions(item) ?? inventoryItemSize(item);
    const position = positions[index];
    if (size && position) placed.push({ item, index, size, ...position });
    else unplaced.push({ item, index });
  });
  const emptyCells = Array.from(
    { length: stashSize.columns * stashSize.rows },
    (_, i) => i
  ).filter((cell) => !occupied.has(cell));
  return { placed, unplaced, emptyCells };
});
const keySetItems = computed(() => {
  if (store.build.stash.length + 9 > 100) return;
  const { occupied } = stashItemLayout(store.build);
  return createUberKeySet(occupied);
});
function addKeySet() {
  if (keySetItems.value) store.build.stash.push(...keySetItems.value);
}
const ancientsSetItems = computed(() => {
  if (store.build.stash.length + 5 > 100) return;
  const { occupied } = stashItemLayout(store.build);
  const items: PlannerItem[] = [];
  // The Colossal Summit recipe consumes ua1–ua5, not their stack containers.
  for (const [baseCode, name] of [
    ["ua1", "Talic's Anguish"],
    ["ua2", "Korlic's Pain"],
    ["ua3", "Madawc's Ire"],
    ["ua4", "Bul-Kathos' Nightmare"],
    ["ua5", "Worusk's End"],
  ]) {
    const position = placeStashItem(occupied, 1, 2);
    if (!position) return;
    items.push({
      name,
      quality: "normal",
      baseCode,
      itemLevel: 99,
      requiredLevel: 1,
      bonuses: {},
      notes: "",
      stashPosition: position.y * stashSize.columns + position.x,
    });
  }
  return items;
});
function addAncientsSet() {
  if (ancientsSetItems.value) store.build.stash.push(...ancientsSetItems.value);
}
const rejuvenationContainer = computed(() => {
  if (store.build.stash.length >= 100) return;
  const { occupied } = stashItemLayout(store.build);
  return createFullRejuvenationContainer(occupied);
});
function addRejuvenationContainer() {
  if (rejuvenationContainer.value) store.build.stash.push(rejuvenationContainer.value);
}
function remove(index: number) {
  store.build.stash.splice(index, 1);
}
</script>
