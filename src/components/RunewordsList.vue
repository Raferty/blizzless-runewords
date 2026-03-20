<template>
  <div class="runewords-list">
    <div
      v-for="item in gridFilteredRunewords"
      :key="item.id"
      class="runewords-list__item"
    >
      <UiCard :title="item.name[store.currentLang]">
        <RuneWordCard :runeword="item" />
      </UiCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import UiCard from "@/components/ui/UiCard.vue";
import RuneWordCard from "@/components/RuneWordCard.vue";
import { useInfoStore, useRunewordsStore } from "@/store";

const store = useInfoStore();
const runewordsStore = useRunewordsStore();
const { gridFilteredRunewords } = storeToRefs(runewordsStore);
</script>

<style scoped lang="scss">
.runewords-list {
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: 1fr;
  gap: 12px;
  align-items: stretch;

  @media (min-width: 641px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (min-width: 901px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (min-width: 1201px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (min-width: 2561px) {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  &__item {
    min-width: 0;
    display: flex;
  }
}
</style>
