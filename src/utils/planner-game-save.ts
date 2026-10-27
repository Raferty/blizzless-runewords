import { D2RSaver, type BinaryParsedItem, type D2SCharacterProfile } from "d2r-saver";
import { writeItem, type types as SaveTypes } from "@d2runewizard/d2s";
import { constants as originalConstants } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";
import { plannerClasses } from "@/shared/planner";
import { RUNEWORDS } from "@/shared/runewords";
import { CUSTOM_RUNEWORDS } from "@/shared/custom-runewords";
import { ROTW_RUNEWORDS } from "@/shared/rotw-runewords";
import { REWORKED_RUNEWORDS } from "@/shared/reworked-runewords";
import {
  attributeBudget,
  parseBuild,
  skillBudget,
  spentAttributes,
  spentSkills,
} from "./planner";
import type { ClassId, EquipmentSlot, PlannerBuild, PlannerItem } from "@/types/planner";

import { affixStats, parseAffixes } from "./planner-affixes";
import { layoutStashItems } from "./planner-stash";
import {
  resolvePropertyValues,
  itemSkillClass,
  isClassCharm,
} from "./planner-properties";

type RawData = Parameters<typeof D2RSaver.fromData>[0];
type Locale = Parameters<typeof D2RSaver.fromData>[1];
type Definition = Record<string, string | number | undefined>;
const classes = [
  "amazon",
  "sorceress",
  "necromancer",
  "paladin",
  "barbarian",
  "druid",
  "assassin",
  "warlock",
] as const;
const nativeClasses = ["ama", "sor", "nec", "pal", "bar", "dru", "ass", "war"];
const slots: Record<EquipmentSlot, string> = {
  head: "head",
  amulet: "neck",
  armor: "tors",
  mainHand: "rarm",
  offHand: "larm",
  gloves: "glov",
  ringLeft: "lrin",
  ringRight: "rrin",
  belt: "belt",
  boots: "feet",
  swapMain: "rarm2",
  swapOff: "larm2",
};
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
export interface GameSaveEntry {
  key: string;
  item: PlannerItem;
  slot?: EquipmentSlot;
  owner: "hero" | "mercenary" | "charm" | "stash";
  position?: number;
  height?: number;
}
export interface GameSaveChoice {
  value: string;
  label: string;
  base: string;
  unique?: string;
}
export interface GameSaveOptions {
  name: string;
  choices: Record<string, string>;
  rolls: Record<string, GameSaveRoll>;
}
export type GameSaveRoll = 0 | 1 | "planned";
export class GameSaveError extends Error {
  constructor(
    public code: string,
    public detail = ""
  ) {
    super(code);
  }
}
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-zа-я0-9]/g, "");
export const validCharacterName = (name: string) =>
  /^[A-Za-z][A-Za-z_-]{1,14}$/.test(name) && (name.match(/[-_]/g)?.length ?? 0) <= 1;
export function gameSaveEntries(build: PlannerBuild): GameSaveEntry[] {
  return [
    ...Object.entries(build.equipment).map(([slot, item]) => ({
      key: `hero.${slot}`,
      item,
      slot: slot as EquipmentSlot,
      owner: "hero" as const,
    })),
    ...Object.entries(build.mercenary.equipment).map(([slot, item]) => ({
      key: `mercenary.${slot}`,
      item,
      slot: slot as EquipmentSlot,
      owner: "mercenary" as const,
    })),
    ...build.charms.map((item) => ({
      key: `charm.${item.id}`,
      item,
      owner: "charm" as const,
      position: item.position,
      height: item.height,
    })),
    ...build.stash.map((item, i) => ({
      key: `stash.${i}`,
      item,
      owner: "stash" as const,
    })),
  ];
}
export function saveChecksum(bytes: Uint8Array) {
  let sum = 0;
  for (let i = 0; i < bytes.length; i++)
    sum = ((sum << 1) + (sum < 0 ? 1 : 0) + (i >= 12 && i < 16 ? 0 : bytes[i])) | 0;
  return sum >>> 0;
}

export function createGameSaveExporter(data: RawData, locale: Locale) {
  const saver = D2RSaver.fromData(structuredClone(data), locale);
  const gd = saver.gd;
  const constants = structuredClone(originalConstants) as SaveTypes.IConstantData;
  for (const [name, stat] of Object.entries(gd.itemStatCost)) {
    constants.magical_properties[stat.id] = {
      ...constants.magical_properties[stat.id],
      s: name,
      sB: stat.savebits,
      sA: stat.saveadd,
      sP: stat.saveparambits,
      cB: stat.csvbits,
      dF: stat.descfunc,
      e: Number(stat.encode ?? constants.magical_properties[stat.id]?.e ?? 0),
    };
  }
  function types(code: string) {
    const result = new Set<string>();
    const visit = (type?: string) => {
      if (!type || result.has(type)) return;
      result.add(type);
      visit(gd.itemTypes[type]?.equiv1);
      visit(gd.itemTypes[type]?.equiv2);
    };
    visit(gd.items[code]?.type);
    return result;
  }
  function word(entry: GameSaveEntry) {
    const name =
      [...RUNEWORDS, ...REWORKED_RUNEWORDS, ...CUSTOM_RUNEWORDS, ...ROTW_RUNEWORDS].find(
        (w) => w.id === entry.item.runewordId
      )?.name.en ?? entry.item.name;
    const matches = Object.entries(gd.runes).filter(
      ([, def]) => normalize(def.name) === normalize(name)
    );
    if (matches.length < 2) return matches[0];
    const kind =
      entry.item.baseKind ??
      (name.includes("Weapons")
        ? "weapon"
        : name.includes("Armor")
          ? "armor"
          : undefined);
    if (!kind) return matches[0];
    const wanted = { weapon: "weap", armor: "armo", shield: "shld" }[kind];
    const includes = (type: string): boolean =>
      type === wanted ||
      (!!gd.itemTypes[type]?.equiv1 && includes(gd.itemTypes[type].equiv1!)) ||
      (!!gd.itemTypes[type]?.equiv2 && includes(gd.itemTypes[type].equiv2!));
    return matches.find(([, def]) =>
      [1, 2, 3, 4, 5, 6].some((i) =>
        includes(String((def as unknown as Definition)[`itype${i}`] ?? ""))
      )
    );
  }
  function permitted(code: string, entry: GameSaveEntry, build: PlannerBuild) {
    const base = gd.items[code];
    if (!base || !/^[a-z0-9]{3}$/.test(code)) return false;
    if (
      /^unused$/i.test(base.name) ||
      (!base.spawnable &&
        code !== "box" &&
        !["unique", "set"].includes(entry.item.quality))
    )
      return false;
    const t = types(code);
    if (code === "box")
      return ["charm", "stash"].includes(entry.owner) && entry.item.quality === "normal";
    if (entry.item.baseKind === "weapon" && !t.has("weap")) return false;
    if (entry.item.baseKind === "shield" && !t.has("shld")) return false;
    if (entry.item.baseKind === "armor" && (!t.has("armo") || t.has("shld")))
      return false;
    const nativeClass = nativeClasses[classes.indexOf(build.classId)];
    const classRestriction = [...t]
      .map((type) => gd.itemTypes[type]?.class)
      .find(Boolean);
    if (
      classRestriction &&
      entry.owner !== "stash" &&
      (entry.owner === "mercenary" || classRestriction !== nativeClass)
    )
      return false;
    if (entry.owner === "charm")
      return code === { 1: "cm1", 2: "cm2", 3: "cm3" }[entry.height ?? 1];
    if (entry.slot) {
      const slot = slots[entry.slot].replace(/2$/, "");
      if (slot === "rarm" && !t.has("weap")) return false;
      if (
        slot === "larm" &&
        t.has("weap") &&
        entry.owner === "hero" &&
        !(build.classId === "barbarian" || (build.classId === "assassin" && t.has("h2h")))
      )
        return false;
      const bodySlots = [...t].flatMap((type) => [
        gd.itemTypes[type]?.bodyloc1,
        gd.itemTypes[type]?.bodyloc2,
      ]);
      if (!bodySlots.includes(slot)) return false;
      if (entry.item.baseKind === "weapon" && !t.has("weap")) return false;
      if (entry.item.baseKind === "shield" && !t.has("shld")) return false;
      if (entry.item.baseKind === "armor" && t.has("weap")) return false;
    }
    if (entry.item.quality === "runeword") {
      const rw = word(entry)?.[1] as unknown as Definition | undefined;
      if (!rw) return false;
      const count = [1, 2, 3, 4, 5, 6].filter((i) => rw[`rune${i}`]).length;
      const maxSockets = Math.min(
        base.gemsockets ?? 0,
        ...[...t].map((type) => gd.itemTypes[type]?.maxsock40 || 99)
      );
      if (maxSockets < count) return false;
      if (
        ![1, 2, 3, 4, 5, 6].some((i) => rw[`itype${i}`] && t.has(String(rw[`itype${i}`])))
      )
        return false;
      if ([1, 2, 3].some((i) => rw[`etype${i}`] && t.has(String(rw[`etype${i}`]))))
        return false;
    }
    return true;
  }
  function choices(entry: GameSaveEntry, build: PlannerBuild): GameSaveChoice[] {
    const label = (code: string) =>
      gd.locale.strings[gd.items[code].namestr] || gd.items[code].name || code;
    if (entry.item.quality === "unique" || entry.item.quality === "set") {
      const definitions = entry.item.quality === "unique" ? gd.uniqueItems : gd.setItems;
      return Object.entries(definitions)
        .flatMap(([unique, definition]) => {
          const d = definition as unknown as Definition;
          const base = String(d.code ?? d.item ?? "");
          return permitted(base, entry, build)
            ? [
                {
                  value: unique,
                  unique,
                  base,
                  label: `${gd.locale.strings[String(d.index)] || d.index} · ${label(base)}`,
                },
              ]
            : [];
        })
        .sort((a, b) => a.label.localeCompare(b.label));
    }
    return Object.keys(gd.items)
      .filter(
        (code) =>
          permitted(code, entry, build) &&
          (entry.slot ||
            entry.owner === "charm" ||
            types(code).has("weap") ||
            types(code).has("armo") ||
            types(code).has("ring") ||
            types(code).has("amul") ||
            types(code).has("char") ||
            code === "box")
      )
      .map((base) => ({ value: base, base, label: `${label(base)} [${base}]` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
  function defaultChoice(entry: GameSaveEntry, build: PlannerBuild) {
    const list = choices(entry, build);
    const selected = ["unique", "set"].includes(entry.item.quality)
      ? entry.item.catalogId
      : entry.item.baseCode;
    if (selected && list.some((option) => option.value === selected)) return selected;
    if (list.length === 1) return list[0].value;
    return (
      list.find(
        (option) => normalize(option.label.split(" · ")[0]) === normalize(entry.item.name)
      )?.value ?? ""
    );
  }
  function validateStats(stats: Record<string, number>) {
    for (const [key, value] of Object.entries(stats)) {
      const [name, parameter] = key.split("#");
      const stat = gd.itemStatCost[name];
      if (
        !stat ||
        !Number.isInteger(value) ||
        value + (stat.saveadd || 0) < 0 ||
        value + (stat.saveadd || 0) >= 2 ** stat.savebits
      )
        throw new GameSaveError("statRange", key);
      if (
        parameter !== undefined &&
        (!Number.isInteger(Number(parameter)) ||
          Number(parameter) >= 2 ** (stat.saveparambits || 0))
      )
        throw new GameSaveError("statRange", key);
      const codec = constants.magical_properties[stat.id];
      if (
        (codec.e === 2 || codec.e === 3) &&
        (!Number.isInteger(Number(key.split("#")[2])) ||
          Number(key.split("#")[2]) < 0 ||
          Number(key.split("#")[2]) > 63 ||
          Number(parameter) > 1023)
      )
        throw new GameSaveError("statRange", key);
      if (codec.e === 3 && (value < 0 || value > 255))
        throw new GameSaveError("statRange", key);
    }
  }
  // Numeric property compiler, matching Properties.txt functions. Unsupported encodings fail explicitly.
  function definitionStats(
    def: Definition,
    base: string,
    roll: 0 | 1,
    values: PlannerItem["propertyValues"] = {},
    skillClass: ClassId = "amazon"
  ) {
    def = resolvePropertyValues(def, gd.properties, values);
    const stats: Record<string, number> = {};
    const add = (key: string, value: number, param?: string | number) => {
      const k = param == null ? key : `${key}#${param}`;
      stats[k] = (stats[k] || 0) + value;
    };
    for (let i = 1; i <= 12; i++) {
      const code = String(def[`prop${i}`] ?? "");
      if (!code) continue;
      const p = gd.properties[code] as unknown as Definition;
      if (!p) throw new GameSaveError("property", code);
      const min = Number(def[`min${i}`] ?? 0),
        max = Number(def[`max${i}`] ?? min),
        value = roll ? max : min;
      const param = def[`par${i}`] === "" ? undefined : def[`par${i}`];
      let last = value;
      for (let j = 1; j <= 7; j++) {
        const func = Number(p[`func${j}`] || 0),
          key = String(p[`stat${j}`] ?? "");
        if (!func) continue;
        switch (func) {
          case 36:
            // Min/Max are class IDs; Val is the fixed skill bonus (Torch: +3).
            add(
              key,
              Number(p[`val${j}`] ?? 0),
              Math.max(min, Math.min(max, classes.indexOf(skillClass)))
            );
            break;
          case 3:
            add(key, last);
            break;
          case 5:
            add("mindamage", value);
            break;
          case 6:
            add("maxdamage", value);
            break;
          case 7:
            add("item_mindamage_percent", value);
            add("item_maxdamage_percent", value);
            break;
          case 10:
          case 22:
          case 24:
            add(key, value, param);
            break;
          case 11:
            // Properties.txt uses Min for chance and Max for skill level.
            add(
              key,
              min,
              `${param}#${max || Math.round((100 - Number(gd.skills[String(param)]?.reqlevel ?? 0)) / 3.9)}`
            );
            break;
          case 14:
          case 17:
            add(key, Number(param ?? value));
            break;
          case 15:
            add(key, min);
            break;
          case 16:
            add(key, max);
            break;
          case 19:
            if (min < 0 && max < 0) {
              const required = Number(gd.skills[String(param)]?.reqlevel ?? 0);
              const level = Math.max(
                1,
                Math.floor(
                  (99 - required) / Math.max(1, Math.floor((99 - required) / -max))
                )
              );
              add(key, Math.floor((-min * level) / 8) - min, `${param}#${level}`);
            } else add(key, min, `${param}#${max}`);
            break;
          case 20:
            add("item_indesctructible", 1);
            break;
          case 21:
            add(key, value, p[`val${j}`]);
            break;
          case 23:
            stats.item_ethereal = 1;
            break;
          default:
            if (!gd.itemStatCost[key]) throw new GameSaveError("property", code);
            add(key, Number(p[`set${j}`] ?? value));
            break;
        }
        last = stats[key] ?? value;
      }
    }
    void base;
    return stats;
  }
  function catalogBonuses(
    id: string,
    quality: "unique" | "set",
    roll: 0 | 1,
    values: PlannerItem["propertyValues"] = {},
    skillClass: ClassId = "amazon"
  ) {
    const definition = (quality === "unique" ? gd.uniqueItems : gd.setItems)[id];
    if (!definition) throw new GameSaveError("base", id);
    // The summary only projects properties described by the current game tables.
    // The binary exporter retains its stricter validation of the full definition.
    const supported = { ...definition } as Definition;
    for (let i = 1; i <= 12; i++)
      if (!gd.properties[String(supported[`prop${i}`] ?? "")])
        delete supported[`prop${i}`];
    const stats = definitionStats(supported, "", roll, values, skillClass);
    return {
      bonuses: Object.fromEntries(
        Object.entries(bonusStats).map(([key, stat]) => [key, stats[stat] ?? 0])
      ) as PlannerItem["bonuses"],
      classBonuses: Object.fromEntries(
        classes.map((id, i) => [id, stats[`item_addclassskills#${i}`] ?? 0])
      ) as PlannerItem["classBonuses"],
      sockets: stats.item_numsockets ?? 0,
      ethereal: !!stats.item_ethereal,
    };
  }
  function itemDefinition(item: PlannerItem): Definition | undefined {
    if (item.catalogId && (item.quality === "unique" || item.quality === "set"))
      return (item.quality === "unique" ? gd.uniqueItems : gd.setItems)[
        item.catalogId
      ] as unknown as Definition;
    if (item.quality !== "runeword") return;
    const runeWord = word({ key: "properties", item, owner: "stash" })?.[1] as unknown as
      Definition | undefined;
    if (!runeWord) return;
    const def: Definition = {};
    for (let i = 1; i <= 7; i++) {
      def[`prop${i}`] = runeWord[`t1code${i}`];
      def[`par${i}`] = runeWord[`t1param${i}`];
      def[`min${i}`] = runeWord[`t1min${i}`];
      def[`max${i}`] = runeWord[`t1max${i}`];
    }
    return def;
  }
  function itemBonuses(item: PlannerItem, fallback: ClassId) {
    const def = itemDefinition(item);
    if (!def) return { bonuses: item.bonuses, classBonuses: item.classBonuses };
    const stats = definitionStats(
      def,
      item.baseCode ?? "",
      item.propertyRoll ?? 0,
      item.propertyValues,
      itemSkillClass(item, fallback)
    );
    if (item.quality === "runeword") {
      const runeWord = word({
        key: "properties",
        item,
        owner: "stash",
      })?.[1] as unknown as Definition;
      const category =
        item.baseKind === "weapon"
          ? "weapon"
          : item.baseKind === "shield"
            ? "shield"
            : "helm";
      for (let i = 1; i <= 6; i++) {
        const code = runeWord[`rune${i}`];
        if (!code) continue;
        const gem = gd.gems[String(code)] as unknown as Definition;
        const gemDef: Definition = {};
        for (let j = 1; j <= 3; j++) {
          gemDef[`prop${j}`] = gem[`${category}mod${j}code`];
          gemDef[`par${j}`] = gem[`${category}mod${j}param`];
          gemDef[`min${j}`] = gem[`${category}mod${j}min`];
          gemDef[`max${j}`] = gem[`${category}mod${j}max`];
        }
        for (const [key, value] of Object.entries(definitionStats(gemDef, "", 1)))
          stats[key] = (stats[key] ?? 0) + value;
      }
    }
    return {
      bonuses: Object.fromEntries(
        Object.entries(bonusStats).map(([key, stat]) => [key, stats[stat] ?? 0])
      ) as PlannerItem["bonuses"],
      classBonuses: Object.fromEntries(
        classes.map((id, i) => [id, stats[`item_addclassskills#${i}`] ?? 0])
      ) as PlannerItem["classBonuses"],
    };
  }
  function itemRunes(item: PlannerItem): string[] {
    if (item.quality !== "runeword") return [];
    const def = word({ key: "runes", item, owner: "stash" })?.[1] as unknown as
      Definition | undefined;
    return def
      ? [1, 2, 3, 4, 5, 6].flatMap((i) =>
          def[`rune${i}`] ? [String(def[`rune${i}`])] : []
        )
      : [];
  }
  function socketBonuses(code: string, category: "weapon" | "helm" | "shield") {
    const gem = gd.gems[code] as unknown as Definition | undefined;
    if (!gem) throw new GameSaveError("property", code);
    const def: Definition = {};
    for (let i = 1; i <= 3; i++) {
      def[`prop${i}`] = gem[`${category}mod${i}code`];
      def[`par${i}`] = gem[`${category}mod${i}param`];
      def[`min${i}`] = gem[`${category}mod${i}min`];
      def[`max${i}`] = gem[`${category}mod${i}max`];
    }
    const stats = definitionStats(def, "", 1);
    return {
      bonuses: Object.fromEntries(
        Object.entries(bonusStats).flatMap(([key, stat]) =>
          stats[stat] ? [[key, stats[stat]]] : []
        )
      ) as PlannerItem["bonuses"],
      classBonuses: Object.fromEntries(
        classes.flatMap((id, i) =>
          stats[`item_addclassskills#${i}`]
            ? [[id, stats[`item_addclassskills#${i}`]]]
            : []
        )
      ) as NonNullable<PlannerItem["classBonuses"]>,
    };
  }
  function magicProperties(stats: Record<string, number>): SaveTypes.IMagicProperty[] {
    const result: SaveTypes.IMagicProperty[] = [];
    const done = new Set<string>();
    const byId = new Map(
      Object.entries(gd.itemStatCost).map(([name, stat]) => [stat.id, name])
    );
    for (const key of Object.keys(stats).sort(
      (a, b) => gd.itemStatCost[a.split("#")[0]].id - gd.itemStatCost[b.split("#")[0]].id
    )) {
      if (done.has(key)) continue;
      const [name, p1, p2] = key.split("#");
      const id = gd.itemStatCost[name].id,
        values: number[] = [];
      for (let i = 0; i < (constants.magical_properties[id].np || 1); i++) {
        const nextName = byId.get(id + i)!;
        const nextKey =
          i === 0 ? key : [nextName, p1, p2].filter((v) => v !== undefined).join("#");
        const definition = constants.magical_properties[id + i],
          value = stats[nextKey] ?? 0;
        if (definition.sP) {
          if (definition.dF === 14)
            values.push(Number(p1) % 3, Math.floor(Number(p1) / 3));
          else if (definition.e === 2 || definition.e === 3)
            values.push(Number(p2), Number(p1));
          else values.push(Number(p1 ?? 0));
        }
        values.push(value);
        if (definition.e === 3) values.push(value);
        done.add(nextKey);
      }
      if (values.some((value) => !Number.isFinite(value)))
        throw new GameSaveError("property", key);
      result.push({ id, values } as SaveTypes.IMagicProperty);
    }
    return result;
  }
  async function exportCharacter(
    input: PlannerBuild,
    options: GameSaveOptions
  ): Promise<Uint8Array> {
    const build = parseBuild(input);
    if (!validCharacterName(options.name)) throw new GameSaveError("name");
    const character = plannerClasses.find((c) => c.id === build.classId)!;
    const classIndex = classes.indexOf(build.classId);
    const profile: D2SCharacterProfile = {
      name: options.name,
      class: nativeClasses[classIndex],
      level: build.level,
      stats: {
        str: build.attributes.strength,
        dex: build.attributes.dexterity,
        vit: build.attributes.vitality,
        int: build.attributes.energy,
      },
      skills: { ...build.skills },
      weaponSet: build.weaponSet,
      items: {},
      mercItems: {},
      inventory: [],
      stash: [],
      cube: [],
      belt: [],
      quests: Object.values(build.quests).map((q) => ({
        denofevil: q.den,
        radamentslair: q.radament,
        thefallenangel: q.izual,
        lamessenstome: q.lamEsen,
        prisonofice: q.anya,
        thegoldenbird: q.goldenBird,
      })),
    };
    const life =
      character.life +
      (build.level - 1) * character.lifePerLevel +
      build.attributes.vitality * character.lifePerVitality +
      Object.values(build.quests).filter((q) => q.goldenBird).length * 20;
    const mana =
      character.mana +
      (build.level - 1) * character.manaPerLevel +
      build.attributes.energy * character.manaPerEnergy;
    const stamina =
      character.stamina +
      (build.level - 1) * character.staminaPerLevel +
      build.attributes.vitality * character.staminaPerVitality;
    profile.attributes = {
      strength: character.base.strength + build.attributes.strength,
      dexterity: character.base.dexterity + build.attributes.dexterity,
      vitality: character.base.vitality + build.attributes.vitality,
      energy: character.base.energy + build.attributes.energy,
      statpts: attributeBudget(build) - spentAttributes(build),
      newskills: skillBudget(build) - spentSkills(build),
      hitpoints: life * 256,
      maxhp: life * 256,
      mana: mana * 256,
      maxmana: mana * 256,
      stamina: stamina * 256,
      maxstamina: stamina * 256,
      level: build.level,
      experience: Number(
        (data.experience as Record<string, { amazon: number }>)[build.level - 1]
          ?.amazon ?? 0
      ),
      gold: 0,
      goldbank: 0,
    };
    for (const [key, value] of Object.entries(profile.attributes)) {
      const bits = gd.itemStatCost[key]?.csvbits;
      if (!bits || !Number.isInteger(value) || value < 0 || value >= 2 ** bits)
        throw new GameSaveError("statRange", key);
    }
    const mercSkill: Record<string, string> = {
      "rogue-fire": "Fire Arrow",
      "rogue-cold": "Cold Arrow",
      "desert-prayer": "Prayer",
      "desert-defiance": "Defiance",
      "desert-blessed-aim": "Blessed Aim",
      "desert-thorns": "Thorns",
      "desert-holy-freeze": "Holy Freeze",
      "desert-might": "Might",
      "wolf-fire": "Fire Ball",
      "wolf-cold": "Frozen Orb",
      "wolf-lightning": "Lightning",
      "barbarian-bash": "Concentrate",
      "barbarian-frenzy": "Frenzy",
    };
    let mercXP = 0;
    if (build.mercenary.type !== "none") {
      const skill = mercSkill[build.mercenary.type];
      const match = Object.entries(gd.hireling).find(
        ([, rows]) =>
          Array.isArray(rows) && rows.some((row) => Object.values(row).includes(skill))
      );
      const row = match?.[1]?.[0] as unknown as
        { level: number; explvl: number } | undefined;
      if (!match || !row || build.mercenary.level < row.level)
        throw new GameSaveError("mercenary");
      profile.merc = match[0];
      profile.mercLevel = build.mercenary.level;
      profile.mercName = 0;
      mercXP = row.explvl * build.mercenary.level ** 2 * (build.mercenary.level + 1);
    }
    const items: Record<number | string, BinaryParsedItem> = {};
    const runewordProperties = new Map<number, Record<string, number>>();
    const entries = gameSaveEntries(build).map((entry) => {
      const choice = choices(entry, build).find(
        (c) => c.value === options.choices[entry.key]
      );
      if (!choice) throw new GameSaveError("base", entry.item.name);
      return { entry, choice, base: gd.items[choice.base] };
    });
    const stashEntries = entries.filter(({ entry }) => entry.owner === "stash");
    const stashLayout = layoutStashItems(
      stashEntries.map(({ entry, base }) => ({
        size: [base.invwidth, base.invheight] as const,
        position: entry.item.stashPosition,
      })),
      gd.info.stash!
    );
    const stashPositions = new Map(
      stashEntries.map(({ entry }, index) => [entry.key, stashLayout.positions[index]])
    );
    const usedIds = new Set<number>();
    const itemAffixIds = new Map<number, string[]>();
    function nextId() {
      let id: number;
      do {
        id = crypto.getRandomValues(new Uint32Array(1))[0];
      } while (!id || usedIds.has(id));
      usedIds.add(id);
      return id;
    }
    for (const { entry, choice, base } of entries) {
      if (entry.item.affixes?.length)
        parseAffixes(entry.item.affixes, { ...entry.item, baseCode: choice.base });
      const item: BinaryParsedItem = {
        itemId: nextId(),
        base: choice.base,
        quality: {
          normal: 2,
          magic: 4,
          rare: 6,
          unique: 7,
          set: 5,
          runeword: 9,
          crafted: 8,
        }[entry.item.quality],
        ilvl: entry.item.itemLevel ?? 99,
        unidentified: false,
        ethereal: entry.item.ethereal ?? false,
        socketed: false,
        sockets: 0,
        socketedItems: [],
        stats: {},
        binaryOffset: { start: 0, end: 0 },
        name: entry.item.name,
        defense: "maxac" in base ? base.maxac : undefined,
      };
      itemAffixIds.set(
        item.itemId,
        (entry.item.affixes ?? []).map((a) => a.id)
      );
      const mode = options.rolls[entry.key] ?? "planned";
      const roll = mode === "planned" ? (entry.item.propertyRoll ?? 1) : mode;
      let maxSockets = base.gemsockets || 0;
      if (choice.unique) {
        item.unique = choice.unique;
        const definition = (gd.uniqueItems[choice.unique] ??
          gd.setItems[choice.unique]) as unknown as Definition;
        item.stats = definitionStats(
          definition,
          choice.base,
          roll,
          mode === "planned" ? entry.item.propertyValues : undefined,
          itemSkillClass(entry.item, build.classId)
        );
        maxSockets = Math.max(
          maxSockets,
          definitionStats(definition, choice.base, 1).item_numsockets || 0
        );
      }
      if (entry.item.quality === "runeword") {
        const rw = word(entry);
        if (!rw) throw new GameSaveError("base", entry.item.name);
        item.unique = rw[0];
        const def = rw[1] as unknown as Definition;
        item.uniqueValues = Array.from({ length: 7 }, (_, i) =>
          Number(def[`t1${roll ? "max" : "min"}${i + 1}`] ?? 0)
        );
        item.socketedItems = [1, 2, 3, 4, 5, 6].flatMap((i) =>
          def[`rune${i}`] ? [String(def[`rune${i}`])] : []
        );
        item.sockets = item.socketedItems.length;
        item.socketed = true;
        const props: Definition = {};
        for (let i = 1; i <= 7; i++) {
          props[`prop${i}`] = def[`t1code${i}`];
          props[`par${i}`] = def[`t1param${i}`];
          props[`min${i}`] = def[`t1min${i}`];
          props[`max${i}`] = def[`t1max${i}`];
        }
        const stats = definitionStats(
          props,
          choice.base,
          roll,
          mode === "planned" ? entry.item.propertyValues : undefined
        );
        if (mode === "planned" && !entry.item.propertyValues) {
          const socketStats: Record<string, number> = {};
          const category = types(choice.base).has("weap")
            ? "weapon"
            : types(choice.base).has("shld")
              ? "shield"
              : "helm";
          for (const rune of item.socketedItems) {
            const gem = gd.gems[String(rune)] as unknown as Definition | undefined;
            if (!gem) throw new GameSaveError("property", String(rune));
            const props: Definition = {};
            for (let i = 1; i <= 3; i++) {
              props[`prop${i}`] = gem[`${category}mod${i}code`];
              props[`par${i}`] = gem[`${category}mod${i}param`];
              props[`min${i}`] = gem[`${category}mod${i}min`];
              props[`max${i}`] = gem[`${category}mod${i}max`];
            }
            for (const [key, value] of Object.entries(
              definitionStats(props, choice.base, 1)
            ))
              socketStats[key] = (socketStats[key] ?? 0) + value;
          }
          for (const [key, value] of Object.entries(entry.item.bonuses)) {
            const stat = bonusStats[key as keyof typeof bonusStats];
            stats[stat] = value! - (socketStats[stat] ?? 0);
          }
          for (const [id, value] of Object.entries(entry.item.classBonuses ?? {})) {
            const stat = `item_addclassskills#${classes.indexOf(id as ClassId)}`;
            stats[stat] = value! - (socketStats[stat] ?? 0);
          }
        }
        if (stats.item_ethereal) {
          item.ethereal = true;
          delete stats.item_ethereal;
        }
        validateStats(stats);
        runewordProperties.set(item.itemId, stats);
      } else {
        for (const [key, value] of Object.entries(entry.item.bonuses))
          if ((mode === "planned" && !entry.item.propertyValues) || !choice.unique)
            item.stats[bonusStats[key as keyof typeof bonusStats]] = value!;
        for (const [id, value] of Object.entries(entry.item.classBonuses ?? {}))
          if (
            !isClassCharm(entry.item) &&
            ((mode === "planned" && !entry.item.propertyValues) || !choice.unique)
          )
            item.stats[`item_addclassskills#${classes.indexOf(id as ClassId)}`] = value;
        for (const [stat, value] of Object.entries(affixStats(entry.item)))
          item.stats[stat] = (item.stats[stat] ?? 0) + value;
        if (item.stats.item_ethereal) {
          item.ethereal = true;
          delete item.stats.item_ethereal;
        }
        if (item.stats.item_numsockets) {
          item.sockets = Math.min(item.stats.item_numsockets, maxSockets);
          item.socketed = true;
          delete item.stats.item_numsockets;
          if (item.sockets > maxSockets) throw new GameSaveError("base", entry.item.name);
        }
        if (entry.item.sockets !== undefined) {
          item.sockets = entry.item.sockets;
          item.socketed = item.sockets > 0;
          if (item.sockets > maxSockets) throw new GameSaveError("base", entry.item.name);
        }
        item.socketedItems = (entry.item.socketedItems ?? []).filter(
          (code): code is string => code !== null
        );
        if (
          item.socketedItems.length > item.sockets ||
          item.socketedItems.some((code) => !gd.gems[String(code)])
        )
          throw new GameSaveError("base", entry.item.name);
        validateStats(item.stats);
      }
      items[item.itemId] = item;
      if (item.ethereal && item.defense !== undefined)
        item.defense = Math.floor(item.defense * 1.5);
      if (entry.owner === "hero") profile.items[slots[entry.slot!]] = item.itemId;
      else if (entry.owner === "mercenary") {
        if (!profile.merc) throw new GameSaveError("mercenary");
        profile.mercItems[slots[entry.slot!]] = item.itemId;
      } else if (entry.owner === "charm")
        profile.inventory[entry.position!] = item.itemId;
      else {
        const position = stashPositions.get(entry.key);
        if (!position) throw new GameSaveError("stash");
        profile.stash[position.y * gd.info.stash!.columns + position.x] = item.itemId;
      }
    }
    // Keep the exact fixed-point character stream. Serialize items with the current
    // d2runewizard codec, including its correct chance-to-cast/charges encoding.
    const seed = saver.writeD2S(
      {
        ...profile,
        items: {},
        mercItems: {},
        inventory: [],
        stash: [],
        cube: [],
        belt: [],
      },
      {},
      options.name
    );
    const prefixLength = seed.length - (profile.merc ? 23 : 19);
    if (seed[prefixLength] !== 74 || seed[prefixLength + 1] !== 77)
      throw new GameSaveError("validation");
    async function encodeItem(
      item: BinaryParsedItem,
      location: { loc: number; equip?: number; x?: number; y?: number; storage?: number }
    ): Promise<Uint8Array> {
      const t = types(item.base),
        base = gd.items[item.base];
      const simple = t.has("rune") || t.has("gem") || t.has("poti");
      const rw = runewordProperties.get(item.itemId);
      const canonicalRunewordId = rw ? Number(item.unique!.replace("runeword", "")) : 0;
      // Stored v105 aliases documented by the codecs; Nightfall=1396 is
      // confirmed from a Blizzless save (d2r-saver CUSTOM_RUNEWORD_IDS).
      const storedRunewordIds: Record<number, number> = {
        196: 2784,
        197: 2785,
        198: 2786,
        199: 2787,
        200: 2788,
        201: 2789,
        202: 2790,
        203: 2791,
        204: 2792,
        205: 3074,
        206: 3075,
        207: 3076,
        325: 1396,
      };
      const native = {
        type: item.base,
        version: "101",
        id: item.itemId,
        level: item.ilvl,
        quality: rw ? 2 : item.quality,
        identified: 1,
        socketed: item.sockets ? 1 : 0,
        new: 0,
        is_ear: 0,
        starter_item: 0,
        simple_item: simple ? 1 : 0,
        ethereal: item.ethereal ? 1 : 0,
        personalized: 0,
        given_runeword: rw ? 1 : 0,
        location_id: location.loc,
        equipped_id: location.equip ?? 0,
        position_x: location.x ?? 0,
        position_y: location.y ?? 0,
        alt_position_id: location.storage ?? 0,
        type_id: t.has("armo") ? 1 : t.has("weap") ? 3 : 4,
        categories: t.has("armo") ? ["Any Armor"] : t.has("weap") ? ["Weapon"] : [],
        nr_of_items_in_sockets: item.socketedItems.length,
        total_nr_of_sockets: item.sockets,
        defense_rating: item.defense ?? 0,
        max_durability: base.durability ?? 0,
        current_durability: base.durability ?? 0,
        magic_prefix: Number(
          itemAffixIds
            .get(item.itemId)
            ?.find((id) => id.startsWith("mp"))
            ?.slice(2) ?? 0
        ),
        magic_suffix: Number(
          itemAffixIds
            .get(item.itemId)
            ?.find((id) => id.startsWith("ms"))
            ?.slice(2) ?? 0
        ),
        rare_name_id: 156,
        rare_name_id2: 1,
        magical_name_ids: Array.from({ length: 6 }, (_, i) =>
          Number(
            itemAffixIds
              .get(item.itemId)
              ?.filter((id) => id.startsWith(i % 2 ? "ms" : "mp"))
              [Math.floor(i / 2)]?.slice(2) ?? 0
          )
        ),
        multiple_pictures: 0,
        class_specific: 0,
        unique_id: Number(item.unique?.replace("unique", "") ?? 0),
        set_id: Number(item.unique?.replace("set", "") ?? 0),
        runeword_id: storedRunewordIds[canonicalRunewordId] ?? canonicalRunewordId,
        magic_attributes: magicProperties(item.stats),
        runeword_attributes: rw ? magicProperties(rw) : undefined,
        socketed_items: [],
        quantity: base.stackable ? 1 : 0,
        _unknown_data: {},
      } as unknown as SaveTypes.IItem;
      if (native.max_durability > 0 && item.stats.item_indesctructible)
        native.max_durability = 0;
      for (const code of item.socketedItems) {
        const child = {
          ...native,
          type: String(code),
          quality: 2,
          simple_item: 1,
          socketed: 0,
          given_runeword: 0,
          ethereal: 0,
          nr_of_items_in_sockets: 0,
          total_nr_of_sockets: 0,
          socketed_items: [],
          magic_attributes: [],
          location_id: 6,
          equipped_id: 0,
          alt_position_id: 0,
          position_x: 0,
          position_y: 0,
        } as SaveTypes.IItem;
        native.socketed_items.push(child);
      }
      constants.stackables[item.base] = !!base.stackable;
      return writeItem(native, 105, constants, {
        extendedStash: true,
        disableItemEnhancements: true,
      });
    }
    async function list(merc: boolean) {
      const entries: {
        id: number | string;
        loc: number;
        equip?: number;
        x?: number;
        y?: number;
        storage?: number;
      }[] = [];
      const body: Record<string, number> = {
        head: 1,
        neck: 2,
        tors: 3,
        rarm: 4,
        larm: 5,
        rrin: 6,
        lrin: 7,
        belt: 8,
        feet: 9,
        glov: 10,
        rarm2: 11,
        larm2: 12,
      };
      for (const [slot, id] of Object.entries(merc ? profile.mercItems : profile.items))
        entries.push({ id, loc: 1, equip: body[slot], x: body[slot] });
      if (!merc) {
        profile.inventory.forEach((id, i) => {
          if (id !== undefined)
            entries.push({ id, loc: 0, x: i % 10, y: Math.floor(i / 10), storage: 1 });
        });
        profile.stash.forEach((id, i) => {
          if (id !== undefined)
            entries.push({
              id,
              loc: 0,
              x: i % gd.info.stash!.columns,
              y: Math.floor(i / gd.info.stash!.columns),
              storage: 5,
            });
        });
      }
      return [
        new Uint8Array([74, 77, entries.length & 255, entries.length >> 8]),
        ...(await Promise.all(
          entries.map((entry) => encodeItem(items[entry.id], entry))
        )),
      ];
    }
    const pieces = [
      seed.subarray(0, prefixLength),
      ...(await list(false)),
      new Uint8Array([74, 77, 0, 0, 106, 102]),
      ...(profile.merc ? await list(true) : []),
      new Uint8Array([107, 102, 0, 1, 0, 108, 102, 0, 0]),
    ];
    const bytes = new Uint8Array(pieces.reduce((n, piece) => n + piece.length, 0));
    let offset = 0;
    for (const piece of pieces) {
      bytes.set(piece, offset);
      offset += piece.length;
    }
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    header.setUint32(8, bytes.length, true);
    // Unlock act travel for a build-testing character without granting unselected
    // stat/skill/life/resistance rewards. Quest blocks are 96 bytes in v105.
    for (let difficulty = 0; difficulty < 3; difficulty++) {
      const questStart = 413 + difficulty * 96;
      for (const offset of [
        0, 12, 14, 16, 28, 30, 32, 44, 46, 48, 52, 56, 68, 78, 80, 82,
      ])
        header.setUint16(questStart + offset, 1, true);
    }
    bytes[20] = build.hardcore ? 4 : 0;
    bytes.fill(0, 152, 155);
    bytes[152 + ["normal", "nightmare", "hell"].indexOf(build.difficulty)] = 0x80;
    if (profile.merc) {
      header.setUint32(163, 0x10203040, true);
      header.setUint16(169, Number(profile.merc), true);
      header.setUint32(171, mercXP, true);
    }
    header.setUint32(12, saveChecksum(bytes), true);
    const check = saver.readD2S(bytes);
    if (
      check.warnings.length ||
      check.profile.class !== profile.class ||
      check.profile.level !== profile.level ||
      Object.keys(check.profile.items).length !== Object.keys(profile.items).length ||
      Object.keys(check.profile.mercItems).length !==
        Object.keys(profile.mercItems).length ||
      check.profile.inventory.filter((id) => id !== undefined).length !==
        profile.inventory.filter((id) => id !== undefined).length ||
      check.profile.stash.filter((id) => id !== undefined).length !==
        profile.stash.filter((id) => id !== undefined).length
    )
      throw new GameSaveError("validation", check.warnings.join("; "));
    return bytes;
  }
  return {
    choices,
    defaultChoice,
    catalogBonuses,
    itemDefinition,
    itemBonuses,
    itemRunes,
    socketBonuses,
    propertyStats: definitionStats,
    exportCharacter,
    saver,
    gd,
  };
}
export type GameSaveExporter = ReturnType<typeof createGameSaveExporter>;
let exporter: Promise<GameSaveExporter> | undefined;
export function loadGameSaveExporter() {
  return (exporter ??= Promise.all(
    ["data.json", "strings.json"].map(async (name) => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}data/planner-save/${name}`
      );
      if (!response.ok) throw new GameSaveError("load");
      return response.json();
    })
  )
    .then(([data, locale]) => createGameSaveExporter(data, locale))
    .catch((error) => {
      exporter = undefined;
      throw error;
    }));
}
