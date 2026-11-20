import data from "@/shared/planner-supplies.json";
import type { PlannerItem } from "@/types/planner";
import type { GameSaveExporter } from "./planner-game-save";

interface Supply {
  name: string;
  category: string;
  catalogId?: string;
}
export interface RecipeInput {
  codes: string[];
  quality: "normal" | "magic";
  ethereal?: boolean;
  count: number;
}
export interface RecipeInputVariant {
  parts: RecipeInput[];
  outputEthereal: boolean;
  sourceRows: number[];
}
export const stashSupplies: Record<string, Supply> = data.supplies;
export const uberQuestIngredients = [
  {
    id: "ancients",
    ru: "Убер-древние",
    en: "Uber Ancients",
    codes: ["ua1", "ua2", "ua3", "ua4", "ua5"],
  },
  {
    id: "tristram",
    ru: "Убер-Тристрам",
    en: "Uber Tristram",
    codes: ["pk1", "pk2", "pk3", "dhn", "bey", "mbr"],
  },
  {
    id: "bartuc",
    ru: "Бартук",
    en: "Bartuc",
    codes: ["p14", "p20", "p21"],
  },
] as const;
export const recipeInputs: Record<string, RecipeInputVariant[]> = data.recipes as Record<
  string,
  RecipeInputVariant[]
>;
export const stashKits = [
  {
    id: "bartuc",
    ru: "Вход к Бартуку",
    en: "Bartuc portal ingredients",
    codes: ["p14", "p20", "p21"],
  },
  {
    id: "respec",
    ru: "Набор для сброса",
    en: "Respec set",
    codes: ["toa", "tes", "ceh", "bet", "fed"],
  },
  {
    id: "organs",
    ru: "Органы Uber Tristram",
    en: "Uber Tristram organs",
    codes: ["dhn", "bey", "mbr"],
  },
  {
    id: "act2",
    ru: "Квестовый набор · Акт II",
    en: "Quest set · Act II",
    codes: ["msf", "vip", "hst"],
  },
  {
    id: "act3",
    ru: "Квестовый набор · Акт III",
    en: "Quest set · Act III",
    codes: ["qey", "qhr", "qbr", "qf1", "qf2"],
  },
  {
    id: "worldstone-shards",
    ru: "Шарды актов I–V",
    en: "Act I–V Worldstone Shards",
    codes: ["xa1", "xa2", "xa3", "xa4", "xa5"],
  },
] as const;

/** A physical loose item, never a similarly named stack container. */
export function createStashSupply(native: GameSaveExporter, code: string): PlannerItem {
  const supply = stashSupplies[code];
  const base = native.gd.items[code];
  if (!supply || !base) throw Error("Unknown stash supply");
  const item: PlannerItem = {
    name: supply.name,
    baseCode: code,
    quality: supply.catalogId ? "unique" : "normal",
    ...(supply.catalogId ? { catalogId: supply.catalogId, propertyRoll: 1 } : {}),
    requiredLevel: Math.max(1, base.levelreq || 1),
    itemLevel: 99,
    bonuses: {},
    notes: "",
  };
  if (supply.catalogId)
    Object.assign(item, native.catalogBonuses(supply.catalogId, "unique", 1));
  return item;
}

export function createRecipeIngredients(
  native: GameSaveExporter,
  recipeId: string,
  variantIndex: number,
  codes: string[]
): PlannerItem[] {
  const variant = recipeInputs[recipeId]?.[variantIndex];
  if (!variant || codes.length !== variant.parts.length)
    throw Error("Invalid recipe inputs");
  return variant.parts.flatMap((part, index) => {
    const code = codes[index];
    if (!part.codes.includes(code)) throw Error("Invalid recipe ingredient");
    const base = native.gd.items[code];
    const name = native.gd.locale.strings[base.namestr] || base.name;
    return Array.from({ length: part.count }, (): PlannerItem => ({
      name,
      baseCode: code,
      quality: part.quality,
      ...(part.ethereal ? { ethereal: true } : {}),
      requiredLevel: Math.max(1, base.levelreq || 1),
      itemLevel: 99,
      bonuses: {},
      notes: "",
    }));
  });
}
