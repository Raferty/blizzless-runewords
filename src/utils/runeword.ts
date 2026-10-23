import { ITEM_TYPE_ID as T } from "@/shared/constants";

/** Selected runes represent available rune kinds, rather than quantities. */
export function isComplete(where: number[], what: number[]): boolean {
  const have = new Set(where);
  return what.every((id) => have.has(id));
}

/** Match a concrete base against broad weapon/shield groups in recipes. */
export function matchesItemType(types: number[], selected: number): boolean {
  if (types.includes(selected)) return true;
  const melee = [
    T.AXES,
    T.MACES,
    T.SWORDS,
    T.STAVES,
    T.SCEPTERS,
    T.CLAWS,
    T.POLEARMS,
    T.CLUBS,
    T.HAMMERS,
    T.SPEARS,
    T.WANDS,
    T.DAGGERS,
    T.KATARS,
  ];
  const weapons = [
    T.MELEE_WEAPONS,
    T.MISSILE_WEAPONS,
    T.WEAPONS,
    T.SORCERESS_ORBS,
    ...melee,
  ];
  const specialShields = [T.PALADIN_SHIELDS, T.VOODOO_HEADS];
  if (weapons.includes(selected) && types.includes(T.WEAPONS)) return true;
  if (melee.includes(selected) && types.includes(T.MELEE_WEAPONS)) return true;
  if (specialShields.includes(selected) && types.includes(T.SHIELDS)) return true;
  if (selected === T.WEAPONS) return types.some((id) => weapons.includes(id));
  if (selected === T.MELEE_WEAPONS) return types.some((id) => melee.includes(id));
  if (selected === T.SHIELDS) return types.some((id) => specialShields.includes(id));
  return false;
}

export interface StatSection {
  title: string;
  lines: string[];
}

/** Lines before the first base heading apply to every base. Preserve their order. */
export function splitStatSections(lines: string[]): StatSection[] {
  const shared: string[] = [];
  const sections: StatSection[] = [];
  for (const line of lines) {
    if (/^#[^#]+#$/.test(line))
      sections.push({ title: line.slice(1, -1), lines: [...shared] });
    else if (sections.length) sections[sections.length - 1].lines.push(line);
    else shared.push(line);
  }
  return sections.length ? sections : [{ title: "", lines: shared }];
}
