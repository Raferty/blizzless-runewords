import type { ClassId, PlannerItem } from "@/types/planner";

export const propertyClasses: ClassId[] = [
  "amazon",
  "sorceress",
  "necromancer",
  "paladin",
  "barbarian",
  "druid",
  "assassin",
  "warlock",
];

type PropertyGroups = Record<string, { [key: string]: unknown }>;

export function propertyGroupOptions(group: PropertyGroups[string] | undefined) {
  if (!group || group.pickmode !== 2) return [];
  return Array.from({ length: 20 }, (_, n) => n + 1).filter(
    (option) => group[`prop${option}`] && Number(group[`chance${option}`] ?? 0) > 0
  );
}

export function resolvePropertyGroups(
  definition: Record<string, unknown>,
  groups: PropertyGroups = {},
  choices: PlannerItem["propertyChoices"] = {}
) {
  const result = { ...definition };
  for (const key of Object.keys(choices))
    if (!/^(?:[1-9]|1[0-2])$/.test(key) || !groups[String(definition[`prop${key}`])])
      throw new Error("Invalid property group");
  for (let index = 1; index <= 12; index++) {
    const group = groups[String(definition[`prop${index}`])];
    if (!group) continue;
    const options = propertyGroupOptions(group);
    const selected = choices[index] ?? options[0];
    if (!options.includes(selected)) throw new Error("Invalid property choice");
    result[`prop${index}`] = group[`prop${selected}`];
    result[`par${index}`] = group[`modparam${selected}`];
    result[`min${index}`] = group[`modmin${selected}`];
    result[`max${index}`] = group[`modmax${selected}`];
  }
  return result;
}

export function propertyRange(
  definition: Record<string, unknown>,
  property: object,
  index: number
) {
  const p = property as Record<string, unknown>;
  const min = Number(definition[`min${index}`] ?? 0);
  const max = Number(definition[`max${index}`] ?? min);
  // These columns encode separate values (damage endpoints, skill IDs, charges,
  // proc chance/level), not a random numeric roll.
  const special = [11, 12, 14, 15, 16, 17, 19, 20, 23, 25, 36];
  if (
    min >= max ||
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    Array.from({ length: 7 }, (_, i) => Number(p[`func${i + 1}`] ?? 0)).some((fn) =>
      special.includes(fn)
    )
  )
    return;
  return { min, max };
}

export function resolvePropertyValues(
  definition: Record<string, unknown>,
  properties: Record<string, object>,
  values: PlannerItem["propertyValues"] = {}
) {
  const result = { ...definition } as Record<string, string | number | undefined>;
  for (const [key, value] of Object.entries(values)) {
    const index = Number(key);
    const property = properties[String(definition[`prop${index}`] ?? "")];
    const range = property && propertyRange(definition, property, index);
    if (!range || !Number.isInteger(value) || value < range.min || value > range.max)
      throw new Error("Invalid property roll");
    result[`min${index}`] = value;
    result[`max${index}`] = value;
  }
  return result;
}

export const isClassCharm = (item: PlannerItem) =>
  item.quality === "unique" &&
  (item.catalogId === "unique400" ||
    /^(Hellfire Torch|Факел адского пламени)$/i.test(item.name));

export function itemSkillClass(item: PlannerItem, fallback: ClassId): ClassId {
  return (
    item.skillClass ??
    propertyClasses.find((id) => (item.classBonuses?.[id] ?? 0) > 0) ??
    fallback
  );
}

export function normalizeClassCharm(item: PlannerItem, fallback: ClassId) {
  if (!isClassCharm(item)) return;
  item.skillClass = itemSkillClass(item, fallback);
  item.classBonuses = { [item.skillClass]: 3 };
}
