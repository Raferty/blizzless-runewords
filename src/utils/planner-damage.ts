import combat from "@/shared/planner-combat.json";
import { equipmentSlots, plannerSkills } from "@/shared/planner";
import type { ClassId, PlannerBuild, PlannerItem, PlannerSkill } from "@/types/planner";
import type { GameSaveExporter } from "./planner-game-save";
import { buildStats } from "./planner";
import { affixStats } from "./planner-affixes";
import { plannerItemIdentity } from "./planner-item-art";
import { socketCategory } from "./planner-sockets";
import { itemSkillClass } from "./planner-properties";
import { evaluateSkillFormula } from "./planner-skill-formula";

type Row = Record<string, string | number | undefined>;
type Stats = Record<string, number>;
export type DamageElement = "physical" | "fire" | "ltng" | "cold" | "pois" | "mag";
export const damageElements: DamageElement[] = [
  "physical",
  "fire",
  "ltng",
  "cold",
  "pois",
  "mag",
];
export interface DamageOptions {
  resistance?: Partial<Record<DamageElement, number>>;
  corpseLife?: number;
  auraId?: number | null;
  includeUnlearned?: boolean;
}
export interface DamagePart {
  element: DamageElement;
  min: number;
  max: number;
  baseMin: number;
  baseMax: number;
  synergy: number;
  mastery: number;
  resistance: number;
}
export interface SkillDamage {
  id: number;
  skill?: PlannerSkill;
  level: number;
  hardLevel: number;
  parts: DamagePart[];
  min: number;
  max: number;
  mana: number;
  frames?: number;
  dps?: number;
  duration?: number;
  count?: number;
  note?:
    | "summon"
    | "corpse"
    | "poison"
    | "periodic"
    | "sequence"
    | "support"
    | "unlearned"
    | "unsupported"
    | "buff"
    | "retaliation"
    | "area"
    | "pulse";
  requires?: "shield" | "weapon";
  active?: boolean;
}
const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const classIds: ClassId[] = [
  "amazon",
  "sorceress",
  "necromancer",
  "paladin",
  "barbarian",
  "druid",
  "assassin",
  "warlock",
];
const projection: Record<string, string> = {
  strength: "strength",
  dexterity: "dexterity",
  vitality: "vitality",
  energy: "energy",
  allSkills: "item_allskills",
  fcr: "item_fastercastrate",
  ias: "item_fasterattackrate",
};
function merge(target: Stats, source: Stats) {
  for (const [key, value] of Object.entries(source))
    target[key] = (target[key] ?? 0) + value;
}

export function combatItemStats(
  native: GameSaveExporter,
  item: PlannerItem,
  classId: ClassId
): Stats {
  const identity = plannerItemIdentity(item);
  const resolved = { ...item, ...identity };
  const definition = native.itemDefinition(resolved);
  const result = definition
    ? native.propertyStats(
        definition,
        identity.baseCode ?? "",
        item.propertyRoll ?? 0,
        item.propertyValues,
        itemSkillClass(item, classId),
        item.propertyChoices
      )
    : {};
  const addInsert = (code: string, index: number) => {
    const gem = native.gd.gems[code] as unknown as Row | undefined;
    const jewel = native.gd.uniqueItems[code] as unknown as Row | undefined;
    const props: Row = jewel ? { ...jewel } : {};
    if (gem)
      for (let i = 1; i <= 3; i++) {
        const prefix = socketCategory(resolved);
        props[`prop${i}`] = gem[`${prefix}mod${i}code`];
        props[`par${i}`] = gem[`${prefix}mod${i}param`];
        props[`min${i}`] = gem[`${prefix}mod${i}min`];
        props[`max${i}`] = gem[`${prefix}mod${i}max`];
      }
    if (gem || jewel)
      merge(
        result,
        native.propertyStats(props, "", 1, item.socketPropertyValues?.[index])
      );
  };
  if (item.quality === "runeword") native.itemRunes(item).forEach(addInsert);
  // Saved projections can contain intentional custom values; loose inserts and
  // affixes are separate in the planner and must be applied only once.
  for (const [key, stat] of Object.entries(projection)) {
    const value = item.bonuses[key as keyof typeof item.bonuses];
    if (value !== undefined)
      result[stat] = definition ? value : (result[stat] ?? 0) + value;
  }
  for (const [id, value] of Object.entries(item.classBonuses ?? {})) {
    const key = `item_addclassskills#${classIds.indexOf(id as ClassId)}`;
    if (value !== undefined) result[key] = value;
  }
  if (item.quality !== "runeword")
    (item.socketedItems ?? []).forEach((code, index) => {
      if (code) addInsert(code, index);
    });
  merge(result, affixStats(item));
  return result;
}

// The five damage bands in Skills.txt: levels 2–8, 9–16, 17–22, 23–28, 29+.
export function skillDamageByLevel(base: number, increments: number[], level: number) {
  if (level < 1) return 0;
  const widths = [7, 8, 6, 6, Infinity];
  let remaining = level - 1,
    result = base;
  widths.forEach((width, i) => {
    const count = Math.max(0, Math.min(remaining, width));
    result += count * (increments[i] ?? 0);
    remaining -= count;
  });
  return result;
}

export function animationFrames(
  classId: ClassId,
  mode: string,
  weaponClass: string,
  faster: number,
  skillSpeed = 0,
  weaponSpeed = 0
) {
  const records = combat.animations as Record<string, { frames: number; speed: number }>;
  const prefix = combat.classes[classId] + mode;
  const animation =
    records[prefix + weaponClass.toUpperCase()] ?? records[prefix + "HTH"];
  if (!animation) return;
  const effective = Math.min(
    75,
    Math.max(
      -85,
      Math.trunc((120 * Math.max(0, faster)) / (120 + Math.max(0, faster))) +
        skillSpeed -
        weaponSpeed
    )
  );
  const rate = Math.max(1, Math.trunc((animation.speed * (100 + effective)) / 100));
  return Math.max(1, Math.ceil((animation.frames * 256) / rate) - 1);
}

export function calculateBuildDamage(
  native: GameSaveExporter,
  build: PlannerBuild,
  options: DamageOptions = {}
) {
  const skills = native.gd.skills as unknown as Record<string, Row>;
  const names = new Map(
    Object.entries(skills).map(([id, row]) => [normalize(String(row.skill)), Number(id)])
  );
  const metadata = new Map(plannerSkills.map((skill) => [skill.id, skill]));
  const main = build.equipment[build.weaponSet ? "swapMain" : "mainHand"];
  const off = build.equipment[build.weaponSet ? "swapOff" : "offHand"];
  const items = [
    ...equipmentSlots
      .filter(({ key }) => key !== "mainHand" && key !== "offHand")
      .map(({ key }) => build.equipment[key]),
    main,
    off,
    ...build.charms,
  ].filter((item): item is PlannerItem => !!item);
  const stats: Stats = {};
  const itemStats = new Map<PlannerItem, Stats>();
  const warnings: string[] = [];
  for (const item of items) {
    try {
      const raw = combatItemStats(native, item, build.classId);
      itemStats.set(item, raw);
      merge(stats, raw);
    } catch {
      warnings.push(item.name);
    }
  }
  const summary = buildStats(build);
  Object.assign(stats, summary.attributes, { level: build.level });
  const classIndex = classIds.indexOf(build.classId);
  const rank = (id: number) => {
    const hard = build.skills[id] ?? 0;
    const single = stats[`item_singleskill#${id}`] ?? 0;
    const ownClass = metadata.get(id)?.classId === build.classId;
    const oskill = Math.min(ownClass ? 3 : 99, stats[`item_nonclassskill#${id}`] ?? 0);
    if (!hard && !single && !oskill) return 0;
    const tree = metadata.get(id)?.tree;
    return Math.max(
      0,
      hard +
        single +
        oskill +
        (stats.item_allskills ?? 0) +
        (ownClass ? (stats[`item_addclassskills#${classIndex}`] ?? 0) : 0) +
        (ownClass && tree !== undefined
          ? (stats[`item_addskill_tab#${classIndex * 3 + tree}`] ?? 0)
          : 0)
    );
  };
  const active = new Set<string>();
  const numeric = (row: Row, key: string) => Number(row[key] ?? 0);
  const band = (id: number, elemental: boolean, maximum: boolean) => {
    const row = skills[id],
      key = maximum ? "max" : "min";
    const prefix = elemental ? `e${key}` : `${key}dam`;
    return skillDamageByLevel(
      numeric(row, prefix),
      [1, 2, 3, 4, 5].map((i) =>
        numeric(row, elemental ? `e${key}lev${i}` : `${key}levdam${i}`)
      ),
      rank(id)
    );
  };
  const formula = (id: number, value: unknown, overrideLevel?: number): number => {
    const row = skills[id],
      level = overrideLevel ?? rank(id);
    const key = `${id}:${value}:${level}`;
    if (active.has(key) || active.size > 24) throw new Error("Recursive skill formula");
    active.add(key);
    try {
      return evaluateSkillFormula(value, {
        variable: (name) => {
          if (name === "lvl") return level;
          if (name === "blvl") return build.skills[id] ?? 0;
          if (name === "ulvl") return build.level;
          if (/^(?:par|pa)\d+$/.test(name))
            return numeric(row, "param" + name.replace(/^(?:par|pa)/, ""));
          const linear = /^(ln|dm)(\d)(\d)$/.exec(name);
          if (linear) {
            if (!level) return 0;
            const a = numeric(row, `param${linear[2]}`),
              b = numeric(row, `param${linear[3]}`);
            return linear[1] === "ln"
              ? a + (level - 1) * b
              : Math.min(
                  b,
                  a +
                    Math.trunc(((b - a) * Math.trunc((110 * level) / (level + 6))) / 100)
                );
          }
          if (["edmn", "edmx", "enms", "exms", "mdmn", "mdmx"].includes(name)) {
            const raw =
              band(id, name[0] === "e", ["edmx", "exms", "mdmx"].includes(name)) *
              2 ** numeric(row, "hitshift");
            return name === "enms" || name === "exms" ? raw : Math.trunc(raw / 256);
          }
          if (name === "edln") return duration(id);
          if (name === "toht")
            return numeric(row, "tohit") + (level - 1) * numeric(row, "levtohit");
          throw new Error(`Unsupported skill variable: ${name}`);
        },
        reference: (kind, name, field) => {
          if (kind === "stat") {
            if (field !== "accr" && field !== "base")
              throw new Error("Unsupported stat reference");
            return stats[name] ?? 0;
          }
          const target = names.get(normalize(name));
          if (target === undefined) throw new Error("Unknown skill reference");
          if (field === "blvl") return build.skills[target] ?? 0;
          if (field === "lvl") return rank(target);
          if (/^par\d+$|^ln\d\d$|^dm\d\d$|^edm[nx]$/.test(field))
            return formula(target, field);
          throw new Error("Unsupported skill reference");
        },
      });
    } finally {
      active.delete(key);
    }
  };
  const duration = (id: number) => {
    const row = skills[id],
      level = rank(id);
    const frames =
      numeric(row, "elen") +
      Math.min(7, Math.max(0, level - 1)) * numeric(row, "elevlen1") +
      Math.min(8, Math.max(0, level - 8)) * numeric(row, "elevlen2") +
      Math.max(0, level - 16) * numeric(row, "elevlen3");
    return Math.max(
      0,
      frames + Math.trunc((frames * formula(id, row.elensympercalc)) / 100)
    );
  };
  // Passive elemental masteries add to equipment mastery, rather than multiply it.
  for (const [id, row] of Object.entries(skills))
    if (row.passive && rank(Number(id))) {
      for (let i = 1; i <= 6; i++) {
        const stat = String(row[`passivestat${i}`] ?? "");
        if (/^passive_(?:fire|ltng|cold|pois|mag)_(?:mastery|pierce)$/.test(stat))
          try {
            stats[stat] =
              (stats[stat] ?? 0) + formula(Number(id), row[`passivecalc${i}`]);
          } catch {
            /* No fabricated passive bonus. */
          }
      }
    }
  const auraCandidates = plannerSkills.filter(
    (skill) =>
      skill.classId === build.classId &&
      skills[skill.id]?.aura &&
      !skills[skill.id]?.passive &&
      rank(skill.id) > 0
  );
  const automaticAura =
    rank(112) && rank(113)
      ? 113
      : ([122, 113, 98].find(
          (id) => metadata.get(id)?.classId === build.classId && rank(id)
        ) ?? null);
  const auraId = options.auraId === undefined ? automaticAura : options.auraId;
  const auraLevels = new Map<number, number>();
  const selfAuras = new Set<number>();
  for (const [key, value] of Object.entries(stats))
    if (key.startsWith("item_aura#") || key.startsWith("aura#")) {
      const id = Number(key.split("#")[1]);
      auraLevels.set(id, value);
      selfAuras.add(id);
    }
  // Equipped party auras are active, but mercenary weapon damage is never added.
  const mercAuras = new Map<number, number>();
  let mercSkillBonus = 0;
  for (const item of Object.values(build.mercenary.equipment))
    if (item && build.mercenary.type !== "none") {
      try {
        const mods = combatItemStats(native, item, build.classId);
        mercSkillBonus += mods.item_allskills ?? 0;
        for (const [key, value] of Object.entries(mods))
          if (key.startsWith("item_aura#") || key.startsWith("aura#"))
            mercAuras.set(
              Number(key.split("#")[1]),
              value + (mercAuras.get(Number(key.split("#")[1])) ?? 0)
            );
      } catch {
        warnings.push(item.name);
      }
    }
  for (const [id, level] of mercAuras)
    auraLevels.set(id, Math.max(level, auraLevels.get(id) ?? 0));
  if (build.mercenary.type === "desert-might") {
    const mercLevel = build.mercenary.level;
    const rows = (Object.values(native.gd.hireling).flat() as unknown as Row[])
      .filter(
        (row) =>
          row.version === 100 &&
          row.skill2 === "Might" &&
          numeric(row, "level") <= mercLevel
      )
      .sort((a, b) => numeric(b, "level") - numeric(a, "level"));
    const row = rows[0];
    if (row) {
      const level =
        numeric(row, "level2") +
        Math.floor(
          ((mercLevel - numeric(row, "level")) * numeric(row, "lvlperlvl2")) / 32
        ) +
        mercSkillBonus;
      auraLevels.set(98, Math.max(level, auraLevels.get(98) ?? 0));
    }
  }
  if (auraId !== null && auraId !== undefined && rank(auraId)) {
    auraLevels.set(auraId, Math.max(rank(auraId), auraLevels.get(auraId) ?? 0));
    selfAuras.add(auraId);
  }
  let auraDamage = 0,
    partyAuraDamage = 0,
    auraSpeed = 0,
    concentration = 0;
  for (const [id, level] of auraLevels) {
    const row = skills[id];
    if (!row) continue;
    for (let i = 1; i <= 6; i++) {
      if (row[`aurastat${i}`] === "damagepercent") {
        const bonus = formula(id, row[`aurastatcalc${i}`], level);
        auraDamage += bonus;
        partyAuraDamage += bonus;
      }
      if (row[`aurastat${i}`] === "attackrate")
        auraSpeed += formula(id, row[`aurastatcalc${i}`], level);
    }
    if (id === 122 && selfAuras.has(id))
      auraDamage +=
        formula(id, row.passivecalc1, level) - formula(id, row.aurastatcalc3, level);
    if (id === 113) concentration = formula(id, row.aurastatcalc1, level);
  }
  const weaponCode = main && plannerItemIdentity(main).baseCode;
  const weapon = weaponCode
    ? (native.gd.items[weaponCode] as unknown as Row | undefined)
    : undefined;
  const weaponMods = main ? (itemStats.get(main) ?? {}) : {};
  const offCode = off && plannerItemIdentity(off).baseCode;
  const dualWield = !!(weapon && offCode && native.gd.weapons[offCode]);
  const secondaryMods = dualWield && off ? (itemStats.get(off) ?? {}) : {};
  const attackStat = (key: string) => (stats[key] ?? 0) - (secondaryMods[key] ?? 0);
  const matchesType = (
    type: string,
    expected: string,
    seen = new Set<string>()
  ): boolean => {
    if (type === expected) return true;
    if (!type || seen.has(type)) return false;
    seen.add(type);
    const row = native.gd.itemTypes[type] as unknown as Row | undefined;
    return (
      !!row &&
      [row.equiv1, row.equiv2].some((parent) =>
        matchesType(String(parent ?? ""), expected, seen)
      )
    );
  };
  let weaponMastery = 0;
  if (weapon)
    for (const skill of plannerSkills) {
      const raw = skills[skill.id];
      if (
        !rank(skill.id) ||
        !raw.passive ||
        !raw.passiveitype ||
        !matchesType(String(weapon.type), String(raw.passiveitype))
      )
        continue;
      for (let i = 1; i <= 6; i++)
        if (raw[`passivestat${i}`] === "passive_mastery_melee_dmg")
          weaponMastery += formula(skill.id, raw[`passivecalc${i}`]);
    }
  const weaponClass = String(weapon?.wclass ?? "hth");
  const castFrames = animationFrames(
    build.classId,
    "SC",
    weaponClass,
    stats.item_fastercastrate ?? 0
  );
  const adjust = (
    element: DamageElement,
    low: number,
    high: number,
    synergy = 0,
    mastery = 0
  ): DamagePart => {
    const initialResistance = options.resistance?.[element] ?? 0;
    const pierce = element === "physical" ? 0 : (stats[`passive_${element}_pierce`] ?? 0);
    const resistance =
      initialResistance >= 100 ? 100 : Math.max(-100, initialResistance - pierce);
    const factor = Math.max(0, 100 - resistance) / 100;
    return {
      element,
      min: Math.max(0, Math.floor(low * factor)),
      max: Math.max(0, Math.floor(high * factor)),
      baseMin: low,
      baseMax: high,
      synergy,
      mastery,
      resistance,
    };
  };
  const attackParts = (bonus = 0, scale = 1): DamagePart[] => {
    const twoHanded = weapon?.["2handed"] && !off;
    const baseMin =
      numeric(weapon ?? {}, twoHanded ? "2handmindam" : "mindam") || (weapon ? 0 : 1);
    const baseMax =
      numeric(weapon ?? {}, twoHanded ? "2handmaxdam" : "maxdam") || (weapon ? 0 : 2);
    const ethereal = main?.ethereal || weaponMods.item_ethereal ? 1.5 : 1;
    const strength =
      (summary.attributes.strength * Number(weapon?.strbonus ?? 100)) / 100;
    const dexterity =
      (summary.attributes.dexterity * Number(weapon?.dexbonus ?? 0)) / 100;
    const multiplier =
      Math.max(
        0,
        100 +
          strength +
          dexterity +
          attackStat("item_mindamage_percent") -
          (weaponMods.item_mindamage_percent ?? 0) +
          auraDamage +
          weaponMastery +
          bonus
      ) / 100;
    const ownMin =
      Math.floor(
        (Math.floor(baseMin * ethereal) *
          (100 + (weaponMods.item_mindamage_percent ?? 0))) /
          100
      ) +
      attackStat("mindamage") +
      attackStat("item_normaldamage");
    const ownMax =
      Math.floor(
        (Math.floor(baseMax * ethereal) *
          (100 + (weaponMods.item_maxdamage_percent ?? 0))) /
          100
      ) +
      attackStat("maxdamage") +
      attackStat("item_normaldamage");
    const parts = [
      adjust(
        "physical",
        Math.floor(ownMin * multiplier * scale),
        Math.floor(ownMax * multiplier * scale)
      ),
    ];
    for (const [element, prefix] of [
      ["fire", "fire"],
      ["ltng", "light"],
      ["cold", "cold"],
      ["mag", "magic"],
    ] as const)
      if (attackStat(`${prefix}maxdam`) || attackStat(`${prefix}mindam`))
        parts.push(
          adjust(
            element,
            attackStat(`${prefix}mindam`) * scale,
            attackStat(`${prefix}maxdam`) * scale
          )
        );
    return parts;
  };
  const finalize = (row: SkillDamage) => {
    row.min = row.parts.reduce((sum, part) => sum + part.min, 0);
    row.max = row.parts.reduce((sum, part) => sum + part.max, 0);
    if (
      row.parts.length &&
      row.frames &&
      !row.requires &&
      !["buff", "retaliation", "area", "periodic", "pulse"].includes(row.note ?? "")
    )
      row.dps = (((row.min + row.max) / 2) * 25) / row.frames;
    if (row.duration && row.note === "poison")
      row.dps = (row.min + row.max) / 2 / row.duration;
    return row;
  };
  const attack = finalize({
    id: 0,
    level: 1,
    hardLevel: 0,
    parts: attackParts(),
    min: 0,
    max: 0,
    mana: 0,
    note: dualWield ? "sequence" : undefined,
    frames: dualWield
      ? undefined
      : animationFrames(
          build.classId,
          "A1",
          weaponClass,
          stats.item_fasterattackrate ?? 0,
          auraSpeed,
          Number(weapon?.speed ?? 0)
        ),
  });
  const rows: SkillDamage[] = [attack];
  for (const skill of plannerSkills.filter((s) => s.classId === build.classId)) {
    const level = rank(skill.id),
      raw = skills[skill.id];
    if (!raw || (!level && !options.includeUnlearned)) continue;
    const row: SkillDamage = {
      id: skill.id,
      skill,
      level,
      hardLevel: build.skills[skill.id] ?? 0,
      parts: [],
      min: 0,
      max: 0,
      mana: 0,
    };
    if (!level) {
      row.note = "unlearned";
      rows.push(row);
      continue;
    }
    try {
      row.mana = Math.max(
        numeric(raw, "minmana"),
        (numeric(raw, "mana") + (level - 1) * numeric(raw, "lvlmana")) *
          2 ** (numeric(raw, "manashift") - 8)
      );
      if (skill.id === 74) {
        const life = Math.max(1, options.corpseLife ?? 10000);
        const low = (formula(skill.id, raw.calc1) * life) / 100,
          high = (formula(skill.id, raw.calc2) * life) / 100;
        const fire = formula(skill.id, raw.calc3) / 100;
        row.parts = [
          adjust("physical", low * (1 - fire), high * (1 - fire)),
          adjust("fire", low * fire, high * fire),
        ];
        row.frames = castFrames;
        row.note = "corpse";
      } else if (skill.id === 70) {
        const flat = formula(skill.id, raw.passivecalc2);
        const monster = native.gd.monsters[String(raw.summon)] as unknown as Row;
        const boost = 100 + formula(skill.id, raw.aurastatcalc1) + partyAuraDamage;
        row.parts = [
          adjust(
            "physical",
            Math.floor(((numeric(monster, "a1mind") + flat) * boost) / 100),
            Math.floor(((numeric(monster, "a1maxd") + flat) * boost) / 100)
          ),
        ];
        row.count = Math.max(1, formula(skill.id, raw.petmax));
        row.note = "summon";
      } else if (skill.id === 97) {
        const shieldCode = off && plannerItemIdentity(off).baseCode;
        const shield = shieldCode
          ? (native.gd.armor[shieldCode] as unknown as Row | undefined)
          : undefined;
        if (!shield || shield.mindam === undefined) row.requires = "shield";
        else {
          const holyMin = rank(117) ? band(117, false, false) : 0,
            holyMax = rank(117) ? band(117, false, true) : 0;
          const multiplier =
            (100 +
              summary.attributes.strength +
              auraDamage +
              formula(skill.id, raw.calc1) +
              (stats.item_mindamage_percent ?? 0) -
              (weaponMods.item_mindamage_percent ?? 0)) /
            100;
          row.parts = [
            adjust(
              "physical",
              Math.floor(
                (numeric(shield, "mindam") + holyMin + (stats.item_normaldamage ?? 0)) *
                  multiplier
              ),
              Math.floor(
                (numeric(shield, "maxdam") + holyMax + (stats.item_normaldamage ?? 0)) *
                  multiplier
              )
            ),
          ];
          row.frames = animationFrames(
            build.classId,
            "S1",
            weaponClass,
            stats.item_fasterattackrate ?? 0,
            auraSpeed,
            Number(weapon?.speed ?? 0)
          );
        }
      } else {
        const elemental =
          raw.emin !== undefined &&
          raw.emax !== undefined &&
          damageElements.includes(String(raw.etype) as DamageElement);
        const physical =
          raw.mindam !== undefined &&
          raw.maxdam !== undefined &&
          !raw.aura &&
          !raw.passive &&
          skill.id !== 117;
        const weaponSkill =
          !raw.summon &&
          (numeric(raw, "srcdam") > 0 ||
            (raw.calc1desc === "Damage %" && raw.useattackrate)) &&
          !raw.aura &&
          !raw.passive;
        if (weaponSkill) {
          if (!weapon) row.requires = "weapon";
          else
            row.parts.push(
              ...attackParts(
                raw.calc1desc === "Damage %" ? formula(skill.id, raw.calc1) : 0,
                numeric(raw, "srcdam") ? numeric(raw, "srcdam") / 128 : 1
              )
            );
        }
        for (const isElemental of [false, true]) {
          if (!(isElemental ? elemental : physical)) continue;
          const element = (isElemental ? raw.etype : "physical") as DamageElement;
          const synergy = formula(
            skill.id,
            isElemental ? raw.edmgsympercalc : raw.dmgsympercalc
          );
          const mastery = isElemental ? (stats[`passive_${element}_mastery`] ?? 0) : 0;
          let low = band(skill.id, isElemental, false) * 2 ** numeric(raw, "hitshift");
          let high = band(skill.id, isElemental, true) * 2 ** numeric(raw, "hitshift");
          // Lightning's fixed one-point minimum is intentionally not synergized.
          if (low > 256 || numeric(raw, isElemental ? "eminlev1" : "minlevdam1"))
            low += Math.trunc((low * synergy) / 100);
          high += Math.trunc((high * synergy) / 100);
          low += Math.trunc((low * mastery) / 100);
          high += Math.trunc((high * mastery) / 100);
          if (skill.id === 112 && concentration) {
            const bonus = Math.trunc((concentration * numeric(raw, "param1")) / 8);
            low += Math.trunc((low * bonus) / 100);
            high += Math.trunc((high * bonus) / 100);
          }
          if (element === "pois") {
            const frames = duration(skill.id);
            row.duration = frames / 25;
            low *= frames;
            high *= frames;
            row.note = "poison";
          }
          row.parts.push(
            adjust(
              element,
              Math.floor(low / 256),
              Math.floor(high / 256),
              synergy,
              mastery
            )
          );
        }
        if (raw.summon) {
          row.note = "summon";
          row.count = Math.max(1, formula(skill.id, raw.petmax ?? 1));
        } else if (raw.aura || raw.passive || !row.parts.length) {
          row.note = "support";
          row.active = raw.aura ? auraLevels.has(skill.id) : !!raw.passive;
        } else if (
          raw.periodic ||
          /inferno|firewall|arcticblast|hurricane|armageddon|blaze|firestorm/.test(
            normalize(String(raw.skill))
          )
        )
          row.note = "periodic";
        else if (
          (raw.anim === "SC" ||
            (build.classId === "sorceress" && [49, 53].includes(skill.id))) &&
          !weaponSkill
        ) {
          // Lightning/Chain Lightning use their own 19-frame sequence.
          const lightning = build.classId === "sorceress" && [49, 53].includes(skill.id);
          const fcr = Math.max(0, stats.item_fastercastrate ?? 0);
          const sequenceFrames = lightning
            ? Math.ceil(
                (19 * 256) /
                  Math.floor(
                    (256 * (100 + Math.min(75, Math.trunc((120 * fcr) / (120 + fcr))))) /
                      100
                  )
              )
            : castFrames;
          row.frames = Math.max(sequenceFrames ?? 0, formula(skill.id, raw.delay));
        } else if (weaponSkill) row.note = "sequence";
      }
      if ([52, 278].includes(skill.id)) row.note = "buff";
      if ([40, 50, 60].includes(skill.id)) row.note = "retaliation";
      if ([59, 234, 244, 249, 250].includes(skill.id)) row.note = "area";
      if (raw.aura && row.parts.length) row.note = "pulse";
      if (
        /inferno|firewall|arcticblast|blaze|firestorm/.test(normalize(String(raw.skill)))
      ) {
        row.note = "unsupported";
        row.parts = [];
      }
      rows.push(finalize(row));
    } catch {
      row.parts = [];
      row.note = "unsupported";
      rows.push(row);
    }
  }
  return {
    rows,
    auraCandidates,
    auraId,
    castFrames,
    fcr: stats.item_fastercastrate ?? 0,
    weapon: main?.name,
    dualWield,
    warnings,
  };
}
