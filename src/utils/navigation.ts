export interface CatalogRoute {
  section: "runewords" | "recipes" | "planner";
}
export function parseCatalogHash(hash: string): CatalogRoute {
  const [section] = hash.replace(/^#\/?/, "").split(/[/?]/);
  if (section === "planner") return { section: "planner" };
  return { section: ["recipes", "ricepes"].includes(section) ? "recipes" : "runewords" };
}
