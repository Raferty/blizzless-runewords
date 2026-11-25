import { RUNEWORDS } from "@/shared/runewords";
import { REWORKED_RUNEWORDS } from "@/shared/reworked-runewords";
import { ROTW_RUNEWORDS } from "@/shared/rotw-runewords";
import { CUSTOM_RUNEWORDS } from "@/shared/custom-runewords";
import pureRunewords from "@/shared/planner-pure-runewords.json";
import { runewordNames } from "./runeword";

export const plannerRunewords = [
  ...RUNEWORDS,
  ...REWORKED_RUNEWORDS,
  ...CUSTOM_RUNEWORDS,
  ...ROTW_RUNEWORDS,
];

export function findPlannerRuneword(item: { name: string; runewordId?: number }) {
  const name = item.name.trim().toLowerCase();
  return plannerRunewords.find((word) =>
    item.runewordId === undefined
      ? runewordNames(word).some((alias) => alias.toLowerCase() === name)
      : word.id === item.runewordId
  );
}

export function runeSequences(normal: string[]) {
  const variants: Record<string, string[][]> = pureRunewords;
  return normal.length ? [normal, ...(variants[normal.join(",")] ?? [])] : [];
}
