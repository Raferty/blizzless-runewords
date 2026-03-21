<template>
  <table class="table" role="grid">
    <thead>
      <tr>
        <th
          v-for="(item, index) in store.interface.table.headers[store.currentLang]"
          :key="index"
          scope="col"
        >
          <span
            v-if="
              item === 'Runeword' ||
              item === 'Рунное слово' ||
              item === 'Level' ||
              item === 'Уровень' ||
              item === 'Item Types' ||
              item === 'Тип предмета'
            "
            class="table__th-inner"
          >
            <template v-if="item === 'Runeword' || item === 'Рунное слово'">
              <span class="sortable" @click="handleSort('name')">{{ item }}</span>
              <span v-if="sortField === 'name'" class="sort">
                <SortIcon :direction="sortDirection" />
              </span>
            </template>
            <template v-else-if="item === 'Level' || item === 'Уровень'">
              <span class="sortable" @click="handleSort('level')">{{ item }}</span>
              <span v-if="sortField === 'level'" class="sort">
                <SortIcon :direction="sortDirection" />
              </span>
            </template>
            <template v-else-if="item === 'Item Types' || item === 'Тип предмета'">
              <span class="sortable" @click="handleSort('types')">{{ item }}</span>
              <span v-if="sortField === 'types'" class="sort">
                <SortIcon :direction="sortDirection" />
              </span>
            </template>
          </span>
          <template v-else>
            <span>{{ item }}</span>
          </template>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="item in sortedItems"
        :key="item.id"
        :class="[
          isRunewordComplete(selectedRunes, item.runes ?? []) ? 'complete' : '',
          isTableSelectedRow(item) ? 'table-selected' : '',
        ]"
      >
        <td class="table__name">
          <span
            class="name"
            tabindex="0"
            role="button"
            data-tooltip-trigger="rune-name"
            :data-tooltip-item-id="item.id"
            @mouseenter="handleMouseEnter(item, $event)"
            @mouseleave="handleMouseLeave(item)"
            @click="handleRuneNameClick(item, $event)"
            @keydown="handleRuneNameKeydown($event, item)"
            >{{ item.name[store.currentLang] }}</span
          >
          <span v-if="item.reworked" class="reworked">{{
            store.interface.markers.reworked[store.currentLang]
          }}</span>

          <span v-if="item.patch === 'rotw'" class="rotw">RotW</span>

          <span v-if="item?.bugged?.status" class="warning"
            >!!! {{ store.interface.markers.bugged[store.currentLang] }}</span
          >
          <span v-if="item?.marked" class="new">blizzless only</span>
        </td>
        <template v-for="(rune, index) in item.runes" :key="index">
          <template v-if="isFound(rune)">
            <td class="found">
              {{ getRuneName(rune) }}
            </td>
          </template>
          <template v-else>
            <td class="notfound">
              {{ getRuneName(rune) }}
            </td>
          </template>
        </template>

        <template v-for="n in RUNELENGTH - (item.runes?.length ?? 0)" :key="n">
          <td>&nbsp;</td>
        </template>
        <td class="table__types">
          <template v-for="(type, index) in item.types ?? []" :key="index">
            {{ getTypeName(type)
            }}<template v-if="index < (item.types?.length ?? 0) - 1">, </template>
          </template>

          <template v-if="item.excluded && item.excluded.length > 0">
            <span class="table__classes">({{ item.excluded }})</span>
          </template>
          <template v-if="item.classes && item.classes.length > 0">
            <span class="table__classes">({{ item.classes.join(", ") }})</span>
          </template>
        </td>
        <td>{{ item.level }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { storeToRefs } from "pinia";
import { useInfoStore, useRunewordsStore } from "@/store";
import SortIcon from "@/components/SortIcon.vue";
import { useRunes } from "@/composables/useRunes";
import { sortByField } from "@/utils/array";
import { isComplete as isRunewordComplete } from "@/utils/runeword";
import type { RunewordTableItem } from "@/types";

const store = useInfoStore();
const runewordsStore = useRunewordsStore();
const { selectedRunes, filteredRunewords, tableSelectedRunewordIds } =
  storeToRefs(runewordsStore);
const { getRuneName, getTypeName, getTypesSortKey } = useRunes();

type TooltipPayload = { item: RunewordTableItem; left: number; top: number };

const emit = defineEmits<{
  (e: "select", item: RunewordTableItem): void;
  (e: "tooltip-hover", payload: TooltipPayload): void;
  (e: "tooltip-hover-end", itemId: number): void;
  (e: "tooltip-click", payload: TooltipPayload): void;
}>();

const RUNELENGTH = 6;

/** Rows that use a sidebar-selected rune — ids come from store (`tableSelectedRunewordIds`). */
const isTableSelectedRow = (item: RunewordTableItem): boolean =>
  tableSelectedRunewordIds.value.has(item.id);

const isFound = (id: number): boolean => {
  return selectedRunes.value.includes(id);
};

const MODAL_X_OFFSET = 40;
const MODAL_Y_ANCHOR_OFFSET = 20;

const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

/** Viewport coords for `position: fixed` tooltip (clientX/Y + offset). */
const getTooltipAnchorViewport = (
  e: MouseEvent | KeyboardEvent
): { left: number; top: number } => {
  const maybeMouse = e as MouseEvent;
  if (typeof maybeMouse.clientX === "number" && typeof maybeMouse.clientY === "number") {
    return {
      left: maybeMouse.clientX + MODAL_X_OFFSET,
      top: maybeMouse.clientY + MODAL_Y_ANCHOR_OFFSET,
    };
  }

  const activeEl = document.activeElement as HTMLElement | null;
  if (activeEl) {
    const rect = activeEl.getBoundingClientRect();
    return {
      left: rect.left + rect.width / 2 + MODAL_X_OFFSET,
      top: rect.top + MODAL_Y_ANCHOR_OFFSET,
    };
  }

  return { left: MODAL_X_OFFSET, top: MODAL_Y_ANCHOR_OFFSET };
};

const handleMouseEnter = (item: RunewordTableItem, e: MouseEvent): void => {
  if (isTouchDevice()) return;

  const { left, top } = getTooltipAnchorViewport(e);
  emit("tooltip-hover", {
    item,
    left,
    top,
  });
};

const handleMouseLeave = (item: RunewordTableItem): void => {
  emit("tooltip-hover-end", item.id);
};

const handleRuneNameClick = (
  item: RunewordTableItem,
  e: MouseEvent | KeyboardEvent
): void => {
  emit("select", item);

  const { left, top } = getTooltipAnchorViewport(e);
  emit("tooltip-click", {
    item,
    left,
    top,
  });
};

const handleRuneNameKeydown = (e: KeyboardEvent, item: RunewordTableItem): void => {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  handleRuneNameClick(item, e);
};

const sortField = ref<"name" | "level" | "types">("name");
const sortDirection = ref<"asc" | "desc">("asc");

const handleSort = (field: "name" | "level" | "types"): void => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = field;
    sortDirection.value = "asc";
  }
};

const sortedItems = computed(() => {
  let items: RunewordTableItem[] = [];
  /** Same pipeline as grid: search + sockets + reworked + new (rune selection does not hide rows). */
  const source = filteredRunewords.value;
  switch (sortField.value) {
    case "name":
      items = sortByField([...source], `name.${store.currentLang}`);
      break;
    case "level":
      items = sortByField([...source], "level");
      break;
    case "types":
      items = [...source].sort((a, b) => {
        const keyA = getTypesSortKey(a);
        const keyB = getTypesSortKey(b);
        return (keyA || "").localeCompare(keyB || "");
      });
      break;
  }
  if (sortDirection.value === "desc") {
    items = [...items].reverse();
  }

  /** Rows where every rune of the runeword is among selected runes — on top (subset of selection is enough). */
  const selected = selectedRunes.value;
  const rowIsComplete = (item: RunewordTableItem): boolean => {
    const runes = item.runes ?? [];
    return runes.length > 0 && isRunewordComplete(selected, runes);
  };

  const completeRows: RunewordTableItem[] = [];
  const otherRows: RunewordTableItem[] = [];
  for (const item of items) {
    (rowIsComplete(item) ? completeRows : otherRows).push(item);
  }
  return [...completeRows, ...otherRows];
});
</script>

<style lang="scss">
.table {
  display: block;
  width: 100%;
  overflow-x: auto;
  font-size: 14px;
  border-collapse: collapse;

  @media (min-width: 1024px) {
    display: table;
  }

  th {
    padding: 4px;
    line-height: 100%;
    text-align: left;
    white-space: nowrap;
  }

  tr {
    border-bottom: 1px solid var(--color-border-light);
  }

  td {
    padding: 7px 5px;
    text-align: left;
    border-bottom: 1px solid var(--color-border-dark);
  }

  &__th-inner {
    display: inline-flex;
    gap: 2px;
    align-items: center;
  }

  &__name {
    position: relative;

    span {
      display: inline-block;
      margin-right: 8px;
      cursor: pointer;
    }
  }

  &__classes {
    display: block;
    color: var(--color-accent);
  }

  &__types {
    color: var(--color-muted);
  }
}

.name {
  color: var(--color-title);
}

.sortable {
  cursor: pointer;
}

.found {
  color: var(--color-success-alt);
}

.notfound {
  color: var(--color-notfound);
}

.complete {
  background-color: var(--color-complete-bg);
}

/** Row uses at least one rune from the sidebar selection (`tableSelectedRunewords`). */
.table-selected:not(.complete) {
  box-shadow: inset 3px 0 0 var(--color-accent);
}

.chips {
  display: inline-block;
  padding: 2px 4px;
  font-size: 12px;
  color: var(--color-text-inverse);
  text-align: center;
  background-color: var(--color-ladder-bg);
  border-radius: 4px;
}

.reworked {
  padding: 2px 4px;
  font-size: 12px;
  color: var(--color-text-inverse);
  background-color: var(--color-reworked-bg);
  border-radius: 4px;
}

.warning {
  padding: 2px 4px;
  font-size: 12px;
  color: var(--color-text-on-warning);
  background-color: var(--color-warning-bg);
  border-radius: 4px;
}

.new {
  padding: 2px 4px;
  font-size: 12px;
  color: var(--color-text-inverse);
  background-color: var(--color-success-alt);
  border-radius: 4px;
}

.rotw {
  padding: 2px 4px;
  font-size: 12px;
  color: var(--color-text-inverse);
  background-color: var(--color-rotw);
  border-radius: 4px;
}
</style>
