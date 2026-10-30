<template>
  <div class="table-scroll">
    <table class="table">
      <thead>
        <tr>
          <th
            v-for="header in headers"
            :key="header.key"
            scope="col"
            :aria-sort="ariaSort(header.field)"
          >
            <button
              v-if="header.field"
              class="table__sort"
              @click="words.setSort(header.field)"
            >
              <span>{{ header.label }}</span>
              <SortIcon
                v-if="words.sortBy === header.field"
                class="table__sort-icon"
                :direction="words.sortDirection"
                aria-hidden="true"
              />
            </button>
            <span v-else>{{ header.label }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in words.orderedRunewords"
          :key="item.id"
          :class="{
            complete: item.complete,
            'table-selected': words.tableSelectedRunewordIds.has(item.id),
          }"
          @click="$emit('select', item)"
        >
          <td class="table__name">
            <button class="name" @click.stop="$emit('select', item)">
              {{ item.name[info.currentLang] }}</button
            ><RunewordBadges :item="item" /><span
              v-if="words.favorites.includes(item.id)"
              class="favorite"
              :aria-label="t('В избранном', 'Favorite')"
              ><UiIcon name="star" :size="12" filled
            /></span>
          </td>
          <td class="table__recipe">
            <template v-for="(rune, index) in item.runes" :key="index"
              ><span v-if="index" class="separator"> · </span
              ><span
                :class="
                  words.selectedRunes.includes(rune) ? 'rune--found' : 'rune--missing'
                "
                >{{ getRuneName(rune) }}</span
              ></template
            >
          </td>
          <td class="table__types">
            {{ (item.types ?? []).map(getTypeName).join(", ")
            }}<span v-if="item.excluded?.length" class="table__excluded"
              >({{ item.excluded }})</span
            >
          </td>
          <td class="table__classes">{{ item.classes?.join(", ") || "—" }}</td>
          <td class="table__level">{{ item.level }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<script setup lang="ts">
import UiIcon from "@/components/ui/UiIcon.vue";
import { computed } from "vue";
import { useInfoStore, useRunewordsStore } from "@/store";
import { useRunes } from "@/composables/useRunes";
import { useText } from "@/composables/useText";
import SortIcon from "@/components/SortIcon.vue";
import type { RunewordSortField } from "@/store/runewords";
import RunewordBadges from "@/components/RunewordBadges.vue";
import type { RunewordTableItem } from "@/types";
const info = useInfoStore();
const words = useRunewordsStore();
const t = useText();
const headers = computed<
  { key: string; field: RunewordSortField | null; label: string }[]
>(() => [
  { key: "name", field: "name", label: t("Рунное слово", "Runeword") },
  { key: "recipe", field: null, label: t("Рецепт", "Recipe") },
  { key: "types", field: null, label: t("Основа", "Base") },
  { key: "classes", field: null, label: t("Класс", "Class") },
  { key: "level", field: "level", label: "LVL" },
]);
function ariaSort(
  field: RunewordSortField | null
): "ascending" | "descending" | undefined {
  return words.sortBy === field
    ? words.sortDirection === "asc"
      ? "ascending"
      : "descending"
    : undefined;
}
const { getRuneName, getTypeName } = useRunes();
defineEmits<{ (e: "select", item: RunewordTableItem): void }>();
</script>
<style scoped lang="scss">
.table-scroll {
  width: 100%;
  overflow-x: auto;
}
.table {
  width: 100%;
  min-width: 640px;
  border-spacing: 0;
  border-collapse: collapse;
}
th {
  padding: 8px 10px;
  font-size: 10px;
  font-weight: 400;
  color: #b2c1cc;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  background: #243039;
}
.table__sort {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 0;
  font: inherit;
  vertical-align: middle;
  color: inherit;
  text-transform: inherit;
  background: transparent;
  border: 0;
}
.table__sort:hover {
  color: var(--color-accent);
}
.table__sort-icon {
  display: block;
  flex-shrink: 0;
  width: 12px;
  height: 12px;
}
th:first-child {
  width: 28%;
}
th:nth-child(2) {
  width: 30%;
}
th:nth-child(3) {
  width: 25%;
}
th:nth-child(4) {
  width: 12%;
}
th:last-child {
  width: 5%;
  text-align: right;
}
td {
  padding: 7px 10px;
  border-bottom: 1px var(--border-style) #303a43;
}
tbody tr {
  min-height: 36px;
  cursor: pointer;
}
tbody tr:hover {
  background: #27333d;
}
.table__name {
  font-size: 13px;
}
.name {
  padding: 0;
  font-size: inherit;
  color: var(--color-title);
  text-align: left;
  background: transparent;
  border: 0;
}
.badges {
  margin-left: 7px;
  vertical-align: middle;
}
.table__recipe {
  font-size: 11px;
  color: #c5d9e2;
}
.separator {
  color: #73818d;
}
.table__types,
.table__classes {
  font-size: 11px;
  color: var(--color-muted);
}
.table__excluded {
  display: block;
}
.table__level {
  font-size: 11px;
  text-align: right;
}
.complete {
  background: #203325;
  box-shadow: inset 3px 0 #5cbd4b;
}
.table-selected:not(.complete) {
  background: #17252c;
  box-shadow: inset 3px 0 var(--color-accent);
}
.favorite {
  margin-left: 5px;
  font-size: 11px;
  color: #ffe866;
}
@media (max-width: 600px) {
  th,
  td {
    padding: 7px 6px;
  }
  .table__name {
    font-size: 12px;
  }
}
</style>
