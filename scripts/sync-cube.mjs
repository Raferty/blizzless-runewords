import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const origin = "https://blizzless.info";
// Share the filter's rune assets, including source keys such as mal and io_rune.
const server = await createServer({
  root,
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
let runes;
try {
  ({ RUNES: runes } = await server.ssrLoadModule("/src/shared/constants.ts"));
} finally {
  await server.close();
}
const endpoints = ["recipes", "ingredients", "ingredients-tags", "recipes-tags"];
const raw = await Promise.all(
  endpoints.map(async (endpoint) => {
    const response = await fetch(`${origin}/api/cube/${endpoint}`, {
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error(`${endpoint}: empty data`);
    return data;
  })
);
const [versions, ingredients, ingredientTags, recipeTags] = raw;
const localized = (item, field) => ({
  ru: item[`${field}_ru`]?.trim() || "",
  en: item[`${field}_en`]?.trim() || "",
});
const normalizeItem = (item) => {
  if (typeof item.key !== "string" || !Number.isFinite(item.count) || item.count <= 0)
    throw new Error("Invalid recipe item");
  if (item.alternatives?.length) throw new Error("New alternatives need review");
  return { key: item.key, count: item.count, notes: localized(item, "notes") };
};
const normalizeRecipe = (item) => ({
  key: item.key,
  name: localized(item, "name"),
  notes: localized(item, "notes"),
  status: item.status || "unchanged",
  tags: item.tags || [],
  officialVersion: item.officialVersion,
  blizzlessVersion: item.blizzlessVersion,
  ingredients: item.ingredients.map(normalizeItem),
  result: item.result.map(normalizeItem),
});
const grouped = new Map();
for (const version of versions) {
  if (!version.isPublished) continue;
  if (!grouped.has(version.key)) grouped.set(version.key, []);
  grouped.get(version.key).push(version);
}
const recipes = [...grouped.values()].map((group) => {
  const latest = (field) =>
    group.filter((item) => item[field] != null).sort((a, b) => b[field] - a[field])[0];
  const official = latest("officialVersion");
  const modified = latest("blizzlessVersion");
  const current = modified || official;
  if (!current) throw new Error("Recipe has no published version");
  return {
    ...normalizeRecipe(current),
    ...(modified && official ? { original: normalizeRecipe(official) } : {}),
  };
});
const ingredientKeys = new Set(ingredients.map((item) => item.key));
if (ingredientKeys.size !== ingredients.length) throw new Error("Duplicate ingredients");
for (const recipe of recipes.flatMap((item) => [
  item,
  ...(item.original ? [item.original] : []),
])) {
  if (!recipe.ingredients.length || !recipe.result.length)
    throw new Error("Empty formula");
  for (const item of [...recipe.ingredients, ...recipe.result])
    if (!ingredientKeys.has(item.key)) throw new Error(`Unknown ingredient: ${item.key}`);
}

const imageRequests = new Map();
const imagesDir = path.join(root, "public/images/cube");
await mkdir(imagesDir, { recursive: true });
const missingImages = [];
function ingredientImage(item, tags) {
  if (tags.includes("rune")) {
    const words = (item.name_en || "").toLowerCase().split(/[^a-z]+/);
    const matches = runes.filter((rune) => words.includes(rune.name.en.toLowerCase()));
    if (matches.length !== 1) throw new Error(`Unknown rune image: ${item.key}`);
    return `local:${matches[0].image_url.replace(/^\//, "")}`;
  }
  if (item.imgName) {
    if (item.imgName.includes("..") || item.imgName.includes(":"))
      throw new Error("Unexpected image path");
    return /\/|^[a-f0-9]{64}/i.test(item.imgName)
      ? item.imgName
      : `items/${item.imgName.replace(/\.png$/, "")}.png`;
  }
  if (item.key.startsWith("gem_")) {
    const [, grade, ...gem] = item.key.split("_");
    return `gems/${gem.join("_")}/${grade}.png`;
  }
  for (const prefix of ["potion_", "misc_"])
    if (item.key.startsWith(prefix))
      return `${prefix.slice(0, -1)}/${item.key.slice(prefix.length)}.webp`;
  if (/^any_.+_gem$/.test(item.key)) return `gems/any/any_${item.key.slice(4, -4)}.webp`;
  return null;
}
function imageFor(source) {
  if (!source) return Promise.resolve(null);
  if (source.startsWith("local:")) {
    const image = source.slice(6);
    return access(path.join(root, "public", image)).then(() => image);
  }
  if (!imageRequests.has(source))
    imageRequests.set(source, async () => {
      const url = `${origin}/media/${source}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (response.status === 404) {
        missingImages.push(source);
        return null;
      }
      if (!response.ok) throw new Error(`Image ${source}: HTTP ${response.status}`);
      const type = response.headers.get("content-type") || "";
      if (!type.startsWith("image/")) throw new Error(`Not an image: ${source}`);
      const extension = type.includes("webp")
        ? "webp"
        : type.includes("png")
          ? "png"
          : "jpg";
      const name = `${createHash("sha256").update(source).digest("hex").slice(0, 18)}.${extension}`;
      await writeFile(
        path.join(imagesDir, name),
        new Uint8Array(await response.arrayBuffer())
      );
      return `images/cube/${name}`;
    });
  return source;
}
const ingredientTagKeys = Object.fromEntries(
  ingredientTags.map((tag) => [tag._id, tag.key])
);
const normalizedIngredients = ingredients.map((item) => {
  const tags = (item.tags || []).map((id) => ingredientTagKeys[id] || id);
  return {
    key: item.key,
    name: localized(item, "name"),
    tags,
    image: imageFor(ingredientImage(item, tags)),
  };
});
const resolvedImages = new Map();
const queue = [...imageRequests];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const [key, download] = queue.shift();
      resolvedImages.set(key, await download());
    }
  })
);
async function resolveImage(value) {
  return typeof value === "string" ? resolvedImages.get(value) : await value;
}
for (const item of normalizedIngredients) item.image = await resolveImage(item.image);
const tag = (item) => ({ key: item.key, name: localized(item, "name") });
const catalog = {
  source: `${origin}/cube`,
  checkedAt: new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()),
  sourceVersionCount: versions.length,
  recipes,
  ingredients: normalizedIngredients,
  recipeTags: recipeTags.map(tag),
  ingredientTags: ingredientTags.map(tag),
  missingImages,
};
await writeFile(
  path.join(root, "src/shared/cube-catalog.json"),
  JSON.stringify(catalog, null, 2) + "\n"
);
// Keep a raw local snapshot for audits; docs/ is ignored by Git.
const audit = path.join(root, "docs/audits", catalog.checkedAt, "cube");
await mkdir(audit, { recursive: true });
for (let i = 0; i < endpoints.length; i++)
  await writeFile(
    path.join(audit, `${endpoints[i]}.json`),
    JSON.stringify(raw[i], null, 2) + "\n"
  );
console.log(
  `Cube synced: ${recipes.length} recipes, ${ingredients.length} ingredients, ${imageRequests.size - missingImages.length} images, ${missingImages.length} unavailable source images.`
);
