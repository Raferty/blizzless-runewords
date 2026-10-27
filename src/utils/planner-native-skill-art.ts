import type { PlannerSkill } from "@/types/planner";

export interface NativeSkillArtPart {
  x: number;
  y: number;
  width: number;
  height: number;
  viewBox: string;
  image: string;
}
export interface NativeSkillTreeArtwork {
  sockets: NativeSkillArtPart[];
  arrows: NativeSkillArtPart[];
}

const texture = (name: string) => `images/planner/wowhead/trees/${name}.webp`;
const part = (
  x: number,
  y: number,
  width: number,
  height: number,
  viewBox: string,
  image = "druid2"
): NativeSkillArtPart => ({ x, y, width, height, viewBox, image: texture(image) });

// All coordinates are in the original 740×1046 connection layers. Only plain
// shafts stretch; arrowheads, diagonal connections and sockets keep their shape.
export function nativeSkillTreeArtwork(
  skills: PlannerSkill[]
): NativeSkillTreeArtwork | undefined {
  const sockets = skills.map((skill) =>
    skill.row === 6
      ? part((skill.column - 1) * 260, 900, 216, 146, "0 900 216 146")
      : part(
          (skill.column - 1) * 260,
          (skill.row - 1) * 180,
          216,
          156,
          "0 0 216 156",
          "paladin1"
        )
  );
  const arrows: NativeSkillArtPart[] = [];
  for (const skill of skills) {
    for (const prerequisite of skill.requires) {
      const parent = skills.find((node) => node.id === prerequisite);
      if (!parent) return undefined;
      const x = (parent.column - 1) * 260;
      const y = (parent.row - 1) * 180;
      const rows = skill.row - parent.row;
      const columns = skill.column - parent.column;
      if (columns === 0 && rows === 1) {
        arrows.push(part(x, y + 150, 150, 28, "0 510 150 28"));
      } else if (columns === 0 && rows >= 2) {
        const shaftHeight = rows * 180 - 194;
        arrows.push(
          part(x, y + 154, 150, shaftHeight, "0 154 150 166"),
          part(x, y + rows * 180 - 40, 150, 38, "0 320 150 38")
        );
      } else if (rows === 0 && columns === -2) {
        arrows.push(part(x - 370, y + 38, 374, 76, "150 38 374 76", "necromancer1"));
      } else if (rows === 1 && columns === 1) {
        arrows.push(part(x + 150, y + 34, 116, 144, "150 394 116 144"));
      } else if (rows === 1 && columns === -1) {
        arrows.push(part(x - 110, y + 34, 116, 144, "150 214 116 144", "necromancer1"));
      } else if (rows === 2 && columns === 1) {
        arrows.push(part(x + 90, y + 154, 176, 204, "90 334 176 204", "druid3"));
      } else if (rows === 2 && columns === -1) {
        arrows.push(part(x - 106, y + 154, 176, 204, "154 334 176 204", "necromancer2"));
      } else {
        // A future server layout must not silently display an incorrect arrow.
        return undefined;
      }
    }
  }
  return { sockets, arrows };
}
