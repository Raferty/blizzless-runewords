import type { PlannerItem } from "@/types/planner";

// Personal stash dimensions from the bundled Blizzless data.json (info.stash).
export const stashSize = { columns: 16, rows: 13 };

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
