import artwork from "@/shared/planner-item-art.json";
import type { PlannerItem } from "@/types/planner";

const bases: Record<string, string | null> = artwork.bases;
const unique: Record<string, (string | null)[]> = artwork.unique;
const sets: Record<string, (string | null)[]> = artwork.set;
const tiers: Record<string, number> = artwork.tiers;
const dimensions: Record<string, number[]> = artwork.dimensions;
const catalogBases: Record<string, string> = artwork.catalogBases;
const names: Record<"unique" | "set", Record<string, string>> = artwork.names;
type BaseTier = "normal" | "exceptional" | "elite";
type AppearanceItem = Pick<PlannerItem, "baseCode" | "quality" | "catalogId"> &
  Partial<Pick<PlannerItem, "name">>;

function appearanceReference(item: AppearanceItem) {
  const quality =
    item.quality === "unique" || item.quality === "set" ? item.quality : undefined;
  const definitions =
    quality === "unique" ? unique : quality === "set" ? sets : undefined;
  const name = item.name?.normalize("NFKC").replace(/[’‘]/g, "'").trim().toLowerCase();
  const candidate = quality
    ? item.catalogId || (name ? names[quality][name] : undefined)
    : undefined;
  const catalogId = candidate && definitions?.[candidate] ? candidate : undefined;
  return {
    definitions,
    catalogId,
    baseCode: item.baseCode || (catalogId ? catalogBases[catalogId] : undefined),
  };
}

export const baseItemImage = (code: string) =>
  code === "box" ? "images/planner/items/horadric-cube.webp" : bases[code] || undefined;
export function plannerItemIdentity(item: AppearanceItem) {
  const { baseCode, catalogId } = appearanceReference(item);
  return { baseCode, catalogId };
}
export function plannerItemImage(
  item: AppearanceItem,
  tier?: BaseTier
): string | undefined {
  const { definitions, catalogId, baseCode } = appearanceReference(item);
  if (catalogId && definitions)
    return (
      definitions[catalogId][
        tier
          ? ["normal", "exceptional", "elite"].indexOf(tier)
          : (tiers[baseCode || ""] ?? 0)
      ] || undefined
    );
  return baseItemImage(baseCode || "");
}

export function plannerItemDimensions(
  item: AppearanceItem
): [number, number] | undefined {
  if (item.baseCode === "box") return [2, 2];
  const size = dimensions[appearanceReference(item).baseCode || ""];
  return size ? [size[0], size[1]] : undefined;
}
