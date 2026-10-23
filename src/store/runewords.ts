import { defineStore } from "pinia";
import type { RuneItem, RunewordTableItem } from "@/types";
import { getItemTypeDisplayName, RUNES } from "@/shared/constants";
import { CUSTOM_RUNEWORDS } from "@/shared/custom-runewords";
import { REWORKED_RUNEWORDS } from "@/shared/reworked-runewords";
import { RUNEWORDS } from "@/shared/runewords";
import { ROTW_RUNEWORDS } from "@/shared/rotw-runewords";
import { useInfoStore } from "@/store";
import { isComplete, matchesItemType } from "@/utils/runeword";

const ALL_RUNEWORDS = [
  ...RUNEWORDS,
  ...REWORKED_RUNEWORDS,
  ...ROTW_RUNEWORDS,
  ...CUSTOM_RUNEWORDS,
];

function storedIds(key: string): number[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter((id): id is number => Number.isInteger(id))
      : [];
  } catch {
    return [];
  }
}

export type RunewordSortField = "name" | "level" | "sockets";

interface RunewordsState {
  search: string;
  searchDebounced: string;
  selectedRunes: number[];
  socketsFilter: number[];
  reworkedFilter: "unchanged" | "changed" | null;
  blizzlessFilter: boolean | null;
  rotwFilter: boolean | null;
  itemTypeFilter: number | null;
  sortBy: RunewordSortField;
  sortDirection: "asc" | "desc";
  favorites: number[];
  favoritesOnly: boolean;
  baseSelections: Record<number, number>;
  runes: RuneItem[];
}

export const useRunewordsStore = defineStore({
  id: "runewords",
  state: (): RunewordsState => ({
    search: "",
    searchDebounced: "",
    selectedRunes: storedIds("selectedRunes"),
    socketsFilter: [],
    reworkedFilter: null,
    blizzlessFilter: null,
    rotwFilter: null,
    itemTypeFilter: null,
    sortBy: "name",
    sortDirection: "asc",
    favorites: storedIds("blizzless-favorites"),
    favoritesOnly: false,
    baseSelections: {},
    runes: RUNES,
  }),
  getters: {
    sortedRunewords(state): RunewordTableItem[] {
      return ALL_RUNEWORDS.map((item) => ({
        ...item,
        complete: isComplete(state.selectedRunes, item.runes),
      })) as RunewordTableItem[];
    },
    filteredRunewords(): RunewordTableItem[] {
      const q = this.searchDebounced.toLowerCase().trim();
      return this.sortedRunewords.filter((word) => {
        const searchText = [
          word.name.ru,
          word.name.en,
          ...(word.types ?? []).flatMap((id) => [
            getItemTypeDisplayName(id, "ru"),
            getItemTypeDisplayName(id, "en"),
          ]),
          ...word.runes.flatMap((id) => {
            const rune = RUNES.find((r) => r.id === id);
            return [rune?.name.ru ?? "", rune?.name.en ?? ""];
          }),
        ]
          .join(" ")
          .toLowerCase();
        return (
          (!q || searchText.includes(q)) &&
          (!this.socketsFilter.length ||
            this.socketsFilter.includes(word.runes.length)) &&
          (this.reworkedFilter === null ||
            (this.reworkedFilter === "changed"
              ? word.reworked === true
              : !word.reworked)) &&
          (this.blizzlessFilter === null ||
            Boolean(word.marked) === this.blizzlessFilter) &&
          (this.rotwFilter === null || (word.patch === "rotw") === this.rotwFilter) &&
          (this.itemTypeFilter === null ||
            matchesItemType(word.types ?? [], this.itemTypeFilter)) &&
          (!this.favoritesOnly || this.favorites.includes(word.id))
        );
      });
    },
    orderedRunewords(): RunewordTableItem[] {
      const lang = useInfoStore().currentLang;
      const direction = this.sortDirection === "asc" ? 1 : -1;
      return [...this.filteredRunewords].sort((a, b) => {
        if (Boolean(a.complete) !== Boolean(b.complete)) return a.complete ? -1 : 1;
        let result = 0;
        if (this.sortBy === "level") result = a.level - b.level;
        else if (this.sortBy === "sockets") result = a.runes.length - b.runes.length;
        else result = a.name[lang].localeCompare(b.name[lang], lang);
        return direction * (result || a.name[lang].localeCompare(b.name[lang], lang));
      });
    },
    gridFilteredRunewords(state): RunewordTableItem[] {
      return this.orderedRunewords.filter(
        (word) =>
          !state.selectedRunes.length ||
          word.runes.some((id) => state.selectedRunes.includes(id))
      );
    },
    tableSelectedRunewords(state): RunewordTableItem[] {
      return this.sortedRunewords.filter((word) =>
        word.runes.some((id) => state.selectedRunes.includes(id))
      );
    },
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
    toggleFavorite(id: number): void {
      this.favorites = this.favorites.includes(id)
        ? this.favorites.filter((value) => value !== id)
        : [...this.favorites, id];
      localStorage.setItem("blizzless-favorites", JSON.stringify(this.favorites));
    },
    resetVersions(): void {
      this.reworkedFilter = null;
      this.blizzlessFilter = null;
      this.rotwFilter = null;
    },
    resetFilters(): void {
      this.search = "";
      this.searchDebounced = "";
      this.socketsFilter = [];
      this.itemTypeFilter = null;
      this.resetVersions();
      this.favoritesOnly = false;
      this.setSelectedRunes([]);
    },
    setSort(field: RunewordsState["sortBy"]): void {
      this.sortDirection =
        this.sortBy === field && this.sortDirection === "asc" ? "desc" : "asc";
      this.sortBy = field;
    },
  },
});
