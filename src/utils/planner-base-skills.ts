import data from "@/shared/planner-affixes.json";
import { plannerSkills } from "@/shared/planner";
import type { ClassId, PlannerItem } from "@/types/planner";
interface SkillTabMod {
  tab: number;
  min: number;
  max: number;
  level: number;
  requiredLevel: number;
}
interface BaseProfile {
  staffClass?: string;
  skillTabs?: SkillTabMod[];
}
const bases = data.bases as unknown as Record<string, BaseProfile>;
const classes: Record<string, ClassId> = {
  ama: "amazon",
  sor: "sorceress",
  nec: "necromancer",
  pal: "paladin",
  bar: "barbarian",
  dru: "druid",
  ass: "assassin",
  war: "warlock",
};
export function baseSkillProfile(item: PlannerItem) {
  if (
    !["normal", "superior", "magic", "rare", "crafted", "runeword"].includes(item.quality)
  )
    return;
  const base = bases[item.baseCode || ""];
  if (!base || (!base.staffClass && !base.skillTabs?.length)) return;
  return {
    ...base,
    classId: classes[base.staffClass || ""],
    skillTabs: (base.skillTabs || []).filter(
      (mod) => mod.level <= (item.itemLevel ?? 99)
    ),
  };
}
export function baseSkillOptions(item: PlannerItem) {
  const profile = baseSkillProfile(item);
  return plannerSkills.filter((skill) => skill.classId === profile?.classId);
}
export function parseBaseSkills(
  value: unknown,
  item: PlannerItem
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("base skills");
  const entries = Object.entries(value);
  if (entries.length > 3) throw Error("base skills count");
  const allowed = baseSkillOptions(item);
  const result: Record<string, number> = {};
  for (const [id, rank] of entries) {
    if (
      !allowed.some((skill) => String(skill.id) === id) ||
      typeof rank !== "number" ||
      !Number.isInteger(rank) ||
      rank < 1 ||
      rank > 3
    )
      throw Error("base skill range/class");
    result[id] = rank;
  }
  return result;
}
export function parseBaseSkillTab(value: unknown, item: PlannerItem) {
  const mod = value as PlannerItem["baseSkillTab"];
  if (
    !mod ||
    !Number.isInteger(mod.tab) ||
    !Number.isInteger(mod.value) ||
    !baseSkillProfile(item)?.skillTabs.some(
      (row) => row.tab === mod.tab && mod.value >= row.min && mod.value <= row.max
    )
  )
    throw Error("base skill tab");
  return { tab: mod.tab, value: mod.value };
}
export function baseSkillStats(item: PlannerItem) {
  const result: Record<string, number> = {};
  if (item.baseSkills)
    for (const [id, value] of Object.entries(parseBaseSkills(item.baseSkills, item)))
      result[`item_singleskill#${id}`] = value;
  if (item.baseSkillTab) {
    const mod = parseBaseSkillTab(item.baseSkillTab, item);
    result[`item_addskill_tab#${mod.tab}`] = mod.value;
  }
  return result;
}
export function baseSkillRequiredLevel(item: PlannerItem) {
  return Math.max(
    1,
    ...Object.keys(item.baseSkills || {}).map(
      (id) => plannerSkills.find((skill) => skill.id === Number(id))?.requiredLevel || 1
    ),
    ...((item.baseSkillTab &&
      baseSkillProfile(item)
        ?.skillTabs.filter(
          (row) =>
            row.tab === item.baseSkillTab!.tab &&
            item.baseSkillTab!.value >= row.min &&
            item.baseSkillTab!.value <= row.max
        )
        .map((row) => row.requiredLevel)) ||
      [])
  );
}
export function retainBaseSkills(item: PlannerItem) {
  if (item.baseSkills) {
    const allowed = baseSkillOptions(item);
    const rows = Object.fromEntries(
      Object.entries(item.baseSkills).filter(([id]) =>
        allowed.some((skill) => String(skill.id) === id)
      )
    );
    if (Object.keys(rows).length) item.baseSkills = rows;
    else delete item.baseSkills;
  }
  if (item.baseSkillTab)
    try {
      parseBaseSkillTab(item.baseSkillTab, item);
    } catch {
      delete item.baseSkillTab;
    }
}
export function inheritRunewordBase(
  item: PlannerItem,
  previous: PlannerItem,
  allowedBases: string[]
) {
  if (
    item.quality !== "runeword" ||
    !previous.baseCode ||
    !allowedBases.includes(previous.baseCode)
  )
    return;
  item.baseCode = previous.baseCode;
  item.baseKind = previous.baseKind;
  item.itemLevel = previous.itemLevel ?? 99;
  item.ethereal = previous.ethereal;
  if (previous.baseSkills) item.baseSkills = { ...previous.baseSkills };
  if (previous.baseSkillTab) item.baseSkillTab = { ...previous.baseSkillTab };
  if (previous.automod)
    item.automod = { ...previous.automod, values: [...previous.automod.values] };
  if (previous.superiorMod)
    item.superiorMod = {
      ...previous.superiorMod,
      values: [...previous.superiorMod.values],
    };
  retainBaseSkills(item);
}
export function baseSkillDefinition(item: PlannerItem) {
  const definition: Record<string, string | number> = {};
  const rows = [
    ...Object.entries(item.baseSkills || {}).map(([id, value]) => ({
      code: "skill",
      param: Number(id),
      value,
    })),
    ...(item.baseSkillTab
      ? [
          {
            code: "skilltab",
            param: item.baseSkillTab.tab,
            value: item.baseSkillTab.value,
          },
        ]
      : []),
  ];
  rows.forEach((row, index) =>
    Object.assign(definition, {
      [`prop${index + 1}`]: row.code,
      [`par${index + 1}`]: row.param,
      [`min${index + 1}`]: row.value,
      [`max${index + 1}`]: row.value,
    })
  );
  return definition;
}
