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
              <FilterBlizzles v-model="blizzlessFilter" />
              <FilterROTW v-model="rotwFilter" />
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

          <RunewordsTable
            v-if="view === 'table'"
            @select="openRunewordModal"
            @tooltip-hover="handleTableTooltipHover"
            @tooltip-hover-end="handleTableTooltipHoverEnd"
          />

          <RunewordsList v-if="view === 'grid'" />

          <Hints />
        </div>
      </section>
    </div>
  </main>
  <TheFooter />

  <UiModal :model-value="currentCard" :closable="true" @close="closeRunewordModal">
    <RuneWordCard v-if="selectedRuneword" :runeword="selectedRuneword" :show-old="true" />
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
import { ref, watch } from "vue";
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
import FilterBlizzles from "@/components/FilterBlizzles.vue";
import FilterROTW from "@/components/FilterROTW.vue";
import RunewordsTable from "@/components/RunewordsTable.vue";

import { useInfoStore, useRunewordsStore } from "@/store";
import type { RunewordCardItem, RunewordTableItem } from "@/types";

type TableTooltipPayload = { item: RunewordTableItem; left: number; top: number };

const store = useInfoStore();
const runewordsStore = useRunewordsStore();

const { search, socketsFilter, reworkedFilter, blizzlessFilter, rotwFilter } =
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
const selectedRuneword = ref<RunewordCardItem | null>(null);
const tooltipShow = ref(false);
const tooltipItem = ref<RunewordTableItem | null>(null);
const tooltipLeft = ref(0);
const tooltipTop = ref(0);

/** Клик по имени в таблице — полноэкранная модалка с карточкой. */
function openRunewordModal(item: RunewordTableItem): void {
  selectedRuneword.value = item as RunewordCardItem;
  currentCard.value = true;
  tooltipShow.value = false;
  tooltipItem.value = null;
}

function closeRunewordModal(): void {
  currentCard.value = false;
}

/** Ховер по имени — плавающий Tooltip с RuneWordCard. */
function handleTableTooltipHover(payload: TableTooltipPayload): void {
  if (currentCard.value) return;
  tooltipItem.value = payload.item;
  tooltipLeft.value = payload.left;
  tooltipTop.value = payload.top;
  tooltipShow.value = true;
}

function handleTableTooltipHoverEnd(): void {
  tooltipShow.value = false;
  tooltipItem.value = null;
}

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
    width: 158px;
    margin-bottom: 0;
  }

  &__container {
    position: sticky;
    top: 15px;
    padding-right: 8px;
    padding-left: 8px;

    @media (min-width: 1024px) {
      padding-right: 0;
      padding-left: 0;
    }
  }
}

.main {
  padding-right: 8px;
  padding-left: 8px;

  @media (min-width: 1024px) {
    padding-right: 16px;
    padding-left: 16px;
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
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
}

.filters {
  display: flex;
  gap: 12px;
}

.switcher {
  display: flex;
  gap: 4px;

  &__button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 90px;
    height: 24px;
    font-size: 14px;
    line-height: 100%;
    color: var(--color-text-inverse);
    cursor: pointer;
    background-color: var(--color-notfound);
    border: 1px solid var(--color-notfound);
    border-radius: 4px;

    &--active {
      background-color: var(--color-success-alt);
      border-color: var(--color-success-alt);
    }
  }
}
</style>
