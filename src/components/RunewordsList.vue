<template>
  <div class="runewords-list">
    <div
      v-for="item in words.gridFilteredRunewords"
      :key="item.id"
      class="runewords-list__item"
    >
      <RuneWordCard :runeword="item" @select="$emit('select', item)" />
    </div>
  </div>
</template>
<script setup lang="ts">
import RuneWordCard from "@/components/RuneWordCard.vue";
import { useRunewordsStore } from "@/store";
import type { RunewordTableItem } from "@/types";
const words = useRunewordsStore();
defineEmits<{ (e: "select", item: RunewordTableItem): void }>();
</script>
<style scoped lang="scss">
.runewords-list {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
  width: 100%;
}
.runewords-list__item {
  position: relative;
  display: flex;
  min-width: 0;
  background: var(--color-panel);
  border: 1px var(--border-style) var(--color-border);
  border-radius: 5px;
}
.runewords-list__item :deep(.runeword) {
  display: flex;
  flex-direction: column;
}
.runewords-list__item :deep(.item-stats) {
  flex: 1;
}
.runewords-list__item:hover {
  background: #232d36;
  border-color: #668393;
}
@media (min-width: 820px) {
  .runewords-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1150px) {
  .runewords-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 1500px) {
  .runewords-list {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (min-width: 2200px) {
  .runewords-list {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
@media (min-width: 2800px) {
  .runewords-list {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
@media (min-width: 3400px) {
  .runewords-list {
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
  }
}
</style>
