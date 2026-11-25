import type { Attribute, ClassId, PlannerItem } from "@/types/planner";
import type { GameSaveExporter } from "./planner-game-save";
import { plannerItemIdentity } from "./planner-item-art";
import { combatItemStats } from "./planner-damage";
import { itemRequiredLevel } from "./planner-sockets";

export interface ItemRequirementStatus {
  level: { required: number; current: number; met: boolean };
  attributes: { key: Attribute; required: number; current: number; met: boolean }[];
  classMet: boolean;
  unmet: boolean;
}

export function itemRequirements(
  native: GameSaveExporter | undefined,
  item: PlannerItem,
  classId: ClassId,
  attributes: Record<Attribute, number>,
  level: number
): ItemRequirementStatus {
  const identity = plannerItemIdentity(item);
  const base = native?.gd.items[identity.baseCode ?? ""];
  const resolved = { ...item, ...identity, propertyRoll: item.propertyRoll ?? 1 };
  const definition = native?.itemDefinition(resolved);
  const requiredLevel = Math.max(
    itemRequiredLevel(item),
    native?.baseModifierRequiredLevel(resolved) ?? 1,
    base?.levelreq ?? 1,
    Number(definition?.lvlreq ?? 1)
  );
  const stats = native && base ? combatItemStats(native, resolved, classId) : {};
  const percent = stats.item_req_percent ?? 0;
  const ethereal = item.ethereal || stats.item_ethereal ? 10 : 0;
  // The game applies the truncated percentage adjustment, then the ethereal -10.
  const required = (value: number) =>
    Math.max(0, value + Math.trunc((value * percent) / 100) - ethereal);
  const requirements = (
    [
      ["strength", base && "reqstr" in base ? base.reqstr : 0],
      ["dexterity", base && "reqdex" in base ? base.reqdex : 0],
    ] as const
  ).flatMap(([key, value]) => {
    const amount = required(Number(value ?? 0));
    return amount > 0
      ? [
          {
            key,
            required: amount,
            current: attributes[key],
            met: attributes[key] >= amount,
          },
        ]
      : [];
  });
  const restricted = base && native?.baseCharacteristics(base.code, classId)?.classId;
  const classMet = !restricted || restricted === classId;
  return {
    classMet,
    level: { required: requiredLevel, current: level, met: level >= requiredLevel },
    attributes: requirements,
    unmet: !classMet || level < requiredLevel || requirements.some((requirement) => !requirement.met),
  };
}
