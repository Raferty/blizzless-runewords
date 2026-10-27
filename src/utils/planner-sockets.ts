import { affixRequiredLevel } from "./planner-affixes";
import data from "@/shared/planner-sockets.json";
import { plannerItemIdentity } from "./planner-item-art";
import type { Bonuses, ClassId, PlannerItem } from "@/types/planner";

export type SocketCategory = "weapon" | "helm" | "shield";
export interface SocketBonuses {
  bonuses: Bonuses;
  classBonuses: Partial<Record<ClassId, number>>;
}
export interface SocketInsert {
  code: string;
  name: { ru: string; en: string };
  image_url: string;
  group: "rune" | "gem";
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
  const result: SocketBonuses = { bonuses: {}, classBonuses: {} };
  if (item.quality === "runeword") return result;
  const category = socketCategory(item);
  for (const code of item.socketedItems ?? []) {
    const effect = code ? socketInsertByCode.get(code)?.effects[category] : undefined;
    if (!effect) continue;
    for (const [key, value] of Object.entries(effect.bonuses)) {
      const bonus = key as keyof Bonuses;
      result.bonuses[bonus] = (result.bonuses[bonus] ?? 0) + value!;
    }
    for (const [key, value] of Object.entries(effect.classBonuses)) {
      const id = key as ClassId;
      result.classBonuses[id] = (result.classBonuses[id] ?? 0) + value!;
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
