import type { EquipmentSlot } from "@/types/planner";

// Coordinates in the original D2R inventory asset served publicly by LootCube.
// CSS displays the original artwork; controls remain independent interactive elements.
export const paperdollPositions: Partial<
  Record<EquipmentSlot, [number, number, number, number]>
> = {
  head: [39.6, 2.6, 20.5, 18.8],
  amulet: [61.9, 16.9, 11.3, 10.5],
  mainHand: [4.5, 6.9, 20.8, 35.2],
  armor: [39.6, 23.5, 20.6, 27.4],
  offHand: [74.9, 6.9, 20.8, 35.2],
  gloves: [4.5, 44.3, 20.8, 18.8],
  ringLeft: [26.7, 52.8, 11.3, 10.3],
  belt: [39.6, 52.8, 20.6, 10.3],
  ringRight: [61.9, 52.8, 11.3, 10.3],
  boots: [74.9, 44.3, 20.8, 18.8],
};
export function paperdollStyle(slot: EquipmentSlot) {
  const [left, top, width, height] = paperdollPositions[slot]!;
  return { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` };
}

export const paperdollCapacity: Record<EquipmentSlot, [number, number]> = {
  head: [2, 2],
  amulet: [1, 1],
  mainHand: [2, 4],
  offHand: [2, 4],
  armor: [2, 3],
  gloves: [2, 2],
  belt: [2, 1],
  boots: [2, 2],
  ringLeft: [1, 1],
  ringRight: [1, 1],
  swapMain: [2, 4],
  swapOff: [2, 4],
};
