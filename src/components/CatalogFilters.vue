<template>
  <div class="filters">
    <div class="filter-line">
      <label id="item-type-label" for="item-type">{{ t("Основа", "Base") }}</label>
      <UiSelect
        id="item-type"
        v-model="words.itemTypeFilter"
        class="base-select"
        :options="itemTypeOptions"
        aria-labelledby="item-type-label"
        :active="words.itemTypeFilter !== null"
      />
      <span>{{ t("Сокеты", "Sockets") }}</span>
      <div class="filter-chips" :aria-label="t('Сокеты', 'Sockets')">
        <button
          v-for="count in [2, 3, 4, 5, 6]"
          :key="count"
          :aria-pressed="words.socketsFilter.includes(count)"
          @click="toggleSocket(count)"
        >
          {{ count }}
        </button>
      </div>
    </div>
    <div class="filter-line filter-line--versions">
      <span>{{ t("Версия", "Version") }}</span>
      <div class="filter-chips" :aria-label="t('Версия', 'Version')">
        <button :aria-pressed="allVersions" @click="words.resetVersions()">
          {{ t("Все", "All") }}
        </button>
        <button
          :aria-pressed="words.reworkedFilter === 'changed'"
          @click="
            words.reworkedFilter = words.reworkedFilter === 'changed' ? null : 'changed'
          "
        >
          {{ t("Переработанные", "Reworked") }}
        </button>
        <button
          :aria-pressed="words.reworkedFilter === 'unchanged'"
          @click="
            words.reworkedFilter =
              words.reworkedFilter === 'unchanged' ? null : 'unchanged'
          "
        >
          {{ t("Без изменений", "Unchanged") }}
        </button>
        <button
          :aria-pressed="words.blizzlessFilter === true"
          @click="words.blizzlessFilter = words.blizzlessFilter ? null : true"
        >
          {{ t("Только Blizzless", "Blizzless only") }}
        </button>
        <button
          :aria-pressed="words.rotwFilter === true"
          @click="words.rotwFilter = words.rotwFilter ? null : true"
        >
          RotW
        </button>
      </div>
    </div>
    <button class="reset" @click="words.resetFilters()">
      {{ t("Сбросить всё", "Reset all") }}
    </button>
  </div>
  <div
    v-if="activeFilters.length"
    class="active-filters"
    :aria-label="t('Активные фильтры', 'Active filters')"
  >
    <button
      v-for="filter in activeFilters"
      :key="filter.key"
      :aria-label="`${t('Убрать фильтр', 'Remove filter')}: ${filter.label}`"
      @click="filter.clear()"
    >
      {{ filter.label }} <span aria-hidden="true">×</span>
    </button>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import type { SelectOption } from "@/types/select";
import { useRunewordsStore } from "@/store";
import { useText } from "@/composables/useText";
import { useRunes } from "@/composables/useRunes";
const words = useRunewordsStore();
const t = useText();
const { getTypeName, getRuneName } = useRunes();
const itemTypes = computed(() =>
  [...new Set(words.sortedRunewords.flatMap((word) => word.types ?? []))].sort((a, b) =>
    getTypeName(a).localeCompare(getTypeName(b))
  )
);
const itemTypeOptions = computed<SelectOption<number | null>[]>(() => [
  { value: null, label: t("Все предметы", "All items") },
  ...itemTypes.value.map((id) => ({ value: id, label: getTypeName(id) })),
]);
const allVersions = computed(
  () =>
    words.reworkedFilter === null &&
    words.blizzlessFilter === null &&
    words.rotwFilter === null
);
function toggleSocket(count: number) {
  words.socketsFilter = words.socketsFilter.includes(count)
    ? words.socketsFilter.filter((n) => n !== count)
    : [...words.socketsFilter, count];
}
const activeFilters = computed(() => {
  const filters: { key: string; label: string; clear: () => void }[] = [];
  if (words.search)
    filters.push({
      key: "search",
      label: words.search,
      clear: () => {
        words.search = "";
        words.searchDebounced = "";
      },
    });
  if (words.itemTypeFilter !== null)
    filters.push({
      key: "type",
      label: getTypeName(words.itemTypeFilter),
      clear: () => {
        words.itemTypeFilter = null;
      },
    });
  for (const count of words.socketsFilter)
    filters.push({
      key: `socket-${count}`,
      label: `${count} ${t("сок.", "sockets")}`,
      clear: () => toggleSocket(count),
    });
  if (words.reworkedFilter)
    filters.push({
      key: "reworked",
      label:
        words.reworkedFilter === "changed"
          ? t("Переработанные", "Reworked")
          : t("Без изменений", "Unchanged"),
      clear: () => {
        words.reworkedFilter = null;
      },
    });
  if (words.blizzlessFilter)
    filters.push({
      key: "blizzless",
      label: t("Только Blizzless", "Blizzless only"),
      clear: () => {
        words.blizzlessFilter = null;
      },
    });
  if (words.rotwFilter)
    filters.push({
      key: "rotw",
      label: "RotW",
      clear: () => {
        words.rotwFilter = null;
      },
    });
  if (words.favoritesOnly)
    filters.push({
      key: "favorites",
      label: t("Избранное", "Favorites"),
      clear: () => {
        words.favoritesOnly = false;
      },
    });
  for (const id of words.selectedRunes)
    filters.push({
      key: `rune-${id}`,
      label: getRuneName(id),
      clear: () => words.setSelectedRunes(words.selectedRunes.filter((r) => r !== id)),
    });
  return filters;
});
</script>
<style scoped lang="scss">
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px var(--border-style) var(--color-border);
}
.filter-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: var(--color-muted);
}
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.filter-chips button {
  padding: 4px 8px;
  font-size: 11px;
  white-space: nowrap;
}
.base-select {
  width: 140px;
}
.reset {
  padding: 4px 0;
  margin-left: auto;
  font-size: 10px;
  color: var(--color-muted);
  background: transparent;
  border: 0;
}
.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}
.active-filters button {
  display: flex;
  gap: 8px;
  align-items: center;
  max-width: 100%;
  padding: 2px 7px;
  font-size: 10px;
  color: #ffe866;
  overflow-wrap: anywhere;
  background: #29270b;
  border-color: #756b1f;
}
@media (min-width: 1200px) {
  .filters {
    flex-wrap: nowrap;
  }
}
@media (max-width: 900px) {
  .filter-line--versions {
    flex-basis: 100%;
  }
}
@media (max-width: 600px) {
  .base-select {
    width: 125px;
  }
  .filters {
    gap: 8px;
  }
  .filter-line {
    gap: 5px;
  }
  .filter-chips button {
    padding: 4px 6px;
  }
  .reset {
    margin-left: 0;
  }
}
</style>
