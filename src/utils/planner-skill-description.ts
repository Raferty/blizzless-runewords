import labels from "@/shared/planner-skill-labels.json";
import type { PlannerBuild, PlannerSkill } from "@/types/planner";
import type { GameSaveExporter } from "./planner-game-save";
import { skillCalculationContext } from "./planner-damage";

type Lang = "en" | "ru";
const localized: Record<string, Record<Lang, string>> = labels;

export function describeSkill(
  native: GameSaveExporter,
  build: PlannerBuild,
  skill: PlannerSkill,
  level: number,
  next: boolean,
  lang: Lang
) {
  const row = native.gd.skills[skill.id];
  const desc = native.skillDescriptions?.[String(row?.skilldesc)];
  const sections = {
    fixed: [] as string[],
    effects: [] as string[],
    synergies: [] as string[],
  };
  if (!desc) return sections;
  const preview = next
    ? {
        ...build,
        skills: { ...build.skills, [skill.id]: (build.skills[skill.id] ?? 0) + 1 },
      }
    : build;
  const { formula } = skillCalculationContext(native, preview, { id: skill.id, level });
  const label = (key: unknown) =>
    localized[String(key).toLowerCase()]?.[lang] || native.gd.locale.strings[String(key)];
  const number = new Intl.NumberFormat(lang, {
    maximumFractionDigits: 1,
    useGrouping: false,
  });
  for (const prefix of ["dsc2", "desc", "dsc3"] as const) {
    const lines = Object.keys(desc)
      .filter((k) => k.startsWith(prefix + "line"))
      .map((k) => Number(k.slice((prefix + "line").length)))
      .sort((a, b) => (prefix === "dsc3" ? a - b : b - a));
    for (const i of lines) {
      const type = Number(desc[prefix + "line" + i]);
      const get = (field: string) => desc[prefix + field + i];
      let template = label(get("texta"));
      if (!template || type === 40) continue;
      const second = label(get("textb"));
      const args: (string | number)[] = [];
      try {
        const calc = (field: string) => formula(skill.id, get(field));
        switch (type) {
          case 36:
          case 31:
          case 79: {
            const divisor = calc("calcb");
            if (!divisor) continue;
            const value = calc("calca") / divisor;
            if (type === 79) {
              if (!second) continue;
              args.push(second);
            } else if (value !== 1 && second) template = second;
            args.push(value);
            break;
          }
          case 76:
          case 77:
            if (!second) continue;
            args.push(second, calc("calca"));
            if (type === 77) args.push(calc("calcb"));
            break;
          case 13: {
            const monster = native.gd.monsters[String(row.summon)];
            const key = { normal: "minhp", nightmare: "minhpn", hell: "minhph" }[
              build.difficulty
            ];
            const baseLife = Number(monster?.[key]);
            if (!Number.isFinite(baseLife)) continue;
            args.push(Math.floor((baseLife * (100 + calc("calca"))) / 100));
            break;
          }
          case 74:
            args.push(calc("calca"));
            break;
          case 75:
          case 41:
            args.push(calc("calca"), calc("calcb"));
            break;
          case 18:
          case 56:
            break;
          default:
            continue;
        }
        let index = 0;
        const line = template
          .replace(/%%|%[+]?[ds]/g, (token: string) => {
            if (token === "%%") return "%";
            const value = args[index++];
            if (value === undefined) throw new Error("Missing description argument");
            return typeof value === "number"
              ? (token === "%+d" && value >= 0 ? "+" : "") + number.format(value)
              : value;
          })
          .trim();
        if (line)
          sections[
            prefix === "desc" ? "effects" : prefix === "dsc2" ? "fixed" : "synergies"
          ].push(line);
      } catch {
        /* Omit a line when its native calculation cannot be evaluated. */
      }
    }
  }
  return sections;
}
