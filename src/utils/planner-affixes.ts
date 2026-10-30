import data from "@/shared/planner-affixes.json";
import type { Bonuses, ClassId, PlannerAffix, PlannerItem } from "@/types/planner";

export interface AffixMod {
  code: string;
  param: string | number;
  min: number;
  max: number;
  variable: boolean;
  low: Record<string, number>;
  high: Record<string, number>;
}
export interface ItemAffix {
  id: string;
  kind: "prefix" | "suffix";
  name: string;
  group: number;
  rare: boolean;
  level: number;
  requiredLevel: number;
  maxLevel: number;
  types: string[];
  exclude: string[];
  classSpecific: string;
  mods: AffixMod[];
}
interface AffixBase {
  level: number;
  magicLevel: number;
  types: string[];
  classSpecific: string;
  rare: boolean;
  maxSockets: number;
}
export const itemAffixes = data.affixes as ItemAffix[];
export const affixById = new Map(itemAffixes.map((affix) => [affix.id, affix]));
const bases = data.bases as Record<string, AffixBase>;
export const canBeRare = (code: string) => !!bases[code]?.rare;
export const editableQuality = (quality: PlannerItem["quality"]) =>
  quality === "magic" || quality === "rare" || quality === "crafted";
export function affixLevel(item: PlannerItem) {
  const base = bases[item.baseCode ?? ""];
  if (!base) return 0;
  const ilvl = Math.max(base.level, Math.min(99, item.itemLevel ?? 99));
  return Math.min(
    99,
    base.magicLevel
      ? ilvl + base.magicLevel
      : ilvl < 99 - Math.floor(base.level / 2)
        ? ilvl - Math.floor(base.level / 2)
        : 2 * ilvl - 99
  );
}
export function affixFits(affix: ItemAffix, item: PlannerItem) {
  const base = bases[item.baseCode ?? ""];
  const level = affixLevel(item);
  return (
    !!base &&
    editableQuality(item.quality) &&
    (item.quality === "magic" || (base.rare && affix.rare)) &&
    affix.level <= level &&
    (!affix.maxLevel || level <= affix.maxLevel) &&
    (!affix.classSpecific ||
      !base.classSpecific ||
      affix.classSpecific === base.classSpecific) &&
    affix.types.some((type) => base.types.includes(type)) &&
    !affix.exclude.some((type) => base.types.includes(type))
  );
}
export function canAddAffix(affix: ItemAffix, item: PlannerItem) {
  const selected = (item.affixes ?? []).map((a) => affixById.get(a.id)!);
  return (
    affixFits(affix, item) &&
    (item.quality !== "crafted" || selected.length < 4) &&
    selected.filter((a) => a.kind === affix.kind).length <
      (item.quality === "magic" ? 1 : 3) &&
    !selected.some((a) => a.kind === affix.kind && a.group === affix.group)
  );
}
export function newAffix(affix: ItemAffix): PlannerAffix {
  return { id: affix.id, values: affix.mods.map((mod) => (mod.variable ? mod.max : 0)) };
}
export function parseAffixes(value: unknown, item: PlannerItem): PlannerAffix[] {
  if (
    !Array.isArray(value) ||
    value.length > 6 ||
    (!editableQuality(item.quality) && value.length)
  )
    throw new Error("affixes");
  const result: PlannerAffix[] = [];
  for (const row of value) {
    const affix = affixById.get(row?.id);
    if (
      !affix ||
      !canAddAffix(affix, { ...item, affixes: result }) ||
      !Array.isArray(row.values) ||
      row.values.length !== affix.mods.length ||
      affix.mods.some(
        (mod, i) =>
          !Number.isInteger(row.values[i]) ||
          (mod.variable
            ? row.values[i] < mod.min || row.values[i] > mod.max
            : row.values[i] !== 0)
      )
    )
      throw new Error("affixes");
    result.push({ id: affix.id, values: [...row.values] });
  }
  return result;
}
export function retainCompatibleAffixes(item: PlannerItem) {
  const result: PlannerAffix[] = [];
  for (const row of item.affixes ?? []) {
    const affix = affixById.get(row.id);
    if (affix && canAddAffix(affix, { ...item, affixes: result })) result.push(row);
  }
  return result;
}
export function affixStats(item: PlannerItem) {
  const stats: Record<string, number> = {};
  for (const row of item.affixes ?? []) {
    const affix = affixById.get(row.id);
    if (!affix) continue;
    affix.mods.forEach((mod, i) => {
      const ratio = mod.variable ? (row.values[i] - mod.min) / (mod.max - mod.min) : 0;
      for (const key of new Set([...Object.keys(mod.low), ...Object.keys(mod.high)])) {
        const low = mod.low[key] ?? 0,
          high = mod.high[key] ?? 0;
        stats[key] = (stats[key] ?? 0) + Math.round(low + (high - low) * ratio);
      }
    });
  }
  return stats;
}
const bonusStats = {
  strength: "strength",
  dexterity: "dexterity",
  vitality: "vitality",
  energy: "energy",
  life: "maxhp",
  mana: "maxmana",
  fireResist: "fireresist",
  coldResist: "coldresist",
  lightningResist: "lightresist",
  poisonResist: "poisonresist",
  allSkills: "item_allskills",
  fcr: "item_fastercastrate",
  fhr: "item_fastergethitrate",
  ias: "item_fasterattackrate",
  frw: "item_fastermovevelocity",
  magicFind: "item_magicbonus",
} as const;
const classes: ClassId[] = [
  "amazon",
  "sorceress",
  "necromancer",
  "paladin",
  "barbarian",
  "druid",
  "assassin",
  "warlock",
];
export function affixBonuses(item: PlannerItem, level: number) {
  const stats = affixStats(item);
  // Per-level stats store eighths in ItemStatCost; apply once at the hero's level.
  for (const [stat, target] of Object.entries({
    item_hp_perlevel: "maxhp",
    item_mana_perlevel: "maxmana",
    item_strength_perlevel: "strength",
    item_dexterity_perlevel: "dexterity",
    item_vitality_perlevel: "vitality",
    item_energy_perlevel: "energy",
    item_find_magic_perlevel: "item_magicbonus",
  })) {
    stats[target] = (stats[target] ?? 0) + Math.floor(((stats[stat] ?? 0) * level) / 8);
  }
  return {
    bonuses: Object.fromEntries(
      Object.entries(bonusStats).map(([key, stat]) => [key, stats[stat] ?? 0])
    ) as Bonuses,
    classBonuses: Object.fromEntries(
      classes.map((id, index) => [id, stats[`item_addclassskills#${index}`] ?? 0])
    ) as Record<ClassId, number>,
    treeBonuses: Object.fromEntries(
      classes.map((id, index) => [
        id,
        [0, 1, 2].map((tree) => stats[`item_addskill_tab#${index * 3 + tree}`] ?? 0),
      ])
    ) as Record<ClassId, number[]>,
    stats,
  };
}
export function affixRequiredLevel(item: PlannerItem) {
  const level = Math.max(
    0,
    ...(item.affixes ?? []).map((a) => affixById.get(a.id)?.requiredLevel ?? 1)
  );
  return item.quality === "crafted"
    ? Math.min(98, level + 10 + 3 * (item.affixes?.length ?? 0))
    : Math.max(1, level);
}
export function affixSockets(item: PlannerItem) {
  return Math.min(
    bases[item.baseCode ?? ""]?.maxSockets ?? 0,
    affixStats(item).item_numsockets ?? 0
  );
}
export function affixDefinition(affix: ItemAffix, values?: number[]) {
  return Object.fromEntries(
    affix.mods.flatMap((mod, i) => [
      [`prop${i + 1}`, mod.code],
      [`par${i + 1}`, mod.param],
      [`min${i + 1}`, mod.variable && values ? values[i] : mod.min],
      [`max${i + 1}`, mod.variable && values ? values[i] : mod.max],
    ])
  );
}
