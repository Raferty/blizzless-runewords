import { affixRequiredLevel } from "./planner-affixes";
import data from "@/shared/planner-sockets.json";
import { plannerItemIdentity, plannerItemImage } from "./planner-item-art";
import type { Bonuses, ClassId, PlannerItem } from "@/types/planner";

export type SocketCategory = "weapon" | "helm" | "shield";
// Jewelry cannot be socketed, even when misc.txt reserves socket bits for it.
export const baseSupportsSockets = (code?: string) => code !== "rin" && code !== "amu";
export interface SocketBonuses {
  bonuses: Bonuses;
  classBonuses: Partial<Record<ClassId, number>>;
  skillBonuses?: Record<string, number>;
}
export interface SocketInsert {
  code: string;
  name: { ru: string; en: string };
  image_url: string;
  group: "rune" | "gem" | "facet" | "jewel";
  baseCode?: string;
  ranges?: Record<string, { min: number; max: number }>;
  rollEffects?: Record<string, SocketBonuses>;
  requiredLevel: number;
  effects: Record<SocketCategory, SocketBonuses>;
}
export const magicSocketJewels: Record<
  string,
  {
    name: SocketInsert["name"];
    requiredLevel: number;
    definition: Record<string, string | number>;
  }
> = {
  j15fr: {
    name: { en: "Ruby Jewel of Fervor", ru: "Рубиновый самоцвет стремительности" },
    requiredLevel: 31,
    definition: {
      prop1: "swing2",
      min1: 15,
      max1: 15,
      prop2: "res-fire",
      min2: 30,
      max2: 30,
    },
  },
  j15ar: {
    name: {
      en: "Jewel of Fervor and Accuracy",
      ru: "Самоцвет стремительности и меткости",
    },
    requiredLevel: 31,
    definition: {
      prop1: "swing2",
      min1: 15,
      max1: 15,
      prop2: "att",
      min2: 100,
      max2: 100,
    },
  },
};
export const socketInserts = data.items as SocketInsert[];
export const socketInsertByCode = new Map(socketInserts.map((item) => [item.code, item]));
export function socketInsertVisual(code: string, iconIndex?: number) {
  const insert = socketInsertByCode.get(code);
  return insert &&
    iconIndex !== undefined &&
    insert.group === "jewel" &&
    insert.baseCode === "jew"
    ? {
        ...insert,
        image_url: `/${plannerItemImage({ baseCode: "jew", quality: "magic", iconIndex })}`,
      }
    : insert;
}
export function parseSocketIconIndices(value: unknown, codes: (string | null)[] = []) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("socket icons");
  const result: NonNullable<PlannerItem["socketIconIndices"]> = {};
  for (const [index, iconIndex] of Object.entries(value)) {
    const insert = /^[0-5]$/.test(index)
      ? socketInsertByCode.get(codes[Number(index)] ?? "")
      : undefined;
    if (
      insert?.group !== "jewel" ||
      insert.baseCode !== "jew" ||
      typeof iconIndex !== "number" ||
      !Number.isInteger(iconIndex) ||
      iconIndex < 0 ||
      iconIndex > 5
    )
      throw new Error("socket icon range");
    result[index] = iconIndex;
  }
  return result;
}
const bases = data.bases as Record<string, SocketCategory>;
export function socketCategory(item: PlannerItem): SocketCategory {
  const { baseCode } = plannerItemIdentity(item);
  return (
    bases[baseCode ?? ""] ||
    (item.baseKind === "weapon"
      ? "weapon"
      : item.baseKind === "shield"
        ? "shield"
        : "helm")
  );
}
export function socketedBonuses(item: PlannerItem): SocketBonuses {
  const result: SocketBonuses = { bonuses: {}, classBonuses: {}, skillBonuses: {} };
  if (item.quality === "runeword") return result;
  const category = socketCategory(item);
  for (const [index, code] of (item.socketedItems ?? []).entries()) {
    const insert = code ? socketInsertByCode.get(code) : undefined;
    const effect = insert?.effects[category];
    if (!effect) continue;
    const values = item.socketPropertyValues?.[index] ?? {};
    for (const [key, value] of Object.entries(effect.bonuses)) {
      const bonus = key as keyof Bonuses;
      const adjustment = Object.entries(values).reduce((sum, [property, roll]) => {
        const range = insert?.ranges?.[property];
        return (
          sum +
          (range
            ? (roll - range.max) * (insert?.rollEffects?.[property]?.bonuses[bonus] ?? 0)
            : 0)
        );
      }, 0);
      result.bonuses[bonus] = (result.bonuses[bonus] ?? 0) + value! + adjustment;
    }
    for (const [key, value] of Object.entries(effect.classBonuses)) {
      const id = key as ClassId;
      result.classBonuses[id] = (result.classBonuses[id] ?? 0) + value!;
    }
    for (const [id, value] of Object.entries(effect.skillBonuses ?? {}))
      result.skillBonuses![id] = (result.skillBonuses![id] ?? 0) + value;
  }
  return result;
}
export function socketInsertItem(
  code: string,
  values?: Record<string, number>
): PlannerItem | undefined {
  const insert = socketInsertByCode.get(code);
  if (!insert?.baseCode || magicSocketJewels[code]) return;
  return {
    name: insert.name.en,
    quality: "unique",
    catalogId: code,
    baseCode: insert.baseCode,
    requiredLevel: insert.requiredLevel,
    notes: "",
    bonuses: {},
    propertyRoll: 1,
    propertyValues: values,
  };
}
export function parseSocketPropertyValues(value: unknown, codes: (string | null)[] = []) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("socket rolls");
  const result: NonNullable<PlannerItem["socketPropertyValues"]> = {};
  for (const [index, properties] of Object.entries(value)) {
    const insert = /^[0-5]$/.test(index)
      ? socketInsertByCode.get(codes[Number(index)] ?? "")
      : undefined;
    if (
      !insert?.ranges ||
      !properties ||
      typeof properties !== "object" ||
      Array.isArray(properties)
    )
      throw new Error("socket rolls");
    result[index] = {};
    for (const [property, roll] of Object.entries(properties)) {
      const range = insert.ranges[property];
      if (
        !range ||
        typeof roll !== "number" ||
        !Number.isInteger(roll) ||
        roll < range.min ||
        roll > range.max
      )
        throw new Error("socket roll range");
      result[index][property] = roll;
    }
  }
  return result;
}
export function itemRequiredLevel(item: PlannerItem): number {
  return Math.max(
    item.requiredLevel,
    affixRequiredLevel(item),
    ...(item.socketedItems ?? []).map((code) =>
      code ? (socketInsertByCode.get(code)?.requiredLevel ?? 1) : 1
    )
  );
}
