import { stashItemLimit } from "@/shared/planner";
import type { PlannerBuild, PlannerItem } from "@/types/planner";
import { charmFits, inventoryWidth, parsePlannerItem } from "./planner";
import {
  plannerItemDimensions,
  plannerItemIdentity,
  isTome,
  isWorldstoneShard,
} from "./planner-item-art";
import { gridItemCells, layoutStashItems, stashSize } from "./planner-stash";

export type ItemSource =
  { owner: "inventory"; id: string } | { owner: "stash"; index: number };
export type ItemDestination = { owner: "inventory" | "stash"; position: number };

export function sourceItem(build: PlannerBuild, source: ItemSource) {
  return source.owner === "inventory"
    ? build.charms.find((item) => item.id === source.id)
    : build.stash[source.index];
}

export function inventoryItemSize(item: PlannerItem): [number, number] | undefined {
  const code = plannerItemIdentity(item).baseCode;
  if (code === "box") return [2, 2];
  if (isTome(code)) return [1, 2];
  if (isWorldstoneShard(code)) return [1, 1];
  if (code === "cm4") return [1, 3];
  if (code === "cs2") return [3, 1];
  if (code && /^cm[123]$/.test(code)) return [1, Number(code[2])];
  const size = plannerItemDimensions(item);
  if (size) return size;
  // Legacy planner charms may not have an explicit base yet.
  if ("height" in item && [1, 2, 3].includes(Number(item.height)))
    return [inventoryWidth(item), Number(item.height)];
}

export function stashItemLayout(build: PlannerBuild) {
  return layoutStashItems(
    build.stash.map((item) => ({
      size: plannerItemDimensions(item) ?? inventoryItemSize(item),
      position: item.stashPosition,
    }))
  );
}

export function fitsStashCell(build: PlannerBuild, item: PlannerItem, position: number) {
  const size = plannerItemDimensions(item) ?? inventoryItemSize(item);
  const cells = size && gridItemCells(position, ...size);
  if (!cells) return false;
  const { occupied } = stashItemLayout(build);
  return cells.every((cell) => !occupied.has(cell));
}

export function canMoveItem(
  build: PlannerBuild,
  source: ItemSource,
  target: ItemDestination
) {
  const item = sourceItem(build, source);
  if (!item) return false;
  if (target.owner === "inventory") {
    const size = inventoryItemSize(item);
    return (
      !!size &&
      charmFits(
        build.charms,
        target.position,
        size[1],
        source.owner === "inventory" ? source.id : undefined,
        size[0]
      )
    );
  }
  if (source.owner !== "stash" && build.stash.length >= stashItemLimit) return false;
  const size = plannerItemDimensions(item) ?? inventoryItemSize(item);
  const cells = size && gridItemCells(target.position, size[0], size[1]);
  if (!cells) return false;
  const { occupied, positions } = stashItemLayout(build);
  if (source.owner === "stash") {
    const current = positions[source.index];
    if (current) {
      gridItemCells(
        current.y * stashSize.columns + current.x,
        size![0],
        size![1]
      )!.forEach((cell) => occupied.delete(cell));
    }
  }
  return cells.every((cell) => !occupied.has(cell));
}

export function moveItem(
  build: PlannerBuild,
  source: ItemSource,
  target: ItemDestination
) {
  if (!canMoveItem(build, source, target)) return false;
  const item = sourceItem(build, source)!;
  if (source.owner === "inventory" && target.owner === "inventory") {
    build.charms.find((entry) => entry.id === source.id)!.position = target.position;
    return true;
  }
  // Freeze the visible layout before changing the list; other items stay put.
  const { positions } = stashItemLayout(build);
  build.stash.forEach((entry, index) => {
    const position = positions[index];
    if (position) entry.stashPosition = position.y * stashSize.columns + position.x;
  });
  if (source.owner === "stash" && target.owner === "stash") {
    item.stashPosition = target.position;
    return true;
  }
  const moved = parsePlannerItem(item);
  delete moved.stashPosition;
  if (target.owner === "inventory") {
    build.charms.push({
      ...moved,
      id: crypto.randomUUID(),
      position: target.position,
      height: inventoryItemSize(item)![1],
    });
  } else {
    build.stash.push({ ...moved, stashPosition: target.position });
  }
  if (source.owner === "inventory")
    build.charms = build.charms.filter((entry) => entry.id !== source.id);
  else build.stash.splice(source.index, 1);
  return true;
}

/** Copy into the nearest free rectangle without moving or sharing the source. */
export function duplicateItem(build: PlannerBuild, source: ItemSource): boolean {
  const original = sourceItem(build, source);
  if (!original) return false;
  const inventory = source.owner === "inventory";
  if (!inventory && build.stash.length >= stashItemLimit) return false;
  const size = inventory ? inventoryItemSize(original) : plannerItemDimensions(original);
  if (!size) return false;
  const columns = inventory ? 10 : stashSize.columns;
  const rows = inventory ? 4 : stashSize.rows;
  const layout = stashItemLayout(build);
  const current = inventory
    ? (original as PlannerItem & { position: number }).position
    : (layout.positions[source.index]?.y ?? 0) * columns +
      (layout.positions[source.index]?.x ?? 0);
  const occupied = inventory ? undefined : layout.occupied;
  const distance = (position: number) =>
    Math.abs((position % columns) - (current % columns)) +
    Math.abs(Math.floor(position / columns) - Math.floor(current / columns));
  const candidates = Array.from({ length: columns * rows }, (_, i) => i).sort(
    (a, b) =>
      distance(a) - distance(b) ||
      Math.abs(Math.floor(a / columns) - Math.floor(current / columns)) -
        Math.abs(Math.floor(b / columns) - Math.floor(current / columns)) ||
      Number(a < current) - Number(b < current) ||
      a - b
  );
  const position = candidates.find((position) =>
    inventory
      ? charmFits(build.charms, position, size[1], undefined, size[0])
      : gridItemCells(position, ...size)?.every((cell) => !occupied!.has(cell))
  );
  if (position === undefined) return false;
  const copy = parsePlannerItem(JSON.parse(JSON.stringify(original)));
  delete copy.stashPosition;
  if (inventory)
    build.charms.push({ ...copy, id: crypto.randomUUID(), height: size[1], position });
  else {
    build.stash.forEach((item, index) => {
      const cell = layout.positions[index];
      if (cell) item.stashPosition = cell.y * columns + cell.x;
    });
    build.stash.push({ ...copy, stashPosition: position });
  }
  return true;
}
