import catalog from "./planner-catalog.json";
import type {
  Attribute,
  BonusKey,
  EquipmentSlot,
  PlannerClass,
  PlannerSkill,
} from "@/types/planner";

export const plannerClasses = catalog.classes as PlannerClass[];
export const plannerSkills = catalog.skills as PlannerSkill[];
export const plannerSource = catalog.source;
export const attributes: { key: Attribute; ru: string; en: string }[] = [
  { key: "strength", ru: "Сила", en: "Strength" },
  { key: "dexterity", ru: "Ловкость", en: "Dexterity" },
  { key: "vitality", ru: "Живучесть", en: "Vitality" },
  { key: "energy", ru: "Энергия", en: "Energy" },
];
export const bonusFields: { key: BonusKey; ru: string; en: string; percent?: boolean }[] =
  [
    ...attributes,
    { key: "life", ru: "Жизнь", en: "Life" },
    { key: "mana", ru: "Мана", en: "Mana" },
    { key: "allSkills", ru: "Все навыки", en: "All skills" },
    { key: "fireResist", ru: "Сопр. огню", en: "Fire resist", percent: true },
    { key: "coldResist", ru: "Сопр. холоду", en: "Cold resist", percent: true },
    { key: "lightningResist", ru: "Сопр. молнии", en: "Lightning resist", percent: true },
    { key: "poisonResist", ru: "Сопр. яду", en: "Poison resist", percent: true },
    { key: "fcr", ru: "Скорость чар (FCR)", en: "Cast rate (FCR)", percent: true },
    { key: "fhr", ru: "Восст. от удара (FHR)", en: "Hit recovery (FHR)", percent: true },
    { key: "ias", ru: "Скорость атаки (IAS)", en: "Attack speed (IAS)", percent: true },
    { key: "frw", ru: "Бег / ходьба (FRW)", en: "Run / walk (FRW)", percent: true },
    { key: "magicFind", ru: "Маг. находки (MF)", en: "Magic find (MF)", percent: true },
  ];
export const equipmentSlots: {
  key: EquipmentSlot;
  ru: string;
  en: string;
  icon: string;
  row: number;
  column: number;
}[] = [
  { key: "head", ru: "Шлем", en: "Helm", icon: "helm", row: 1, column: 2 },
  { key: "amulet", ru: "Амулет", en: "Amulet", icon: "amulet", row: 1, column: 3 },
  { key: "mainHand", ru: "Оружие", en: "Weapon", icon: "sword", row: 2, column: 1 },
  { key: "armor", ru: "Доспех", en: "Body armor", icon: "armor", row: 2, column: 2 },
  { key: "offHand", ru: "Левая рука", en: "Off-hand", icon: "shield", row: 2, column: 3 },
  { key: "gloves", ru: "Перчатки", en: "Gloves", icon: "gloves", row: 3, column: 1 },
  { key: "belt", ru: "Пояс", en: "Belt", icon: "belt", row: 3, column: 2 },
  { key: "boots", ru: "Сапоги", en: "Boots", icon: "boots", row: 3, column: 3 },
  { key: "ringLeft", ru: "Кольцо I", en: "Ring I", icon: "ring", row: 4, column: 1 },
  { key: "ringRight", ru: "Кольцо II", en: "Ring II", icon: "ring", row: 4, column: 3 },
];
export const difficulties = [
  { value: "normal", ru: "Обычная", en: "Normal", penalty: 0 },
  { value: "nightmare", ru: "Кошмар", en: "Nightmare", penalty: -40 },
  { value: "hell", ru: "Ад", en: "Hell", penalty: -100 },
] as const;
export const quests = [
  {
    key: "den",
    act: 1,
    ru: "Логово зла",
    en: "Den of Evil",
    reward: "+1",
    kind: "skill",
  },
  {
    key: "radament",
    act: 2,
    ru: "Радамент",
    en: "Radament",
    reward: "+1",
    kind: "skill",
  },
  {
    key: "goldenBird",
    act: 3,
    ru: "Золотая птица",
    en: "The Golden Bird",
    reward: "+20",
    kind: "life",
  },
  {
    key: "lamEsen",
    act: 3,
    ru: "Книга Лам Эсена",
    en: "Lam Esen’s Tome",
    reward: "+5",
    kind: "attributes",
  },
  { key: "izual", act: 4, ru: "Изуал", en: "Izual", reward: "+2", kind: "skill" },
  { key: "anya", act: 5, ru: "Аня", en: "Anya", reward: "+10%", kind: "resist" },
] as const;
export const mercenaries = [
  { value: "none", ru: "Без наёмника", en: "No mercenary", act: 0 },
  {
    value: "rogue-fire",
    ru: "Акт I · Разбойница · Огонь",
    en: "Act I · Rogue · Fire",
    act: 1,
  },
  {
    value: "rogue-cold",
    ru: "Акт I · Разбойница · Холод",
    en: "Act I · Rogue · Cold",
    act: 1,
  },
  {
    value: "desert-prayer",
    ru: "Акт II · Пустынник · Молитва",
    en: "Act II · Desert · Prayer",
    act: 2,
  },
  {
    value: "desert-defiance",
    ru: "Акт II · Пустынник · Непокорность",
    en: "Act II · Desert · Defiance",
    act: 2,
  },
  {
    value: "desert-blessed-aim",
    ru: "Акт II · Пустынник · Меткость",
    en: "Act II · Desert · Blessed Aim",
    act: 2,
  },
  {
    value: "desert-thorns",
    ru: "Акт II · Пустынник · Шипы",
    en: "Act II · Desert · Thorns",
    act: 2,
  },
  {
    value: "desert-holy-freeze",
    ru: "Акт II · Пустынник · Священный холод",
    en: "Act II · Desert · Holy Freeze",
    act: 2,
  },
  {
    value: "desert-might",
    ru: "Акт II · Пустынник · Мощь",
    en: "Act II · Desert · Might",
    act: 2,
  },
  {
    value: "wolf-fire",
    ru: "Акт III · Железный волк · Огонь",
    en: "Act III · Iron Wolf · Fire",
    act: 3,
  },
  {
    value: "wolf-cold",
    ru: "Акт III · Железный волк · Холод",
    en: "Act III · Iron Wolf · Cold",
    act: 3,
  },
  {
    value: "wolf-lightning",
    ru: "Акт III · Железный волк · Молния",
    en: "Act III · Iron Wolf · Lightning",
    act: 3,
  },
  {
    value: "barbarian-bash",
    ru: "Акт V · Варвар · Концентрация / Берсерк",
    en: "Act V · Barbarian · Concentrate / Berserk",
    act: 5,
  },
  {
    value: "barbarian-frenzy",
    ru: "Акт V · Варвар · Бешенство",
    en: "Act V · Barbarian · Frenzy",
    act: 5,
  },
];
