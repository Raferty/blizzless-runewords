import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const dataBytes = await readFile(new URL("public/data/planner-save/data.json", root));
const data = JSON.parse(dataBytes);
const nativeArt = JSON.parse(
  await readFile(new URL("src/shared/planner-native-art.json", root))
);
const supplies = JSON.parse(
  await readFile(new URL("src/shared/planner-supplies.json", root))
).supplies;
// HD names are an artwork lookup only. Positional unique/set IDs can differ
// between Blizzless and the upstream client, so resolve the actual inventory file.
const artData = JSON.parse(
  await readFile(new URL("node_modules/d2r-saver/data/data.json", root))
);
const origin = "https://lootcube.net/images/items/";
const destination = new URL("public/images/planner/items/", root);
const bases = {
  ...Object.fromEntries(
    Object.entries(data.weapons).map(([code, row]) => [code, { row, group: "weapon" }])
  ),
  ...Object.fromEntries(
    Object.entries(data.armor).map(([code, row]) => [code, { row, group: "armor" }])
  ),
};
function hasType(type, wanted, seen = new Set()) {
  if (!type || seen.has(type)) return false;
  if (wanted.includes(type)) return true;
  seen.add(type);
  return [data.itemTypes[type]?.equiv1, data.itemTypes[type]?.equiv2].some((parent) =>
    hasType(parent, wanted, seen)
  );
}
for (const [code, row] of Object.entries(data.misc))
  if (
    supplies[code] ||
    hasType(row.type, ["ring", "amul", "char", "key", "book", "jewl"]) ||
    /^(?:ua[1-5]|pk[1-3]|rv[sl]|bkd)$/.test(code)
  )
    bases[code] = { row, group: "misc" };
// Stash placement and saved-item identity must not depend on artwork availability.
const allBases = {
  ...bases,
  ...Object.fromEntries(
    Object.entries(data.misc).map(([code, row]) => [code, { row, group: "misc" }])
  ),
};
const tier = (row, code) => {
  return row?.ultracode === code ? 2 : row?.ubercode === code ? 1 : 0;
};
const hdAt = (row, index) =>
  Array.isArray(row?.hd) ? row.hd[index] || row.hd[0] : row?.hd;
const aliases = new Map();
function remember(file, group, hd) {
  if (typeof file === "string" && typeof hd === "string" && hd)
    if (!aliases.has(file.toLowerCase()))
      aliases.set(file.toLowerCase(), `${group}/${hd}`);
}
const originalBases = {};
for (const [table, group] of [
  ["weapons", "weapon"],
  ["armor", "armor"],
  ["misc", "misc"],
])
  for (const [code, row] of Object.entries(artData[table]))
    originalBases[code] = { row, group };
for (const { row, group } of Object.values(originalBases))
  remember(row.invfile, group, row.hd);
// These inventory variants are selected explicitly by several unique jewelry items.
for (const [type, code] of [
  ["ring", "rin"],
  ["amul", "amu"],
]) {
  for (let index = 1; index <= (data.itemTypes[type]?.varinvgfx || 0); index++) {
    const file = data.itemTypes[type][`invgfx${index}`];
    if (file) aliases.set(file.toLowerCase(), `misc/${data.misc[code].hd}${index}`);
  }
}
for (const code of ["cm1", "cm2", "cm3"]) {
  const firstGraphic = data.itemTypes[data.misc[code].type]?.invgfx1;
  if (firstGraphic)
    aliases.set(firstGraphic.toLowerCase(), `misc/${artData.misc[code].hd}`);
}
const defaultInventoryFile = (row) => {
  const type = data.itemTypes[row.type];
  return type?.varinvgfx && type.invgfx1 ? type.invgfx1 : row.invfile;
};
for (const [quality, definitions] of [
  ["unique", artData.uniqueItems],
  ["set", artData.setItems],
]) {
  for (const definition of Object.values(definitions)) {
    const code = definition.code || definition.item;
    const base = originalBases[code];
    if (!base) continue;
    const hd = hdAt(definition, tier(base.row, code));
    remember(definition.invfile, base.group, hd);
    ["normcode", "ubercode", "ultracode"].forEach((field, index) => {
      const upgraded = originalBases[base.row[field]] || base;
      remember(
        upgraded.row[quality + "invfile"],
        upgraded.group,
        hdAt(definition, index)
      );
    });
  }
}
const baseKeys = {};
for (const [code, { row, group }] of Object.entries(bases))
  baseKeys[code] =
    nativeArt.bases?.[code] ||
    nativeArt.variants[code]?.[0] ||
    (/^ua[1-5]$/.test(code)
      ? `misc/${row.hd}.avif`
      : supplies[code] ||
          row.type === "key" ||
          row.type === "book" ||
          /^pk[1-3]$/.test(code) ||
          code === "bkd"
        ? `${group}/${row.hd}`
        : hasType(row.type, ["jewl"])
          ? `${group}/${row.hd}`
          : aliases.get(defaultInventoryFile(row)?.toLowerCase()) || null);
const qualityKeys = { unique: {}, set: {} };
const names = { unique: {}, set: {} };
const catalogBases = {};
const strings = new Map(
  JSON.parse(await readFile(new URL("public/data/planner-save/strings.json", root)))
);
const normalizedName = (name) =>
  name.normalize("NFKC").replace(/[’‘]/g, "'").trim().toLowerCase();
// RotW items reuse legacy invfile names despite having different HD appearances.
// Resolve these by stable item name, never by the client/server's positional IDs.
const uniqueArtwork = {
  ...nativeArt.unique,
  "Measured Wrath": "armor/grimoires/measured_wrath",
  Dreadfang: "weapon/sword/two_handed_sword",
  Wraithstep: "armor/boot/light_plate_boots",
  "Gheed's Wager": "armor/belt/heavy_belt",
  "Unique Warlock Helm": "armor/helmet/unique_warlock_helm",
  mephisto_sta: "misc/key/mephisto_sta",
  mephisto_stb: "misc/key/mephisto_stb",
  mephisto_stc: "misc/key/mephisto_stc",
  cont_rvl: "misc/quest/cont_rvl",
};
for (const [quality, definitions] of [
  ["unique", data.uniqueItems],
  ["set", data.setItems],
]) {
  for (const [id, definition] of Object.entries(definitions)) {
    const code = definition.code || definition.item;
    const base = allBases[code];
    if (!base) continue;
    catalogBases[id] = code;
    for (const name of [definition.index, strings.get(definition.index)])
      if (name) names[quality][normalizedName(name)] = id;
    if (quality === "set") {
      // The Blizzless set-item gallery resolves HD art and inventory tint by name.
      // The launcher uses the same graphic for normal, exceptional and elite bases.
      const path = nativeArt.set[definition.index];
      if (!path) throw new Error(`Missing set artwork: ${definition.index}`);
      qualityKeys.set[id] = Array(3).fill("sets/" + path);
      continue;
    }
    qualityKeys[quality][id] = [0, 1, 2].map((index) => {
      const uniqueImage =
        quality === "unique" && uniqueArtwork[definition.index.replace(/ Player$/, "")];
      if (uniqueImage) return uniqueImage;
      if (
        nativeArt.bases?.[code] &&
        !definition.invfile &&
        !base.row[quality + "invfile"]
      )
        return nativeArt.bases[code];
      if (supplies[code]?.catalogId === id) return `${base.group}/${base.row.hd}`;
      if (!bases[code]) return null;
      const upgradedCode = base.row[["normcode", "ubercode", "ultracode"][index]] || code;
      const upgraded = bases[upgradedCode] || base;
      const file =
        definition.invfile ||
        upgraded.row[quality + "invfile"] ||
        defaultInventoryFile(upgraded.row);
      return aliases.get(file?.toLowerCase()) || null;
    });
  }
}
const keys = [
  ...new Set(
    [
      ...Object.values(baseKeys),
      ...Object.values(qualityKeys.unique).flat(),
      ...Object.values(qualityKeys.set).flat(),
      ...Object.values(nativeArt.variants).flat(),
    ].filter(Boolean)
  ),
].sort();
const images = new Map();
const missing = [];
// Original Blizzless inventory sprites, pinned to the launcher manifest.
// Shared invfile names cannot identify them; preserve their original RGBA pixels.
const keySprites = {
  ...nativeArt.sprites,
  "misc/quest/jewel_dis":
    "a926c84b8e77c4ad1116475c6caacdf0dda0eb03155bd4f5f30c37a6924d3322",
  "misc/quest/parts_1":
    "1aa22d0d5cb9a02f0af89c44f34e6446d68bb9cccff0fff038ce7eec50e6e97e",
  "misc/quest/parts_2":
    "fa991baba93ef9cdce010f5029f5b24bd1cad35ccfc617ebfda49bf058f27f3c",
  "misc/quest/parts_3":
    "c8f59b04d4b47cfa1d297399291b3d4421696caf033684c49a397c27322e9af9",
  "misc/quest/cont_rvl":
    "f8059926648c49c6913b2920ae40a1854082498a577a19df1738a770283e51c7",
  "misc/key/mephisto_key":
    "904288fe2a8ef731e175462581565f8752780de3e6104f63901f86001b92af1e",
  "misc/key/mephisto_key2":
    "d797b93a1d337236419c8e8021bdd18d58b8e5a9240ed8f15276304b8a144177",
  "misc/key/mephisto_key3":
    "e0448767fa53aeb0af1ee5626da09451c907ecf5e1563d09360d923e07c0accf",
  "misc/key/mephisto_sta":
    "4f2ab490fd1f5088e93a753c3bbb2d85934d4341a7a2dfcc8c61f62db3c9449b",
  "misc/key/mephisto_stb":
    "35cbf85f2269327c9e5a9e8e8afc9181968740cf1138d59e8dba60ac5bc40f6e",
  "misc/key/mephisto_stc":
    "229fdc3701750f60080481554745da169ca94627c19063808fa9f813d00244bc",
  "misc/shard/cont_ua1":
    "568d18fd85b1518503eba4cc333e0e0ae653e275b695ae9357b89d57ef0682f6",
  "misc/shard/cont_ua2":
    "53895807e7a5c41dc6c1637ddd24ecdbd6b568112b2739108a2a0a37a78a805d",
  "misc/shard/cont_ua3":
    "985fd7f3fc5818e7fab2077f72a493d6ce06163b6cb8b4e01513ad00d344a5ba",
  "misc/shard/cont_ua4":
    "f5f7cb88b5fd59ba0e269d1f91d27d2c478f968cb1d680b5755d7911108ec3bf",
  "misc/shard/cont_ua5":
    "f758afd47c43d31101c9447d62f3a5478abfbe112176a9a44d5ecec45730bf85",
};
function spritePng(bytes) {
  const width = bytes.readUInt32LE(8),
    height = bytes.readUInt32LE(12);
  if (
    !["SpA1", "SPa1"].includes(bytes.toString("ascii", 0, 4)) ||
    bytes.readUInt16LE(4) !== 31 ||
    bytes.readUInt32LE(20) !== 1 ||
    bytes.readUInt16LE(6) !== width ||
    !width ||
    !height ||
    bytes.length !== 40 + width * height * 4
  )
    throw new Error("Unsupported key sprite format");
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const length = Buffer.alloc(4),
      checksum = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([length, body, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6; // RGBA
  const rows = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++)
    bytes.copy(
      rows,
      y * (1 + width * 4) + 1,
      40 + y * width * 4,
      40 + (y + 1) * width * 4
    );
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const classicFallbacks = {
  "weapon/axe/butchers_cleaver": {
    url: "https://classic.battle.net/images/battle/diablo2exp/images/items/uniques/thegnasher.gif",
    file: "classic/invhaxu.gif",
  },
  "armor/helmet/leorics_crown": {
    url: "https://classic.battle.net/images/battle/diablo2exp/images/items/sets/ondalsalmighty.gif",
    file: "classic/invuhms.gif",
  },
};
let cursor = 0;
const isWebp = (bytes) =>
  bytes.length > 12 &&
  bytes.toString("ascii", 0, 4) === "RIFF" &&
  bytes.toString("ascii", 8, 12) === "WEBP";
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (cursor < keys.length) {
      const key = keys[cursor++];
      if (/^(?:sets|misc)\/[a-z0-9_-]+\/[a-z0-9_.-]+\.avif$/i.test(key)) {
        const file = new URL(key, destination);
        let bytes = await readFile(file).catch(() => null);
        if (!bytes || !bytes.subarray(0, 32).includes("avif")) {
          const url =
            "https://blizzless.info/imgs/game-items/" + key.slice(key.indexOf("/") + 1);
          const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
          if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
          bytes = Buffer.from(await response.arrayBuffer());
          if (!bytes.subarray(0, 32).includes("avif"))
            throw new Error(`Invalid AVIF: ${url}`);
          await mkdir(new URL(".", file), { recursive: true });
          await writeFile(file, bytes);
        }
        images.set(key, "images/planner/items/" + key);
        continue;
      }
      if (!/^(weapon|armor|misc)\/[a-z0-9_/-]+$/.test(key))
        throw new Error(`Invalid item image key: ${key}`);
      if (keySprites[key]) {
        let sprite;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await fetch(
              "https://blizzless.info/api/launcher-mods/blobs/" + keySprites[key],
              { signal: AbortSignal.timeout(20000) }
            );
            if (!response.ok) throw new Error(`Native sprite: HTTP ${response.status}`);
            sprite = Buffer.from(await response.arrayBuffer());
            break;
          } catch (error) {
            if (attempt === 2) throw error;
          }
        }
        if (createHash("sha256").update(sprite).digest("hex") !== keySprites[key])
          throw new Error(`Key sprite checksum mismatch: ${key}`);
        const file = new URL(key + ".png", destination);
        await mkdir(new URL(".", file), { recursive: true });
        await writeFile(file, spritePng(sprite));
        images.set(key, "images/planner/items/" + key + ".png");
        continue;
      }
      const file = new URL(key + ".webp", destination);
      let localPath = "images/planner/items/" + key + ".webp";
      let bytes;
      const expectedHash = nativeArt.externalImages[key]?.sha256;
      try {
        bytes = await readFile(file);
        if (!isWebp(bytes)) bytes = undefined;
        if (
          bytes &&
          expectedHash &&
          createHash("sha256").update(bytes).digest("hex") !== expectedHash
        )
          bytes = undefined;
      } catch {
        /* Download uncached artwork. */
      }
      if (!bytes) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await fetch(origin + key + ".webp", {
              signal: AbortSignal.timeout(20000),
            });
            if (!response.ok) {
              if (response.status === 404) break;
              throw new Error(`HTTP ${response.status}`);
            }
            const downloaded = Buffer.from(await response.arrayBuffer());
            if (!isWebp(downloaded)) throw new Error("Not a WebP image");
            if (
              expectedHash &&
              createHash("sha256").update(downloaded).digest("hex") !== expectedHash
            )
              throw new Error(`Artwork checksum mismatch: ${key}`);
            bytes = downloaded;
            await mkdir(new URL(".", file), { recursive: true });
            await writeFile(file, bytes);
            break;
          } catch (error) {
            if (attempt === 1) missing.push({ key, reason: String(error.message) });
          }
        }
      }
      const fallback = classicFallbacks[key];
      if (!bytes && fallback) {
        const fallbackFile = new URL(fallback.file, destination);
        try {
          let gif;
          try {
            gif = await readFile(fallbackFile);
          } catch {
            /* Not cached yet. */
          }
          if (!gif) {
            const response = await fetch(fallback.url, {
              signal: AbortSignal.timeout(20000),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            gif = Buffer.from(await response.arrayBuffer());
          }
          if (!/^GIF8[79]a$/.test(gif.toString("ascii", 0, 6)))
            throw new Error("Not a GIF image");
          await mkdir(new URL(".", fallbackFile), { recursive: true });
          await writeFile(fallbackFile, gif);
          bytes = gif;
          localPath = "images/planner/items/" + fallback.file;
          const previousFailure = missing.findIndex((entry) => entry.key === key);
          if (previousFailure !== -1) missing.splice(previousFailure, 1);
        } catch (error) {
          missing.push({ key, reason: String(error.message) });
        }
      }
      if (bytes) images.set(key, localPath);
      else if (!missing.some((entry) => entry.key === key))
        missing.push({ key, reason: "HTTP 404" });
    }
  })
);
const image = (key) => images.get(key) || null;
const coloredSunders = {};
for (const [id, definition] of Object.entries(data.uniqueItems)) {
  if (definition.code !== "cm4") continue;
  const tint = nativeArt.sunderColors?.[definition.invtransform];
  const sourceImage = image(qualityKeys.unique[id]?.[0]);
  if (!tint || !sourceImage) continue;
  const bytes = await readFile(new URL("public/" + sourceImage, root));
  // Preserve the inventory graphic and its alpha; use the native palette's
  // RGB tint on its luminance. This approximates the client's HD colour shader.
  const matrix = tint.flatMap((channel) => [
    0.2126 * channel,
    0.7152 * channel,
    0.0722 * channel,
    0,
    0,
  ]);
  matrix.push(0, 0, 0, 1, 0);
  const filename = `misc/charm/sunder_${definition.invtransform}.svg`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="300" viewBox="0 0 100 300"><defs><filter id="tint" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${matrix.map((v) => Number(v.toFixed(7))).join(" ")}"/></filter></defs><image width="100" height="300" href="data:image/webp;base64,${bytes.toString("base64")}" filter="url(#tint)"/></svg>\n`;
  await writeFile(new URL(filename, destination), svg);
  coloredSunders[id] = "images/planner/items/" + filename;
}
const manifest = {
  checkedAt: new Date().toISOString().slice(0, 10),
  source: origin,
  keySpriteSource: "https://blizzless.info/api/launcher-mods/blobs/",
  keySprites,
  nativeArtSource: nativeArt.source,
  variants: Object.fromEntries(
    Object.entries(nativeArt.variants).map(([code, keys]) => [code, keys.map(image)])
  ),
  gameDataSha256: createHash("sha256").update(dataBytes).digest("hex"),
  bases: Object.fromEntries(
    Object.entries(baseKeys).map(([code, key]) => [code, image(key)])
  ),
  tiers: Object.fromEntries(
    Object.entries(bases).map(([code, { row }]) => [code, tier(row, code)])
  ),
  dimensions: Object.fromEntries(
    Object.entries(allBases).map(([code, { row }]) => [
      code,
      [Math.max(1, row.invwidth || 1), Math.max(1, row.invheight || 1)],
    ])
  ),
  catalogBases,
  names,
  unresolvedBaseFiles: Object.fromEntries(
    Object.entries(bases)
      .filter(([code]) => !baseKeys[code])
      .map(([code, { row }]) => [code, defaultInventoryFile(row)])
  ),
  unique: Object.fromEntries(
    Object.entries(qualityKeys.unique).map(([id, keys]) => {
      const override =
        coloredSunders[id] || nativeArt.imageOverrides?.[data.uniqueItems[id].index];
      return [id, override ? Array(3).fill(override) : keys.map(image)];
    })
  ),
  set: Object.fromEntries(
    Object.entries(qualityKeys.set).map(([id, keys]) => [id, keys.map(image)])
  ),
  missing: missing.sort((a, b) => a.key.localeCompare(b.key)),
};
await writeFile(
  new URL("src/shared/planner-item-art.json", root),
  JSON.stringify(manifest, null, 2) + "\n"
);
console.log(
  `Item artwork: ${images.size}/${keys.length} images, ${Object.keys(baseKeys).length} bases, ${Object.keys(manifest.unique).length} uniques, ${Object.keys(manifest.set).length} set items.`
);
if (missing.length)
  console.log("Unavailable artwork:", missing.map((entry) => entry.key).join(", "));
