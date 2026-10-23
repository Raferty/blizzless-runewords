<template>
  <TheHeader />
  <div class="shell">
    <aside class="aside">
      <div class="aside__inner"><RuneList /></div>
    </aside>
    <main class="catalog">
      <CatalogFilters />
      <div class="results-top">
        <p role="status">
          {{ t("Найдено", "Found") }} <b>{{ visibleCount }}</b> /
          {{ words.sortedRunewords.length }}
        </p>
        <div class="results-top__controls">
          <UiSelect
            v-model="words.sortBy"
            class="sort-select"
            :options="sortOptions"
            :aria-label="t('Сортировка', 'Sort')"
            @change="words.sortDirection = 'asc'"
          />
          <div class="view-switch" :aria-label="t('Вид каталога', 'Catalog view')">
            <button :aria-pressed="view === 'table'" @click="view = 'table'">
              {{ t("Таблица", "Table") }}</button
            ><button :aria-pressed="view === 'grid'" @click="view = 'grid'">
              {{ t("Сетка", "Grid") }}
            </button>
          </div>
          <button
            class="favorite-filter"
            :aria-pressed="words.favoritesOnly"
            :aria-label="t('Показать избранное', 'Show favorites')"
            :title="t('Избранное', 'Favorites')"
            @click="words.favoritesOnly = !words.favoritesOnly"
          >
            {{ words.favoritesOnly ? "★" : "☆" }}
          </button>
        </div>
      </div>
      <RunewordsTable v-if="view === 'table' && visibleCount" @select="openRuneword" />
      <RunewordsList v-else-if="visibleCount" @select="openRuneword" />
      <div v-else class="empty-state">
        <span aria-hidden="true">⌕</span>
        <h2>{{ t("Ничего не найдено", "No runewords found") }}</h2>
        <p>
          {{
            t(
              "Попробуйте изменить запрос или сбросить фильтры.",
              "Try another search or reset the filters."
            )
          }}
        </p>
        <button @click="words.resetFilters()">
          {{ t("Сбросить фильтры", "Reset filters") }}
        </button>
      </div>
      <p v-if="words.selectedRunes.length" class="rune-hint">
        {{
          view === "table"
            ? t(
                "Выбранные руны подсвечены. Полные рецепты показаны первыми.",
                "Selected runes are highlighted. Complete recipes appear first."
              )
            : t(
                "Показаны рецепты хотя бы с одной выбранной руной.",
                "Showing recipes containing at least one selected rune."
              )
        }}
      </p>
      <TheFooter />
    </main>
  </div>
  <UiModal
    :model-value="selectedRuneword !== null"
    :closable="true"
    :label="selectedRuneword?.name[info.currentLang]"
    @close="selectedRuneword = null"
  >
    <template v-if="selectedRuneword">
      <div class="detail-topbar">
        <span
          >{{ t("Рунное слово", "Runeword") }} ·
          {{ String(selectedRuneword.id).padStart(3, "0") }}</span
        ><button
          :aria-pressed="words.favorites.includes(selectedRuneword.id)"
          :aria-label="
            words.favorites.includes(selectedRuneword.id)
              ? t('Убрать из избранного', 'Remove from favorites')
              : t('В избранное', 'Add to favorites')
          "
          @click="words.toggleFavorite(selectedRuneword.id)"
        >
          {{ words.favorites.includes(selectedRuneword.id) ? "★" : "☆" }}</button
        ><button
          autofocus
          :aria-label="t('Закрыть', 'Close')"
          @click="selectedRuneword = null"
        >
          ×
        </button>
      </div>
      <RuneWordCard :key="selectedRuneword.id" :runeword="selectedRuneword" show-old />
    </template>
  </UiModal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useDebouncedRef } from "@/composables/useDebouncedRef";
import { useText } from "@/composables/useText";
import TheHeader from "@/components/TheHeader.vue";
import TheFooter from "@/components/TheFooter.vue";
import RuneList from "@/components/RuneList.vue";
import CatalogFilters from "@/components/CatalogFilters.vue";
import RunewordsList from "@/components/RunewordsList.vue";
import RunewordsTable from "@/components/RunewordsTable.vue";
import RuneWordCard from "@/components/RuneWordCard.vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import type { SelectOption } from "@/types/select";
import type { RunewordSortField } from "@/store/runewords";
import UiModal from "@/components/ui/UiModal.vue";
import { useInfoStore, useRunewordsStore } from "@/store";
import type { RunewordTableItem } from "@/types";
const info = useInfoStore();
const words = useRunewordsStore();
const t = useText();
const sortOptions = computed<SelectOption<RunewordSortField>[]>(() => [
  { value: "name", label: t("По названию", "By name") },
  { value: "level", label: t("По уровню", "By level") },
  { value: "sockets", label: t("По сокетам", "By sockets") },
]);
const { search } = storeToRefs(words);
const debouncedSearch = useDebouncedRef(search, 250);
watch(debouncedSearch, (value) => words.setSearchDebounced(value), { immediate: true });
const view = ref(localStorage.getItem("blizzless-view") === "grid" ? "grid" : "table");
watch(view, (value) => localStorage.setItem("blizzless-view", value));
const visibleCount = computed(() =>
  view.value === "table"
    ? words.filteredRunewords.length
    : words.gridFilteredRunewords.length
);
const selectedRuneword = ref<RunewordTableItem | null>(null);
function openRuneword(item: RunewordTableItem) {
  selectedRuneword.value = item;
}
</script>
<style scoped lang="scss">
.shell {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  max-width: 1800px;
  min-height: calc(100svh - 60px);
  margin: 0 auto;
}
.aside {
  min-width: 0;
  border-right: 1px var(--border-style) var(--color-border);
}
.aside__inner {
  position: sticky;
  top: 0;
  max-height: 100svh;
  padding: 12px 10px;
  overflow: auto;
}
.catalog {
  min-width: 0;
  padding: 0 16px;
}
.results-top {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  font-size: 11px;
  color: var(--color-muted);
}
.results-top b {
  color: var(--color-text);
}
.results-top__controls {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}
.sort-select {
  width: 140px;
}
.view-switch {
  display: flex;
}
.view-switch button {
  padding: 5px 9px;
  font-size: 11px;
  border-radius: 0;
}
.view-switch button:first-child {
  border-radius: 3px 0 0 3px;
}
.view-switch button:last-child {
  border-radius: 0 3px 3px 0;
}
.view-switch button[aria-pressed="true"] {
  color: #e3f1f7;
  background: #3b5b6b;
  border-color: #536f7e;
  box-shadow: none;
}
.favorite-filter {
  width: 34px;
  height: 28px;
  font-size: 21px;
  line-height: 1;
}
.empty-state {
  padding: 80px 16px;
  color: var(--color-muted);
  text-align: center;
}
.empty-state > span {
  font-size: 42px;
  color: var(--color-accent);
}
.empty-state h2 {
  margin: 10px 0;
  font-size: 20px;
  color: var(--color-title);
}
.empty-state button {
  padding: 7px 12px;
  margin-top: 20px;
}
.rune-hint {
  margin-top: 14px;
  font-size: 10px;
  color: var(--color-muted);
}
.detail-topbar {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  gap: 7px;
  align-items: center;
  padding: 8px 14px;
  background: #243039;
  border-bottom: 1px var(--border-style) var(--color-border);
}
.detail-topbar > span {
  margin-right: auto;
  font-size: 10px;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.detail-topbar button {
  width: 28px;
  height: 28px;
  font-size: 21px;
  line-height: 1;
  background: transparent;
  border: 0;
}
@media (min-width: 2200px) {
  .shell {
    max-width: none;
  }
}
@media (max-width: 900px) {
  .catalog {
    padding: 0 12px;
  }
}
@media (max-width: 600px) {
  .shell {
    display: block;
  }
  .aside {
    border-right: 0;
    border-bottom: 1px var(--border-style) var(--color-border);
  }
  .aside__inner {
    position: static;
    max-height: none;
    padding: 12px;
  }
  .results-top__controls {
    gap: 5px;
  }
  .sort-select {
    width: 105px;
  }
  .view-switch button {
    padding: 5px 6px;
  }
}
</style>
