import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const nativeCubeSha256 =
  "9c433e140eb6f93aab839502bc0da847542686cb492c2ca7bb49a79e145e1fc6";
export const nativeCubeUrl =
  "https://blizzless.info/api/launcher-mods/blobs/" + nativeCubeSha256;
const localized = (ru, en) => ({ ru, en });
const part = (key, count = 1, ru = "", en = "") => ({
  key,
  count,
  notes: localized(ru, en),
});

/** Supplement the glossary API with enabled recipes from the actual mod table. */
export async function augmentNativeCubeRecipes(catalog, sourceBytes) {
  if (!sourceBytes) {
    const response = await fetch(nativeCubeUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error(`Native cube source: HTTP ${response.status}`);
    sourceBytes = new Uint8Array(await response.arrayBuffer());
  }
  assert.equal(createHash("sha256").update(sourceBytes).digest("hex"), nativeCubeSha256);
  const lines = new TextDecoder()
    .decode(sourceBytes)
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.split("\t"));
  const header = lines.shift();
  const rows = lines.map((cells) =>
    Object.fromEntries(header.map((key, i) => [key, cells[i] || ""]))
  );
  const provenance = {};
  function check(ids, inputs, output, modifiers = {}) {
    for (let i = 0; i < ids.length; i++) {
      const row = rows[ids[i]];
      assert.equal(row.enabled, "1", `Disabled native recipe ${ids[i]}`);
      const expected = Array.isArray(inputs[0]) ? inputs[i] : inputs;
      assert.equal(
        Number(row.numinputs),
        expected.reduce(
          (sum, input) => sum + Number(input.match(/qty=(\d+)/)?.[1] || 1),
          0
        )
      );
      assert.deepEqual(
        Array.from({ length: 7 }, (_, n) => row[`input ${n + 1}`]).filter(Boolean),
        expected
      );
      assert.equal(row.output, Array.isArray(output) ? output[i] : output);
      for (const [key, value] of Object.entries(modifiers)) assert.equal(row[key], value);
    }
    return ids;
  }
  const image = (key) => {
    const graphic = catalog.ingredients.find((item) => item.key === key)?.image;
    assert(graphic, `Missing cube illustration: ${key}`);
    return graphic;
  };
  function ingredient(key, ru, en, tags, graphic) {
    const item = { key, name: localized(ru, en), tags, image: graphic };
    const old = catalog.ingredients.findIndex((item) => item.key === key);
    if (old < 0) catalog.ingredients.push(item);
    else catalog.ingredients[old] = item;
  }
  const sword = image("normal_quality_weapon"),
    armor = image("normal_quality_armor"),
    helm = image("Blue helm"),
    shield = image("blue_shield");
  for (const [key, ru, en, tag, graphic] of [
    [
      "socket_normal_weapon",
      "Обычное оружие без сокетов",
      "Normal Unsocketed Weapon",
      "weapon",
      sword,
    ],
    [
      "socket_normal_armor",
      "Обычный доспех без сокетов",
      "Normal Unsocketed Body Armor",
      "armor",
      armor,
    ],
    [
      "socket_normal_helm",
      "Обычный шлем без сокетов",
      "Normal Unsocketed Helm",
      "helm",
      helm,
    ],
    [
      "socket_normal_shield",
      "Обычный щит без сокетов",
      "Normal Unsocketed Shield",
      "shield",
      shield,
    ],
    [
      "socket_weapon_result",
      "Оружие с сокетами",
      "Socketed Normal Weapon",
      "weapon",
      sword,
    ],
    [
      "socket_armor_result",
      "Доспех с сокетами",
      "Socketed Normal Body Armor",
      "armor",
      armor,
    ],
    ["socket_helm_result", "Шлем с сокетами", "Socketed Normal Helm", "helm", helm],
    [
      "socket_shield_result",
      "Щит с сокетами",
      "Socketed Normal Shield",
      "shield",
      shield,
    ],
    ["socket_magic_weapon", "Магическое оружие", "Magic Weapon", "weapon", sword],
    [
      "socket_magic_result",
      "Магическое оружие с сокетами",
      "Socketed Magic Weapon",
      "weapon",
      sword,
    ],
    [
      "socket_rare_item",
      "Редкий предмет без сокетов",
      "Rare Unsocketed Item",
      "base",
      armor,
    ],
    [
      "socket_rare_result",
      "Редкий предмет с одним сокетом",
      "Rare Item with One Socket",
      "sockets",
      armor,
    ],
    [
      "socket_any_item",
      "Предмет с заполненными сокетами",
      "Item with Filled Sockets",
      "sockets",
      armor,
    ],
    [
      "socket_non_runeword",
      "Предмет с заполненными сокетами без рунного слова",
      "Socketed Item without a Runeword",
      "sockets",
      armor,
    ],
    [
      "socket_empty_item",
      "Предмет с пустыми сокетами",
      "Item with Empty Sockets",
      "sockets",
      armor,
    ],
  ])
    ingredient(key, ru, en, [tag], graphic);
  ingredient(
    "stone_of_jordan",
    "Камень Иордана",
    "The Stone of Jordan",
    ["ring"],
    "images/planner/items/misc/ring/stone_of_jordan.png"
  );
  ingredient(
    "socket_recovered_inserts",
    "Извлечённые руны, камни и джевелы",
    "Recovered Runes, Gems and Jewels",
    ["sockets"],
    "images/planner/items/misc/gem/perfect_diamond1.webp"
  );
  ingredient(
    "bartuc_scroll",
    "Потрёпанный свиток",
    "Tattered Scroll",
    ["regular"],
    "images/planner/items/misc/quest/tattered_scroll.png"
  );
  ingredient(
    "bartuc_bloodstone",
    "Кровавик",
    "Bloodstone",
    ["regular"],
    "images/planner/items/misc/gem/bloodstone.png"
  );
  ingredient(
    "bartuc_demon_paw",
    "Кисть демона",
    "Demon Paw",
    ["regular"],
    "images/planner/items/misc/quest/ceremonial_claws.png"
  );
  // Correct two glossary presentation errors without changing any formula.
  catalog.ingredients.find((item) => item.key === "armor_to_recharge").image =
    image("armor_to_repair");
  const standard = catalog.ingredients.find((item) => item.key === "any_standard_gem");
  standard.name = localized("Любой обычный самоцвет", "Any Standard Gem");
  standard.tags = ["gem"];
  catalog.recipes.find((recipe) => recipe.key === "Amulet of the Sensei").tags = [
    "amulet",
  ];
  const additions = [];
  function recipe(key, ru, en, tags, inputs, result, noteRu, noteEn, ids, added = false) {
    additions.push({
      key,
      name: localized(ru, en),
      notes: localized(noteRu, noteEn),
      status: added ? "added" : "unchanged",
      tags,
      officialVersion: added ? null : 1,
      blizzlessVersion: added ? 1 : null,
      ingredients: inputs,
      result,
    });
    provenance[key] = ids;
  }
  const limitRu =
    "Основа должна поддерживать сокеты. Только обычное качество без сокетов: не превосходное и не низкокачественное. Эфирные основы подходят. Бросок 1–6 ограничивается максимумом основы и ilvl; свойства сохраняются.";
  const limitEn =
    "The base must support sockets. Normal quality without sockets only: not superior or low quality. Ethereal bases are allowed. A 1–6 roll is capped by the base and item level; existing properties are preserved.";
  for (const [kind, ru, en, type, runes, gem, max, id] of [
    ["weapon", "оружие", "Weapon", "weap", ["r08", "r11"], "gpv", 6, 164],
    ["armor", "доспех", "Body Armor", "tors", ["r07", "r10"], "gpy", 4, 163],
    ["helm", "шлем", "Helm", "helm", ["r08", "r10"], "gpb", 3, 165],
    ["shield", "щит", "Shield", "shld", ["r07", "r11"], "gpr", 4, 166],
  ]) {
    const runeNames = { r07: "tal", r08: "ral", r10: "thul", r11: "amn" };
    const gems = {
      gpv: "gem_perfect_amethyst",
      gpy: "gem_perfect_topaz",
      gpb: "gem_perfect_sapphire",
      gpr: "gem_perfect_ruby",
    };
    const ids = check([id], [`${type},nor,nos`, ...runes, gem], "useitem", {
      "mod 1": "sock",
      "mod 1 min": "1",
      "mod 1 max": "6",
    });
    recipe(
      `socket_add_${kind}`,
      `Пробивка сокетов: ${ru}`,
      `Add Sockets to Normal ${en}`,
      [kind === "shield" ? "shields" : kind, "base", "sockets"],
      [
        part(`socket_normal_${kind}`),
        ...runes.map((code) => part(`rune_${runeNames[code]}`)),
        part(gems[gem]),
      ],
      [
        part(
          `socket_${kind}_result`,
          1,
          `1–${max} сокетов, в пределах лимита основы`,
          `1–${max} sockets, limited by the base`
        ),
      ],
      limitRu,
      limitEn,
      ids
    );
  }
  recipe(
    "socket_add_rare",
    "Добавить один сокет в редкий предмет",
    "Add One Socket to a Rare Item",
    ["sockets"],
    [part("socket_rare_item"), part("gems", 3), part("stone_of_jordan")],
    [part("socket_rare_result")],
    "Нужен редкий предмет без сокетов, в котором вообще допустимы сокеты. Кольца и амулеты не подходят. Свойства сохраняются, эфирность сохраняется.",
    "Requires an unsocketed rare item that can have sockets. Rings and amulets are excluded. Existing properties and ethereal status are preserved.",
    check(
      [63, 2330],
      [
        ["any,rar,nos,noe", "skz,qty=3", "The Stone of Jordan"],
        ["any,rar,nos,eth", "skz,qty=3", "The Stone of Jordan"],
      ],
      ["useitem,sock=1", "useitem,sock=1,eth"]
    )
  );
  for (const [grade, ru, en, item, gem, lvl, ids, ratio] of [
    [
      "chipped",
      "треснувшие",
      "Chipped",
      "socket_magic_weapon",
      "gem0",
      25,
      [185, 2331],
      "50",
    ],
    [
      "flawless",
      "безупречные",
      "Flawless",
      "socket_magic_weapon",
      "gem3",
      30,
      [16, 2324],
      "60",
    ],
    ["standard", "обычные", "Standard", "socketed_weapon", "gem2", 30, [15, 2323], "60"],
  ]) {
    const keys = {
      chipped: "any_chipped_gem",
      flawless: "any_flawless_gem",
      standard: "any_standard_gem",
    };
    const quality = grade === "standard" ? "sock" : "mag";
    recipe(
      `socket_reroll_${grade}`,
      `Перекрафт оружия: ${ru} самоцветы`,
      `Socketed Weapon Reroll: ${en} Gems`,
      ["weapon", "sockets", "reroll"],
      [part(item), part(keys[grade], 3)],
      [
        part(
          "socket_magic_result",
          1,
          `1–2 сокета; ilvl ${lvl}`,
          `1–2 sockets; ilvl ${lvl}`
        ),
      ],
      "Создаёт новое магическое оружие той же основы. Старые аффиксы и содержимое сокетов теряются. Эфирность сохраняется. Если основа не поддерживает сокеты, они не появятся.",
      "Creates a new magic weapon of the same base. Old affixes and socket contents are lost. Ethereal status is preserved. Bases that cannot have sockets receive none.",
      check(
        ids,
        [
          [`weap,${quality},noe`, `${gem},qty=3`],
          [`weap,${quality},eth`, `${gem},qty=3`],
        ],
        ["usetype,mag", "usetype,mag,eth"],
        {
          lvl: String(lvl),
          ilvl: ratio,
          "mod 1": "sock",
          "mod 1 min": "1",
          "mod 1 max": "2",
        }
      )
    );
  }
  recipe(
    "socket_clear_hel",
    "Очистить сокеты через Hel",
    "Clear Sockets with Hel",
    ["sockets"],
    [part("socket_any_item"), part("rune_hel"), part("misc_town_portal_scroll")],
    [part("socket_empty_item")],
    "Предмет и число сокетов сохраняются. Вставленные руны, камни и джевелы уничтожаются. Работает и с рунными словами.",
    "The item and socket count are preserved. Inserted runes, gems and jewels are destroyed. Runewords are also accepted.",
    check([179], ["any,sock", "r15", "tsc"], "useitem,uns")
  );
  recipe(
    "socket_recover_um",
    "Извлечь вставки через Um",
    "Recover Socket Inserts with Um",
    ["sockets"],
    [part("socket_non_runeword"), part("rune_um"), part("misc_town_portal_scroll")],
    [
      part("socket_empty_item"),
      part(
        "socket_recovered_inserts",
        1,
        "Все вставки из предмета",
        "All inserts from the item"
      ),
    ],
    "Рецепт Blizzless: предмет сохраняется, руны, камни и джевелы возвращаются. Рунные слова не подходят.",
    "Blizzless recipe: preserves the item and returns its runes, gems and jewels. Runewords are excluded.",
    check([2244], ["any,sock,nru", "tsc", "r22"], "useitem,rem"),
    true
  );
  recipe(
    "portal_bartuc",
    "Портал к Бартуку",
    "Portal to Bartuc",
    ["uniques", "event"],
    [part("bartuc_scroll"), part("bartuc_bloodstone"), part("bartuc_demon_paw")],
    [part("portal", 1, "Вход к Бартуку", "Entrance to Bartuc")],
    "Сложите три отдельных предмета в кубе в Харрогате на сложности Ад. Открывает вход к Бартуку.",
    "Transmute the three loose items in Harrogath on Hell difficulty. Opens the entrance to Bartuc.",
    check([2334], ["p14", "p20", "p21"], "Red Portal,lvl=142,qty=1", { op: "28" }),
    true
  );
  for (const entry of additions) {
    const i = catalog.recipes.findIndex((recipe) => recipe.key === entry.key);
    if (i < 0) catalog.recipes.push(entry);
    else catalog.recipes[i] = entry;
  }
  // These six are re-creations with socket affixes, not socket punches.
  for (const entry of catalog.recipes)
    if (
      !entry.tags.includes("sockets") &&
      entry.result.some((item) => /\bsockets?\b/i.test(item.notes.en)) &&
      !entry.tags.includes("reroll")
    )
      entry.tags.push("reroll");
  for (const [key, ru, en] of [
    ["sockets", "Сокеты", "Sockets"],
    ["reroll", "Перекрафт", "Reroll"],
  ])
    if (!catalog.recipeTags.some((tag) => tag.key === key))
      catalog.recipeTags.push({ key, name: localized(ru, en) });
  catalog.nativeRecipeSource = {
    url: nativeCubeUrl,
    sha256: nativeCubeSha256,
    manifestVersion: 1795131992295,
    checkedAt: "2026-11-20",
    rows: provenance,
  };
  return catalog;
}
