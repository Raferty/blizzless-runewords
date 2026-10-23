export interface CatalogRoute {
  section: "runewords" | "recipes";
}
export function parseCatalogHash(hash: string): CatalogRoute {
  const [section] = hash.replace(/^#\/?/, "").split("/");
  return { section: ["recipes", "ricepes"].includes(section) ? "recipes" : "runewords" };
}
