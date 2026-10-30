import {
  attributes,
  bonusFields,
  difficulties,
  equipmentSlots,
  mercenaries,
  plannerClasses,
  plannerSkills,
} from "@/shared/planner";
import type {
  Bonuses,
  ClassId,
  PlannerBuild,
  PlannerCharm,
  PlannerItem,
  PlannerSkill,
} from "@/types/planner";
import { affixBonuses, parseAffixes, affixSockets } from "./planner-affixes";
import { waypoints } from "@/shared/planner-waypoints";
import {
  socketInsertByCode,
  socketedBonuses,
  parseSocketPropertyValues,
} from "./planner-sockets";
import {
  normalizeClassCharm,
  propertyClasses,
  isClassCharm,
  itemSkillClass,
} from "./planner-properties";
import { craftDefinition } from "./planner-crafts";
import { isTome } from "./planner-item-art";

export function createBuild(classId: ClassId = "sorceress"): PlannerBuild {
  return {
    version: 1,
    name: "",
    classId,
    level: 90,
    difficulty: "hell",
    gold: 0,
    hardcore: false,
    weaponSet: 0,
    waypoints: Object.fromEntries(
      difficulties.map(({ value }) => [
        value,
        Object.fromEntries(waypoints.map(({ key }) => [key, true])),
      ])
    ) as PlannerBuild["waypoints"],
    quests: Object.fromEntries(
      difficulties.map(({ value }) => [
        value,
        {
          den: true,
          radament: true,
          izual: true,
          lamEsen: true,
          anya: true,
          goldenBird: true,
        },
      ])
    ) as PlannerBuild["quests"],
    attributes: { strength: 0, dexterity: 0, vitality: 0, energy: 0 },
    skills: {},
    equipment: {},
    charms: [],
    stash: [],
    primarySkills: [],
    mercenary: { type: "none", level: 90, equipment: {} },
    notes: "",
    author: "",
    description: "",
    strengths: "",
    weaknesses: "",
    lootFilter: "",
  };
}
export const cloneBuild = (build: PlannerBuild): PlannerBuild =>
  JSON.parse(JSON.stringify(build));
export const mercenaryLevelCap = (characterLevel: number) => Math.min(98, characterLevel);
export const goldCapacity = (characterLevel: number) => characterLevel * 10000;
export const spentSkills = (build: PlannerBuild) =>
  Object.values(build.skills).reduce((a, b) => a + b, 0);
export const skillBudget = (build: PlannerBuild) =>
  build.level -
  1 +
  Object.values(build.quests).reduce(
    (sum, q) => sum + +q.den + +q.radament + +q.izual * 2,
    0
  );
export function requiredSkillLevel(build: PlannerBuild): number {
  const questPoints = skillBudget(build) - (build.level - 1);
  return Math.max(
    1,
    spentSkills(build) - questPoints + 1,
    ...plannerSkills
      .filter((skill) => skill.classId === build.classId && build.skills[skill.id])
      .map((skill) => skill.requiredLevel + build.skills[skill.id] - 1)
  );
}
export const spentAttributes = (build: PlannerBuild) =>
  Object.values(build.attributes).reduce((a, b) => a + b, 0);
export const attributeBudget = (build: PlannerBuild) =>
  (build.level - 1) * 5 + Object.values(build.quests).filter((q) => q.lamEsen).length * 5;

export function skillPlan(build: PlannerBuild, skill: PlannerSkill): number[] | null {
  if (
    skill.classId !== build.classId ||
    (build.skills[skill.id] ?? 0) >=
      Math.min(skill.maxPoints, build.level - skill.requiredLevel + 1)
  )
    return null;
  const plan: number[] = [];
  function prerequisite(id: number) {
    if (build.skills[id] || plan.includes(id)) return;
    const parent = plannerSkills.find((s) => s.id === id)!;
    parent.requires.forEach(prerequisite);
    plan.push(id);
  }
  skill.requires.forEach(prerequisite);
  plan.push(skill.id);
  return spentSkills(build) + plan.length <= skillBudget(build) ? plan : null;
}
export function skillsAfterRemoval(
  build: PlannerBuild,
  id: number,
  all = false
): PlannerBuild["skills"] {
  const skills = { ...build.skills };
  if (!skills[id]) return skills;
  if (!all && skills[id] > 1) {
    skills[id]--;
    return skills;
  }
  delete skills[id];
  let changed: boolean;
  do {
    changed = false;
    for (const skill of plannerSkills) {
      if (
        skill.classId === build.classId &&
        skills[skill.id] &&
        skill.requires.some((parent) => !skills[parent])
      ) {
        delete skills[skill.id];
        changed = true;
      }
    }
  } while (changed);
  return skills;
}
export function buildAtLevel(build: PlannerBuild, level: number): PlannerBuild {
  const next = cloneBuild(build);
  next.level = integer(level, 1, 99);
  next.gold = Math.min(next.gold ?? 0, goldCapacity(next.level));
  // Refund higher-tier skills first so their prerequisites can remain invested.
  const skills = plannerSkills
    .filter((skill) => skill.classId === next.classId)
    .sort((a, b) => b.requiredLevel - a.requiredLevel || b.row - a.row || b.id - a.id);
  for (const skill of skills) {
    const maximum = Math.max(
      0,
      Math.min(skill.maxPoints, next.level - skill.requiredLevel + 1)
    );
    if ((next.skills[skill.id] ?? 0) > maximum) {
      if (maximum) next.skills[skill.id] = maximum;
      else next.skills = skillsAfterRemoval(next, skill.id, true);
    }
  }
  for (const skill of skills) {
    const excess = spentSkills(next) - skillBudget(next);
    if (excess <= 0) break;
    const points = next.skills[skill.id] ?? 0;
    if (points > excess) next.skills[skill.id] -= excess;
    else if (points) next.skills = skillsAfterRemoval(next, skill.id, true);
  }
  const total = spentAttributes(next);
  const budget = attributeBudget(next);
  if (total > budget) {
    const shares = attributes.map(({ key }) => ({
      key,
      value: (next.attributes[key] * budget) / total,
    }));
    for (const { key, value } of shares) next.attributes[key] = Math.floor(value);
    let remaining = budget - spentAttributes(next);
    for (const { key } of shares.sort((a, b) => (b.value % 1) - (a.value % 1))) {
      if (!remaining) break;
      next.attributes[key]++;
      remaining--;
    }
  }
  return parseBuild(next);
}
export function charmFits(
  charms: PlannerCharm[],
  position: number,
  height: number,
  except?: string,
  width = 1
): boolean {
  if (
    !Number.isInteger(position) ||
    position < 0 ||
    position >= 40 ||
    ![1, 2, 3].includes(height) ||
    Math.floor(position / 10) + height > 4 ||
    ![1, 2, 3].includes(width) ||
    (position % 10) + width > 10
  )
    return false;
  const cells = new Set(charms.filter((c) => c.id !== except).flatMap(inventoryCells));
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => position + y * 10 + x)
  )
    .flat()
    .every((cell) => !cells.has(cell));
}
export const inventoryWidth = (item: PlannerItem) =>
  item.baseCode === "box" ? 2 : item.baseCode === "cs2" ? 3 : 1;
export const inventoryCells = (item: PlannerCharm) =>
  Array.from({ length: item.height }, (_, y) =>
    Array.from({ length: inventoryWidth(item) }, (_, x) => item.position + y * 10 + x)
  ).flat();

export function defaultInventory(classId: ClassId): PlannerCharm[] {
  const common = { notes: "", itemLevel: 99, sockets: 0, propertyRoll: 1 as const };
  const stats = {
    strength: 20,
    dexterity: 20,
    vitality: 20,
    energy: 20,
    fireResist: 20,
    coldResist: 20,
    lightningResist: 20,
    poisonResist: 20,
  };
  return [
    {
      ...common,
      id: `default-cube-${classId}`,
      name: "Horadric Cube",
      quality: "normal",
      baseCode: "box",
      requiredLevel: 1,
      bonuses: {},
      height: 2,
      position: 0,
    },
    {
      ...common,
      id: `default-annihilus-${classId}`,
      name: "Annihilus",
      quality: "unique",
      catalogId: "unique381",
      baseCode: "cm1",
      requiredLevel: 70,
      bonuses: { ...stats, allSkills: 1 },
      height: 1,
      position: 2,
    },
    {
      ...common,
      id: `default-torch-${classId}`,
      name: "Hellfire Torch",
      quality: "unique",
      catalogId: "unique400",
      baseCode: "cm2",
      requiredLevel: 75,
      bonuses: { ...stats },
      classBonuses: { [classId]: 3 },
      skillClass: classId,
      height: 2,
      position: 3,
    },
  ];
}

export function createDefaultBuild(classId: ClassId = "sorceress"): PlannerBuild {
  const build = createBuild(classId);
  build.charms = defaultInventory(classId);
  return build;
}

export function addDefaultInventory(build: PlannerBuild) {
  for (const item of defaultInventory(build.classId)) {
    if (
      [...build.charms, ...build.stash].some((existing) =>
        item.catalogId
          ? existing.catalogId === item.catalogId
          : existing.baseCode === item.baseCode
      )
    )
      continue;
    const position = Array.from({ length: 40 }, (_, i) => i).find((i) =>
      charmFits(build.charms, i, item.height, undefined, inventoryWidth(item))
    );
    if (position !== undefined) build.charms.push({ ...item, position });
  }
}
export function buildStats(build: PlannerBuild) {
  const character = plannerClasses.find((c) => c.id === build.classId)!;
  const activeSlots = equipmentSlots
    .map((s) => s.key)
    .filter((key) => key !== "mainHand" && key !== "offHand");
  const items = [
    ...activeSlots.map((key) => build.equipment[key]),
    build.equipment[build.weaponSet ? "swapMain" : "mainHand"],
    build.equipment[build.weaponSet ? "swapOff" : "offHand"],
    ...build.charms,
  ].filter((item): item is PlannerItem => !!item);
  const insertBonuses = items.map(socketedBonuses);
  const mods = items.map((item) => affixBonuses(item, build.level));
  const bonuses = Object.fromEntries(
    bonusFields.map(({ key }) => [
      key,
      items.reduce(
        (sum, item, index) =>
          sum +
          (item.bonuses[key] ?? 0) +
          (insertBonuses[index].bonuses[key] ?? 0) +
          (mods[index].bonuses[key] ?? 0),
        0
      ),
    ])
  ) as Required<Bonuses>;
  const classSkills = items.reduce(
    (sum, item, index) =>
      sum +
      (isClassCharm(item)
        ? itemSkillClass(item, build.classId) === build.classId
          ? 3
          : 0
        : (item.classBonuses?.[build.classId] ?? 0)) +
      (insertBonuses[index].classBonuses[build.classId] ?? 0) +
      mods[index].classBonuses[build.classId],
    0
  );
  const stats = Object.fromEntries(
    attributes.map(({ key }) => [
      key,
      character.base[key] + build.attributes[key] + bonuses[key],
    ])
  ) as PlannerBuild["attributes"];
  const questLife = Object.values(build.quests).filter((q) => q.goldenBird).length * 20;
  const questResist = Object.values(build.quests).filter((q) => q.anya).length * 10;
  const penalty = difficulties.find((d) => d.value === build.difficulty)!.penalty;
  return {
    attributes: stats,
    bonuses,
    classSkills,
    treeBonuses: [0, 1, 2].map((tree) =>
      mods.reduce((sum, mod) => sum + mod.treeBonuses[build.classId][tree], 0)
    ),
    skillBonus: bonuses.allSkills + classSkills,
    socketSkillBonuses: insertBonuses.reduce<Record<string, number>>((result, insert) => {
      for (const [id, value] of Object.entries(insert.skillBonuses ?? {}))
        result[id] = (result[id] ?? 0) + value;
      return result;
    }, {}),
    life: Math.floor(
      character.life +
        (build.level - 1) * character.lifePerLevel +
        (stats.vitality - character.base.vitality) * character.lifePerVitality +
        bonuses.life +
        questLife
    ),
    mana: Math.floor(
      character.mana +
        (build.level - 1) * character.manaPerLevel +
        (stats.energy - character.base.energy) * character.manaPerEnergy +
        bonuses.mana
    ),
    stamina: Math.floor(
      character.stamina +
        (build.level - 1) * character.staminaPerLevel +
        (stats.vitality - character.base.vitality) * character.staminaPerVitality
    ),
    resists: (
      ["fireResist", "coldResist", "lightningResist", "poisonResist"] as const
    ).map((key) => ({
      key,
      uncapped: bonuses[key] + questResist + penalty,
      value: Math.max(-100, Math.min(75, bonuses[key] + questResist + penalty)),
    })),
  };
}

// Rebuild the object from known fields; imported JSON and shared links are untrusted.
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("object");
  return value as Record<string, unknown>;
}
function integer(value: unknown, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)
    throw new Error("number");
  return value;
}
function string(value: unknown, max: number): string {
  if (typeof value !== "string" || value.length > max) throw new Error("string");
  return value;
}
export function parsePlannerItem(value: unknown): PlannerItem {
  const item = record(value);
  if (
    !["normal", "magic", "rare", "unique", "set", "runeword", "crafted"].includes(
      String(item.quality)
    )
  )
    throw new Error("quality");
  const rawBonuses = record(item.bonuses);
  const bonuses: Bonuses = {};
  for (const { key } of bonusFields) {
    if (rawBonuses[key] !== undefined)
      bonuses[key] = integer(rawBonuses[key], -1000, 10000);
  }
  const classBonuses: Partial<Record<ClassId, number>> = {};
  if (item.classBonuses !== undefined) {
    const rawClasses = record(item.classBonuses);
    for (const { id } of plannerClasses)
      if (rawClasses[id] !== undefined)
        classBonuses[id] = integer(rawClasses[id], -100, 100);
  }
  if (
    item.baseKind !== undefined &&
    !["weapon", "armor", "shield"].includes(String(item.baseKind))
  )
    throw new Error("base kind");
  if (item.baseCode !== undefined && !/^[a-z0-9]{3}$/.test(String(item.baseCode)))
    throw new Error("base code");
  if (item.catalogId !== undefined && !/^(?:unique|set)\d+$/.test(String(item.catalogId)))
    throw new Error("catalog id");
  if (item.ethereal !== undefined && typeof item.ethereal !== "boolean")
    throw new Error("ethereal");
  let socketedItems: (string | null)[] | undefined;
  if (item.socketedItems !== undefined) {
    const count = item.sockets === undefined ? 0 : integer(item.sockets, 0, 6);
    if (
      !Array.isArray(item.socketedItems) ||
      item.socketedItems.length > count ||
      Array.from(item.socketedItems).some(
        (code) =>
          code !== null && (typeof code !== "string" || !socketInsertByCode.has(code))
      ) ||
      (item.quality === "runeword" && item.socketedItems.some(Boolean))
    )
      throw new Error("socket contents");
    socketedItems = [...item.socketedItems];
  }
  const result: PlannerItem = {
    name: string(item.name, 100),
    quality: item.quality as PlannerItem["quality"],
    requiredLevel: integer(item.requiredLevel, 1, 99),
    notes: string(item.notes, 4000),
    bonuses,
    ...(item.stashPosition === undefined
      ? {}
      : { stashPosition: integer(item.stashPosition, 0, 207) }),
    ...(item.baseCode === undefined ? {} : { baseCode: String(item.baseCode) }),
    ...(item.catalogId === undefined ? {} : { catalogId: String(item.catalogId) }),
    ...(item.itemLevel === undefined
      ? {}
      : { itemLevel: integer(item.itemLevel, 1, 99) }),
    ...(item.sockets === undefined ? {} : { sockets: integer(item.sockets, 0, 6) }),
    ...(socketedItems === undefined ? {} : { socketedItems }),
    ...(item.socketPropertyValues === undefined
      ? {}
      : {
          socketPropertyValues: parseSocketPropertyValues(
            item.socketPropertyValues,
            socketedItems
          ),
        }),
    ...(item.ethereal === undefined ? {} : { ethereal: item.ethereal as boolean }),
    ...(item.propertyRoll === undefined
      ? {}
      : { propertyRoll: integer(item.propertyRoll, 0, 1) as 0 | 1 }),
    ...(item.classBonuses === undefined ? {} : { classBonuses }),
    ...(item.baseKind === undefined
      ? {}
      : { baseKind: item.baseKind as PlannerItem["baseKind"] }),
    ...(item.runewordId === undefined
      ? {}
      : { runewordId: integer(item.runewordId, 1, 100000) }),
  };
  if (item.affixes !== undefined) {
    result.affixes = parseAffixes(item.affixes, result);
    if ((result.sockets ?? 0) < affixSockets(result)) throw new Error("affix sockets");
  }
  if (item.craftId !== undefined) {
    result.craftId = string(item.craftId, 120);
    craftDefinition(result);
  }
  if (item.propertyValues !== undefined) {
    result.propertyValues = {};
    for (const [key, value] of Object.entries(record(item.propertyValues))) {
      if (!/^(?:[1-9]|1[0-2])$/.test(key)) throw new Error("property index");
      result.propertyValues[key] = integer(value, -100000, 100000);
    }
  }
  if (item.propertyChoices !== undefined) {
    result.propertyChoices = {};
    for (const [key, value] of Object.entries(record(item.propertyChoices))) {
      if (!/^(?:[1-9]|1[0-2])$/.test(key)) throw new Error("property group index");
      result.propertyChoices[key] = integer(value, 1, 1024);
    }
  }
  if (item.skillClass !== undefined) {
    if (!propertyClasses.includes(item.skillClass as ClassId))
      throw new Error("skill class");
    result.skillClass = item.skillClass as ClassId;
  }
  if (item.containerQuantity !== undefined) {
    if (item.quality !== "unique" || !["bg1", "bg2"].includes(String(item.baseCode)))
      throw new Error("container quantity");
    // Add_one uses 11 save bits with SaveAdd=10 in the Blizzless tables.
    result.containerQuantity = integer(item.containerQuantity, 0, 2037);
  }
  if (item.quantity !== undefined) {
    if (!isTome(result.baseCode) || result.quality !== "normal")
      throw new Error("tome quantity");
    result.quantity = integer(item.quantity, 0, 20);
  }
  return result;
}
export function parseBuild(value: unknown): PlannerBuild {
  const raw = record(value);
  if (raw.version !== 1 || !plannerClasses.some((c) => c.id === raw.classId))
    throw new Error("version/class");
  const build = createBuild(raw.classId as ClassId);
  build.name = string(raw.name, 100);
  build.level = integer(raw.level, 1, 99);
  build.gold =
    raw.gold === undefined ? 0 : integer(raw.gold, 0, goldCapacity(build.level));
  if (!difficulties.some((d) => d.value === raw.difficulty))
    throw new Error("difficulty");
  build.difficulty = raw.difficulty as PlannerBuild["difficulty"];
  if (typeof raw.hardcore !== "boolean") throw new Error("hardcore");
  build.hardcore = raw.hardcore;
  build.weaponSet = integer(raw.weaponSet, 0, 1) as 0 | 1;
  // Older builds exported every waypoint as unlocked.
  if (raw.waypoints !== undefined) {
    const progress = record(raw.waypoints);
    for (const { value: difficulty } of difficulties) {
      const points = record(progress[difficulty]);
      for (const { key } of waypoints) {
        if (typeof points[key] !== "boolean") throw new Error("waypoint");
        build.waypoints[difficulty][key] = points[key];
      }
    }
  }
  const rawQuests = record(raw.quests);
  for (const { value: difficulty } of difficulties) {
    const quest = record(rawQuests[difficulty]);
    for (const key of Object.keys(
      build.quests[difficulty]
    ) as (keyof PlannerBuild["quests"]["normal"])[]) {
      if (typeof quest[key] !== "boolean") throw new Error("quest");
      build.quests[difficulty][key] = quest[key];
    }
  }
  const rawAttributes = record(raw.attributes);
  for (const { key } of attributes)
    build.attributes[key] = integer(rawAttributes[key], 0, 505);
  if (spentAttributes(build) > attributeBudget(build))
    throw new Error("attribute budget");
  for (const [id, points] of Object.entries(record(raw.skills))) {
    const skill = plannerSkills.find(
      (s) => String(s.id) === id && s.classId === build.classId
    );
    if (!skill) throw new Error("skill");
    build.skills[skill.id] = integer(
      points,
      0,
      Math.max(0, Math.min(skill.maxPoints, build.level - skill.requiredLevel + 1))
    );
  }
  if (
    spentSkills(build) > skillBudget(build) ||
    plannerSkills.some(
      (s) => build.skills[s.id] && s.requires.some((id) => !build.skills[id])
    )
  )
    throw new Error("skill budget/prerequisites");
  const equipment = record(raw.equipment);
  for (const key of [...equipmentSlots.map((s) => s.key), "swapMain", "swapOff"] as const)
    if (equipment[key] !== undefined)
      build.equipment[key] = parsePlannerItem(equipment[key]);
  if (!Array.isArray(raw.stash) || raw.stash.length > 100) throw new Error("stash");
  build.stash = raw.stash.map(parsePlannerItem);
  if (
    !Array.isArray(raw.primarySkills) ||
    raw.primarySkills.length > 3 ||
    new Set(raw.primarySkills).size !== raw.primarySkills.length ||
    raw.primarySkills.some(
      (id) => !plannerSkills.some((s) => s.id === id && s.classId === build.classId)
    )
  )
    throw new Error("primary skills");
  build.primarySkills = raw.primarySkills as number[];
  if (!Array.isArray(raw.charms) || raw.charms.length > 40) throw new Error("charms");
  build.charms = [];
  for (const entry of raw.charms) {
    const rawCharm = record(entry);
    const charm: PlannerCharm = {
      ...parsePlannerItem(entry),
      id: string(rawCharm.id, 100),
      position: integer(rawCharm.position, 0, 39),
      height: integer(rawCharm.height, 1, 3),
    };
    if (
      !charm.id ||
      build.charms.some((c) => c.id === charm.id) ||
      (charm.baseCode === "box" && charm.height !== 2) ||
      (isTome(charm.baseCode) && charm.height !== 2) ||
      (charm.baseCode === "cs2" && charm.height !== 1) ||
      (charm.baseCode === "cm4" && charm.height !== 3) ||
      !charmFits(
        build.charms,
        charm.position,
        charm.height,
        undefined,
        inventoryWidth(charm)
      )
    )
      throw new Error("charm placement");
    build.charms.push(charm);
  }
  for (const item of [
    ...Object.values(build.equipment),
    ...build.charms,
    ...build.stash,
  ]) {
    if (item) normalizeClassCharm(item, build.classId);
  }
  const merc = record(raw.mercenary);
  if (!mercenaries.some((m) => m.value === merc.type)) throw new Error("mercenary");
  build.mercenary.type = merc.type as string;
  // Earlier v1 builds allowed 99 or a level above the hero. Keep their other data.
  build.mercenary.level = Math.min(
    integer(merc.level, 1, 99),
    mercenaryLevelCap(build.level)
  );
  const mercItems = record(merc.equipment);
  for (const key of ["head", "armor", "mainHand", "offHand"] as const)
    if (mercItems[key] !== undefined)
      build.mercenary.equipment[key] = parsePlannerItem(mercItems[key]);
  build.notes = string(raw.notes, 10000);
  for (const key of [
    "author",
    "description",
    "strengths",
    "weaknesses",
    "lootFilter",
  ] as const)
    build[key] = string(raw[key], key === "author" ? 100 : 10000);
  return build;
}
export function encodeBuild(build: PlannerBuild): string {
  return btoa(
    Array.from(new TextEncoder().encode(JSON.stringify(build)), (byte) =>
      String.fromCharCode(byte)
    ).join("")
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function decodeBuild(encoded: string): PlannerBuild {
  if (encoded.length > 120000) throw new Error("size");
  return parseBuild(
    JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        Uint8Array.from(atob(encoded.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
          c.charCodeAt(0)
        )
      )
    )
  );
}
