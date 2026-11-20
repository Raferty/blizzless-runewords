import artwork from "@/shared/planner-item-art.json";
import type { PlannerItem } from "@/types/planner";

const bases: Record<string, string | null> = artwork.bases;
const unique: Record<string, (string | null)[]> = artwork.unique;
const sets: Record<string, (string | null)[]> = artwork.set;
const tiers: Record<string, number> = artwork.tiers;
const dimensions: Record<string, number[]> = artwork.dimensions;
const variants: Record<string, string[]> = artwork.variants;
const catalogBases: Record<string, string> = artwork.catalogBases;
const names: Record<"unique" | "set", Record<string, string>> = artwork.names;
type BaseTier = "normal" | "exceptional" | "elite";
type AppearanceItem = Pick<PlannerItem, "baseCode" | "quality" | "catalogId"> &
  Partial<Pick<PlannerItem, "name" | "iconIndex">>;

// Blizzless uses these internal bases for keys and other stackable quest items.
export const isContainerBase = (code?: string) => code === "bg1" || code === "bg2";
export const worldstoneShardCodes = ["xa1", "xa2", "xa3", "xa4", "xa5"] as const;
export const isWorldstoneShard = (code?: string) => /^xa[1-5]$/.test(code || "");
export const isTome = (code?: string) => code === "tbk" || code === "ibk";

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
export function charmSkinImages(item: AppearanceItem): string[] {
  return item.quality === "magic" && ["cm1", "cm2", "cm3"].includes(item.baseCode || "")
    ? variants[item.baseCode!] || []
    : [];
}
export function plannerItemImage(
  item: AppearanceItem,
  tier?: BaseTier
): string | undefined {
  const { definitions, catalogId, baseCode } = appearanceReference(item);
  if (catalogId && definitions) {
    const image =
      definitions[catalogId][
        tier
          ? ["normal", "exceptional", "elite"].indexOf(tier)
          : (tiers[baseCode || ""] ?? 0)
      ] || undefined;
    // Uniques without a fixed inventory graphic retain the native base's
    // picture ID. Fixed unique artwork (jewelry, facets, etc.) takes priority.
    return item.iconIndex !== undefined && image === bases[baseCode || ""]
      ? variants[baseCode || ""]?.[item.iconIndex] || image
      : image;
  }
  return variants[baseCode || ""]?.[item.iconIndex ?? 0] || baseItemImage(baseCode || "");
}

export function plannerItemDimensions(
  item: AppearanceItem
): [number, number] | undefined {
  if (item.baseCode === "box") return [2, 2];
  const size = dimensions[appearanceReference(item).baseCode || ""];
  return size ? [size[0], size[1]] : undefined;
}
