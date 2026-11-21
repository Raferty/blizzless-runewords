import type { EquipmentSlot } from "@/types/planner";

// Pixel bounds in the 1081 × 1200 visible crop of inventory-clear-v3.png.
const paperdollPositions: Partial<
  Record<EquipmentSlot, [number, number, number, number]>
> = {
  head: [426, 39, 225, 226],
  amulet: [667, 209, 124, 124],
  mainHand: [47, 90, 224, 421],
  armor: [426, 283, 225, 328],
  offHand: [810, 90, 224, 421],
  gloves: [47, 530, 224, 226],
  ringLeft: [287, 630, 124, 126],
  belt: [426, 630, 225, 126],
  ringRight: [667, 630, 124, 126],
  boots: [810, 530, 224, 226],
};
export function slotBackgroundInset(
  width: number,
  height: number,
  [top, right, bottom, left]: readonly [number, number, number, number]
) {
  return `${(top / height) * 100}% ${(right / width) * 100}% ${(bottom / height) * 100}% ${(left / width) * 100}%`;
}
export function paperdollStyle(slot: EquipmentSlot) {
  const [left, top, width, height] = paperdollPositions[slot]!;
  return {
    left: `${(left / 1081) * 100}%`,
    top: `${(top / 1200) * 100}%`,
    width: `${(width / 1081) * 100}%`,
    height: `${(height / 1200) * 100}%`,
    "--planner-slot-inset": slotBackgroundInset(width, height, [5, 10, 10, 10]),
  };
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
