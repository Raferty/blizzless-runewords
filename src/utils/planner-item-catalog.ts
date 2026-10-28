import type { GameSaveEntry, GameSaveExporter } from "./planner-game-save";
import type { ClassId, PlannerBuild, PlannerItem } from "@/types/planner";
import {
  resolvePropertyValues,
  resolvePropertyGroups,
  propertyClasses,
  itemSkillClass,
} from "./planner-properties";
import { socketCategory } from "./planner-sockets";
import type { RunewordTableItem } from "@/types";
import { baseItemImage } from "./planner-item-art";
import { runewordTemplates } from "./planner-runewords";
import { plannerClasses } from "@/shared/planner";

export const itemCategories = [
  {
    code: "pala",
    group: "shields",
    ru: "Щиты паладина",
    en: "Auric Shields",
  },
  {
    code: "head",
    group: "shields",
    ru: "Головы некроманта",
    en: "Voodoo Heads",
  },
  {
    code: "grim",
    group: "shields",
    ru: "Гримуары",
    en: "Grimoires",
  },
  { code: "shld", group: "shields", ru: "Щиты", en: "Shields" },
  { code: "axe", group: "weapons", ru: "Топоры", en: "Axes" },
  {
    code: "swor",
    group: "weapons",
    ru: "Мечи",
    en: "Swords",
  },
  { code: "knif", group: "weapons", ru: "Кинжалы", en: "Daggers" },
  {
    code: "spea",
    group: "weapons",
    ru: "Копья",
    en: "Spears",
  },
  {
    code: "pole",
    group: "weapons",
    ru: "Древковое оружие",
    en: "Polearms",
  },
  {
    code: "club",
    group: "weapons",
    ru: "Дубины",
    en: "Clubs",
  },
  {
    code: "hamm",
    group: "weapons",
    ru: "Молоты",
    en: "Hammers",
  },
  {
    code: "mace",
    group: "weapons",
    ru: "Булавы",
    en: "Maces",
  },
  {
    code: "scep",
    group: "weapons",
    ru: "Скипетры",
    en: "Scepters",
  },
  { code: "wand", group: "weapons", ru: "Жезлы", en: "Wands" },
  {
    code: "staf",
    group: "weapons",
    ru: "Посохи",
    en: "Staves",
  },
  { code: "h2h", group: "weapons", ru: "Когти", en: "Claws" },
  { code: "bow", group: "weapons", ru: "Луки", en: "Bows" },
  {
    code: "xbow",
    group: "weapons",
    ru: "Арбалеты",
    en: "Crossbows",
  },
  {
    code: "orb",
    group: "weapons",
    ru: "Сферы",
    en: "Orbs",
  },
  {
    code: "taxe",
    group: "weapons",
    ru: "Метательные топоры",
    en: "Throwing Axes",
  },
  {
    code: "tkni",
    group: "weapons",
    ru: "Метательные ножи",
    en: "Throwing Knives",
  },
  {
    code: "jave",
    group: "weapons",
    ru: "Дротики",
    en: "Javelins",
  },
  {
    code: "weap",
    group: "weapons",
    ru: "Другое оружие",
    en: "Other Weapons",
  },
  {
    code: "pelt",
    group: "armor",
    ru: "Шкуры друида",
    en: "Druid Pelts",
  },
  {
    code: "phlm",
    group: "armor",
    ru: "Шлемы варвара",
    en: "Barbarian Helms",
  },
  { code: "helm", group: "armor", ru: "Шлемы", en: "Helms" },
  { code: "tors", group: "armor", ru: "Доспехи", en: "Body Armor" },
  { code: "glov", group: "armor", ru: "Перчатки", en: "Gloves" },
  { code: "belt", group: "armor", ru: "Пояса", en: "Belts" },
  { code: "boot", group: "armor", ru: "Ботинки", en: "Boots" },
  { code: "amul", group: "other", ru: "Амулеты", en: "Amulets" },
  { code: "ring", group: "other", ru: "Кольца", en: "Rings" },
  { code: "char", group: "other", ru: "Талисманы", en: "Charms" },
  { code: "ques", group: "other", ru: "Квестовые предметы", en: "Quest Items" },
] as const;

export interface ItemBase {
  code: string;
  name: string;
  category: string;
  kind?: PlannerItem["baseKind"];
  level: number;
  tier: "normal" | "exceptional" | "elite";
  maxSockets: number;
  height: number;
  image?: string;
}
export interface CatalogItem {
  id: string;
  name: string;
  quality: PlannerItem["quality"];
  level: number;
  bases: string[];
  catalogId?: string;
  word?: RunewordTableItem;
  existing?: PlannerItem;
}
export type ItemContext = Omit<GameSaveEntry, "item">;
export function createItemCatalog(
  native: GameSaveExporter,
  build: PlannerBuild,
  context: ItemContext,
  words: RunewordTableItem[]
) {
  const gd = native.gd;
  const bases = new Map<string, ItemBase>();
  for (const [code, item] of Object.entries(gd.items)) {
    const types = new Set<string>();
    const visit = (type?: string) => {
      if (!type || types.has(type)) return;
      types.add(type);
      visit(gd.itemTypes[type]?.equiv1);
      visit(gd.itemTypes[type]?.equiv2);
    };
    visit(item.type);
    const category = itemCategories.find((c) => types.has(c.code));
    if (!category) continue;
    bases.set(code, {
      code,
      name: gd.locale.strings[item.namestr] || item.name,
      category: category.code,
      kind: types.has("weap")
        ? "weapon"
        : types.has("shld")
          ? "shield"
          : types.has("armo")
            ? "armor"
            : undefined,
      level: Math.max(1, item.levelreq || 1),
      tier:
        "ultracode" in item && item.ultracode === code
          ? "elite"
          : "ubercode" in item && item.ubercode === code
            ? "exceptional"
            : "normal",
      maxSockets: Math.min(
        item.gemsockets || 0,
        ...[...types].map((type) => gd.itemTypes[type]?.maxsock40 || 6)
      ),
      height: item.invheight,
      image: baseItemImage(code),
    });
  }
  const choices = (item: PlannerItem) =>
    (context.owner === "charm" ? [1, 2, 3] : [context.height])
      .flatMap((height) => native.choices({ ...context, height, item }, build))
      .filter((choice) => bases.has(choice.base));
  const empty: PlannerItem = {
    name: "",
    quality: "normal",
    bonuses: {},
    requiredLevel: 1,
    notes: "",
  };
  const availableBases = choices(empty);
  const items: CatalogItem[] = availableBases.map(({ base }) => ({
    id: `base:${base}`,
    name: bases.get(base)!.name,
    quality: "normal",
    level: bases.get(base)!.level,
    bases: [base],
  }));
  for (const quality of ["unique", "set"] as const) {
    const definitions = quality === "unique" ? gd.uniqueItems : gd.setItems;
    for (const choice of choices({ ...empty, quality })) {
      const def = definitions[choice.value];
      if (def.enabled === 0 || def.spawnable === 0) continue;
      items.push({
        id: `${quality}:${choice.value}`,
        name: gd.locale.strings[def.index] || def.index,
        quality,
        level: Math.max(1, def.lvlreq || 1),
        bases: [choice.base],
        catalogId: choice.value,
      });
    }
  }
  for (const word of words) {
    const codes = [
      ...new Set(
        runewordTemplates(word.name.en).flatMap((template) =>
          choices({
            ...empty,
            name: word.name.en,
            quality: "runeword",
            runewordId: word.id,
            baseKind: template.kind,
          }).map((c) => c.base)
        )
      ),
    ];
    if (codes.length)
      items.push({
        id: `runeword:${word.id}`,
        name: word.name.en,
        quality: "runeword",
        level: word.level,
        bases: codes,
        word,
      });
  }
  return {
    bases,
    items: items.sort((a, b) => a.name.localeCompare(b.name)),
    availableBases: new Set(availableBases.map((b) => b.base)),
  };
}

export function catalogPropertyLines(
  native: GameSaveExporter,
  item: CatalogItem,
  roll: 0 | 1,
  characterLevel = 99,
  values: PlannerItem["propertyValues"] = {},
  skillClass: ClassId = "amazon",
  choices: PlannerItem["propertyChoices"] = {}
) {
  if (!item.catalogId || (item.quality !== "unique" && item.quality !== "set")) return [];
  const definition = (
    item.quality === "unique" ? native.gd.uniqueItems : native.gd.setItems
  )[item.catalogId];
  return definition
    ? definitionPropertyLines(
        native,
        definition,
        roll,
        characterLevel,
        values,
        skillClass,
        choices
      )
    : [];
}

export function socketPropertyLines(
  native: GameSaveExporter,
  code: string,
  category: "weapon" | "helm" | "shield",
  characterLevel = 99,
  values: PlannerItem["propertyValues"] = {}
) {
  const jewel = native.gd.uniqueItems[code];
  if (jewel && ["jew", "cjw"].includes(jewel.code))
    return definitionPropertyLines(native, jewel, 1, characterLevel, values);
  const gem = native.gd.gems[code] as unknown as Record<string, unknown> | undefined;
  if (!gem) return [];
  const definition: Record<string, unknown> = {};
  let poisonMin = 0,
    poisonMax = 0,
    poisonLength = 0;
  for (let i = 1; i <= 3; i++) {
    const property = gem[`${category}mod${i}code`];
    if (property === "pois-min") poisonMin = Number(gem[`${category}mod${i}max`] ?? 0);
    else if (property === "pois-max")
      poisonMax = Number(gem[`${category}mod${i}max`] ?? 0);
    else if (property === "pois-len")
      poisonLength = Number(gem[`${category}mod${i}max`] ?? 0);
    else if (property === "dmg-pois") {
      poisonMin = Number(gem[`${category}mod${i}min`] ?? 0);
      poisonMax = Number(gem[`${category}mod${i}max`] ?? 0);
      poisonLength = Number(gem[`${category}mod${i}param`] ?? 0);
    } else definition[`prop${i}`] = property;
    definition[`min${i}`] = gem[`${category}mod${i}min`];
    definition[`max${i}`] = gem[`${category}mod${i}max`];
    definition[`par${i}`] = gem[`${category}mod${i}param`];
  }
  const lines = definitionPropertyLines(native, definition, 1, characterLevel);
  if (poisonLength) {
    // Gems.txt stores poison rates in 1/256 damage per frame, not total damage.
    const min = Math.round((poisonMin * poisonLength) / 256);
    const max = Math.round((poisonMax * poisonLength) / 256);
    lines.push(
      `Adds ${min === max ? min : `${min}–${max}`} Poison Damage Over ${Math.floor(poisonLength / 25)} Seconds`
    );
  }
  return lines;
}

export function definitionPropertyLines(
  native: GameSaveExporter,
  definition: Record<string, unknown>,
  roll: 0 | 1,
  characterLevel: number,
  values: PlannerItem["propertyValues"] = {},
  skillClass: ClassId = "amazon",
  choices: PlannerItem["propertyChoices"] = {}
) {
  definition = resolvePropertyValues(
    resolvePropertyGroups(definition, native.gd.propertyGroups, choices),
    native.gd.properties,
    values
  );
  const lines: string[] = [];
  for (let i = 1; i <= 12; i++) {
    const code = String(definition[`prop${i}`] ?? "");
    const property = native.gd.properties[code];
    if (!property) continue;
    const min = Number(definition[`min${i}`] ?? 0),
      max = Number(definition[`max${i}`] ?? min);
    const par = String(definition[`par${i}`] ?? "");
    if (code === "dmg-pois") {
      const frames = Number(par);
      const low = Math.round((min * frames) / 256),
        high = Math.round((max * frames) / 256);
      lines.push(
        `Adds ${low === high ? low : `${low}–${high}`} Poison Damage Over ${frames / 25} Seconds`
      );
      continue;
    }
    if (property.func1 === 36) {
      const index = Math.max(min, Math.min(max, propertyClasses.indexOf(skillClass)));
      lines.push(`+${property.val1} to ${plannerClasses[index].name.en} Skill Levels`);
      continue;
    }
    if (!property.tooltip) {
      if (code === "state") {
        const appearance: Record<string, string> = {
          fullsetgeneric: "Display Aura",
          monsterset: "Transforms into a Vampire",
        };
        if (appearance[par]) lines.push(appearance[par]);
      } else if (code === "cold-len")
        lines.push(`Cold Duration: ${(roll ? max : min) / 25} seconds`);
      continue;
    }
    let text = String(property.tooltip);
    if (text.includes("#-#")) text = text.replace("#-#", `${min}–${max}`);
    if (code.endsWith("-skill"))
      text = text.replace("#", String(min)).replace("#", String(max));
    if (code === "charged") {
      const required = Number(native.gd.skills[par]?.reqlevel ?? 0);
      const level =
        min < 0 && max < 0
          ? Math.max(
              1,
              Math.floor(
                (99 - required) / Math.max(1, Math.floor((99 - required) / -max))
              )
            )
          : max;
      const charges = min < 0 && max < 0 ? Math.floor((-min * level) / 8) - min : min;
      text = text.replace("#", String(level)).replace(/#/g, String(charges));
    }
    const value =
      code.endsWith("/lvl") && String(property.parameter).includes("#/8")
        ? Math.floor((Number(par) * characterLevel) / 8)
        : roll
          ? max
          : min;
    text = text.replace(/#/g, String(value));
    const skill = native.gd.skills[par];
    const tree = plannerClasses[Math.floor(Number(par) / 3)]?.trees[Number(par) % 3];
    text = text.replace(/\[Class Skill Tab\] Skills/g, tree?.en ?? "Skill Tree");
    text = text.replace(
      /\[Skill\]/g,
      skill ? native.gd.locale.strings[`skillname${par}`] || skill.skill : par
    );
    const classIndex = ["ama", "sor", "nec", "pal", "bar", "dru", "ass", "war"].indexOf(
      String(skill?.charclass ?? "")
    );
    text = text.replace(/\[Class\]/g, plannerClasses[classIndex]?.name.en ?? "Class");
    text = text.replace(
      /\[Day\/Dusk\/Night\/Dawn\]/g,
      ["Day", "Dusk", "Night", "Dawn"][Number(par)] ?? "Day / Dusk / Night / Dawn"
    );
    text = text.replace(/\[([^\]]+)\]/g, "$1");
    lines.push(text);
  }
  return lines;
}

export function itemPropertyLines(
  native: GameSaveExporter,
  item: PlannerItem,
  level: number,
  fallback: ClassId
) {
  const definition = native.itemDefinition(item);
  if (!definition) return [];
  const lines = definitionPropertyLines(
    native,
    definition,
    item.propertyRoll ?? 1,
    level,
    item.propertyValues,
    itemSkillClass(item, fallback),
    item.propertyChoices
  );
  for (const code of native.itemRunes(item))
    lines.push(...socketPropertyLines(native, code, socketCategory(item), level));
  return lines;
}

export interface ConditionalSetBonus {
  count: number;
  requires?: string;
  lines: string[];
}
export interface CatalogSetBonuses {
  name: string;
  size: number;
  item: ConditionalSetBonus[];
  partial: ConditionalSetBonus[];
  full: string[];
}

export function catalogSetBonuses(
  native: GameSaveExporter,
  catalogId: string,
  roll: 0 | 1,
  characterLevel = 99
): CatalogSetBonuses | undefined {
  const definition = native.gd.setItems[catalogId];
  if (!definition) return;
  const set = native.gd.sets[definition.set];
  if (!set) return;
  const members = Object.values(native.gd.setItems)
    .filter((entry) => entry.set === definition.set)
    .sort((a, b) => Number(a.id) - Number(b.id));
  const otherMembers = members.filter((entry) => entry.id !== definition.id);
  const lines = (
    source: Record<string, unknown>,
    fields: [code: string, min: string, max: string, parameter: string][]
  ) =>
    definitionPropertyLines(
      native,
      Object.fromEntries(
        fields.flatMap(([code, min, max, parameter], index) => [
          [`prop${index + 1}`, source[code]],
          [`min${index + 1}`, source[min]],
          [`max${index + 1}`, source[max]],
          [`par${index + 1}`, source[parameter]],
        ])
      ),
      roll,
      characterLevel
    );
  const item: ConditionalSetBonus[] = [];
  for (let i = 1; i <= 5; i++) {
    const properties = lines(
      definition,
      ["a", "b"].map((suffix) => [
        `aprop${i}${suffix}`,
        `amin${i}${suffix}`,
        `amax${i}${suffix}`,
        `apar${i}${suffix}`,
      ])
    );
    if (!properties.length) continue;
    // addfunc=1 requires a specific companion item (Civerb's Ward), not a count.
    const companion = definition.addfunc === 1 ? otherMembers[i - 1] : undefined;
    item.push({
      count: definition.addfunc === 1 ? 2 : i + 1,
      ...(companion
        ? { requires: native.gd.locale.strings[companion.index] || companion.index }
        : {}),
      lines: properties,
    });
  }
  const partial: ConditionalSetBonus[] = [];
  for (let count = 2; count <= 6; count++) {
    const properties = lines(
      set,
      ["a", "b"].map((suffix) => [
        `pcode${count}${suffix}`,
        `pmin${count}${suffix}`,
        `pmax${count}${suffix}`,
        `pparam${count}${suffix}`,
      ])
    );
    if (properties.length) partial.push({ count, lines: properties });
  }
  return {
    name: native.gd.locale.strings[set.name] || set.name,
    size: members.length,
    item,
    partial,
    full: lines(
      set,
      Array.from({ length: 8 }, (_, i) => [
        `fcode${i + 1}`,
        `fmin${i + 1}`,
        `fmax${i + 1}`,
        `fparam${i + 1}`,
      ])
    ),
  };
}
