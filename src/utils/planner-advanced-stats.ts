import type { PlannerBuild, PlannerItem } from "@/types/planner";
import type { Lang } from "@/types/lang";
import type { GameSaveExporter } from "./planner-game-save";
import { buildStats } from "./planner";
import { affixStats } from "./planner-affixes";
import { baseSkillStats } from "./planner-base-skills";
import { nativeStatsSignature, itemSkillClass } from "./planner-properties";
import { plannerClasses, plannerSkills } from "@/shared/planner";
import { plannerItemIdentity } from "./planner-item-art";
import { socketCategory } from "./planner-sockets";

type Stats = Record<string, number>;
type Definition = Record<string, string | number | undefined>;
type SetDefinition = Definition & { id: number; set: string };
type GroupId = "general" | "resources" | "offense" | "defense" | "skills" | "effects";
export interface AdvancedStatRow {
  key: string;
  label: string;
  value: string;
  amount: number;
}
export interface AdvancedStatGroup {
  id: GroupId;
  label: string;
  rows: AdvancedStatRow[];
}
const groups: [GroupId, string, string][] = [
  ["general", "Скорость и поиск", "Speed and finding"],
  ["resources", "Характеристики и восстановление", "Attributes and recovery"],
  ["offense", "Атака и урон", "Attack and damage"],
  ["defense", "Защита и сопротивления", "Defense and resistances"],
  ["skills", "Навыки", "Skills"],
  ["effects", "Эффекты предметов", "Item effects"],
];
// These are the editable projections used by buildStats; their values already
// include sockets, random affixes and the supported per-level properties.
const projections = {
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
const supportedPerLevel = new Set([
  "item_strength_perlevel",
  "item_dexterity_perlevel",
  "item_vitality_perlevel",
  "item_energy_perlevel",
  "item_hp_perlevel",
  "item_mana_perlevel",
  "item_find_magic_perlevel",
]);
const flags = new Set([
  "item_cannotbefrozen",
  "item_preventheal",
  "item_ignoretargetac",
  "item_knockback",
  "item_halffreezeduration",
  "item_indesctructible",
  "item_restinpeace",
  "item_nofreeze",
]);
const localStats = new Set([
  "item_armor_percent",
  "armorclass",
  "item_maxdurability_percent",
  "maxdurability",
  "item_replenish_durability",
  "item_replenish_quantity",
  "item_indesctructible",
  "item_req_percent",
  "item_extra_stack",
  "item_maxdamage_percent",
  "item_mindamage_percent",
  "coldlength",
]);
const weaponStats = new Set([
  "mindamage",
  "maxdamage",
  "item_normaldamage",
  "firemindam",
  "firemaxdam",
  "lightmindam",
  "lightmaxdam",
  "coldmindam",
  "coldmaxdam",
  "magicmindam",
  "magicmaxdam",
  "lifedrainmindam",
  "manadrainmindam",
  "item_deadlystrike",
  "item_crushingblow",
  "item_openwounds",
  "item_ignoretargetac",
  "item_fractionaltargetac",
  "item_preventheal",
  "item_knockback",
  "item_stupidity",
  "item_howl",
  "item_freeze",
  "item_slow",
  "item_demondamage_percent",
  "item_undeaddamage_percent",
  "tohit",
  "item_tohit_percent",
]);
const ignored = new Set([
  "item_numsockets",
  "item_ethereal",
  "lifedrainmaxdam",
  "manadrainmaxdam",
  "item_elemskill_fire",
  "item_elemskill_lightning",
  "item_elemskill_magic",
  "item_elemskill_cold",
  "item_elemskill_poison",
  "poisonlength",
  "poisonmindam",
  "poisonmaxdam",
  "item_event_sound",
  "state",
  "Add_one",
]);
type Field = [GroupId, string, string, string?];
const fields: Record<string, Field> = {
  item_fastercastrate: ["general", "Скорость чар (FCR)", "Cast rate (FCR)", "%"],
  item_fastergethitrate: [
    "general",
    "Восстановление от удара (FHR)",
    "Hit recovery (FHR)",
    "%",
  ],
  item_fasterattackrate: ["general", "Скорость атаки (IAS)", "Attack speed (IAS)", "%"],
  item_fastermovevelocity: ["general", "Бег / ходьба (FRW)", "Run / walk (FRW)", "%"],
  item_fasterblockrate: ["general", "Скорость блока (FBR)", "Block rate (FBR)", "%"],
  item_magicbonus: ["general", "Магические находки (MF)", "Magic find (MF)", "%"],
  item_goldbonus: ["general", "Дополнительное золото", "Extra gold from monsters", "%"],
  item_reducedprices: ["general", "Скидка торговцев", "Vendor price reduction", "%"],
  item_lightradius: ["general", "Радиус освещения", "Light radius"],
  item_addexperience: ["general", "Получаемый опыт", "Experience gained", "%"],
  strength: ["resources", "Бонус силы", "Bonus strength"],
  dexterity: ["resources", "Бонус ловкости", "Bonus dexterity"],
  vitality: ["resources", "Бонус живучести", "Bonus vitality"],
  energy: ["resources", "Бонус энергии", "Bonus energy"],
  maxhp: ["resources", "Бонус жизни", "Bonus life"],
  maxmana: ["resources", "Бонус маны", "Bonus mana"],
  item_maxhp_percent: ["resources", "Максимальная жизнь", "Maximum life", "%"],
  item_maxmana_percent: ["resources", "Максимальная мана", "Maximum mana", "%"],
  maxstamina: ["resources", "Бонус выносливости", "Bonus stamina"],
  item_maxstamina_percent: [
    "resources",
    "Максимальная выносливость",
    "Maximum stamina",
    "%",
  ],
  hpregen: ["resources", "Восполнение жизни", "Replenish life"],
  manarecoverybonus: ["resources", "Регенерация маны", "Regenerate mana", "%"],
  staminarecoverybonus: [
    "resources",
    "Восстановление выносливости",
    "Stamina recovery",
    "%",
  ],
  item_staminadrainpct: [
    "resources",
    "Замедление расхода выносливости",
    "Slower stamina drain",
    "%",
  ],
  item_healafterkill: ["resources", "Жизнь за убийство", "Life after each kill"],
  item_manaafterkill: ["resources", "Мана за убийство", "Mana after each kill"],
  item_healafterdemonkill: [
    "resources",
    "Жизнь за убийство демона",
    "Life after each demon kill",
  ],
  item_damagetomana: [
    "resources",
    "Полученный урон в ману",
    "Damage taken goes to mana",
    "%",
  ],
  lifedrainmindam: ["offense", "Кража жизни за удар", "Life stolen per hit", "%"],
  manadrainmindam: ["offense", "Кража маны за удар", "Mana stolen per hit", "%"],
  tohit: ["offense", "Рейтинг атаки", "Attack rating"],
  item_tohit_percent: ["offense", "Бонус рейтинга атаки", "Bonus attack rating", "%"],
  item_demondamage_percent: ["offense", "Урон демонам", "Damage to demons", "%"],
  item_undeaddamage_percent: ["offense", "Урон нежити", "Damage to undead", "%"],
  item_demon_tohit: [
    "offense",
    "Рейтинг атаки против демонов",
    "Attack rating against demons",
  ],
  item_undead_tohit: [
    "offense",
    "Рейтинг атаки против нежити",
    "Attack rating against undead",
  ],
  item_deadlystrike: ["offense", "Смертельный удар (DS)", "Deadly Strike (DS)", "%"],
  item_crushingblow: ["offense", "Сокрушительный удар (CB)", "Crushing Blow (CB)", "%"],
  item_openwounds: ["offense", "Открытые раны (OW)", "Open Wounds (OW)", "%"],
  item_pierce: ["offense", "Сквозная атака", "Piercing attack", "%"],
  item_fractionaltargetac: [
    "offense",
    "Снижение защиты цели",
    "Target defense reduction",
    "%",
  ],
  item_slow: ["offense", "Замедление цели", "Slows target", "%"],
  item_freeze: ["offense", "Заморозка цели", "Freezes target"],
  item_stupidity: ["offense", "Ослепление цели", "Hit blinds target"],
  item_kickdamage: ["offense", "Урон удара ногой", "Kick damage"],
  item_normaldamage: ["offense", "Добавленный урон", "Added damage"],
  item_maxdamage_percent: ["offense", "Повышение урона", "Enhanced damage", "%"],
  item_mindamage_percent: [
    "offense",
    "Повышение минимального урона",
    "Enhanced minimum damage",
    "%",
  ],
  item_armor_percent: [
    "defense",
    "Повышение защиты предмета",
    "Enhanced item defense",
    "%",
  ],
  armorclass: ["defense", "Добавленная защита предмета", "Added item defense"],
  item_indesctructible: ["effects", "Неразрушимость", "Indestructible"],
  item_extra_stack: ["effects", "Дополнительный размер стопки", "Increased stack size"],
  fireresist: ["defense", "Бонус сопротивления огню", "Bonus fire resistance", "%"],
  coldresist: ["defense", "Бонус сопротивления холоду", "Bonus cold resistance", "%"],
  lightresist: [
    "defense",
    "Бонус сопротивления молнии",
    "Bonus lightning resistance",
    "%",
  ],
  poisonresist: ["defense", "Бонус сопротивления яду", "Bonus poison resistance", "%"],
  magicresist: ["defense", "Сопротивление магии", "Magic resistance", "%"],
  damageresist: [
    "defense",
    "Снижение физического урона",
    "Physical damage reduction",
    "%",
  ],
  normal_damage_reduction: ["defense", "Снижение урона", "Damage reduced by"],
  magic_damage_reduction: [
    "defense",
    "Снижение магического урона",
    "Magic damage reduced by",
  ],
  maxfireresist: [
    "defense",
    "Максимум сопротивления огню",
    "Maximum fire resistance",
    "%",
  ],
  maxcoldresist: [
    "defense",
    "Максимум сопротивления холоду",
    "Maximum cold resistance",
    "%",
  ],
  maxlightresist: [
    "defense",
    "Максимум сопротивления молнии",
    "Maximum lightning resistance",
    "%",
  ],
  maxpoisonresist: [
    "defense",
    "Максимум сопротивления яду",
    "Maximum poison resistance",
    "%",
  ],
  item_absorbfire: ["defense", "Поглощение огня", "Fire absorb"],
  item_absorbcold: ["defense", "Поглощение холода", "Cold absorb"],
  item_absorblight: ["defense", "Поглощение молнии", "Lightning absorb"],
  item_absorbmagic: ["defense", "Поглощение магии", "Magic absorb"],
  item_absorbfire_percent: ["defense", "Поглощение огня", "Fire absorb", "%"],
  item_absorbcold_percent: ["defense", "Поглощение холода", "Cold absorb", "%"],
  item_absorblight_percent: ["defense", "Поглощение молнии", "Lightning absorb", "%"],
  item_absorbmagic_percent: ["defense", "Поглощение магии", "Magic absorb", "%"],
  toblock: ["defense", "Повышение шанса блока", "Increased chance of blocking", "%"],
  item_poisonlengthresist: [
    "defense",
    "Сокращение длительности яда",
    "Poison length reduction",
    "%",
  ],
  item_attackertakesdamage: ["defense", "Урон атакующему", "Attacker takes damage"],
  item_attackertakeslightdamage: [
    "defense",
    "Урон молнией атакующему",
    "Attacker takes lightning damage",
  ],
  armorclass_vs_missile: ["defense", "Защита от снарядов", "Defense vs. missiles"],
  armorclass_vs_hth: ["defense", "Защита в ближнем бою", "Defense vs. melee"],
  item_allskills: ["skills", "Все навыки", "All skills"],
  plus_echo: ["skills", "Дополнительные эхо", "Additional echoes"],
  plus_mirror: [
    "skills",
    "Дополнительные зеркальные стрелы",
    "Additional mirrored arrows",
  ],
  item_cannotbefrozen: ["defense", "Нельзя заморозить", "Cannot Be Frozen"],
  item_halffreezeduration: [
    "defense",
    "Половина длительности заморозки",
    "Half freeze duration",
  ],
  item_preventheal: ["offense", "Запрет лечения монстров", "Prevent monster heal"],
  item_ignoretargetac: ["offense", "Игнорирование защиты цели", "Ignore target defense"],
  item_knockback: ["offense", "Отбрасывание", "Knockback"],
  item_restinpeace: [
    "effects",
    "Убитые монстры покоятся с миром",
    "Slain monsters rest in peace",
  ],
};
for (const [element, ru, en] of [
  ["fire", "огня", "fire"],
  ["cold", "холода", "cold"],
  ["ltng", "молнии", "lightning"],
  ["pois", "яда", "poison"],
  ["mag", "магии", "magic"],
]) {
  fields[`passive_${element}_mastery`] = [
    "offense",
    `Урон навыков ${ru}`,
    `${en} skill damage`,
    "%",
  ];
  fields[`passive_${element}_pierce`] = [
    "offense",
    `Пробивание сопротивления ${ru}`,
    `Enemy ${en} resistance reduction`,
    "%",
  ];
}
for (const [element, ru, en] of [
  ["cold", "холоду", "Cold"],
  ["fire", "огню", "Fire"],
  ["light", "молнии", "Lightning"],
  ["poison", "яду", "Poison"],
  ["damage", "физическому урону", "Physical"],
  ["magic", "магии", "Magic"],
]) {
  const key = `item_pierce_${element}_immunity`;
  flags.add(key);
  fields[key] = ["offense", `Снятие иммунитета к ${ru}`, `${en} immunity sunder`];
}
const add = (target: Stats, source: Stats) => {
  for (const [key, value] of Object.entries(source))
    target[key] = flags.has(key)
      ? Math.max(target[key] ?? 0, value)
      : (target[key] ?? 0) + value;
};

function itemStats(
  native: GameSaveExporter,
  item: PlannerItem,
  build: PlannerBuild
): Stats {
  const resolved = { ...item, ...plannerItemIdentity(item) };
  const preserved = item.importedStats?.signature === nativeStatsSignature(item);
  const definition = native.itemDefinition(resolved);
  const stats = preserved
    ? { ...item.importedStats!.values }
    : {
        ...(definition
          ? native.propertyStats(
              definition,
              resolved.baseCode ?? "",
              item.propertyRoll ?? 1,
              item.propertyValues,
              itemSkillClass(item, build.classId),
              item.propertyChoices
            )
          : {}),
      };
  if (!preserved) {
    add(stats, affixStats(item));
    add(stats, native.baseModifierStats(resolved));
  }
  add(stats, baseSkillStats(item));
  const category = socketCategory(resolved);
  const inserts =
    item.quality === "runeword" ? native.itemRunes(item) : (item.socketedItems ?? []);
  inserts.forEach((code, index) => {
    if (!code) return;
    const jewel = native.socketJewelDefinition(code);
    const gem = native.gd.gems[code] as unknown as Definition | undefined;
    const def: Definition = jewel ? { ...jewel } : {};
    for (let i = 1; gem && i <= 3; i++) {
      def[`prop${i}`] = gem[`${category}mod${i}code`];
      def[`par${i}`] = gem[`${category}mod${i}param`];
      def[`min${i}`] = gem[`${category}mod${i}min`];
      def[`max${i}`] = gem[`${category}mod${i}max`];
    }
    add(stats, native.propertyStats(def, "", 1, item.socketPropertyValues?.[index]));
  });
  return stats;
}

function setStats(
  native: GameSaveExporter,
  items: PlannerItem[],
  classId: PlannerBuild["classId"]
) {
  const result: Stats = {};
  const compile = (row: Definition, columns: string[][], roll: 0 | 1 = 1) => {
    const definition: Definition = {};
    columns.forEach(([code, min, max, param], index) => {
      definition[`prop${index + 1}`] = row[code];
      definition[`min${index + 1}`] = row[min];
      definition[`max${index + 1}`] = row[max];
      definition[`par${index + 1}`] = row[param];
    });
    add(result, native.propertyStats(definition, "", roll, undefined, classId));
  };
  const sets = new Map<string, { item: PlannerItem; def: SetDefinition }[]>();
  for (const item of items) {
    const def = (
      item.quality === "set" && item.catalogId
        ? native.gd.setItems[item.catalogId]
        : undefined
    ) as SetDefinition | undefined;
    if (!def) continue;
    const entries = sets.get(def.set) ?? [];
    entries.push({ item, def });
    sets.set(def.set, entries);
  }
  for (const [name, entries] of sets) {
    const members = (
      Object.values(native.gd.setItems) as unknown as SetDefinition[]
    ).filter((item) => item.set === name);
    const equipped = new Set(entries.map(({ def }) => def.id));
    for (const { item, def } of entries) {
      const companions = members
        .filter((member) => member.id !== def.id)
        .sort((a, b) => a.id - b.id);
      for (let i = 1; i <= 5; i++) {
        const active =
          def.addfunc === 1
            ? equipped.has(companions[i - 1]?.id)
            : !!def.addfunc && equipped.size >= i + 1;
        if (active)
          compile(
            def,
            ["a", "b"].map((suffix) => [
              `aprop${i}${suffix}`,
              `amin${i}${suffix}`,
              `amax${i}${suffix}`,
              `apar${i}${suffix}`,
            ]),
            item.propertyRoll ?? 1
          );
      }
    }
    const set = native.gd.sets[name] as unknown as Definition;
    for (let n = 2; n <= equipped.size; n++)
      compile(
        set,
        ["a", "b"].map((suffix) => [
          `pcode${n}${suffix}`,
          `pmin${n}${suffix}`,
          `pmax${n}${suffix}`,
          `pparam${n}${suffix}`,
        ])
      );
    if (equipped.size === members.length)
      compile(
        set,
        Array.from({ length: 8 }, (_, i) => [
          `fcode${i + 1}`,
          `fmin${i + 1}`,
          `fmax${i + 1}`,
          `fparam${i + 1}`,
        ])
      );
  }
  return result;
}

export function advancedBuildStats(
  build: PlannerBuild,
  native: GameSaveExporter,
  lang: Lang
) {
  const summary = buildStats(build, native);
  const totals: Stats = Object.fromEntries(
    Object.values(projections).map((key) => [key, 0])
  );
  const scoped: { key: string; amount: number; item: string }[] = [];
  const warnings: string[] = [];
  const main = build.equipment[build.weaponSet ? "swapMain" : "mainHand"];
  const off = build.equipment[build.weaponSet ? "swapOff" : "offHand"];
  const dual = main && off && native.gd.weapons[plannerItemIdentity(off).baseCode ?? ""];
  const levelStats = (stats: Stats, projectedValues = false) => {
    for (const [key, amount] of Object.entries(stats)) {
      const def = native.gd.itemStatCost[key];
      if (def?.opbase !== "level") continue;
      delete stats[key];
      if (projectedValues && supportedPerLevel.has(key)) continue;
      const target =
        def.op === 5
          ? key.includes("armor")
            ? "item_armor_percent"
            : "item_maxdamage_percent"
          : def.opstat1;
      if (target)
        stats[target] =
          (stats[target] ?? 0) +
          Math.floor((amount * build.level) / 2 ** (def.opparam ?? 0));
    }
  };
  for (const [index, item] of summary.items.entries()) {
    let stats: Stats;
    try {
      stats = itemStats(native, item, build);
    } catch {
      warnings.push(item.name);
      stats = {};
    }
    // Use exactly the same active-item projections as the attribute panel.
    const values = summary.itemBonuses.get(item)!;
    for (const [key, stat] of Object.entries(projections))
      stats[stat] = values[key as keyof typeof projections];
    levelStats(stats, true);
    if (stats.poisonlength && (stats.poisonmindam || stats.poisonmaxdam)) {
      const frames = stats.poisonlength;
      scoped.push({
        key: `poison_damage#${Math.round(((stats.poisonmaxdam ?? 0) * frames) / 256)}#${frames}@${index}`,
        amount: Math.round(((stats.poisonmindam ?? 0) * frames) / 256),
        item: item.name,
      });
    }
    if (stats.item_mindamage_percent === stats.item_maxdamage_percent)
      delete stats.item_mindamage_percent;
    const weapon = !!native.gd.weapons[plannerItemIdentity(item).baseCode ?? ""];
    for (const [key, amount] of Object.entries(stats)) {
      const stat = key.split("#")[0];
      const local = localStats.has(stat) && (!stat.includes("damage_percent") || weapon);
      if (
        local ||
        stat === "item_charged_skill" ||
        (dual &&
          (item === main || item === off) &&
          (weaponStats.has(stat) || stat.startsWith("item_skillon")))
      ) {
        scoped.push({ key: `${key}@${index}`, amount, item: item.name });
        delete stats[key];
      }
    }
    add(totals, stats);
  }
  const setBonuses = setStats(native, summary.items, build.classId);
  levelStats(setBonuses);
  add(totals, setBonuses);
  const ownClass = `item_addclassskills#${plannerClasses.findIndex((c) => c.id === build.classId)}`;
  totals[ownClass] = summary.classSkills + (setBonuses[ownClass] ?? 0);
  const result = groups.map(([id, ru, en]) => ({
    id,
    label: lang === "ru" ? ru : en,
    rows: [] as AdvancedStatRow[],
  }));
  const put = (group: GroupId, row: AdvancedStatRow) =>
    result.find((entry) => entry.id === group)!.rows.push(row);
  const format = (key: string, amount: number, source?: string) => {
    const baseKey = key.split("@")[0];
    const [stat, parameter, skillLevel] = baseKey.split("#");
    if (
      (!amount &&
        ![
          "item_allskills",
          "item_fastercastrate",
          "item_fastergethitrate",
          "item_fasterattackrate",
          "item_fastermovevelocity",
          "item_magicbonus",
          ownClass,
        ].includes(baseKey)) ||
      ignored.has(stat)
    )
      return;
    if (
      stat === "item_mindamage_percent" &&
      totals.item_maxdamage_percent === amount &&
      !source
    )
      return;
    let field = fields[stat];
    let text: string | undefined;
    let value = flags.has(stat)
      ? lang === "ru"
        ? "Да"
        : "Yes"
      : `${amount}${field?.[3] ?? ""}`;
    const skill = parameter
      ? plannerSkills.find((row) => row.id === Number(parameter))
      : undefined;
    const skillName =
      skill?.name[lang] ??
      native.gd.locale.strings[`skillname${parameter}`] ??
      native.gd.skills[parameter]?.skill ??
      parameter;
    const damagePairs = [
      ["mindamage", "maxdamage", "Физический урон", "Physical damage"],
      ["firemindam", "firemaxdam", "Урон огнём", "Fire damage"],
      ["lightmindam", "lightmaxdam", "Урон молнией", "Lightning damage"],
      ["coldmindam", "coldmaxdam", "Урон холодом", "Cold damage"],
      ["magicmindam", "magicmaxdam", "Магический урон", "Magic damage"],
    ];
    const pair = damagePairs.find(([min, max]) => stat === min || stat === max);
    if (stat === "poison_damage") {
      field = ["effects", "Урон ядом", "Poison damage"];
      value = `${amount}–${parameter} / ${Number(skillLevel) / 25} ${lang === "ru" ? "с" : "s"}`;
    } else if (stat === "coldlength") {
      field = ["effects", "Длительность холода", "Cold duration"];
      value = `${amount / 25} ${lang === "ru" ? "с" : "s"}`;
    } else if (pair && !source) {
      const [min, max, ru, en] = pair;
      if (stat === max && totals[min]) return;
      field = ["offense", ru, en];
      value = `${totals[min] ?? 0}–${totals[max] ?? 0}`;
    } else if (
      stat === "item_replenish_durability" ||
      stat === "item_replenish_quantity"
    ) {
      field = [
        "effects",
        stat === "item_replenish_durability"
          ? "Восстановление прочности"
          : "Восполнение количества",
        stat === "item_replenish_durability"
          ? "Repairs durability"
          : "Replenishes quantity",
      ];
      value = `1 / ${Number((100 / amount).toFixed(2))} ${lang === "ru" ? "с" : "s"}`;
    } else if (stat === "item_addclassskills") {
      field = ["skills", "Навыки класса", "Class skills"];
      text =
        baseKey === ownClass
          ? lang === "ru"
            ? "Навыки класса"
            : "Class skills"
          : `${plannerClasses[Number(parameter)]?.name[lang]}: ${lang === "ru" ? "навыки" : "skills"}`;
    } else if (stat === "item_addskill_tab") {
      text =
        plannerClasses[Math.floor(Number(parameter) / 3)]?.trees[Number(parameter) % 3]?.[
          lang
        ];
      field = ["skills", "Ветка навыков", "Skill tree"];
    } else if (["item_nonclassskill", "item_singleskill"].includes(stat)) {
      field = ["skills", "Навык", "Skill"];
      text = skillName;
    } else if (stat === "item_elemskill") {
      const elements = [
        "",
        "Огненные навыки|Fire skills",
        "Навыки молнии|Lightning skills",
        "Магические навыки|Magic skills",
        "Навыки холода|Cold skills",
        "Навыки яда|Poison skills",
      ];
      field = ["skills", "Стихийные навыки", "Elemental skills"];
      text = elements[Number(parameter)]?.split("|")[lang === "ru" ? 0 : 1];
    } else if (stat === "item_aura") {
      field = ["effects", "Аура", "Aura"];
      text = `${lang === "ru" ? "Аура" : "Aura"}: ${skillName}`;
      value = `${amount} ${lang === "ru" ? "ур." : "lvl"}`;
    } else if (stat.startsWith("item_skillon")) {
      const events: Record<string, string[]> = {
        item_skillonhit: ["при попадании", "on striking"],
        item_skillonattack: ["при атаке", "on attack"],
        item_skillongethit: ["при получении удара", "when struck"],
        item_skillonkill: ["при убийстве", "on kill"],
        item_skillondeath: ["при смерти", "on death"],
        item_skillonlevelup: ["при повышении уровня", "on level up"],
      };
      text = `${skillName} (${skillLevel}): ${events[stat]?.[lang === "ru" ? 0 : 1] ?? stat}`;
      field = ["effects", "Срабатывание навыка", "Skill proc"];
      value = `${Math.min(100, amount)}%`;
    } else if (stat === "item_charged_skill") {
      field = ["effects", "Заряды навыка", "Skill charges"];
      text = `${skillName} (${skillLevel})`;
      value = `${amount} ${lang === "ru" ? "зар." : "charges"}`;
    }
    if (!field) {
      const def = native.gd.itemStatCost[stat];
      const template =
        native.gd.locale.strings[(amount < 0 ? def?.descstrneg : def?.descstrpos) ?? ""];
      if (!template) return;
      text = template
        .replace(/%%/g, "%")
        .replace(/%\+?[ds]/g, "")
        .replace(/^[\s+%]+|[\s:%]+$/g, "")
        .trim();
      field = ["effects", text, text];
      if (/%%/.test(template)) value += "%";
    }
    put(source ? "effects" : field[0], {
      key,
      label: `${text ?? field[lang === "ru" ? 1 : 2]}${source ? ` · ${source}` : ""}`,
      value,
      amount,
    });
  };
  // Stable ordering keeps familiar speed/find rows visible before rarer bonuses.
  for (const key of Object.keys(fields)) if (key in totals) format(key, totals[key]);
  for (const [key, amount] of Object.entries(totals))
    if (!fields[key]) format(key, amount);
  for (const row of scoped) format(row.key, row.amount, row.item);
  return { groups: result.filter((group) => group.rows.length), stats: totals, warnings };
}
