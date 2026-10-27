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
  await mkdir(new URL("public/images/planner/sockets/", root), { recursive: true });
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (cursor < gems.length) {
        const item = gems[cursor++];
        const path = new URL(`public${item.image_url}`, root);
        let cached;
        try {
          cached = await readFile(path);
        } catch {
          /* Not downloaded yet. */
        }
        if (cached?.subarray(0, 4).toString() === "RIFF") continue;
        const hd = data.misc[item.code].hd;
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
    `Socket catalog: ${items.length} inserts, ${gems.length} gem images, ${Object.keys(bases).length} base contexts.`
  );
} finally {
  await server.close();
}
