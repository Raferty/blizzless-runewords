import { affixRequiredLevel } from "./planner-affixes";
import data from "@/shared/planner-sockets.json";
import { plannerItemIdentity } from "./planner-item-art";
import type { Bonuses, ClassId, PlannerItem } from "@/types/planner";

export type SocketCategory = "weapon" | "helm" | "shield";
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
export const socketInserts = data.items as SocketInsert[];
export const socketInsertByCode = new Map(socketInserts.map((item) => [item.code, item]));
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
  if (!insert?.baseCode) return;
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
