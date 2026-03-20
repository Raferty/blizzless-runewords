import { RUNES, ITEM_TYPES } from "@/shared/constants";
import { useInfoStore } from "@/store";
import type { RuneItem, ItemType } from "@/types";

export function useRunes() {
  const store = useInfoStore();

  function findRune(id: number): RuneItem | undefined {
    return RUNES.find((rune: RuneItem) => rune.id === id);
  }

  function getRuneName(id: number | string): string {
    const rune = RUNES.find((r: RuneItem) => r.id === parseInt(String(id)));
    return rune?.name[store.currentLang] ?? "";
  }

  function getTypeName(id: number | string): string {
    const type = ITEM_TYPES.find((t: ItemType) => t.id === parseInt(String(id)));
    return type?.name[store.currentLang] ?? "";
  }

  /** Returns comma-separated type names for an item (for sorting/display) */
  function getTypesSortKey(item: { types?: number[] }): string {
    if (!item.types?.length) return "";
    return item.types.map((t) => getTypeName(t)).join(", ");
  }

  return { findRune, getRuneName, getTypeName, getTypesSortKey };
}
