import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { createServer } from "vite";

const root = new URL("../", import.meta.url);
const bytes = await readFile(new URL("public/data/planner-save/data.json", root));
const data = JSON.parse(bytes);
const locale = JSON.parse(
  await readFile(new URL("public/data/planner-save/strings.json", root))
);
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const { createGameSaveExporter } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const { RUNES } = await server.ssrLoadModule("/src/shared/constants.ts");
  const { propertyRange } = await server.ssrLoadModule(
    "/src/utils/planner-properties.ts"
  );
  const native = createGameSaveExporter(data, locale);
  const families = {
    Amethyst: "Аметист",
    Sapphire: "Сапфир",
    Emerald: "Изумруд",
    Ruby: "Рубин",
    Diamond: "Алмаз",
    Topaz: "Топаз",
    Skull: "Череп",
  };
  const qualities = {
    Chipped: "Колотый",
    Flawed: "Мутный",
    Flawless: "Безупречный",
    Perfect: "Идеальный",
  };
  const items = await Promise.all(
    Object.entries(data.gems).map(async ([code, gem]) => {
      const base = data.misc[code];
      const rune = base.type === "rune";
      const original = RUNES.find((r) => r.name.en === gem.name.split(" ")[0]);
      const nameRu = rune
        ? `${code.endsWith("r") ? "Чистая руна" : "Руна"} ${original.name.ru}`
        : gem.name
            .split(" ")
            .map((part) => qualities[part] || families[part] || part)
            .join(" ");
      return {
        code,
        name: { en: gem.name, ru: nameRu },
        group: rune ? "rune" : "gem",
        requiredLevel: base.levelreq || 1,
        image_url: rune ? original.image_url : `/images/planner/sockets/${code}.webp`,
        effects: Object.fromEntries(
          ["weapon", "helm", "shield"].map((category) => [
            category,
            native.socketBonuses(code, category),
          ])
        ),
      };
    })
  );
  const jewelNames = {
    "Defender's Bile": "Желчь защитника",
    "Guardian's Thunder": "Гром стража",
    "Protector's Frost": "Мороз хранителя",
    "Defender's Fire": "Огонь защитника",
    "Protector's Stone": "Камень хранителя",
    "Guardian's Light": "Свет стража",
  };
  // Colossal jewels use the corresponding Ancient's bust, not generic jewel art.
  // Map by name because Blizzless and client positional unique IDs differ.
  const jewelArtwork = {
    "Defender's Bile": "colossal_jewel_talic",
    "Defender's Fire": "colossal_jewel_talic",
    "Guardian's Thunder": "colossal_jewel_madawc",
    "Guardian's Light": "colossal_jewel_madawc",
    "Protector's Frost": "colossal_jewel_korlic",
    "Protector's Stone": "colossal_jewel_korlic",
  };
  for (const [code, definition] of Object.entries(data.uniqueItems)) {
    if (!["jew", "cjw"].includes(definition.code) || !definition.enabled) continue;
    const facet = definition.code === "jew";
    const element = {
      "dmg-ltng": ["Lightning", "Молния"],
      "dmg-cold": ["Cold", "Холод"],
      "dmg-fire": ["Fire", "Огонь"],
      "dmg-pois": ["Poison", "Яд"],
    }[definition.prop1];
    const death = definition.prop4 === "death-skill";
    const ranges = Object.fromEntries(
      Array.from({ length: 12 }, (_, n) => {
        const i = n + 1,
          property = data.properties[definition[`prop${i}`]];
        const range = property && propertyRange(definition, property, i);
        return range ? [[i, range]] : [];
      }).flat()
    );
    const effects = native.socketBonuses(code, "helm");
    const rollEffects = Object.fromEntries(
      Object.entries(ranges).map(([i, range]) => {
        const low = native.socketBonuses(code, "helm", { [i]: range.min });
        return [
          i,
          {
            bonuses: Object.fromEntries(
              Object.entries(effects.bonuses).map(([key, value]) => [
                key,
                (value - (low.bonuses[key] ?? 0)) / (range.max - range.min),
              ])
            ),
            classBonuses: {},
          },
        ];
      })
    );
    items.push({
      code,
      baseCode: definition.code,
      group: facet ? "facet" : "jewel",
      name: facet
        ? {
            en: `Rainbow Facet · ${element[0]} · ${death ? "Death" : "Level Up"}`,
            ru: `Радужный фасет · ${element[1]} · ${death ? "Смерть" : "Новый уровень"}`,
          }
        : { en: definition.index, ru: jewelNames[definition.index] || definition.index },
      requiredLevel: definition.lvlreq,
      image_url: facet
        ? "/images/cube/c42fa7a7a08d52a172.png"
        : `/images/planner/sockets/${jewelArtwork[definition.index]}.webp`,
      effects: Object.fromEntries(
        ["weapon", "helm", "shield"].map((category) => [category, effects])
      ),
      ranges,
      rollEffects,
    });
  }
  const isType = (type, wanted, seen = new Set()) => {
    if (!type || seen.has(type)) return false;
    if (type === wanted) return true;
    seen.add(type);
    return [native.gd.itemTypes[type]?.equiv1, native.gd.itemTypes[type]?.equiv2].some(
      (t) => isType(t, wanted, seen)
    );
  };
  const bases = Object.fromEntries(
    Object.entries(native.gd.items).flatMap(([code, base]) =>
      isType(base.type, "weap")
        ? [[code, "weapon"]]
        : isType(base.type, "shld")
          ? [[code, "shield"]]
          : isType(base.type, "armo")
            ? [[code, "helm"]]
            : []
    )
  );
  const gems = items.filter((i) => i.group === "gem");
  const artwork = [
    ...new Map(
      items
        .filter((item) => item.group === "gem" || item.group === "jewel")
        .map((item) => [item.image_url, item])
    ).values(),
  ];
  await mkdir(new URL("public/images/planner/sockets/", root), { recursive: true });
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (cursor < artwork.length) {
        const item = artwork[cursor++];
        const path = new URL(`public${item.image_url}`, root);
        let cached;
        try {
          cached = await readFile(path);
        } catch {
          /* Not downloaded yet. */
        }
        if (cached?.subarray(0, 4).toString() === "RIFF") continue;
        const hd =
          item.group === "gem"
            ? data.misc[item.code].hd
            : `gem/${jewelArtwork[item.name.en]}`;
        if (!/^[a-z0-9_/-]+$/.test(hd)) throw new Error(`Invalid artwork ${hd}`);
        const response = await fetch(
          `https://lootcube.net/images/items/misc/${hd}.webp`,
          { signal: AbortSignal.timeout(20000) }
        );
        if (!response.ok) throw new Error(`${item.code}: HTTP ${response.status}`);
        const image = Buffer.from(await response.arrayBuffer());
        if (
          image.toString("ascii", 0, 4) !== "RIFF" ||
          image.toString("ascii", 8, 12) !== "WEBP"
        )
          throw new Error(`Invalid WebP ${item.code}`);
        await writeFile(path, image);
      }
    })
  );
  await writeFile(
    new URL("src/shared/planner-sockets.json", root),
    JSON.stringify(
      { gameDataSha256: createHash("sha256").update(bytes).digest("hex"), items, bases },
      null,
      2
    ) + "\n"
  );
  console.log(
    `Socket catalog: ${items.length} inserts, ${gems.length} gem images, ${artwork.length - gems.length} colossal jewel images, ${Object.keys(bases).length} base contexts.`
  );
} finally {
  await server.close();
}
