import type { PlannerItem, PlannerBuild } from "@/types/planner";
import { plannerItemDimensions } from "./planner-item-art";

// Personal stash dimensions from the bundled Blizzless data.json (info.stash).
export const stashSize = { columns: 16, rows: 13 };

// Stage a whole kit before changing the build. Never add half a recipe on overflow.
export function stageStashItems(build: PlannerBuild, items: PlannerItem[]) {
  if (!items.length || build.stash.length + items.length > 100) return;
  const { occupied, positions } = layoutStashItems(
    build.stash.map((item) => ({
      size: plannerItemDimensions(item),
      position: item.stashPosition,
    }))
  );
  if (positions.some((position) => !position)) return;
  const additions: PlannerItem[] = [];
  for (const item of items) {
    const size = plannerItemDimensions(item);
    const position = size && placeStashItem(occupied, ...size);
    if (!position) return;
    additions.push({
      ...item,
      stashPosition: position.y * stashSize.columns + position.x,
    });
  }
  return [
    ...build.stash.map((item, index) => ({
      ...item,
      stashPosition: positions[index]!.y * stashSize.columns + positions[index]!.x,
    })),
    ...additions,
  ];
}

export function createFullRejuvenationContainer(
  occupied: Set<number>
): PlannerItem | undefined {
  const position = placeStashItem(new Set(occupied), 1, 1);
  if (!position) return;
  return {
    name: "Full Rejuvenation Potion · Container",
    quality: "unique",
    baseCode: "bg1",
    catalogId: "unique456",
    containerQuantity: 100,
    itemLevel: 99,
    requiredLevel: 1,
    bonuses: {},
    notes: "",
    stashPosition: position.y * stashSize.columns + position.x,
  };
}

export function createUberKeySet(occupied: Set<number>): PlannerItem[] | undefined {
  const cells = new Set(occupied);
  const items: PlannerItem[] = [];
  for (const [baseCode, name] of [
    ["pk2", "Key of Hate"],
    ["pk1", "Key of Terror"],
    ["pk3", "Key of Destruction"],
  ]) {
    for (let count = 0; count < 3; count++) {
      const position = placeStashItem(cells, 1, 2);
      if (!position) return;
      items.push({
        name,
        quality: "normal",
        baseCode,
        itemLevel: 99,
        requiredLevel: 1,
        bonuses: {},
        notes: "",
        stashPosition: position.y * stashSize.columns + position.x,
      });
    }
  }
  return items;
}

export function gridItemCells(
  position: number,
  width: number,
  height: number,
  { columns, rows } = stashSize
): number[] | undefined {
  if (
    ![position, width, height].every(Number.isInteger) ||
    position < 0 ||
    position >= columns * rows ||
    width < 1 ||
    height < 1 ||
    (position % columns) + width > columns ||
    Math.floor(position / columns) + height > rows
  )
    return;
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => position + y * columns + x)
  ).flat();
}

export function placeStashItem(
  occupied: Set<number>,
  width: number,
  height: number,
  { columns, rows } = stashSize,
  position?: number
): { x: number; y: number } | undefined {
  if (position !== undefined) {
    const cells = gridItemCells(position, width, height, { columns, rows });
    if (!cells || cells.some((cell) => occupied.has(cell))) return;
    cells.forEach((cell) => occupied.add(cell));
    return { x: position % columns, y: Math.floor(position / columns) };
  }
  for (let y = 0; y <= rows - height; y++) {
    for (let x = 0; x <= columns - width; x++) {
      const cells = Array.from({ length: height }, (_, dy) =>
        Array.from({ length: width }, (_, dx) => (y + dy) * columns + x + dx)
      ).flat();
      if (cells.every((cell) => !occupied.has(cell))) {
        cells.forEach((cell) => occupied.add(cell));
        return { x, y };
      }
    }
  }
}

// Reserve explicit positions first so automatic placement cannot displace them.
export function layoutStashItems(
  entries: { size?: readonly [number, number]; position?: number }[],
  size = stashSize
) {
  const occupied = new Set<number>();
  const positions: ({ x: number; y: number } | undefined)[] = entries.map(
    () => undefined
  );
  for (const pinned of [true, false]) {
    entries.forEach((entry, index) => {
      if (!entry.size || (entry.position !== undefined) !== pinned) return;
      positions[index] = placeStashItem(
        occupied,
        entry.size[0],
        entry.size[1],
        size,
        entry.position
      );
    });
  }
  return { positions, occupied };
}
