import { GameSaveError } from "./planner-game-save-error";
import { plannerRunewords, findPlannerRuneword, runeSequences } from "./planner-runeword-recipes";
import { materialSaveCodec } from "./planner-material-save";
import { loadDataFromFile } from "./planner-data-loader";
import { D2RSaver, type BinaryParsedItem, type D2SCharacterProfile } from "d2r-saver";
import { read, write, writeItem, type types as SaveTypes } from "@d2runewizard/d2s";
import { constants as originalConstants } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";
import {
  difficulties,
  mercenaries,
  plannerClasses,
  plannerSkills,
  resistanceTypes,
} from "@/shared/planner";
import { waypoints } from "@/shared/planner-waypoints";
import { runewordNames } from "./runeword";
import {
  attributeBudget,
  createBuild,
  isBackpackGear,
  inventoryWidth,
  parseBuild,
  skillBudget,
  spentAttributes,
  spentSkills,
} from "./planner";
import type {
  ClassId,
  EquipmentSlot,
  PlannerAffix,
  PlannerBuild,
  PlannerItem,
} from "@/types/planner";

import {
  affixStats,
  magicItemName,
  parseAffixes,
  restoreMagicAffixes,
} from "./planner-affixes";
import {
  baseSkillProfile,
  baseSkillOptions,
  baseSkillStats,
} from "./planner-base-skills";
import { layoutStashItems } from "./planner-stash";
import { isContainerBase, isTome, isWorldstoneShard } from "./planner-item-art";
import {
  socketCategory,
  baseSupportsSockets,
  magicSocketJewels,
  parseSocketIconIndices,
  socketInsertByCode,
} from "./planner-sockets";
import { craftDefinition, craftVariant, craftAffixMinimum, hasRequiredCraftAffixes } from "./planner-crafts";
import { stashSupplies } from "./planner-supplies";
import {
  resolvePropertyValues,
  resolvePropertyGroups,
  itemSkillClass,
  isClassCharm,
  nativeStatsSignature,
  propertyRange,
} from "./planner-properties";

type RawData = Parameters<typeof D2RSaver.fromData>[0];
type Locale = Parameters<typeof D2RSaver.fromData>[1];
type Definition = Record<string, string | number | undefined>;
const waypointBitsStart = (difficulty: number) => 711 + difficulty * 24;
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
const projectedStats = new Set<string>(Object.values(bonusStats));
const isProjectedStat = (stat: string) =>
  projectedStats.has(stat) || /^item_addclassskills#\d+$/.test(stat);
export interface GameSaveEntry {
  key: string;
  item: PlannerItem;
  slot?: EquipmentSlot;
  owner: "hero" | "mercenary" | "charm" | "inventory" | "stash";
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
  gameMode?: GameSaveMode;
}
export type GameSaveMode = "expansion" | "rotw";
export const defaultGameSaveMode: (classId?: ClassId) => GameSaveMode = () => "rotw";
export type GameSaveRoll = 0 | 1 | "planned";
export { GameSaveError };
const toHex = (bytes: ArrayLike<number>) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
const fromHex = (hex: string) =>
  Uint8Array.from(hex.match(/../g)!, (pair) => parseInt(pair, 16));
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
      owner: isBackpackGear(item) ? ("inventory" as const) : ("charm" as const),
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
  function rollRareName(base: string) {
    const allowed = types(base);
    const pick = (table: typeof gd.rarePrefix) => {
      const candidates = Object.entries(table).filter(([, row]) => {
        const matches = (kind: string) =>
          Object.entries(row).some(
            ([key, type]) =>
              key.startsWith(kind) && typeof type === "string" && allowed.has(type)
          );
        return matches("itype") && !matches("etype");
      });
      if (!candidates.length) throw new GameSaveError("base", base);
      return candidates[Math.floor(Math.random() * candidates.length)];
    };
    const [prefixId, prefix] = pick(gd.rarePrefix);
    const [suffixId, suffix] = pick(gd.rareSuffix);
    return {
      name: `${gd.locale.strings[prefix.name] || prefix.name} ${gd.locale.strings[suffix.name] || suffix.name}`,
      ids: { rare_name_id: Number(prefixId) + 156, rare_name_id2: Number(suffixId) + 1 },
    };
  }
  function rareNameIds(name: string, base: string) {
    const [prefix, suffix] = name.split(" ");
    const lookup = (table: typeof gd.rarePrefix, part: string) =>
      Object.entries(table).find(
        ([, row]) => (gd.locale.strings[row.name] || row.name) === part
      )?.[0];
    const first = lookup(gd.rarePrefix, prefix);
    const second = lookup(gd.rareSuffix, suffix);
    if (first !== undefined && second !== undefined && name === `${prefix} ${suffix}`)
      return { rare_name_id: Number(first) + 156, rare_name_id2: Number(second) + 1 };
    return rollRareName(base).ids;
  }
  function matchesMercenary(type: string, row: Definition) {
    const mercenary = mercenaries.find((entry) => entry.value === type);
    if (!mercenary?.skillId || Number(row.act) !== mercenary.act) return false;
    const skill = gd.skills[String(mercenary.skillId)]?.skill;
    if (
      !skill ||
      !Object.entries(row).some(
        ([key, value]) => /^skill\d+$/.test(key) && value === skill
      )
    )
      return false;
    // Blizzless has distinct native hirelings for dual swords and dual axes.
    if (type.startsWith("barbarian-frenzy"))
      return Number(row.class) === (type === "barbarian-frenzy-axes" ? 953 : 560);
    return true;
  }
  const saveId = (kind: "uniqueItems" | "setItems", id?: string) => {
    if (!id) return 0;
    const value = (gd[kind][id] as unknown as Definition | undefined)?.saveId;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0)
      throw new GameSaveError("validation", `Missing game record ID: ${id}`);
    return value;
  };
  // UI/catalog IDs are stable across patches; the binary reader needs game row IDs.
  let reader: D2RSaver | undefined;
  // Planner affixes are zero-based rows. The save reserves zero for an empty slot.
  const saveAffixId = (id?: string) => (id ? Number(id.slice(2)) + 1 : 0);
  const plannerAffixId = (id?: string) =>
    id ? id.slice(0, 2) + String(Number(id.slice(2)) - 1).padStart(3, "0") : undefined;
  function readCharacter(bytes: Uint8Array) {
    if (!reader) {
      const readData = structuredClone(data);
      for (const kind of ["uniqueItems", "setItems"] as const) {
        const prefix = kind === "uniqueItems" ? "unique" : "set";
        readData[kind] = Object.fromEntries(
          Object.entries(readData[kind]).map(([id, row]) => [
            `${prefix}${String(saveId(kind, id)).padStart(3, "0")}`,
            row,
          ])
        );
      }
      for (const kind of ["magicPrefix", "magicSuffix", "autoMagic"] as const) {
        readData[kind] = Object.fromEntries(
          Object.entries(data[kind]).map(([id, row]) => [
            id.slice(0, 2) + String(saveAffixId(id)).padStart(3, "0"),
            row,
          ])
        );
      }
      reader = D2RSaver.fromData(readData, locale);
    }
    return reader.readD2S(bytes);
  }

  function storedItems(
    bytes: Uint8Array,
    profile: D2SCharacterProfile,
    items: Record<number | string, BinaryParsedItem>
  ) {
    const result: NonNullable<PlannerBuild["storedItems"]> = [];
    for (const location of ["cube", "belt"] as const) {
      for (const [position, id] of profile[location].entries()) {
        if (id === undefined) continue;
        const { start, end } = items[id].binaryOffset;
        if (start % 8 || end % 8 || end <= start || end > bytes.length * 8)
          throw new GameSaveError("validation");
        const hex = Array.from(bytes.subarray(start / 8, end / 8), (byte) =>
          byte.toString(16).padStart(2, "0")
        ).join("");
        result.push({ location, position, hex });
      }
    }
    return result;
  }
  /**
   * Turn a native v105 character save into a planner draft.  This deliberately
   * favours keeping a usable character over rejecting saves with an item the
   * catalogue does not know yet: such an item is represented by its base and
   * decoded stats.  Unique/set IDs are restored when the local game data has a
   * matching save id, so exported planner saves round-trip losslessly enough
   * for editing and re-exporting.
   */
  function importCharacter(
    bytes: Uint8Array,
    decoded = readCharacter(bytes)
  ): PlannerBuild {
    const { profile, items } = decoded;
    // The reader also uses string base codes for preset inventory/stash supplies.
    const parsedItems = items as Record<number | string, BinaryParsedItem>;
    const classIndex = nativeClasses.indexOf(
      profile.class as (typeof nativeClasses)[number]
    );
    if (classIndex < 0) throw new GameSaveError("validation", "class");
    const classId = classes[classIndex];
    const build = createBuild(classId);
    // A native save owns its inventory; do not retain the new-character defaults.
    build.charms = [];
    const stored = storedItems(bytes, profile, parsedItems);
    if (stored.length) build.storedItems = stored;
    build.difficulty = "normal";
    for (const [index, { value }] of difficulties.entries()) {
      const flags = profile.quests[index];
      build.quests[value] = {
        den: flags.denofevil,
        radament: flags.radamentslair,
        izual: flags.thefallenangel,
        lamEsen: flags.lamessenstome,
        anya: flags.prisonofice,
        goldenBird: flags.thegoldenbird,
      };
      for (const { key, bit } of waypoints)
        build.waypoints[value][key] = !!(
          bytes[waypointBitsStart(index) + (bit >> 3)] &
          (1 << (bit & 7))
        );
      if (bytes[152 + index] & 0x80) build.difficulty = value;
    }
    const nameField = bytes.subarray(299, 331);
    const nameEnd = nameField.indexOf(0);
    build.name =
      nameEnd > 15
        ? new TextDecoder().decode(nameField.subarray(0, nameEnd))
        : profile.name;
    if (decoded.warnings.length)
      throw new GameSaveError("validation", decoded.warnings.join("; "));
    // v105 stores 16 hotkeys and four active skills in consecutive 32-bit fields.
    build.nativeState = {
      skillBindings: toHex(bytes.subarray(40, 120)),
      mapId: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
        155,
        true
      ),
      died: !!(bytes[20] & 8),
      ...(profile.rawCorpse && profile.rawCorpse.length > 4
        ? { corpse: toHex(profile.rawCorpse) }
        : {}),
      ...(profile.rawGolem && profile.rawGolem.length > 3
        ? { golem: toHex(profile.rawGolem) }
        : {}),
    };
    build.hardcore = !!(bytes[20] & 4);
    if (bytes[248] === 2 || bytes[248] === 3)
      build.gameSave = {
        mode: bytes[248] === 3 ? "rotw" : "expansion",
        legacyExpansion: !!(bytes[20] & 0x20),
      };
    build.level = Math.max(1, Math.min(99, profile.level));
    build.stashGold = profile.goldStash ?? 0;
    build.experience = (profile.attributes?.experience ?? 0) >>> 0;
    build.weaponSet = profile.weaponSet === 1 ? 1 : 0;
    build.gold = Math.max(0, Math.min(build.level * 10000, profile.gold ?? 0));
    const character = plannerClasses.find((entry) => entry.id === classId)!;
    build.attributes = {
      strength: Math.max(
        0,
        (profile.attributes?.strength ?? profile.stats.str) - character.base.strength
      ),
      dexterity: Math.max(
        0,
        (profile.attributes?.dexterity ?? profile.stats.dex) - character.base.dexterity
      ),
      vitality: Math.max(
        0,
        (profile.attributes?.vitality ?? profile.stats.vit) - character.base.vitality
      ),
      energy: Math.max(
        0,
        (profile.attributes?.energy ?? profile.stats.int) - character.base.energy
      ),
    };
    build.skills = Object.fromEntries(
      Object.entries(profile.skills)
        .filter(
          ([id, points]) =>
            plannerClasses &&
            plannerSkills.some(
              (skill) => skill.id === Number(id) && skill.classId === classId
            ) &&
            points > 0
        )
        .map(([id, points]) => [Number(id), Math.min(20, points)])
    );

    const quality: Record<number, PlannerItem["quality"]> = {
      1: "normal",
      2: "normal",
      3: "superior",
      4: "magic",
      5: "set",
      6: "rare",
      7: "unique",
      8: "crafted",
      9: "runeword",
    };
    const statBonuses: Record<string, keyof PlannerItem["bonuses"]> = {
      strength: "strength",
      dexterity: "dexterity",
      vitality: "vitality",
      energy: "energy",
      maxhp: "life",
      maxmana: "mana",
      fireresist: "fireResist",
      coldresist: "coldResist",
      lightresist: "lightningResist",
      poisonresist: "poisonResist",
      item_allskills: "allSkills",
      item_fastercastrate: "fcr",
      item_fastergethitrate: "fhr",
      item_fasterattackrate: "ias",
      item_fastermovevelocity: "frw",
      item_magicbonus: "magicFind",
    };
    const findCatalogId = (kind: "uniqueItems" | "setItems", id?: string) => {
      if (!id) return undefined;
      const prefix = kind === "uniqueItems" ? "unique" : "set";
      const savedId = Number(id.slice(prefix.length));
      return Object.entries(gd[kind]).find(([, value]) => {
        const saved = (value as unknown as Definition).saveId;
        return typeof saved === "number" && saved === savedId;
      })?.[0];
    };
    const makeItem = (native: BinaryParsedItem): PlannerItem => {
      const base = gd.items[native.base];
      const itemQuality = quality[native.quality] ?? "normal";
      const prefixId = plannerAffixId(native.magicPrefixCode);
      const suffixId = plannerAffixId(native.magicSuffixCode);
      const prefixKey = prefixId
        ? (gd.magicPrefix[prefixId] as unknown as Definition | undefined)?.name
        : undefined;
      const suffixKey = suffixId
        ? (gd.magicSuffix[suffixId] as unknown as Definition | undefined)?.name
        : undefined;
      const prefix = prefixKey ? gd.locale.strings[prefixKey] || prefixKey : undefined;
      const suffix = suffixKey ? gd.locale.strings[suffixKey] || suffixKey : undefined;
      const { autoAffixId, superiorId, baseStats } = native as BinaryParsedItem & {
        autoAffixId?: number;
        superiorId?: number;
        baseStats?: Record<string, number>;
      };
      const remaining = { ...(baseStats ?? native.stats) };
      const baseItem = {
        quality: itemQuality,
        baseCode: native.base,
        itemLevel: native.ilvl,
      } as PlannerItem;
      function restoreModifier(field: "automod" | "superiorMod", id: string) {
        // Magic/rare affixes and automods may contribute to the same saved stat.
        // Keep the remaining contribution in the imported item after restoring the base.
        const overlaps =
          field === "automod" && (itemQuality === "magic" || itemQuality === "rare");
        const fits = (key: string, value: number) =>
          overlaps && value >= 0
            ? (remaining[key] ?? 0) >= value
            : (remaining[key] ?? 0) === value;
        const option = baseModifierOptions(baseItem, field).find((row) => row.id === id);
        if (!option) return;
        const values = option.ranges.map(({ max }) => max);
        for (const [i, range] of option.ranges.entries()) {
          if (range.min === range.max) continue;
          const def = Object.fromEntries(
            ["prop", "par", "min", "max"].map((key) => [
              key + "1",
              option.definition[key + (i + 1)],
            ])
          );
          for (let value = range.max; value >= range.min; value--) {
            const stats = definitionStats(
              { ...def, min1: value, max1: value },
              native.base,
              1
            );
            if (Object.entries(stats).every(([key, amount]) => fits(key, amount))) {
              values[i] = value;
              break;
            }
          }
        }
        const mod = { id, values };
        const stats = baseModifierStats({ ...baseItem, [field]: mod });
        if (!Object.entries(stats).every(([key, value]) => fits(key, value))) return;
        const totals = { ...native.stats };
        for (const [key, value] of Object.entries(stats)) {
          remaining[key] -= value;
          totals[key] -= value;
        }
        native = { ...native, stats: totals };
        return mod;
      }
      const automod =
        autoAffixId && restoreModifier("automod", plannerAffixId(`am${autoAffixId}`)!);
      const superiorMod =
        superiorId !== undefined &&
        restoreModifier("superiorMod", `qm${String(superiorId).padStart(3, "0")}`);
      const bonuses: PlannerItem["bonuses"] = {};
      for (const [stat, key] of Object.entries(statBonuses)) {
        const value = native.stats[stat];
        if (typeof value === "number")
          // Item life/mana stats returned by d2r-saver are already expressed in
          // display points (unlike the fixed-point character resource fields).
          bonuses[key] = value;
      }
      const catalogId =
        itemQuality === "unique"
          ? findCatalogId("uniqueItems", native.unique)
          : itemQuality === "set"
            ? findCatalogId("setItems", native.unique)
            : undefined;
      const nativeRuneword =
        itemQuality === "runeword" ? gd.runes[native.unique ?? ""] : undefined;
      const runewordName = nativeRuneword?.name;
      const baseTypes = types(native.base);
      const baseKind = baseTypes.has("weap")
        ? "weapon"
        : baseTypes.has("shld")
          ? "shield"
          : "armor";
      const runeword =
        typeof runewordName === "string"
          ? plannerRunewords.find(
              (candidate) =>
                runewordNames(candidate).some(
                  (name) => normalize(name) === normalize(runewordName)
                ) &&
                word({
                  key: "import",
                  owner: "stash",
                  item: {
                    name: runewordName,
                    quality: "runeword",
                    runewordId: candidate.id,
                    baseKind,
                    requiredLevel: 1,
                    notes: "",
                    bonuses: {},
                  },
                })?.[0] === native.unique
            )
          : undefined;
      const runewordId = runeword?.id;
      const runeCodes =
        itemQuality === "runeword"
          ? native.socketedItems.map((value) =>
              typeof value === "string" ? value : parsedItems[value].base
            )
          : [];
      const item: PlannerItem = {
        name: catalogId
          ? gd.locale.strings[
              (itemQuality === "set" ? gd.setItems : gd.uniqueItems)[catalogId].index
            ] || (itemQuality === "set" ? gd.setItems : gd.uniqueItems)[catalogId].index
          : runeword?.name.en ||
            runewordName ||
            ((itemQuality === "rare" || itemQuality === "crafted") && native.name) ||
            (itemQuality === "magic" && (prefix || suffix)
              ? `${prefix ? `${prefix} ` : ""}${gd.locale.strings[base?.namestr ?? ""] || base?.name || native.base}${suffix ? ` ${suffix}` : ""}`
              : gd.locale.strings[base?.namestr ?? ""] || base?.name || native.base),
        quality: itemQuality === "superior" && !superiorMod ? "normal" : itemQuality,
        ...(automod ? { automod } : {}),
        ...(superiorMod ? { superiorMod } : {}),
        requiredLevel: Math.max(1, base?.levelreq || 1),
        notes: "",
        bonuses,
        classBonuses: Object.fromEntries(
          classes.flatMap((id, index) => {
            const value = native.stats[`item_addclassskills#${index}`];
            return value ? [[id, value]] : [];
          })
        ),
        ...(catalogId ? { catalogId } : {}),
        ...(Number.isInteger(runewordId) && runewordId! > 0 ? { runewordId } : {}),
        ...(itemQuality === "runeword"
          ? {
              baseKind,
              ...(runeCodes.some((code) => /^\d{2}r$/.test(code))
                ? { runewordRunes: runeCodes }
                : {}),
            }
          : {}),
        baseCode: native.base,
        itemLevel: Math.max(1, Math.min(99, native.ilvl || 1)),
        ...(native.iconIndex === undefined ? {} : { iconIndex: native.iconIndex }),
        ...(native.sockets ? { sockets: native.sockets } : {}),
        ...(itemQuality !== "runeword" && native.socketedItems.length
          ? {
              socketedItems: native.socketedItems.map((value) =>
                typeof value === "string"
                  ? value
                  : items[value]?.quality === 7
                    ? (findCatalogId("uniqueItems", items[value]?.unique) ?? null)
                    : items[value]?.base === "jew" &&
                        items[value]?.stats.item_fasterattackrate === 15
                      ? items[value]?.stats.fireresist === 30
                        ? "j15fr"
                        : "j15ar"
                      : (items[value]?.base ?? null)
              ),
            }
          : {}),
        ...(native.ethereal ? { ethereal: true } : {}),
        ...(base?.stackable && native.quantity !== undefined
          ? { quantity: native.quantity }
          : {}),
      };
      // Native runeword stats exclude the inserted runes. The planner's flat
      // bonuses include them; the exporter removes them again from the parent.
      if (itemQuality === "runeword") {
        const definition = itemDefinition(item);
        if (definition) {
          // Decode only rolls uniquely determined by a stat in the word's own
          // property list. Base modifiers and inserted runes are separate lists.
          const minimum = definitionStats(definition, native.base, 0);
          const maximum = definitionStats(definition, native.base, 1);
          const values: Record<number, number> = {};
          for (let index = 1; index <= 7; index++) {
            const property = gd.properties[String(definition[`prop${index}`])];
            const range = property && propertyRange(definition, property, index);
            if (!range) continue;
            const raised = definitionStats(definition, native.base, 0, {
              [index]: range.min + 1,
            });
            for (const [key, first] of Object.entries(minimum)) {
              if (
                raised[key] !== first + 1 ||
                maximum[key] - first !== range.max - range.min
              )
                continue;
              const amount =
                (native.stats[key] ?? 0) - (baseStats ? (remaining[key] ?? 0) : 0);
              const value = range.min + amount - first;
              if (Number.isInteger(value) && value >= range.min && value <= range.max) {
                values[index] = value;
                break;
              }
            }
          }
          if (Object.keys(values).length) item.propertyValues = values;
        }
        const category =
          baseKind === "weapon" ? "weapon" : baseKind === "shield" ? "shield" : "helm";
        for (const value of native.socketedItems) {
          const code = typeof value === "string" ? value : parsedItems[value]?.base;
          if (!code) throw new GameSaveError("property", String(value));
          const socket = socketBonuses(code, category);
          for (const [key, value] of Object.entries(socket.bonuses)) {
            const bonus = key as keyof PlannerItem["bonuses"];
            bonuses[bonus] = (bonuses[bonus] ?? 0) + value!;
          }
          for (const [id, value] of Object.entries(socket.classBonuses)) {
            const classId = id as ClassId;
            item.classBonuses![classId] = (item.classBonuses![classId] ?? 0) + value!;
          }
        }
      }
      if (catalogId) {
        const definition = (itemQuality === "set" ? gd.setItems : gd.uniqueItems)[
          catalogId
        ] as unknown as Definition;
        if (
          itemQuality === "unique" &&
          isContainerBase(native.base) &&
          definition.prop1 === "Add_one"
        )
          item.containerQuantity = native.stats.Add_one ?? 0;
        const values: Record<number, number> = {};
        for (let index = 1; index <= 12; index++) {
          const property = gd.properties[String(definition[`prop${index}`])];
          const range = property && propertyRange(definition, property, index);
          const value =
            definition[`prop${index}`] === "oskill"
              ? native.stats[`item_nonclassskill#${definition[`par${index}`]}`]
              : native.uniqueValues?.[index - 1];
          if (
            range &&
            value !== undefined &&
            Number.isInteger(value) &&
            value >= range.min &&
            value <= range.max
          )
            values[index] = value;
        }
        if (Object.keys(values).length) item.propertyValues = values;
      }
      if (item.socketedItems) {
        const rolls: NonNullable<PlannerItem["socketPropertyValues"]> = {};
        native.socketedItems.forEach((id, index) => {
          const code = item.socketedItems?.[index];
          const ranges = code && socketInsertByCode.get(code)?.ranges;
          if (!code || !ranges || typeof id !== "number") return;
          const child = parsedItems[id];
          const definition = socketJewelDefinition(code);
          if (!child || !definition) return;
          for (const [key, range] of Object.entries(ranges)) {
            const stat = gd.properties[String(definition[`prop${key}`])]?.stat1;
            const value = stat && child.stats[stat];
            if (typeof value !== "number" || value < range.min || value > range.max)
              throw new GameSaveError("property", code);
            (rolls[index] ??= {})[key] = value;
          }
        });
        if (Object.keys(rolls).length) item.socketPropertyValues = rolls;
      }
      const socketIcons = Object.fromEntries(
        native.socketedItems.flatMap((value, index) => {
          const child = typeof value === "number" ? parsedItems[value] : undefined;
          return child?.base === "jew" &&
            child.quality === 4 &&
            child.iconIndex !== undefined
            ? [[index, child.iconIndex]]
            : [];
        })
      );
      if (Object.keys(socketIcons).length) item.socketIconIndices = socketIcons;
      if (baseTypes.has("char") && itemQuality === "magic") {
        const ids = [prefixId, suffixId];
        let affixes = restoreMagicAffixes(item, ids, native.stats);
        // Older planner saves wrote zero-based IDs. Recover them only when both
        // the full affix list and every stat roll agree with the saved charm.
        if (affixes.length < ids.filter(Boolean).length) {
          const legacy = restoreMagicAffixes(
            item,
            [native.magicPrefixCode, native.magicSuffixCode],
            native.stats
          );
          const stats = affixStats({ ...item, affixes: legacy });
          if (
            legacy.length === ids.filter(Boolean).length &&
            Object.keys(stats).length === Object.keys(native.stats).length &&
            Object.entries(stats).every(([key, value]) => value === native.stats[key])
          ) {
            affixes = legacy;
            item.name = magicItemName(
              { ...item, affixes },
              gd.locale.strings[base.namestr] || base.name || native.base
            );
          }
        }
        if (affixes.length) {
          item.affixes = affixes;
          for (const stat of Object.keys(affixStats(item))) {
            const key = statBonuses[stat];
            if (key) delete bonuses[key];
            const classIndex = /^item_addclassskills#(\d+)$/.exec(stat)?.[1];
            if (classIndex) delete item.classBonuses?.[classes[Number(classIndex)]];
          }
        }
      }
      // Separate native base skill mods from the word/craft and random affixes.
      const profile = baseSkillProfile(item);
      if (profile) {
        const reference = itemDefinition(item);
        const values: Record<string, number> = {};
        if (reference)
          for (let index = 1; index <= 12; index++) {
            const property = gd.properties[String(reference[`prop${index}`])];
            const range = property && propertyRange(reference, property, index);
            const value = native.uniqueValues?.[index - 1];
            if (range && value !== undefined && value >= range.min && value <= range.max)
              values[index] = value;
          }
        const fixed = reference
          ? definitionStats(
              reference,
              native.base,
              0,
              values,
              itemSkillClass(item, build.classId),
              item.propertyChoices
            )
          : {};
        for (const [key, value] of Object.entries(affixStats(item)))
          fixed[key] = (fixed[key] || 0) + value;
        const staff: Record<string, number> = {};
        for (const skill of baseSkillOptions(item)) {
          const key = `item_singleskill#${skill.id}`,
            value = (native.stats[key] || 0) - (fixed[key] || 0);
          if (Number.isInteger(value) && value >= 1 && value <= 3)
            staff[skill.id] = value;
        }
        if (Object.keys(staff).length <= 3 && Object.keys(staff).length)
          item.baseSkills = staff;
        for (const tab of profile.skillTabs) {
          const key = `item_addskill_tab#${tab.tab}`,
            value = (native.stats[key] || 0) - (fixed[key] || 0);
          if (Number.isInteger(value) && value >= tab.min && value <= tab.max)
            item.baseSkillTab = { tab: tab.tab, value };
        }
      }
      const extra = Object.fromEntries(
        Object.entries(native.stats).flatMap(([stat, value]) => {
          if (isProjectedStat(stat)) return [];
          // The native reader exposes event procs as skill/chance -> level;
          // the property compiler and binary writer use skill/level -> chance.
          const proc =
            /^(item_skillon(?:attack|kill|death|hit|levelup|gethit))#(\d+)#(\d+)$/.exec(
              stat
            );
          return [
            [
              proc ? `${proc[1]}#${proc[2]}#${value}` : stat,
              proc ? Number(proc[3]) : value,
            ],
          ];
        })
      );
      for (const [key, value] of Object.entries(baseSkillStats(item)))
        extra[key] = (extra[key] || 0) - value;
      // d2r-saver adds the implicit blunt-weapon modifier while reading.
      if (baseTypes.has("blun"))
        extra.item_undeaddamage_percent = (extra.item_undeaddamage_percent ?? 0) - 50;
      delete extra.item_numsockets;
      delete extra.item_ethereal;
      const affixIds =
        itemQuality === "crafted"
          ? [...(native.prefixCodes ?? []), ...(native.suffixCodes ?? [])].map((id) =>
              plannerAffixId(id)!
            )
          : [];
      item.importedStats = {
        ...(affixIds.length ? { affixIds } : {}),
        signature: nativeStatsSignature(item),
        values: Object.fromEntries(Object.entries(extra).filter(([, value]) => value)),
      };
      return item;
    };
    const slotByGame: Record<string, EquipmentSlot> = Object.fromEntries(
      Object.entries(slots).map(([slot, game]) => [game, slot as EquipmentSlot])
    );
    for (const [gameSlot, id] of Object.entries(profile.items)) {
      const native = typeof id === "number" ? items[id] : undefined;
      const slot = slotByGame[gameSlot];
      if (native && slot) build.equipment[slot] = makeItem(native);
    }
    if (profile.merc) {
      const rows = gd.hireling[profile.merc] ?? [];
      build.mercenary = {
        type:
          mercenaries.find(
            (entry) =>
              Array.isArray(rows) &&
              rows.some((row) =>
                matchesMercenary(entry.value, row as unknown as Definition)
              )
          )?.value ?? "desert-might",
        level: Math.max(1, Math.min(98, profile.mercLevel ?? build.level)),
        equipment: {},
      };
      for (const [gameSlot, id] of Object.entries(profile.mercItems)) {
        const native = typeof id === "number" ? items[id] : undefined;
        const slot = slotByGame[gameSlot];
        if (native && slot && ["head", "armor", "mainHand", "offHand"].includes(slot))
          build.mercenary.equipment[slot as "head" | "armor" | "mainHand" | "offHand"] =
            makeItem(native);
      }
    }
    for (const [position, id] of profile.inventory.entries()) {
      if (id === "box") {
        build.charms.push({
          id: `d2s-cube-${position}`,
          position,
          height: 2,
          name: "Horadric Cube",
          quality: "normal",
          requiredLevel: 1,
          notes: "",
          bonuses: {},
          baseCode: "box",
          itemLevel: 1,
        });
        continue;
      }
      const native = id === undefined ? undefined : parsedItems[id];
      if (!native) continue;
      const item = makeItem(native);
      const height = Math.max(1, Math.min(4, gd.items[native.base]?.invheight || 1));
      build.charms.push({
        ...item,
        id: `d2s-${native.guid ?? native.itemId}-${position}`,
        position,
        height,
      });
    }
    for (const [position, id] of profile.stash.entries()) {
      // Preset supplies, including ua1–ua5, are keyed by their base code.
      const native = id === undefined ? undefined : parsedItems[id];
      if (!native) continue;
      build.stash.push({ ...makeItem(native), stashPosition: position });
    }
    return parseBuild(build);
  }
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
  async function importGameFile(bytes: Uint8Array) {
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < 16 || header.getUint32(0, true) !== 0xaa55aa55)
      throw new GameSaveError("validation");
    const version = header.getUint32(4, true);
    if (version !== 105 && version !== 99)
      throw new GameSaveError("unsupportedVersion", String(version));
    if (
      header.getUint32(8, true) !== bytes.length ||
      header.getUint32(12, true) !== saveChecksum(bytes)
    )
      throw new GameSaveError("validation");
    if (version === 105) return { build: importCharacter(bytes) };
    // Both layouts use Blizzless stat IDs. The binary codec switches header
    // offsets, quantity bits and item trailers according to header.version.
    const config = { disableItemEnhancements: true, extendedStash: true };
    const legacy = await read(bytes, constants, config);
    legacy.header.version = 105;
    const converted = await write(legacy, constants, config);
    // Preserve opaque quest/waypoint flags, hotkeys, mercenary metadata and
    // the complete UTF-8 name (the generic codec reads only 16 name bytes).
    converted.set(bytes.subarray(36, 191), 20);
    converted.set(bytes.subarray(335, 765), 403);
    const nameField = bytes.subarray(267, 299);
    const terminator = nameField.indexOf(0);
    const nameBytes = terminator < 0 ? nameField : nameField.subarray(0, terminator);
    converted.fill(0, 299, 331);
    converted.set(nameBytes, 299);
    new DataView(converted.buffer, converted.byteOffset, converted.byteLength).setUint32(
      12,
      saveChecksum(converted),
      true
    );
    const decoded = readCharacter(converted);
    if (decoded.warnings.length)
      throw new GameSaveError("validation", decoded.warnings.join("; "));
    // Verify the item payloads in their original layout, including socketed
    // children, before offering the converted file for download.
    const verified = await read(converted, constants, config);
    for (const section of [
      "items",
      "merc_items",
      "corpse_items",
      "golem_item",
    ] as const) {
      const before = [legacy[section] ?? []].flat();
      const after = [verified[section] ?? []].flat();
      if (before.length !== after.length) throw new GameSaveError("validation", section);
      for (const [index, item] of before.entries()) {
        const original = await writeItem(item, 99, constants, config);
        const restored = await writeItem(after[index], 99, constants, config);
        if (
          original.length !== restored.length ||
          original.some((byte, i) => byte !== restored[i])
        )
          throw new GameSaveError("validation", item.type);
      }
    }
    return { build: importCharacter(converted, decoded), converted };
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
  function baseModifierOptions(item: PlannerItem, field: "automod" | "superiorMod") {
    const base = gd.items[item.baseCode ?? ""] as unknown as Definition | undefined;
    const t = types(item.baseCode ?? "");
    const superior = field === "superiorMod";
    const allowed = superior
      ? ["superior", "runeword"]
      : ["normal", "superior", "runeword", "magic", "rare"];
    const isBase = allowed.includes(item.quality);
    if (!base || !isBase) return [];
    const category = ["shld", "scep", "wand", "staf", "bow", "boot", "glov", "belt"].find(
      (type) => t.has(type)
    );
    const qualityType =
      (
        {
          shld: "shield",
          scep: "scepter",
          wand: "wand",
          staf: "staff",
          bow: "bow",
          boot: "boots",
          glov: "gloves",
          belt: "belt",
        } as Record<string, string>
      )[category ?? ""] ?? (t.has("weap") ? "weapon" : "armor");
    if (superior && (!(t.has("weap") || t.has("armo")) || base.compactsave)) return [];
    if (!superior && (!base.autoprefix || item.baseSkillTab)) return [];
    const level = item.itemLevel ?? 99;
    return Object.entries(superior ? gd.qualityItems : gd.autoMagic).flatMap(
      ([id, def]) => {
        const row = def as unknown as Definition;
        if (
          superior
            ? !row[qualityType] ||
              ((!base.durability || base.nodurability) &&
                (row.mod1code === "dur%" || row.mod2code === "dur%"))
            : row.group !== base.autoprefix ||
              !row.spawnable ||
              (item.quality === "rare" && !row.rare) ||
              Number(row.level ?? 0) > level ||
              (!!row.maxlevel && Number(row.maxlevel) < level) ||
              row.mod1code === "skilltab" ||
              ![1, 2, 3, 4, 5, 6, 7].some((i) => t.has(String(row[`itype${i}`]))) ||
              [1, 2, 3, 4, 5].some((i) => t.has(String(row[`etype${i}`])))
        )
          return [];
        const definition: Definition = {};
        const ranges = [1, 2, 3].map((i) => {
          const code = row[`mod${i}code`];
          if (!code) return { min: 0, max: 0 };
          definition[`prop${i}`] = code;
          definition[`par${i}`] = row[`mod${i}param`];
          definition[`min${i}`] = row[`mod${i}min`];
          definition[`max${i}`] = row[`mod${i}max`];
          return (
            propertyRange(definition, gd.properties[String(code)] ?? {}, i) ?? {
              min: Number(row[`mod${i}max`] ?? 0),
              max: Number(row[`mod${i}max`] ?? 0),
            }
          );
        });
        return [{ id, definition, ranges, requiredLevel: Number(row.levelreq ?? 1) }];
      }
    );
  }
  function baseModifierRequiredLevel(item: PlannerItem) {
    const id = item.automod?.id;
    if (!id) return 1;
    return (
      baseModifierOptions(item, "automod").find((option) => option.id === id)
        ?.requiredLevel ?? 1
    );
  }
  function baseModifierStats(item: PlannerItem, strict = false) {
    const stats: Record<string, number> = {};
    for (const field of ["automod", "superiorMod"] as const) {
      const mod = item[field];
      if (!mod) continue;
      const option = baseModifierOptions(item, field).find((row) => row.id === mod.id);
      if (
        !option ||
        option.ranges.some(
          ({ min, max }, i) =>
            !Number.isInteger(mod.values[i]) || mod.values[i] < min || mod.values[i] > max
        )
      ) {
        if (strict) throw new GameSaveError("property", item.name);
        continue;
      }
      const rolls = Object.fromEntries(
        option.ranges.flatMap(({ min, max }, i) =>
          min < max ? [[i + 1, mod.values[i]]] : []
        )
      );
      for (const [key, value] of Object.entries(
        definitionStats(option.definition, item.baseCode ?? "", 1, rolls)
      ))
        stats[key] = (stats[key] ?? 0) + value;
    }
    return stats;
  }
  function word(entry: GameSaveEntry) {
    const known = findPlannerRuneword(entry.item);
    const names = known ? runewordNames(known) : [entry.item.name];
    const matches = Object.entries(gd.runes).filter(([, def]) =>
      names.some((name) => normalize(def.name) === normalize(name))
    );
    if (matches.length < 2) return matches[0];
    const kind = names.some((name) => /\(weapons?\)/i.test(name))
      ? "weapon"
      : names.some((name) => /\(armor\)/i.test(name))
        ? "armor"
        : entry.item.baseKind;
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
  function handsFit(heroClass: ClassId, main?: string, off?: string) {
    if (!off) return true;
    if (stashSupplies[off]?.category === "ammo") {
      if (!main) return true;
      const ammoType = [...types(main)]
        .map((type) => gd.itemTypes[type]?.shoots)
        .find(Boolean);
      return !!ammoType && types(off).has(ammoType);
    }
    if (heroClass !== "barbarian") return true;
    const requiresBothHands = (code: string) =>
      !!(gd.weapons[code] as unknown as Definition | undefined)?.["2handed"] &&
      !types(code).has("swor");
    return !requiresBothHands(off) && (!main || !requiresBothHands(main));
  }
  function permitted(code: string, entry: GameSaveEntry, build: PlannerBuild) {
    const base = gd.items[code];
    if (!base || !/^[a-z0-9]{3}$/.test(code)) return false;
    if (
      entry.item.quality === "superior" &&
      !baseModifierOptions({ ...entry.item, baseCode: code }, "superiorMod").length
    )
      return false;
    if (
      entry.owner === "inventory" &&
      entry.position !== undefined &&
      (base.invheight !== entry.height || base.invwidth !== inventoryWidth(entry.item))
    )
      return false;
    if (
      entry.item.craftId &&
      (entry.item.quality !== "crafted" ||
        !craftVariant({ ...entry.item, baseCode: code }))
    )
      return false;
    // Ammunition is the only loose supply that can be equipped.
    const supply = stashSupplies[code];
    const equippedAmmo =
      supply?.category === "ammo" &&
      entry.item.quality === "normal" &&
      entry.owner === "hero" &&
      (entry.slot === "offHand" || entry.slot === "swapOff");
    if (supply && !equippedAmmo)
      return (
        (["stash", "inventory"].includes(entry.owner) ||
          (entry.owner === "charm" && isWorldstoneShard(code) && entry.height === 1)) &&
        entry.item.quality === (supply.catalogId ? "unique" : "normal") &&
        (!supply.catalogId ||
          !entry.item.catalogId ||
          entry.item.catalogId === supply.catalogId)
      );
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
    if (isTome(code))
      return (
        entry.item.quality === "normal" &&
        (entry.owner === "stash" || (entry.owner === "charm" && entry.height === 2))
      );
    if (entry.item.baseKind === "weapon" && !t.has("weap")) return false;
    if (entry.item.baseKind === "shield" && !t.has("shld")) return false;
    if (entry.item.baseKind === "armor" && (!t.has("armo") || t.has("shld")))
      return false;
    const mercenary = mercenaries.find((entry) => entry.value === build.mercenary.type);
    const nativeClass =
      entry.owner === "mercenary"
        ? mercenary?.act === 5
          ? "bar"
          : mercenary?.act === 1
            ? "ama"
            : undefined
        : nativeClasses[classes.indexOf(build.classId)];
    const classRestriction = [...t]
      .map((type) => gd.itemTypes[type]?.class)
      .find(Boolean);
    if (
      classRestriction &&
      !["stash", "inventory"].includes(entry.owner) &&
      classRestriction !== nativeClass
    )
      return false;
    if (entry.owner === "charm") {
      if (entry.item.quality === "unique")
        return (
          t.has("char") && base.invwidth <= 3 && base.invheight === (entry.height ?? 1)
        );
      return code === { 1: "cm1", 2: "cm2", 3: "cm3" }[entry.height ?? 1];
    }
    if (entry.slot) {
      const slot = slots[entry.slot].replace(/2$/, "");
      if (
        entry.owner === "mercenary" &&
        build.mercenary.type.startsWith("barbarian-frenzy") &&
        ["rarm", "larm"].includes(slot)
      ) {
        const weaponType =
          build.mercenary.type === "barbarian-frenzy-axes" ? "axe" : "swor";
        if (!t.has(weaponType) || Number((base as unknown as Definition)["2handed"]))
          return false;
      }
      if (entry.owner === "hero" && (slot === "rarm" || slot === "larm")) {
        const main =
          entry.slot === "swapMain" || entry.slot === "swapOff" ? "swapMain" : "mainHand";
        const off = main === "swapMain" ? "swapOff" : "offHand";
        const mainCode = slot === "rarm" ? code : build.equipment[main]?.baseCode;
        const offCode = slot === "larm" ? code : build.equipment[off]?.baseCode;
        if (!handsFit(build.classId, mainCode, offCode)) return false;
      }
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
      const barbarianOffhand =
        entry.owner === "hero" &&
        build.classId === "barbarian" &&
        slot === "larm" &&
        t.has("weap") &&
        (t.has("swor") || !Number((base as unknown as Definition)["2handed"]));
      if (!bodySlots.includes(barbarianOffhand ? "rarm" : slot)) return false;
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
          const original = String(d.code ?? d.item ?? "");
          const family = gd.items[original] as unknown as Definition | undefined;
          const selected =
            entry.item.catalogId === unique ? entry.item.baseCode : undefined;
          const base =
            selected &&
            [original, family?.normcode, family?.ubercode, family?.ultracode].includes(
              selected
            )
              ? selected
              : original;
          const name = gd.locale.strings[String(d.index)] || d.index;
          return permitted(base, entry, build)
            ? [
                {
                  value: unique,
                  unique,
                  base,
                  label: `${name} · ${label(base)}`,
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
            entry.owner === "inventory" ||
            types(code).has("weap") ||
            types(code).has("armo") ||
            types(code).has("ring") ||
            types(code).has("amul") ||
            types(code).has("char") ||
            types(code).has("jewl") ||
            isTome(code) ||
            !!stashSupplies[code] ||
            code === "key" ||
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
    skillClass: ClassId = "amazon",
    propertyChoices: PlannerItem["propertyChoices"] = {}
  ) {
    def = resolvePropertyValues(
      resolvePropertyGroups(def, gd.propertyGroups, propertyChoices),
      gd.properties,
      values
    );
    const stats: Record<string, number> = {};
    const add = (key: string, value: number, param?: string | number) => {
      const k = param == null ? key : `${key}#${param}`;
      stats[k] = (stats[k] || 0) + value;
    };
    for (let i = 1; i <= 12; i++) {
      const code = String(def[`prop${i}`] ?? "");
      // Asterisk-prefixed cells are disabled properties in the game tables.
      if (!code || code.startsWith("*")) continue;
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
    skillClass: ClassId = "amazon",
    propertyChoices: PlannerItem["propertyChoices"] = {}
  ) {
    const definition = (quality === "unique" ? gd.uniqueItems : gd.setItems)[id];
    if (!definition) throw new GameSaveError("base", id);
    // The summary only projects properties described by the current game tables.
    // The binary exporter retains its stricter validation of the full definition.
    const supported = resolvePropertyGroups(
      definition,
      gd.propertyGroups,
      propertyChoices
    ) as Definition;
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
    if (item.craftId) return craftDefinition(item);
    if (item.catalogId && (item.quality === "unique" || item.quality === "set")) {
      const definition = (item.quality === "unique" ? gd.uniqueItems : gd.setItems)[
        item.catalogId
      ] as unknown as Definition;
      if (item.containerQuantity === undefined) return definition;
      if (
        !definition ||
        !isContainerBase(String(definition.code)) ||
        definition.prop1 !== "Add_one"
      )
        throw new GameSaveError("base", item.name);
      return {
        ...definition,
        par1: item.containerQuantity,
        min1: item.containerQuantity,
        max1: item.containerQuantity,
      };
    }
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
      itemSkillClass(item, fallback),
      item.propertyChoices
    );
    if (item.quality === "runeword") {
      const category =
        item.baseKind === "weapon"
          ? "weapon"
          : item.baseKind === "shield"
            ? "shield"
            : "helm";
      for (const code of itemRunes(item)) {
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
  function runewordRuneOptions(item: PlannerItem): string[][] {
    if (item.quality !== "runeword") return [];
    const def = word({ key: "runes", item, owner: "stash" })?.[1] as unknown as
      Definition | undefined;
    const normal = def
      ? [1, 2, 3, 4, 5, 6].flatMap((i) =>
          def[`rune${i}`] ? [String(def[`rune${i}`])] : []
        )
      : [];
    return runeSequences(normal);
  }
  function itemRunes(item: PlannerItem): string[] {
    const options = runewordRuneOptions(item);
    if (!item.runewordRunes) return options[0] ?? [];
    const selected = options.find(
      (codes) => codes.join(",") === item.runewordRunes!.join(",")
    );
    if (!selected) throw new GameSaveError("property", item.name);
    return selected;
  }
  function socketJewelDefinition(code: string): Definition | undefined {
    const unique = gd.uniqueItems[code];
    return (
      magicSocketJewels[code]?.definition ??
      (unique && ["jew", "cjw"].includes(unique.code)
        ? (unique as Definition)
        : undefined)
    );
  }
  function socketBonuses(
    code: string,
    category: "weapon" | "helm" | "shield",
    values: PlannerItem["propertyValues"] = {}
  ) {
    const gem = gd.gems[code] as unknown as Definition | undefined;
    const jewel = socketJewelDefinition(code);
    if (!gem && !jewel) throw new GameSaveError("property", code);
    const def: Definition = jewel ?? {};
    for (let i = 1; gem && i <= 3; i++) {
      def[`prop${i}`] = gem[`${category}mod${i}code`];
      def[`par${i}`] = gem[`${category}mod${i}param`];
      def[`min${i}`] = gem[`${category}mod${i}min`];
      def[`max${i}`] = gem[`${category}mod${i}max`];
    }
    const stats = definitionStats(def, String(jewel?.code ?? ""), 1, values);
    return {
      skillBonuses: Object.fromEntries(
        Object.entries(gd.skills).flatMap(([id, skill]) => {
          const element = (
            { fire: 1, ltng: 2, mag: 3, cold: 4, pois: 5 } as Record<string, number>
          )[String((skill as unknown as Definition).etype)];
          const bonus = element ? stats[`item_elemskill#${element}`] : 0;
          return bonus ? [[id, bonus]] : [];
        })
      ),
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
  function itemResistanceCaps(item: PlannerItem, classId: ClassId) {
    const caps: Record<string, number> = {};
    const keys = resistanceTypes.map(({ maximum }) => maximum);
    const add = (stats: Record<string, number>) => {
      for (const key of keys) caps[key] = (caps[key] ?? 0) + (stats[key] ?? 0);
    };
    // Compile only resistance-cap properties, including rolled and grouped properties.
    const addDefinition = (
      row: Definition,
      roll: 0 | 1,
      values?: PlannerItem["propertyValues"],
      choices?: PlannerItem["propertyChoices"]
    ) => {
      const definition = resolvePropertyGroups(
        row,
        gd.propertyGroups,
        choices
      ) as Definition;
      const rolls: Record<string, number> = {};
      for (let i = 1; i <= 12; i++) {
        const prop = gd.properties[String(definition[`prop${i}`])] as
          Definition | undefined;
        if (prop && keys.some((key) => Object.values(prop).includes(key))) {
          if (values?.[i] !== undefined) rolls[i] = values[i];
        } else delete definition[`prop${i}`];
      }
      add(definitionStats(definition, "", roll, rolls, classId));
    };
    if (item.importedStats?.signature === nativeStatsSignature(item))
      add(item.importedStats.values);
    else {
      const def = itemDefinition(item);
      if (def)
        addDefinition(
          def,
          item.propertyRoll ?? 1,
          item.propertyValues,
          item.propertyChoices
        );
      add(affixStats(item));
    }
    const inserts =
      item.quality === "runeword" ? itemRunes(item) : (item.socketedItems ?? []);
    for (const [index, code] of inserts.entries()) {
      if (!code) continue;
      const jewel = socketJewelDefinition(code);
      if (jewel) addDefinition(jewel, 1, item.socketPropertyValues?.[index]);
      else {
        const gem = gd.gems[code] as Definition | undefined;
        if (!gem) continue;
        const prefix = socketCategory(item);
        const props: Definition = {};
        for (let i = 1; i <= 3; i++) {
          props[`prop${i}`] = gem[`${prefix}mod${i}code`];
          props[`min${i}`] = gem[`${prefix}mod${i}min`];
          props[`max${i}`] = gem[`${prefix}mod${i}max`];
        }
        addDefinition(props, 1);
      }
    }
    return caps;
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
    const gameMode =
      options.gameMode ?? build.gameSave?.mode ?? defaultGameSaveMode(build.classId);
    if (
      !["expansion", "rotw"].includes(gameMode) ||
      (build.classId === "warlock" && gameMode !== "rotw")
    )
      throw new GameSaveError("gameMode");
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
    const experienceTable = data.experience as Record<string, { amazon: number }>;
    const levelFloor = Number(experienceTable[build.level - 1]?.amazon ?? 0);
    const nextFloor = Number(experienceTable[build.level]?.amazon ?? 2 ** 32);
    const experience = build.experience ?? levelFloor;
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
      experience: experience >= levelFloor && experience < nextFloor ? experience : levelFloor,
      gold: build.gold,
      goldbank: build.stashGold ?? Math.min(2_500_000, build.level * 25_000),
    };
    for (const [key, value] of Object.entries(profile.attributes)) {
      const bits = gd.itemStatCost[key]?.csvbits;
      if (!bits || !Number.isInteger(value) || value < 0 || value >= 2 ** bits)
        throw new GameSaveError("statRange", key);
    }
    let mercXP = 0;
    if (build.mercenary.type !== "none") {
      const match = Object.entries(gd.hireling).find(
        ([, rows]) =>
          Array.isArray(rows) &&
          rows.some((row) =>
            matchesMercenary(build.mercenary.type, row as unknown as Definition)
          )
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
    {
      const gear = Object.fromEntries(
        entries
          .filter(({ entry }) => entry.owner === "hero")
          .map(({ entry, choice }) => [entry.slot!, choice.base])
      );
      if (
        !handsFit(build.classId, gear.mainHand, gear.offHand) ||
        !handsFit(build.classId, gear.swapMain, gear.swapOff)
      )
        throw new GameSaveError("base", "Two-handed weapon");
    }
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
    const baseModifiers = new Map<
      number,
      { auto?: PlannerAffix; superior?: PlannerAffix }
    >();
    const itemQuantities = new Map<number, number>();
    const socketRolls = new Map<
      number,
      { roll: 0 | 1; values?: Record<string, number>; iconIndex?: number }[]
    >();
    function nextId() {
      let id: number;
      do {
        id = crypto.getRandomValues(new Uint32Array(1))[0];
      } while (!id || usedIds.has(id));
      usedIds.add(id);
      return id;
    }
    for (const { entry, choice, base } of entries) {
      if (
        entry.item.iconIndex !== undefined &&
        (!Number.isInteger(entry.item.iconIndex) ||
          entry.item.iconIndex < 0 ||
          entry.item.iconIndex >= (gd.itemTypes[base.type]?.varinvgfx || 0))
      )
        throw new GameSaveError("base", entry.item.name);
      if (
        entry.item.craftId &&
        (entry.item.affixes?.length ?? 0) < craftAffixMinimum(entry.item.itemLevel ?? 99)
      )
        throw new GameSaveError(
          "property",
          `${entry.item.name}: select the random craft affixes`
        );
      if (!hasRequiredCraftAffixes(entry.item)) throw new GameSaveError("property", entry.item.name + ": of the Apprentice");
      if (entry.item.affixes?.length)
        parseAffixes(entry.item.affixes, { ...entry.item, baseCode: choice.base });
      const item: BinaryParsedItem = {
        itemId: nextId(),
        base: choice.base,
        quality: {
          normal: 2,
          superior: 3,
          magic: 4,
          rare: 6,
          unique: 7,
          set: 5,
          runeword: 9,
          crafted: 8,
        }[entry.item.quality],
        ilvl: entry.item.itemLevel ?? 99,
        ...(entry.item.iconIndex === undefined
          ? {}
          : { iconIndex: entry.item.iconIndex }),
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
      if (entry.item.quantity !== undefined && !base.stackable)
        throw new GameSaveError("base", entry.item.name);
      if (base.stackable)
        itemQuantities.set(
          item.itemId,
          entry.item.quantity ?? (isTome(choice.base) ? 20 : 1)
        );
      const mode = options.rolls[entry.key] ?? "planned";
      const preserveNative =
        mode === "planned" &&
        entry.item.importedStats?.signature === nativeStatsSignature(entry.item);
      if (
        preserveNative &&
        entry.item.quality === "crafted" &&
        entry.item.importedStats?.affixIds
      )
        itemAffixIds.set(item.itemId, entry.item.importedStats.affixIds);
      const restoreNativeStats = (stats: Record<string, number>) => {
        if (!preserveNative) return;
        for (const stat of Object.keys(stats))
          if (
            !isProjectedStat(stat) &&
            !["item_numsockets", "item_ethereal"].includes(stat)
          )
            delete stats[stat];
        for (const [stat, value] of Object.entries(entry.item.importedStats!.values))
          if (
            !isProjectedStat(stat) &&
            !["item_numsockets", "item_ethereal"].includes(stat)
          )
            stats[stat] = value;
      };
      const roll = mode === "planned" ? (entry.item.propertyRoll ?? 1) : mode;
      let maxSockets = base.gemsockets || 0;
      if (choice.unique || entry.item.craftId) {
        if (choice.unique) item.unique = choice.unique;
        const definition = itemDefinition({
          ...entry.item,
          baseCode: choice.base,
          catalogId: choice.unique,
        })!;
        item.stats = definitionStats(
          definition,
          choice.base,
          roll,
          mode === "planned" ? entry.item.propertyValues : undefined,
          itemSkillClass(entry.item, build.classId),
          entry.item.propertyChoices
        );
        maxSockets = Math.max(
          maxSockets,
          definitionStats(definition, choice.base, 1).item_numsockets || 0
        );
      }
      if (!baseSupportsSockets(choice.base)) {
        maxSockets = 0;
        if (
          (entry.item.sockets ?? 0) > 0 ||
          entry.item.socketedItems?.some(Boolean) ||
          item.stats.item_numsockets
        )
          throw new GameSaveError("base", entry.item.name);
      }
      if (entry.item.quality === "crafted")
        maxSockets = Math.min(
          maxSockets,
          Math.max(1, affixStats(entry.item).item_numsockets ?? 0)
        );
      if (entry.item.quality === "runeword") {
        const rw = word(entry);
        if (!rw) throw new GameSaveError("base", entry.item.name);
        item.unique = rw[0];
        const def = rw[1] as unknown as Definition;
        item.uniqueValues = Array.from({ length: 7 }, (_, i) =>
          Number(def[`t1${roll ? "max" : "min"}${i + 1}`] ?? 0)
        );
        item.socketedItems = itemRunes(entry.item);
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
        if (mode === "planned" && (!entry.item.propertyValues || preserveNative)) {
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
        restoreNativeStats(stats);
        validateStats(stats);
        runewordProperties.set(item.itemId, stats);
      } else {
        for (const [key, value] of Object.entries(entry.item.bonuses))
          if (
            (mode === "planned" && (!entry.item.propertyValues || preserveNative)) ||
            (!choice.unique && !entry.item.craftId)
          )
            item.stats[bonusStats[key as keyof typeof bonusStats]] = value!;
        for (const [id, value] of Object.entries(entry.item.classBonuses ?? {}))
          if (
            !isClassCharm(entry.item) &&
            ((mode === "planned" && (!entry.item.propertyValues || preserveNative)) ||
              (!choice.unique && !entry.item.craftId))
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
        const socketIcons = parseSocketIconIndices(
          entry.item.socketIconIndices ?? {},
          entry.item.socketedItems
        );
        socketRolls.set(
          item.itemId,
          (entry.item.socketedItems ?? []).flatMap((code, index) =>
            code
              ? [
                  {
                    roll,
                    iconIndex: socketIcons[index],
                    values:
                      mode === "planned"
                        ? entry.item.socketPropertyValues?.[index]
                        : undefined,
                  },
                ]
              : []
          )
        );
        if (
          item.socketedItems.length > item.sockets ||
          item.socketedItems.some(
            (code) => !gd.gems[String(code)] && !socketJewelDefinition(String(code))
          )
        )
          throw new GameSaveError("base", entry.item.name);
        restoreNativeStats(item.stats);
        validateStats(item.stats);
      }
      for (const [key, value] of Object.entries(
        baseSkillStats({ ...entry.item, baseCode: choice.base })
      ))
        item.stats[key] = (item.stats[key] || 0) + value;
      const baseItem = { ...entry.item, baseCode: choice.base };
      if (baseItem.quality === "superior" && !baseItem.superiorMod)
        throw new GameSaveError(
          "property",
          `${entry.item.name}: select superior modifiers`
        );
      const baseStats = baseModifierStats(baseItem, true);
      for (const [key, value] of Object.entries(baseStats))
        item.stats[key] = (item.stats[key] ?? 0) + value;
      baseModifiers.set(item.itemId, {
        auto: baseItem.automod,
        superior: baseItem.superiorMod,
      });
      if (baseStats.item_armor_percent && item.defense !== undefined) item.defense++;
      validateStats(item.stats);
      items[item.itemId] = item;
      if (item.ethereal && item.defense !== undefined)
        item.defense = Math.floor(item.defense * 1.5);
      if (entry.owner === "hero") profile.items[slots[entry.slot!]] = item.itemId;
      else if (entry.owner === "mercenary") {
        if (!profile.merc) throw new GameSaveError("mercenary");
        profile.mercItems[slots[entry.slot!]] = item.itemId;
      } else if (entry.owner === "charm" || entry.owner === "inventory")
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
      const simple =
        ("compactsave" in base && base.compactsave === 1) ||
        t.has("rune") ||
        t.has("gem") ||
        t.has("poti");
      const questItem =
        t.has("ques") && "questdiffcheck" in base && !!base.questdiffcheck;
      const rw = runewordProperties.get(item.itemId);
      const modifiers = baseModifiers.get(item.itemId);
      const affixIds = itemAffixIds.get(item.itemId) ?? [];
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
        quality: rw ? (modifiers?.superior ? 3 : 2) : item.quality,
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
        categories: [
          ...(t.has("armo") ? ["Any Armor"] : t.has("weap") ? ["Weapon"] : []),
          ...(questItem ? ["Quest"] : []),
        ],
        quest_difficulty: difficulties.findIndex(
          (difficulty) => difficulty.value === build.difficulty
        ),
        nr_of_items_in_sockets: item.socketedItems.length,
        total_nr_of_sockets: item.sockets,
        defense_rating: item.defense ?? 0,
        max_durability: base.durability ?? 0,
        current_durability: base.durability ?? 0,
        magic_prefix: saveAffixId(affixIds.find((id) => id.startsWith("mp"))),
        magic_suffix: saveAffixId(affixIds.find((id) => id.startsWith("ms"))),
        ...((item.quality === 6 || item.quality === 8) &&
          rareNameIds(item.name ?? "", item.base)),
        magical_name_ids: Array.from({ length: 6 }, (_, i) =>
          saveAffixId(
            affixIds.filter((id) => id.startsWith(i % 2 ? "ms" : "mp"))[Math.floor(i / 2)]
          )
        ),
        multiple_pictures: item.iconIndex === undefined ? 0 : 1,
        picture_id: item.iconIndex ?? 0,
        class_specific: modifiers?.auto ? 1 : 0,
        auto_affix_id: saveAffixId(modifiers?.auto?.id),
        file_index: Number(modifiers?.superior?.id.slice(2) ?? 0),
        unique_id: item.quality === 7 ? saveId("uniqueItems", item.unique) : 0,
        set_id: item.quality === 5 ? saveId("setItems", item.unique) : 0,
        runeword_id: storedRunewordIds[canonicalRunewordId] ?? canonicalRunewordId,
        magic_attributes: magicProperties(item.stats),
        runeword_attributes: rw ? magicProperties(rw) : undefined,
        socketed_items: [],
        quantity: base.stackable ? (itemQuantities.get(item.itemId) ?? 1) : 0,
        _unknown_data: {},
      } as unknown as SaveTypes.IItem;
      if (native.max_durability > 0 && item.stats.item_indesctructible)
        native.max_durability = 0;
      for (const [index, insert] of item.socketedItems.entries()) {
        const code = String(insert);
        const jewel = gd.uniqueItems[code];
        const customJewel = magicSocketJewels[code];
        const definition = socketJewelDefinition(code);
        const selected = socketRolls.get(item.itemId)?.[index];
        const stats = definition
          ? definitionStats(
              definition,
              jewel?.code ?? "jew",
              selected?.roll ?? 1,
              selected?.values
            )
          : {};
        validateStats(stats);
        const child = {
          ...native,
          class_specific: 0,
          auto_affix_id: 0,
          file_index: 0,
          id: nextId(),
          type: jewel?.code ?? (customJewel ? "jew" : code),
          type_id: 4,
          categories: [],
          level: 99,
          quality: jewel ? 7 : customJewel ? 4 : 2,
          multiple_pictures: selected?.iconIndex === undefined ? 0 : 1,
          picture_id: selected?.iconIndex ?? 0,
          unique_id: jewel ? saveId("uniqueItems", code) : 0,
          set_id: 0,
          runeword_id: 0,
          runeword_attributes: [],
          quantity: 0,
          defense_rating: 0,
          max_durability: 0,
          current_durability: 0,
          simple_item: jewel || customJewel ? 0 : 1,
          socketed: 0,
          given_runeword: 0,
          ethereal: 0,
          nr_of_items_in_sockets: 0,
          total_nr_of_sockets: 0,
          socketed_items: [],
          magic_attributes: magicProperties(stats),
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
      const preserved = merc
        ? []
        : (build.storedItems ?? []).map(({ hex }) =>
            Uint8Array.from(hex.match(/../g)!, (pair) => parseInt(pair, 16))
          );
      const count = entries.length + preserved.length;
      return [
        new Uint8Array([74, 77, count & 255, count >> 8]),
        ...(await Promise.all(
          entries.map((entry) => encodeItem(items[entry.id], entry))
        )),
        ...preserved,
      ];
    }
    const pieces = [
      seed.subarray(0, prefixLength),
      ...(await list(false)),
      build.nativeState?.corpse
        ? fromHex(build.nativeState.corpse)
        : new Uint8Array([74, 77, 0, 0]),
      new Uint8Array([106, 102]),
      ...(profile.merc ? await list(true) : []),
      build.nativeState?.golem
        ? fromHex(build.nativeState.golem)
        : new Uint8Array([107, 102, 0]),
      // Bound-demon data belongs only to Reign of the Warlock saves.
      ...(gameMode === "rotw" ? [new Uint8Array([1, 0, 108, 102, 0, 0])] : []),
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
    // v105: quest data ends at 701; WS has an 8-byte header, followed by
    // three 24-byte blocks (2-byte prefix, 39 waypoint bits, padding).
    if (bytes[701] !== 0x57 || bytes[702] !== 0x53) throw new GameSaveError("validation");
    difficulties.forEach(({ value }, index) => {
      const start = waypointBitsStart(index);
      bytes.fill(0, start, start + 5);
      for (const { key, bit } of waypoints) {
        if (build.waypoints[value][key]) bytes[start + (bit >> 3)] |= 1 << (bit & 7);
      }
    });
    // d2r-saver 0.2.0 hardcodes RotW (3) for every class. In v105 the
    // actual game mode is PreviewData.GameVersion at 0xF8, independently
    // of the legacy Expansion status bit at 0x14. Preserve imported flags.
    // https://github.com/ResurrectedTrader/D2SSharp/blob/main/src/D2SSharp/Model/PreviewData.cs
    const legacyExpansion =
      build.gameSave?.mode === gameMode ? build.gameSave.legacyExpansion : true;
    if (build.nativeState) {
      bytes.set(fromHex(build.nativeState.skillBindings), 40);
      header.setUint32(155, build.nativeState.mapId, true);
    }
    bytes[20] =
      (legacyExpansion ? 0x20 : 0) |
      (build.hardcore ? 4 : 0) |
      (build.nativeState?.died ? 8 : 0);
    bytes[248] = gameMode === "rotw" ? 3 : 2;
    bytes.fill(0, 152, 155);
    bytes[152 + ["normal", "nightmare", "hell"].indexOf(build.difficulty)] = 0x80;
    if (profile.merc) {
      header.setUint32(163, 0x10203040, true);
      header.setUint16(169, Number(profile.merc), true);
      header.setUint32(171, mercXP, true);
    }
    header.setUint32(12, saveChecksum(bytes), true);
    const check = readCharacter(bytes);
    const preserved = storedItems(bytes, check.profile, check.items);
    if (
      preserved.length !== (build.storedItems?.length ?? 0) ||
      preserved.some(
        (value) =>
          !build.storedItems?.some(
            (input) =>
              input.location === value.location &&
              input.position === value.position &&
              input.hex === value.hex
          )
      )
    )
      throw new GameSaveError("validation");
    if (
      check.warnings.length ||
      toHex(check.profile.rawCorpse ?? []) !==
        (build.nativeState?.corpse ?? "4a4d0000") ||
      toHex(check.profile.rawGolem ?? []) !== (build.nativeState?.golem ?? "6b6600") ||
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
    ...materialSaveCodec(constants, (code) => {
      const base = gd.items[code];
      const kinds = types(code);
      return {
        simple:
          ("compactsave" in base && base.compactsave === 1) ||
          kinds.has("rune") ||
          kinds.has("gem") ||
          kinds.has("poti"),
        quest: kinds.has("ques") && "questdiffcheck" in base && !!base.questdiffcheck,
      };
    }),
    baseCharacteristics(code: string, classId: ClassId) {
      const base = gd.items[code] as unknown as Definition | undefined;
      if (!base) return;
      const kinds = types(code);
      const shield = kinds.has("shld");
      const restricted = [...kinds]
        .map((type) => gd.itemTypes[type]?.class)
        .find(Boolean);
      const wearer =
        shield && restricted ? restricted : nativeClasses[classes.indexOf(classId)];
      const blockFactor = Number(gd.charStats[wearer]?.blockfactor ?? 0);
      const damage = (low: string, high: string) =>
        Number(base[high]) > 0 ? [Number(base[low] ?? 0), Number(base[high])] : undefined;
      return {
        defense: Number(base.maxac) || undefined,
        block: shield ? Number(base.block ?? 0) + blockFactor : undefined,
        smite: shield ? damage("mindam", "maxdam") : undefined,
        kick: kinds.has("boot") ? damage("mindam", "maxdam") : undefined,
        oneHand: kinds.has("weap") ? damage("mindam", "maxdam") : undefined,
        twoHand: damage("2handmindam", "2handmaxdam"),
        throwing: damage("minmisdam", "maxmisdam"),
        durability:
          !base.nodurability && !base.stackable
            ? Number(base.durability) || undefined
            : undefined,
        maxStack: base.stackable ? Number(base.maxstack) || undefined : undefined,
        classId: restricted ? classes[nativeClasses.indexOf(restricted)] : undefined,
      };
    },
    skillDescriptions: data.skillDesc as Record<string, Definition>,
    baseModifierOptions,
    baseModifierRequiredLevel,
    baseModifierStats,
    baseModifierBonuses(item: PlannerItem) {
      const stats = baseModifierStats(item);
      return Object.fromEntries(
        Object.entries(bonusStats).flatMap(([key, stat]) =>
          stats[stat] === undefined ? [] : [[key, stats[stat]]]
        )
      ) as PlannerItem["bonuses"];
    },
    randomRareName: (base: string) => rollRareName(base).name,
    choices,
    permitted,
    defaultChoice,
    catalogBonuses,
    itemDefinition,
    itemBonuses,
    itemResistanceCaps,
    itemRunes,
    runewordRuneOptions,
    socketBonuses,
    socketJewelDefinition,
    propertyStats: definitionStats,
    exportCharacter,
    readCharacter,
    importCharacter,
    importGameFile,
    saver,
    gd,
  };
}
export type GameSaveExporter = ReturnType<typeof createGameSaveExporter>;
let exporter: Promise<GameSaveExporter> | undefined;
export function loadGameSaveExporter() {
  const root = `${import.meta.env.BASE_URL}data/planner-save/`;
  return (exporter ??= loadDataFromFile(`${root}data.json`, `${root}strings.json`)
    .catch(() => {
      throw new GameSaveError("load");
    })
    .then(({ rawData, locale }) => createGameSaveExporter(rawData, locale))
    .catch((error) => {
      exporter = undefined;
      throw error;
    }));
}
