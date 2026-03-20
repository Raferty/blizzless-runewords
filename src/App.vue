<template>
  <TheHeader />
  <main class="main">
    <div class="main__container container">
      <aside class="aside">
        <div class="aside__container">
          <RuneList @select="(e: number[]) => runewordsStore.setSelectedRunes(e)" />
        </div>
      </aside>
      <section class="wrapper">
        <div class="wrapper__container">
          <SearchInput
            v-model="search"
            :placeholder="store.interface.search.placeholder[store.currentLang]"
          />

          <div class="wrapper__meta">
            <div class="filters">
              <FilterSockets v-model="socketsFilter" />
              <FilterReworked v-model="reworkedFilter" />
              <FilterNew v-model="newFilter" />
            </div>

            <div class="switcher">
              <button
                class="switcher__button"
                :class="{ 'switcher__button--active': view === 'table' }"
                @click="view = 'table'"
              >
                Table
              </button>
              <button
                class="switcher__button"
                :class="{ 'switcher__button--active': view === 'grid' }"
                @click="view = 'grid'"
              >
                Grid
              </button>
            </div>
          </div>

          <RunewordsTable v-if="view === 'table'" />

          <RunewordsList v-if="view === 'grid'" />

          <Hints />
        </div>
      </section>
    </div>
  </main>
  <TheFooter />

  <UiModal :model-value="currentCard" :closable="true" @close="currentCard = false">
    <RuneWordCard :runeword="currentRuneWord" :show-old="true" />
  </UiModal>

  <Tooltip
    :show="tooltipShow"
    :item="tooltipItem"
    :left="tooltipLeft"
    :top="tooltipTop"
    title-id="runeword-dialog-title"
    @close="handleTooltipClose"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { useDebouncedRef } from "@/composables/useDebouncedRef";
import TheHeader from "@/components/TheHeader.vue";
import TheFooter from "@/components/TheFooter.vue";
import RuneList from "@/components/RuneList.vue";
import RunewordsList from "@/components/RunewordsList.vue";
import RuneWordCard from "@/components/RuneWordCard.vue";
import UiModal from "@/components/ui/UiModal.vue";
import Tooltip from "@/components/Tooltip.vue";
import Hints from "@/components/Hints.vue";
import SearchInput from "@/components/SearchInput.vue";
import FilterSockets from "@/components/FilterSockets.vue";
import FilterReworked from "@/components/FilterReworked.vue";
import FilterNew from "@/components/FilterNew.vue";
import RunewordsTable from "@/components/RunewordsTable.vue";

import { useInfoStore, useRunewordsStore } from "@/store";
import type { RunewordCardItem, RunewordTableItem } from "@/types";

const store = useInfoStore();
const runewordsStore = useRunewordsStore();

const { search, socketsFilter, reworkedFilter, newFilter, filteredRunewords } =
  storeToRefs(runewordsStore);

const debouncedSearch = useDebouncedRef(search, 250);
const view = ref("table");

watch(
  debouncedSearch,
  (value) => {
    runewordsStore.setSearchDebounced(value);
  },
  { immediate: true }
);

const currentCard = ref(false);
const currentRuneWord = computed<RunewordCardItem>(
  () => filteredRunewords.value[0] ?? ({} as RunewordCardItem)
);
const tooltipShow = ref(false);
const tooltipItem = ref<RunewordTableItem | null>(null);
const tooltipLeft = ref(0);
const tooltipTop = ref(0);

const handleTooltipClose = (): void => {
  tooltipShow.value = false;
  tooltipItem.value = null;
};
</script>

<style lang="scss" scoped>
.aside {
  width: 100%;
  margin-bottom: 16px;

  @media (min-width: 1024px) {
    margin-bottom: 0;
    width: 158px;
  }

  &__container {
    position: sticky;
    top: 15px;
    padding-left: 8px;
    padding-right: 8px;

    @media (min-width: 1024px) {
      padding-left: 0;
      padding-right: 0;
    }
  }
}

.main {
  padding-left: 8px;
  padding-right: 8px;

  @media (min-width: 1024px) {
    padding-left: 16px;
    padding-right: 16px;
  }

  &__container {
    display: flex;
    gap: 16px;

    @media (min-width: 1024px) {
      flex-direction: row;
    }
  }
}

.wrapper {
  flex: 1;
  min-width: 0;

  &__container {
    @media (min-width: 1024px) {
      //margin-left: 32px;
    }
  }

  &__meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }
}

.filters {
  gap: 12px;
  display: flex;
}

.switcher {
  display: flex;
  gap: 4px;

  &__button {
    font-size: 14px;
    line-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 90px;
    height: 24px;
    color: var(--color-text-inverse);
    background-color: var(--color-notfound);
    border: 1px solid var(--color-notfound);
    cursor: pointer;
    border-radius: 4px;

    &--active {
      background-color: var(--color-success-alt);
      border-color: var(--color-success-alt);
    }
  }
}
</style>
