import type { LocalizedName } from "./runeword";
import type { WaypointId } from "@/shared/planner-waypoints";

export type ClassId =
  | "amazon"
  | "sorceress"
  | "necromancer"
  | "paladin"
  | "barbarian"
  | "druid"
  | "assassin"
  | "warlock";
export type Attribute = "strength" | "dexterity" | "vitality" | "energy";
export type Difficulty = "normal" | "nightmare" | "hell";
export type EquipmentSlot =
  | "head"
  | "amulet"
  | "mainHand"
  | "armor"
  | "offHand"
  | "gloves"
  | "ringLeft"
  | "belt"
  | "ringRight"
  | "boots"
  | "swapMain"
  | "swapOff";
export interface PlannerClass {
  id: ClassId;
  name: LocalizedName;
  role: LocalizedName;
  color: string;
  icon: string;
  base: Record<Attribute, number>;
  life: number;
  mana: number;
  stamina: number;
  lifePerLevel: number;
  manaPerLevel: number;
  staminaPerLevel: number;
  lifePerVitality: number;
  manaPerEnergy: number;
  staminaPerVitality: number;
  trees: LocalizedName[];
}
export interface PlannerSkill {
  id: number;
  classId: ClassId;
  name: LocalizedName;
  tree: number;
  row: number;
  column: number;
  requiredLevel: number;
  maxPoints: number;
  requires: number[];
  key: string;
  icon: string;
  description: LocalizedName;
  modified: boolean;
  synergies: number[];
}
export type BonusKey =
  | Attribute
  | "life"
  | "mana"
  | "fireResist"
  | "coldResist"
  | "lightningResist"
  | "poisonResist"
  | "allSkills"
  | "fcr"
  | "fhr"
  | "ias"
  | "frw"
  | "magicFind";
export type Bonuses = Partial<Record<BonusKey, number>>;
export interface PlannerAffix {
  id: string;
  values: number[];
}
export interface PlannerItem {
  name: string;
  quality: "normal" | "magic" | "rare" | "unique" | "set" | "runeword" | "crafted";
  runewordId?: number;
  requiredLevel: number;
  notes: string;
  bonuses: Bonuses;
  classBonuses?: Partial<Record<ClassId, number>>;
  baseKind?: "weapon" | "armor" | "shield";
  baseCode?: string;
  catalogId?: string;
  itemLevel?: number;
  sockets?: number;
  socketedItems?: (string | null)[];
  socketPropertyValues?: Record<string, Record<string, number>>;
  affixes?: PlannerAffix[];
  ethereal?: boolean;
  propertyRoll?: 0 | 1;
  propertyValues?: Record<string, number>;
  propertyChoices?: Record<string, number>;
  skillClass?: ClassId;
  stashPosition?: number;
  containerQuantity?: number;
}
export interface PlannerCharm extends PlannerItem {
  id: string;
  position: number;
  height: number;
}
export interface PlannerBuild {
  version: 1;
  name: string;
  classId: ClassId;
  level: number;
  difficulty: Difficulty;
  gold: number;
  hardcore: boolean;
  weaponSet: 0 | 1;
  waypoints: Record<Difficulty, Record<WaypointId, boolean>>;
  quests: Record<
    Difficulty,
    {
      den: boolean;
      radament: boolean;
      izual: boolean;
      lamEsen: boolean;
      anya: boolean;
      goldenBird: boolean;
    }
  >;
  attributes: Record<Attribute, number>;
  skills: Record<number, number>;
  equipment: Partial<Record<EquipmentSlot, PlannerItem>>;
  stash: PlannerItem[];
  charms: PlannerCharm[];
  primarySkills: number[];
  mercenary: {
    type: string;
    level: number;
    equipment: Partial<Record<"head" | "armor" | "mainHand" | "offHand", PlannerItem>>;
  };
  author: string;
  description: string;
  strengths: string;
  weaknesses: string;
  lootFilter: string;
  notes: string;
}
export interface SavedBuild {
  id: string;
  savedAt: string;
  build: PlannerBuild;
}
