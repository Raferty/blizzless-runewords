import { RUNES } from "@/shared/constants";

export function useFindRuneById(id) {
  return RUNES.find((rune) => rune.id === id);
}

