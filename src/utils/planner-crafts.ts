import data from "@/shared/planner-crafts.json";
import type { PlannerItem } from "@/types/planner";
import type { LocalizedName } from "@/types/runeword";
import type { GameSaveExporter } from "./planner-game-save";
import type { ClassId } from "@/types/planner";
import { affixById, canAddAffix, newAffix } from "./planner-affixes";

export interface CraftVariant {
  ethereal: boolean;
  bases: string[];
  definition: Record<string, string | number>;
  preferredAffixes: string[];
  levels: { level: number; character: number; input: number };
  sourceRows: number[];
}
export interface CraftTemplate {
  id: string;
  name: LocalizedName;
  variants: CraftVariant[];
}
export const plannerCrafts = data.templates as CraftTemplate[];
export const craftById = new Map(plannerCrafts.map((row) => [row.id, row]));
export const unavailableCrafts = data.unavailable;
export function craftVariant(
  item: Pick<PlannerItem, "craftId" | "baseCode" | "ethereal">
) {
  return craftById
    .get(item.craftId ?? "")
    ?.variants.find(
      (row) => row.ethereal === !!item.ethereal && row.bases.includes(item.baseCode ?? "")
    );
}
export function craftDefinition(item: PlannerItem) {
  if (!item.craftId) return;
  const variant = craftVariant(item);
  if (item.quality !== "crafted" || !variant)
    throw Error("Invalid crafting recipe or base");
  return variant.definition;
}
export const craftAffixMinimum = (level: number) =>
  level > 70 ? 4 : level > 50 ? 3 : level > 30 ? 2 : 1;
export function craftedItemLevel(
  variant: CraftVariant,
  characterLevel: number,
  inputLevel = 99
) {
  const { level, character, input } = variant.levels;
  return Math.min(
    99,
    Math.max(
      1,
      level +
        Math.floor((characterLevel * character) / 100) +
        Math.floor((inputLevel * input) / 100)
    )
  );
}
export function createCraftedItem(
  native: GameSaveExporter,
  craftId: string,
  baseCode: string,
  characterLevel: number,
  classId: ClassId
): PlannerItem {
  const craft = craftById.get(craftId);
  const variant =
    craft?.variants.find((row) => !row.ethereal && row.bases.includes(baseCode)) ??
    craft?.variants.find((row) => row.bases.includes(baseCode));
  if (!craft || !variant) throw Error("Invalid crafting recipe or base");
  const base = native.gd.items[baseCode];
  const item: PlannerItem = {
    name: craft.name.en,
    quality: "crafted",
    craftId,
    baseCode,
    requiredLevel: Math.max(1, base.levelreq ?? 1),
    itemLevel: craftedItemLevel(variant, characterLevel),
    ethereal: variant.ethereal,
    bonuses: {},
    notes: "",
    sockets: 0,
    propertyRoll: 0,
    affixes: [],
  };
  for (const id of variant.preferredAffixes) {
    const affix = affixById.get(id);
    if (affix && canAddAffix(affix, item)) item.affixes!.push(newAffix(affix));
  }
  Object.assign(item, native.itemBonuses(item, classId));
  return item;
}
