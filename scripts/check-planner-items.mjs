import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createServer } from "vite";
import { createHash } from "node:crypto";
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
});
try {
  const { createGameSaveExporter } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const {
    createItemCatalog,
    catalogPropertyLines,
    catalogSetBonuses,
    socketPropertyLines,
  } = await server.ssrLoadModule("/src/utils/planner-item-catalog.ts");
  const { baseItemImage, plannerItemImage, plannerItemDimensions } =
    await server.ssrLoadModule("/src/utils/planner-item-art.ts");
  const { itemRuneword, itemSockets, itemRunewordLines, itemBonusLines } =
    await server.ssrLoadModule("/src/utils/planner-item-presentation.ts");
  const art = JSON.parse(
    await readFile(new URL("../src/shared/planner-item-art.json", import.meta.url))
  );
  for (const image of new Set(
    [
      ...Object.values(art.bases),
      ...Object.values(art.unique).flat(),
      ...Object.values(art.set).flat(),
    ].filter(Boolean)
  ))
    await access(new URL("../public/" + image, import.meta.url));
  const { createBuild, parsePlannerItem } = await server.ssrLoadModule(
    "/src/utils/planner.ts"
  );
  const { useRunewordsStore } = await server.ssrLoadModule("/src/store/runewords.ts");
  const { createPinia, setActivePinia } = await import("pinia");
  setActivePinia(createPinia());
  const words = useRunewordsStore().sortedRunewords;
  const enigma = words.find((word) => word.name.en === "Enigma");
  const enigmaItem = {
    name: "Enigma",
    quality: "runeword",
    runewordId: enigma.id,
    baseCode: "utp",
    baseKind: "armor",
    bonuses: {},
    notes: "",
    requiredLevel: 65,
    sockets: 0,
  };
  assert.deepEqual(
    itemSockets(enigmaItem, words).map((rune) => rune?.name.en),
    ["Jah", "Ith", "Ber"]
  );
  assert.equal(itemRuneword({ ...enigmaItem, name: "Custom label" }, words), enigma);
  assert.equal(
    itemRuneword({ ...enigmaItem, runewordId: undefined, name: enigma.name.ru }, words),
    enigma
  );
  assert.deepEqual(itemSockets({ ...enigmaItem, quality: "normal", sockets: 3 }, words), [
    undefined,
    undefined,
    undefined,
  ]);
  assert.equal(itemRuneword({ ...enigmaItem, quality: "rare" }, words), undefined);
  for (const word of words)
    assert(
      itemSockets({ ...enigmaItem, runewordId: word.id }, words).every(Boolean),
      word.name.en
    );
  const infinity = words.find((word) => word.name.en === "Infinity");
  const repeatedRunes = itemSockets({ ...enigmaItem, runewordId: infinity.id }, words);
  assert.equal(
    repeatedRunes[0].id,
    repeatedRunes[2].id,
    "Repeated runes keep their sockets"
  );
  const splitWord = {
    ...enigma,
    stats: {
      en: [
        "Shared",
        "#Weapons#",
        "Weapon",
        "#Shields#",
        "Shield",
        "#Body Armor#",
        "Armor",
      ],
      ru: ["Общее", "#Оружие#", "Оружие", "#Щиты#", "Щит", "#Броня#", "Броня"],
    },
  };
  for (const [kind, line] of [
    ["weapon", "Weapon"],
    ["shield", "Shield"],
    ["armor", "Armor"],
  ])
    assert.deepEqual(itemRunewordLines(splitWord, kind, "en"), ["Shared", line]);
  assert.deepEqual(itemRunewordLines(splitWord, "shield", "ru"), ["Общее", "Щит"]);
  assert(itemRunewordLines(enigma, "armor", "en", 1, 90).includes("+775 Defense"));
  assert(itemRunewordLines(enigma, "armor", "en", 0, 90).includes("+750 Defense"));
  assert(
    itemRunewordLines(enigma, "armor", "en", 1, 90).some((line) =>
      line.includes("+67 To Strength")
    )
  );
  assert(
    itemRunewordLines(enigma, "armor", "ru", 1, 90).some((line) =>
      line.includes("+67 к силе")
    )
  );
  assert(
    itemBonusLines(
      { ...enigmaItem, bonuses: { life: 20, fcr: 30 }, classBonuses: { sorceress: 2 } },
      "en"
    ).includes("+30% Cast rate (FCR)")
  );
  const [data, locale] = await Promise.all(
    ["data.json", "strings.json"].map(async (name) =>
      JSON.parse(
        await readFile(new URL("../public/data/planner-save/" + name, import.meta.url))
      )
    )
  );
  const native = createGameSaveExporter(data, locale);
  const { socketInserts, socketCategory } = await server.ssrLoadModule(
    "/src/utils/planner-sockets.ts"
  );
  const socketData = JSON.parse(
    await readFile(new URL("../src/shared/planner-sockets.json", import.meta.url))
  );
  assert.equal(
    socketData.gameDataSha256,
    createHash("sha256")
      .update(
        await readFile(new URL("../public/data/planner-save/data.json", import.meta.url))
      )
      .digest("hex")
  );
  assert.equal(socketInserts.length, 86);
  assert.equal(socketInserts.filter((insert) => insert.group === "facet").length, 8);
  assert.equal(socketInserts.filter((insert) => insert.group === "jewel").length, 6);
  assert.equal(socketInserts.filter((insert) => insert.group === "gem").length, 35);
  assert.equal(new Set(socketInserts.map((insert) => insert.code)).size, 86);
  for (const insert of socketInserts) {
    await access(new URL("../public" + insert.image_url, import.meta.url));
    for (const category of ["weapon", "helm", "shield"]) {
      assert.deepEqual(
        insert.effects[category],
        native.socketBonuses(insert.code, category),
        `${insert.code} ${category}`
      );
      const lines = socketPropertyLines(native, insert.code, category, 90);
      assert(
        lines.length > 0 ||
          (category === "weapon" && ["04r", "14r", "29r", "32r"].includes(insert.code)),
        `${insert.code} ${category} properties`
      );
      assert(
        lines.every((line) => !/NaN|undefined|#/.test(line)),
        `${insert.code}: ${lines.join("; ")}`
      );
    }
  }
  const mixedSockets = {
    ...enigmaItem,
    quality: "normal",
    sockets: 3,
    socketedItems: ["r22", "gpr", null],
  };
  assert.deepEqual(
    itemSockets(mixedSockets, words).map((insert) => insert?.name.en),
    ["Um Rune", "Perfect Ruby", undefined]
  );
  assert.equal(socketCategory({ ...mixedSockets, baseCode: "uit" }), "shield");
  assert(socketPropertyLines(native, "gpr", "helm").includes("+38 to Life"));
  assert(socketPropertyLines(native, "gpr", "shield").includes("Fire Resist +40%"));
  assert.deepEqual(socketPropertyLines(native, "gpg", "weapon"), [
    "Adds 100 Poison Damage Over 7 Seconds",
  ]);
  assert.deepEqual(socketPropertyLines(native, "r07", "weapon"), [
    "Adds 75 Poison Damage Over 5 Seconds",
  ]);
  assert(
    socketPropertyLines(native, "r13", "weapon").includes("+20% Increased Attack Speed")
  );
  const build = createBuild("paladin");
  const catalog = createItemCatalog(
    native,
    build,
    { key: "test", owner: "hero", slot: "offHand" },
    words
  );
  assert(catalog.items.some((i) => i.word?.name.en === "Spirit"));
  assert(catalog.items.some((i) => i.quality === "set"));
  assert(catalog.items.some((i) => i.quality === "unique"));
  const herald = catalog.items.find((item) => item.name === "Herald of Zakarum");
  assert(catalogPropertyLines(native, herald, 0).includes("+2 to Combat skills"));
  assert(
    !catalog.items.some((i) => i.bases.includes("hax")),
    "Paladin off-hand excludes weapons"
  );
  assert(
    catalog.items.some((i) => i.bases.includes("pa1")),
    "Paladin shields are available"
  );
  const sorc = createItemCatalog(
    native,
    createBuild("sorceress"),
    { key: "test", owner: "hero", slot: "offHand" },
    words
  );
  assert(
    !sorc.items.some((i) => i.bases.includes("pa1")),
    "Class restrictions apply to bases and uniques"
  );
  const stash = createItemCatalog(
    native,
    createBuild("barbarian"),
    { key: "test", owner: "stash" },
    words
  );
  let checked = 0;
  for (const item of stash.items.filter((i) => i.catalogId)) {
    for (const roll of [0, 1]) {
      const bonuses = native.catalogBonuses(item.catalogId, item.quality, roll);
      assert(Object.values(bonuses.bonuses).every(Number.isFinite), item.name);
      assert(
        catalogPropertyLines(native, item, roll).every((line) => !line.includes("#")),
        item.name
      );
      checked++;
    }
  }
  const aldur = stash.items.find((i) => i.name === "Aldur's Rhythm");
  const arcanna = stash.items.find((i) => i.name === "Arcanna's Head");
  assert(arcanna);
  assert.deepEqual(catalogPropertyLines(native, arcanna, 0), [
    "Replenish Life +4",
    "Lightning Resist +30%",
  ]);
  const arcannaSet = catalogSetBonuses(native, arcanna.catalogId, 0);
  assert.equal(arcannaSet.name, "Arcanna's Tricks");
  assert.equal(arcannaSet.size, 4);
  assert.deepEqual(arcannaSet.item, [
    { count: 2, lines: ["Poison Resist +30%"] },
    { count: 3, lines: ["Damage Reduced by 10"] },
  ]);
  assert.deepEqual(arcannaSet.partial, [
    { count: 2, lines: ["+50 to Mana"] },
    { count: 3, lines: ["+50 to Life", "Regenerate Mana 12%"] },
  ]);
  assert(arcannaSet.full.includes("+2 to All Skills"));
  assert(arcannaSet.full.includes("50% Better Chance of Getting Magic Items"));
  const ward = Object.entries(native.gd.setItems).find(
    ([, row]) => row.index === "Civerb's Ward"
  )[0];
  const wardMin = catalogSetBonuses(native, ward, 0);
  const wardMax = catalogSetBonuses(native, ward, 1);
  assert.equal(wardMin.item[0].requires, "Civerb's Icon");
  assert.equal(wardMin.item[0].lines[0], "+21 to Mana");
  assert.equal(wardMax.item[0].lines[0], "+22 to Mana");
  assert.equal(wardMax.item[1].requires, "Civerb's Cudgel");
  for (const [id] of Object.entries(native.gd.setItems)) {
    for (const roll of [0, 1]) {
      const bonuses = catalogSetBonuses(native, id, roll, 90);
      assert(bonuses?.size >= 1, id);
      assert(
        bonuses.item.every((group) => group.count >= 2 && group.count <= 6),
        id
      );
      const lines = [
        ...bonuses.item.flatMap((x) => x.lines),
        ...bonuses.partial.flatMap((x) => x.lines),
        ...bonuses.full,
      ];
      assert(
        lines.every((line) => !/NaN|undefined|#|\[/.test(line)),
        id
      );
    }
  }
  assert.equal(catalogSetBonuses(native, "missing", 0), undefined);
  assert.equal(
    catalogSetBonuses(native, "set075", 0).size,
    1,
    "Blizzless has a standalone Stone Crusher set"
  );
  const horazon = Object.entries(native.gd.setItems).find(
    ([, row]) => row.index === "Horazon's Dominion"
  )[0];
  assert.equal(
    catalogSetBonuses(native, horazon, 0).item.at(-1).count,
    6,
    "Keep the actual table threshold even for the five-piece Horazon set"
  );
  assert(aldur);
  assert.equal(native.catalogBonuses(aldur.catalogId, "set", 0).bonuses.ias, 30);
  assert(catalogPropertyLines(native, aldur, 0).includes("Adds 40–62 Damage"));
  assert.equal(
    stash.bases.get("9fc").image,
    "images/planner/items/weapon/sword/falchion.webp"
  );
  const aliBaba = stash.items.find((item) => item.name === "Blade of Ali Baba");
  assert(aliBaba);
  assert(
    catalogPropertyLines(native, aliBaba, 1, 90).some((line) =>
      line.startsWith("90% Better Chance")
    )
  );
  assert.equal(
    plannerItemImage(
      { baseCode: "9fc", quality: "unique", catalogId: aliBaba.catalogId },
      "exceptional"
    ),
    stash.bases.get("9fc").image
  );
  assert.equal(
    plannerItemImage({
      baseCode: "9fc",
      quality: "unique",
      catalogId: aliBaba.catalogId,
    }),
    stash.bases.get("9fc").image,
    "Existing items resolve their tier before the editor catalog loads"
  );
  assert.equal(
    plannerItemImage(
      { baseCode: "9mt", quality: "set", catalogId: aldur.catalogId },
      "exceptional"
    ),
    "images/planner/items/weapon/mace/bloodrise.webp"
  );
  assert.equal(
    baseItemImage("9mt"),
    "images/planner/items/weapon/mace/morning_star.webp"
  );
  assert.notEqual(
    plannerItemImage({ baseCode: "hax", quality: "normal" }),
    plannerItemImage({ baseCode: "9mt", quality: "normal" })
  );
  assert.equal(plannerItemImage({ baseCode: "missing", quality: "normal" }), undefined);
  assert.deepEqual(plannerItemDimensions({ baseCode: "9fc", quality: "normal" }), [1, 3]);
  assert.equal(
    plannerItemImage({ name: "Aldur’s Rhythm", quality: "set" }),
    "images/planner/items/weapon/mace/bloodrise.webp",
    "Legacy items resolve their artwork without changing saved data"
  );
  assert(plannerItemImage({ name: "Arcanna's Head", quality: "set" }));
  assert.deepEqual(
    plannerItemDimensions({ name: "Aldur's Deception", quality: "set" }),
    [2, 3]
  );
  assert.equal(
    plannerItemImage({ name: "Arcanna's Head", quality: "rare" }),
    undefined,
    "Custom names do not fabricate a base"
  );
  for (const [code, size] of [
    ["cm1", "small"],
    ["cm2", "medium"],
    ["cm3", "large"],
  ])
    assert.equal(
      baseItemImage(code),
      `images/planner/items/misc/charm/charm_${size}.webp`,
      "Charm appearance comes from item-type variants, not placeholder weapons"
    );
  for (const code of stash.bases.keys()) {
    assert(Object.hasOwn(art.bases, code), `Artwork lookup covers ${code}`);
    const source = data.weapons[code] || data.armor[code] || data.misc[code];
    if (source.spawnable !== 0)
      assert(art.bases[code], `Spawnable base ${code} has artwork`);
  }
  assert.equal(
    baseItemImage("cs2"),
    undefined,
    "Disabled crafted sunder placeholder must not display a staff"
  );
  const charms = createItemCatalog(
    native,
    build,
    { key: "test", owner: "charm", height: 1 },
    []
  );
  assert.deepEqual([...charms.availableBases].sort(), ["cm1", "cm2", "cm3"]);
  const crafted = {
    name: "Custom craft",
    quality: "crafted",
    requiredLevel: 1,
    notes: "",
    bonuses: { fcr: 10 },
    baseCode: "lbl",
    itemLevel: 87,
    sockets: 0,
    ethereal: false,
  };
  assert.deepEqual(parsePlannerItem(crafted), crafted);
  for (const invalid of [
    { baseCode: "invalid" },
    { catalogId: "set999x" },
    { sockets: 7 },
    { itemLevel: 100 },
    { ethereal: "yes" },
  ])
    assert.throws(() => parsePlannerItem({ ...crafted, ...invalid }));
  assert.equal(
    native.defaultChoice(
      { key: "hero.belt", owner: "hero", slot: "belt", item: crafted },
      build
    ),
    "lbl"
  );
  console.log(
    `Item browser: slot/class filters, 3 charm sizes, ${checked} unique/set property rolls, crafted metadata and legacy-compatible parsing passed.`
  );
} finally {
  await server.close();
}
