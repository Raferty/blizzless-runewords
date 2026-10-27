import { RUNES } from "@/shared/constants";
import { bonusFields, plannerClasses } from "@/shared/planner";
import type { PlannerItem } from "@/types/planner";
import type { RunewordTableItem } from "@/types";
import type { Lang } from "@/types/lang";
import { splitStatSections } from "./runeword";
import { socketInsertByCode } from "./planner-sockets";

export function itemRuneword(item: PlannerItem, words: RunewordTableItem[]) {
  if (item.quality !== "runeword") return;
  return words.find((word) =>
    item.runewordId !== undefined
      ? word.id === item.runewordId
      : Object.values(word.name).some(
          (name) => name.toLowerCase() === item.name.trim().toLowerCase()
        )
  );
}

export function itemSockets(item: PlannerItem, words: RunewordTableItem[]) {
  const word = itemRuneword(item, words);
  return word
    ? word.runes.map((id) => RUNES.find((rune) => rune.id === id))
    : Array.from({ length: item.sockets ?? 0 }, (_, index) =>
        socketInsertByCode.get(item.socketedItems?.[index] ?? "")
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

export function itemBonusLines(item: PlannerItem, lang: Lang) {
  return [
    ...bonusFields.flatMap((field) => {
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
