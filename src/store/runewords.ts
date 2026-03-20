import { defineStore } from "pinia";
import { ITEM_TYPES, RUNES } from "@/shared/constants";
import { RUNEWORDS } from "@/shared/runewords";
import { isComplete } from "@/utils/runeword";
import type { RuneItem, RunewordTableItem } from "@/types";

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
   * New/Marked filter:
   * - `null` => don't filter by marked/new
   * - `true` => only marked/new
   * - `false` => only not marked/new
   */
  newFilter: boolean | null;
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
    newFilter: null,
    runes: RUNES,
    selectedRunes: JSON.parse(localStorage.getItem("selectedRunes") ?? "[]") ?? [],
  }),
  getters: {
    /**
     * All runewords with `complete` flag derived from selected runes.
     */
    sortedRunewords(state): RunewordTableItem[] {
      const result: RunewordTableItem[] = [];

      RUNEWORDS.forEach((item) => {
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
     * Filtered list: `searchDebounced`, sockets, reworked, new.
     * Selected runes do not reduce the list (they affect `complete` / highlights via `sortedRunewords`).
     */
    filteredRunewords(): RunewordTableItem[] {
      const sorted = this.sortedRunewords;

      const q = this.searchDebounced.toLowerCase().trim();
      const currentLang: "en" | "ru" =
        typeof window !== "undefined"
          ? ((localStorage.getItem("lang") ?? "en") as "en" | "ru")
          : "en";

      const bySearch = q
        ? sorted.filter((word) => {
            const nameMatch =
              word.name.ru.toLowerCase().includes(q) ||
              word.name.en.toLowerCase().includes(q);
            if (nameMatch) return true;

            const matchesType = (word.types ?? [])
              .map((typeId) => ITEM_TYPES.find((t) => t.id === typeId)?.name[currentLang])
              .filter(Boolean)
              .some((name) => (name as string).toLowerCase().includes(q));

            return matchesType;
          })
        : sorted;

      const bySockets = this.socketsFilter.length
        ? bySearch.filter((i) => this.socketsFilter.includes(i.runes.length))
        : bySearch;

      /** Sidebar rune selection does not shrink the list — only search / sockets / reworked / new. */
      let result = bySockets;

      if (this.reworkedFilter !== null) {
        result = result.filter((word) => {
          const isReworked = (word as { reworked?: unknown }).reworked === true;
          return this.reworkedFilter === "changed" ? isReworked : !isReworked;
        });
      }

      if (this.newFilter !== null) {
        result = result.filter((word) => {
          const isNew = (word as { marked?: unknown }).marked === true;
          return this.newFilter ? isNew : !isNew;
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
