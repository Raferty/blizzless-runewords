import art from "@/shared/planner-wowhead-art.json";
import { plannerSkills } from "@/shared/planner";
import type { ClassId, PlannerSkill } from "@/types/planner";

const icons: Record<string, string> = art.icons;
export const skillFrameTexture = "images/planner/wowhead/trees/paladin1.webp";

export function wowheadSkillSprite(skill: PlannerSkill): string | undefined {
  // These server skills replace the original game's skill at the same ID.
  if ([86, 241].includes(skill.id)) return undefined;
  return icons[skill.id];
}

export interface WowheadTreeArtwork {
  image: string;
  adaptation?: "necromancer-curses" | "druid-summoning" | "druid-shapeshifting";
}

export function wowheadTreeArtwork(
  classId: ClassId,
  tree: number
): WowheadTreeArtwork | undefined {
  const original = art.trees.find(
    (entry) => entry.classId === classId && entry.tree === tree
  );
  if (!original) return undefined;
  const current = plannerSkills.filter(
    (skill) => skill.classId === classId && skill.tree === tree
  );
  let expected = original.skills.map((skill) => ({ ...skill }));
  let adaptation: WowheadTreeArtwork["adaptation"];
  if (classId === "necromancer" && tree === 0) {
    adaptation = "necromancer-curses";
    expected = expected.map((skill) => (skill.id === 86 ? { ...skill, row: 6 } : skill));
  } else if (classId === "druid" && tree === 0) {
    adaptation = "druid-summoning";
    expected = expected
      .filter((skill) => skill.id !== 241)
      .map((skill) => (skill.id === 231 ? { ...skill, row: 5 } : skill));
  } else if (classId === "druid" && tree === 1) {
    adaptation = "druid-shapeshifting";
    expected.push({ id: 241, row: 6, column: 3, requires: [243] });
  }
  if (current.length !== expected.length) return undefined;
  const compatible = current.every((skill) => {
    const node = expected.find((entry) => entry.id === skill.id);
    return (
      node &&
      node.row === skill.row &&
      node.column === skill.column &&
      node.requires.length === skill.requires.length &&
      node.requires.every((id) => skill.requires.includes(id))
    );
  });
  return compatible
    ? { image: original.image, ...(adaptation ? { adaptation } : {}) }
    : undefined;
}
