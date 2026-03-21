import { defineStore } from "pinia";
import type { RuneItem, RunewordTableItem } from "@/types";
import { getItemTypeDisplayName, RUNES } from "@/shared/constants";
import { CUSTOM_RUNEWORDS } from "@/shared/custom-runewords";
import { REWORKED_RUNEWORDS } from "@/shared/reworked-runewords";
import { RUNEWORDS } from "@/shared/runewords";
import { ROTW_RUNEWORDS } from "@/shared/rotw-runewords";
import { getStoredLang } from "@/utils/lang";
import { isComplete } from "@/utils/runeword";

/** Базовый список + переработанные (`reworked-runewords.ts`) + RotW + кастомные с `marked`. */
const ALL_RUNEWORDS = [
  ...RUNEWORDS,
  ...REWORKED_RUNEWORDS,
  ...ROTW_RUNEWORDS,
  ...CUSTOM_RUNEWORDS,
];

interface RunewordsState {
  /** Search query (bound to SearchInput v-model) */
  search: string;
  /** Debounced search string for filtering (synced from App) */
  searchDebounced: string;
  /** Selected rune ids coming from RuneList */
  selectedRunes: number[];
  /** Selected sockets from FilterSockets */
  socketsFilter: number[];
  /**
   * Reworked filter:
   * - `null` => don't filter by reworked
   * - `changed` => only reworked
   * - `unchanged` => only not reworked
   */
  reworkedFilter: "unchanged" | "changed" | null;

  /**
   * Blizzless (marked) filter:
   * - `null` => don't filter by marked
   * - `true` => only marked
   * - `false` => only not marked
   */
  blizzlessFilter: boolean | null;

  /**
   * RotW patch filter (`patch === "rotw"`):
   * - `null` => don't filter by patch
   * - `true` => only `patch: "rotw"`
   */
  rotwFilter: boolean | null;
  /** All runes needed by RuneList */
  runes: RuneItem[];
}

export const useRunewordsStore = defineStore({
  id: "runewords",
  state: (): RunewordsState => ({
    search: "",
    searchDebounced: "",
    socketsFilter: [],
    reworkedFilter: null,
    blizzlessFilter: null,
    rotwFilter: null,
    runes: RUNES,
    selectedRunes: JSON.parse(localStorage.getItem("selectedRunes") ?? "[]") ?? [],
  }),
  getters: {
    /**
     * All runewords with `complete` flag derived from selected runes.
     */
    sortedRunewords(state): RunewordTableItem[] {
      const result: RunewordTableItem[] = [];

      ALL_RUNEWORDS.forEach((item) => {
        const word = item as RunewordTableItem;
        if (isComplete(state.selectedRunes, word.runes)) {
          result.push({
            ...word,
            complete: true,
          });
        } else {
          result.push({ ...word });
        }
      });

      return result;
    },

    /**
     * Filtered list: `searchDebounced`, sockets, reworked, blizzless, rotw.
     * Selected runes do not reduce the list (they affect `complete` / highlights via `sortedRunewords`).
     */
    filteredRunewords(): RunewordTableItem[] {
      const sorted = this.sortedRunewords;

      const q = this.searchDebounced.toLowerCase().trim();
      const currentLang = getStoredLang();

      const bySearch = q
        ? sorted.filter((word) => {
            const nameMatch =
              word.name.ru.toLowerCase().includes(q) ||
              word.name.en.toLowerCase().includes(q);
            if (nameMatch) return true;

            const matchesType = (word.types ?? [])
              .map((typeId) => getItemTypeDisplayName(typeId, currentLang))
              .filter(Boolean)
              .some((name) => name.toLowerCase().includes(q));

            return matchesType;
          })
        : sorted;

      const bySockets = this.socketsFilter.length
        ? bySearch.filter((i) => this.socketsFilter.includes(i.runes.length))
        : bySearch;

      /** Sidebar rune selection does not shrink the list — only search / sockets / reworked / blizzless / rotw. */
      let result = bySockets;

      if (this.reworkedFilter !== null) {
        result = result.filter((word) => {
          const isReworked = word.reworked === true;
          return this.reworkedFilter === "changed" ? isReworked : !isReworked;
        });
      }

      if (this.blizzlessFilter !== null) {
        result = result.filter((word) => {
          const isNew = word.marked === true;
          return this.blizzlessFilter ? isNew : !isNew;
        });
      }

      if (this.rotwFilter !== null) {
        result = result.filter((word) => {
          const isRotw = word.patch === "rotw";
          return this.rotwFilter ? isRotw : !isRotw;
        });
      }

      return result;
    },

    /**
     * Grid view: same as `filteredRunewords`, but when the user picked runes in the sidebar,
     * only runewords that use at least one of those runes (table shows the full list + highlights).
     */
    gridFilteredRunewords(state): RunewordTableItem[] {
      const base = this.filteredRunewords;
      if (state.selectedRunes.length === 0) {
        return base;
      }
      const selectedSet = new Set(state.selectedRunes);
      return base.filter((word) =>
        (word.runes ?? []).some((runeId) => selectedSet.has(runeId))
      );
    },

    /**
     * Runewords that contain at least one rune from `selectedRunes`.
     * Used as a "table" view for selected runes.
     */
    tableSelectedRunewords(state): RunewordTableItem[] {
      const selected = state.selectedRunes;
      if (selected.length === 0) {
        return [];
      }

      const selectedSet = new Set(selected);
      return this.sortedRunewords.filter((word) =>
        (word.runes ?? []).some((runeId) => selectedSet.has(runeId))
      );
    },

    /**
     * Ids of runewords that use at least one sidebar-selected rune (`tableSelectedRunewords`).
     * For row highlighting in `RunewordsTable` without passing arrays as props.
     */
    tableSelectedRunewordIds(): Set<number> {
      return new Set(this.tableSelectedRunewords.map((w) => w.id));
    },
  },
  actions: {
    setSelectedRunes(value: number[]): void {
      this.selectedRunes = value;
      localStorage.setItem("selectedRunes", JSON.stringify(value));
    },
    setSearchDebounced(value: string): void {
      this.searchDebounced = value;
    },
  },
});
