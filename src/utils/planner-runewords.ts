import data from "@/shared/planner-runewords.json";
import type { Bonuses, BonusKey, ClassId, PlannerItem } from "@/types/planner";

export interface RunewordTemplate {
  name: string;
  kind: NonNullable<PlannerItem["baseKind"]>;
  ranges: Partial<Record<BonusKey, [number, number]>>;
  classRanges: Partial<Record<ClassId, [number, number]>>;
  unsupported: number;
}
export const plannerRunewords = data.items as RunewordTemplate[];
const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[’‘']/g, "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .trim();
export const runewordTemplates = (name: string) => {
  // Runes.txt retains the old Hustle comments; the client names the two recipes
  // separately. Keep old saved names usable and each renamed recipe in its base.
  const renamed = {
    hysteria: { name: "Hustle", kind: "armor" },
    mania: { name: "Hustle", kind: "weapon" },
  }[normalize(name)];
  return plannerRunewords.filter(
    (word) =>
      normalize(word.name) === normalize(renamed?.name ?? name) &&
      (!renamed || word.kind === renamed.kind)
  );
};
export function runewordBonuses(template: RunewordTemplate, roll: 0 | 1) {
  return {
    bonuses: Object.fromEntries(
      Object.entries(template.ranges).map(([key, range]) => [key, range[roll]])
    ) as Bonuses,
    classBonuses: Object.fromEntries(
      Object.entries(template.classRanges).map(([key, range]) => [key, range[roll]])
    ) as Partial<Record<ClassId, number>>,
  };
}
