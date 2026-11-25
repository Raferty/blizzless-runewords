import type { GameSaveExporter } from "./planner-game-save";
import { RUNES } from "@/shared/constants";
import { bonusFields, plannerClasses } from "@/shared/planner";
import type { PlannerItem } from "@/types/planner";
import type { RunewordTableItem } from "@/types";
import type { Lang } from "@/types/lang";
import { splitStatSections, runewordNames } from "./runeword";
import { nativeStatsSignature } from "./planner-properties";
import { socketInsertVisual } from "./planner-sockets";

import { isWorldstoneShard, type worldstoneShardCodes } from "./planner-item-art";

const shardNames: Record<(typeof worldstoneShardCodes)[number], Record<Lang, string>> = {
  xa1: { en: "Western Worldstone Shard", ru: "Западный осколок камня мироздания" },
  xa2: { en: "Eastern Worldstone Shard", ru: "Восточный осколок камня мироздания" },
  xa3: { en: "Southern Worldstone Shard", ru: "Южный осколок камня мироздания" },
  xa4: { en: "Deep Worldstone Shard", ru: "Глубинный осколок камня мироздания" },
  xa5: { en: "Northern Worldstone Shard", ru: "Северный осколок камня мироздания" },
};

export function worldstoneShardTooltip(code: string | undefined, lang: Lang) {
  if (!isWorldstoneShard(code)) return;
  const act = code.slice(2);
  return {
    name: shardNames[code][lang],
    lines:
      lang === "ru"
        ? [
            `Щёлкните правой кнопкой мыши, чтобы повергнуть акт ${act} в ужас.`,
            "Требуется сложность «Ад» и включённые зоны ужаса.",
            "Преобразуйте осколок отдельно в Хорадрическом кубе, чтобы поместить его в новый контейнер.",
          ]
        : [
            `Right-click to terrorize Act ${act}.`,
            "Requires Hell difficulty with Terror Zones enabled.",
            "Transmute this shard alone in the Horadric Cube to create a container holding it.",
          ],
  };
}

export function itemRuneword(item: PlannerItem, words: RunewordTableItem[]) {
  if (item.quality !== "runeword") return;
  return words.find((word) =>
    item.runewordId !== undefined
      ? word.id === item.runewordId
      : runewordNames(word).some(
          (name) => name.toLowerCase() === item.name.trim().toLowerCase()
        )
  );
}

export function itemSockets(item: PlannerItem, words: RunewordTableItem[]) {
  const word = itemRuneword(item, words);
  if (word && item.runewordRunes)
    return item.runewordRunes.map((code) => socketInsertVisual(code));
  return word
    ? word.runes.map((id) => RUNES.find((rune) => rune.id === id))
    : Array.from({ length: item.sockets ?? 0 }, (_, index) =>
        socketInsertVisual(
          item.socketedItems?.[index] ?? "",
          item.socketIconIndices?.[index]
        )
      );
}

export function itemRunewordLines(
  word: RunewordTableItem,
  kind: PlannerItem["baseKind"],
  lang: Lang,
  roll?: 0 | 1,
  characterLevel?: number
) {
  const sections = splitStatSections(word.stats?.[lang] ?? []);
  const pattern =
    kind === "weapon"
      ? /weapon|оруж/i
      : kind === "shield"
        ? /shield|щит/i
        : /armor|helm|брон|доспех|шлем/i;
  const lines =
    (kind ? sections.find((section) => pattern.test(section.title)) : undefined) ??
    sections[0];
  return lines.lines.map((line) => {
    if (roll !== undefined)
      line = line
        .replace(
          /<span class=['"]varies['"]>(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)<\/span>/g,
          (_, min, max) => (roll ? max : min)
        )
        .replace(/\s*\(varies\)/gi, "");
    if (characterLevel !== undefined)
      line = line
        .replace(
          /\+\(([\d.]+)\*clvl\)/gi,
          (_, scale) => `+${Math.floor(Number(scale) * characterLevel)}`
        )
        .replace(
          /\+?\s*\(([\d.]+) Per Character Level\)\s*\+?\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?(%)?/gi,
          (_, scale, percent) =>
            `+${Math.floor(Number(scale) * characterLevel)}${percent || ""}`
        );
    return line;
  });
}

function importedStatLine(
  game: GameSaveExporter,
  key: string,
  amount: number,
  level: number,
  stats: Record<string, number>,
  lang: Lang
): string[] {
  const [stat, parameter, skillLevel] = key.split("#");
  const definition = game.gd.itemStatCost[stat];
  if (!definition || !amount) return [];
  if (stat === "item_addskill_tab") {
    const tab = Number(parameter);
    const tree = plannerClasses[Math.floor(tab / 3)]?.trees[tab % 3];
    if (tree) return [`+${amount} ${lang === "ru" ? "к навыкам" : "to"} ${tree[lang]}`];
  }
  if (stats.item_mindamage_percent === stats.item_maxdamage_percent) {
    if (stat === "item_mindamage_percent") return [];
    if (stat === "item_maxdamage_percent") return [`+${amount}% Enhanced Damage`];
  }
  const strings = game.gd.locale.strings;
  const perLevel = definition.opbase === "level" && definition.opparam !== undefined;
  const value = perLevel
    ? Math.floor((amount * level) / 2 ** definition.opparam!)
    : amount;
  const template =
    strings[(amount < 0 ? definition.descstrneg : definition.descstrpos) ?? ""];
  if (!template) return [];
  const args = [value, Number(skillLevel)];
  const skill = strings[`skillname${parameter}`] || game.gd.skills[parameter]?.skill;
  const line = template.replace(/%%|%\+?d|%s/g, (token) => {
    if (token === "%%") return "%";
    if (token === "%s") return skill || parameter || "";
    const n = args.shift() ?? value;
    return token === "%+d" && n >= 0 ? `+${n}` : String(n);
  });
  return [
    perLevel && definition.descstr2 ? `${line} ${strings[definition.descstr2]}` : line,
  ];
}

export function itemBonusLines(
  item: PlannerItem,
  lang: Lang,
  game?: GameSaveExporter,
  level = 99
) {
  const resistKeys = [
    "fireResist",
    "coldResist",
    "lightningResist",
    "poisonResist",
  ] as const;
  const attributeKeys = ["strength", "dexterity", "vitality", "energy"] as const;
  const resistValues = resistKeys.map((key) => item.bonuses[key]);
  const attributeValues = attributeKeys.map((key) => item.bonuses[key]);
  const allResist =
    resistValues.every(
      (value) => typeof value === "number" && value === resistValues[0]
    ) && resistValues[0]
      ? resistValues[0]
      : undefined;
  const allAttributes =
    attributeValues.every(
      (value) => typeof value === "number" && value === attributeValues[0]
    ) && attributeValues[0]
      ? attributeValues[0]
      : undefined;
  // A native crafted item carries its rolled stats even when its recipe is unknown.
  const extra =
    item.quality === "crafted" &&
    !item.craftId &&
    item.importedStats?.signature === nativeStatsSignature(item)
      ? item.importedStats.values
      : {};
  return [
    ...(extra.item_cannotbefrozen
      ? [lang === "ru" ? "Нельзя заморозить" : "Cannot Be Frozen"]
      : []),
    ...(extra.item_deadlystrike
      ? [
          `${extra.item_deadlystrike}% ${lang === "ru" ? "смертельного удара" : "Deadly Strike"}`,
        ]
      : []),
    ...(extra.tohit
      ? [`+${extra.tohit} ${lang === "ru" ? "к рейтингу атаки" : "to Attack Rating"}`]
      : []),
    ...Object.entries(extra).flatMap(([key, value]) =>
      game && !["item_cannotbefrozen", "item_deadlystrike", "tohit"].includes(key)
        ? importedStatLine(game, key, value, level, extra, lang)
        : []
    ),
    ...(allAttributes
      ? [
          `${allAttributes > 0 ? "+" : ""}${allAttributes} ${
            lang === "ru" ? "ко всем атрибутам" : "to All Attributes"
          }`,
        ]
      : []),
    ...(allResist
      ? [
          `${allResist > 0 ? "+" : ""}${allResist}% ${
            lang === "ru" ? "ко всем сопротивлениям" : "All Resist"
          }`,
        ]
      : []),
    ...bonusFields.flatMap((field) => {
      if (
        allAttributes &&
        attributeKeys.includes(field.key as (typeof attributeKeys)[number])
      )
        return [];
      if (allResist && resistKeys.includes(field.key as (typeof resistKeys)[number]))
        return [];
      const value = item.bonuses[field.key];
      return value
        ? [`${value > 0 ? "+" : ""}${value}${field.percent ? "%" : ""} ${field[lang]}`]
        : [];
    }),
    ...plannerClasses.flatMap((character) => {
      const value = item.classBonuses?.[character.id];
      return value
        ? [
            `${value > 0 ? "+" : ""}${value} ${lang === "ru" ? "к навыкам" : "to skills"} · ${character.name[lang]}`,
          ]
        : [];
    }),
  ];
}
