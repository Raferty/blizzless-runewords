import assert from "node:assert/strict";

const localized = (ru, en) => ({ ru, en });
const part = (key, count = 1) => ({ key, count, notes: localized("", "") });
const armorTags = ["armor", "helm", "gloves", "boots", "belt", "shields"];
const runeNames = [
  ["El", "Эль"],
  ["Eld", "Элд"],
  ["Tir", "Тир"],
  ["Nef", "Неф"],
  ["Eth", "Эт"],
  ["Ith", "Ит"],
  ["Tal", "Тал"],
  ["Ral", "Рал"],
  ["Ort", "Орт"],
  ["Thul", "Тул"],
  ["Amn", "Амн"],
  ["Sol", "Сол"],
  ["Shael", "Шаэль"],
  ["Dol", "Дол"],
  ["Hel", "Хел"],
  ["Io", "Ио"],
  ["Lum", "Лум"],
  ["Ko", "Ко"],
  ["Fal", "Фал"],
  ["Lem", "Лем"],
  ["Pul", "Пул"],
  ["Um", "Ум"],
  ["Mal", "Мал"],
  ["Ist", "Ист"],
  ["Gul", "Гул"],
  ["Vex", "Векс"],
  ["Ohm", "Ом"],
  ["Lo", "Ло"],
  ["Sur", "Сур"],
  ["Ber", "Бер"],
  ["Jah", "Джа"],
  ["Cham", "Чам"],
  ["Zod", "Зод"],
];
const gemTypes = [
  ["amethyst", "Аметист", ["gcv", "gfv", "gsv", "gzv", "gpv"]],
  ["ruby", "Рубин", ["gcr", "gfr", "gsr", "glr", "gpr"]],
  ["sapphire", "Сапфир", ["gcb", "gfb", "gsb", "glb", "gpb"]],
  ["topaz", "Топаз", ["gcy", "gfy", "gsy", "gly", "gpy"]],
  ["emerald", "Изумруд", ["gcg", "gfg", "gsg", "glg", "gpg"]],
  ["diamond", "Алмаз", ["gcw", "gfw", "gsw", "glw", "gpw"]],
  ["skull", "Череп", ["skc", "skf", "sku", "skl", "skz"]],
];
const gemGrades = [
  ["chipped", "Треснувший", "Chipped"],
  ["flawed", "Мутный", "Flawed"],
  ["standard", "Обычный", ""],
  ["flawless", "Безупречный", "Flawless"],
  ["perfect", "Идеальный", "Perfect"],
];

/** Every formula, including bulk quantities, is checked against the mod table. */
export function augmentCubeUpgrades({ catalog, rows, check, ingredient, recipe, image }) {
  const runeKeys = new Map();
  for (const [index, [en, ru]] of runeNames.entries()) {
    const existing = catalog.ingredients.find((item) => item.name.en === `${en} Rune`);
    const key = existing?.key ?? `rune_${en.toLowerCase()}`;
    if (!existing)
      ingredient(
        key,
        `Руна ${ru}`,
        `${en} Rune`,
        ["rune"],
        `images/${en.toLowerCase()}.webp`
      );
    runeKeys.set(`r${String(index + 1).padStart(2, "0")}`, key);
  }
  const gemKeys = new Map();
  for (const [type, ru, codes] of gemTypes) {
    for (const [index, [grade, gradeRu, gradeEn]] of gemGrades.entries()) {
      const nameEn = `${gradeEn} ${type[0].toUpperCase()}${type.slice(1)}`.trim();
      const existing = catalog.ingredients.find((item) => item.name.en === nameEn);
      const key = existing?.key ?? `gem_${grade}_${type}`;
      if (!existing) {
        const art = `${grade === "standard" ? "" : grade + "_"}${type}`.replace(
          "sapphire",
          "saphire"
        );
        ingredient(
          key,
          `${gradeRu} ${ru.toLowerCase()}`,
          nameEn,
          ["gem", grade, type],
          `images/planner/items/misc/gem/${art}.webp`
        );
      }
      gemKeys.set(codes[index], key);
    }
  }
  const kinds = [
    ["armor", "броня", "Armor", armorTags, image("normal_quality_armor")],
    ["weapon", "оружие", "Weapon", ["weapon"], image("normal_quality_weapon")],
  ];
  const qualities = [
    ["unique", "uni", "Уникальная", "Уникальное", "Unique", "uniques"],
    ["rare", "rar", "Редкая", "Редкое", "Rare", "rare"],
    ["set", "set", "Комплектная", "Комплектное", "Set", "set_items"],
    ["crafted", "crf", "Ремесленная", "Ремесленное", "Crafted", "crafted"],
  ];
  const craftedItems = {
    normal_armor: "norm_craft_armor",
    exceptional_armor: "exc_craft_armor",
    elite_armor: "elite_craft_armor",
    normal_weapon: "craft_upgrade_normal",
    exceptional_weapon: "excep_craft_weapon",
    elite_weapon: "elite_craft_weapon",
  };
  const craftedRecipes = {
    normal_armor: "upgrade_craft_normal_armor",
    exceptional_armor: "upgrade_armor_except_craft",
    normal_weapon: "upgrade_craft_normal_weapon",
    exceptional_weapon: "upgrade_crafted_exceptional_weapon",
  };
  const tierNames = [
    ["normal", "Обычная", "Обычное", "Normal"],
    ["exceptional", "Исключительная", "Исключительное", "Exceptional"],
    ["elite", "Элитная", "Элитное", "Elite"],
  ];
  const keyForItem = (quality, tier, kind) =>
    quality === "crafted"
      ? craftedItems[`${tier}_${kind}`]
      : `${quality}_${tier}_${kind}`;
  for (const [
    quality,
    qualityCode,
    armorRu,
    weaponRu,
    qualityEn,
    qualityTag,
  ] of qualities) {
    for (const [kind, nounRu, nounEn, tags, art] of kinds) {
      const isArmor = kind === "armor";
      for (const [tier, tierArmorRu, tierWeaponRu, tierEn] of tierNames) {
        ingredient(
          keyForItem(quality, tier, kind),
          `${isArmor ? tierArmorRu : tierWeaponRu} ${isArmor ? armorRu.toLowerCase() : weaponRu.toLowerCase()} ${nounRu}`,
          `${tierEn} ${qualityEn} ${nounEn}`,
          tags,
          art
        );
      }
      for (const [index, [tier, , , tierEn]] of tierNames.slice(0, 2).entries()) {
        const next = tierNames[index + 1][0];
        const sourceTier = index === 0 ? "bas" : "exc";
        const output = `useitem,mod,${index === 0 ? "exc" : "eli"}`;
        const native = rows
          .map((row, id) => ({ row, id }))
          .filter(
            ({ row }) =>
              row.enabled === "1" &&
              row.output === output &&
              row["input 1"].endsWith(`,${sourceTier},${qualityCode}`) &&
              (isArmor
                ? !row["input 1"].startsWith("weap,")
                : row["input 1"] === `weap,${sourceTier},${qualityCode}`)
          );
        assert.equal(
          native.length,
          isArmor && ["rare", "crafted"].includes(quality) ? 37 : 1
        );
        const materials = native[0].row;
        const inputs = [materials["input 2"], materials["input 3"], materials["input 4"]];
        const ids = check(
          native.map(({ id }) => id),
          native.map(({ row }) => [row["input 1"], ...inputs]),
          output
        );
        const recipeKey =
          quality === "crafted"
            ? craftedRecipes[`${tier}_${kind}`]
            : `upgrade_${quality}_${tier}_${kind}`;
        const preservedRu =
          "Улучшает основу предмета; свойства, эфирность и содержимое сокетов сохраняются. Требования к уровню, силе и ловкости могут вырасти. Элитную основу улучшить дальше нельзя.";
        const preservedEn =
          "Upgrades the item base; properties, ethereal status and socket contents are preserved. Level, strength and dexterity requirements may increase. Elite bases cannot be upgraded further.";
        const armorRuNote = isArmor
          ? "Подходит для пояса, шлема, перчаток, обуви, щита и нательной брони. "
          : "";
        const armorEnNote = isArmor
          ? "Works with belts, helms, gloves, boots, shields and body armor. "
          : "";
        const hasBonuses = native.some(({ row }) => row["mod 1"]);
        recipe(
          recipeKey,
          `Улучшение ${isArmor ? { unique: "уникальной", rare: "редкой", set: "комплектной", crafted: "ремесленной" }[quality] + " брони" : { unique: "уникального", rare: "редкого", set: "комплектного", crafted: "ремесленного" }[quality] + " оружия"}: ${tierNames[index][1].toLowerCase()} → ${tierNames[index + 1][1].toLowerCase()} основа`,
          `Upgrade ${qualityEn} ${tierEn} ${nounEn}`,
          ["upgrade_u", qualityTag, ...tags],
          [
            part(keyForItem(quality, tier, kind)),
            ...inputs.map((code) => part(runeKeys.get(code) ?? gemKeys.get(code))),
          ],
          [part(keyForItem(quality, next, kind))],
          armorRuNote +
            preservedRu +
            (hasBonuses
              ? " Дополнительное снижение физического урона у нательной брони и щитов зависит от основы."
              : ""),
          armorEnNote +
            preservedEn +
            (hasBonuses
              ? " Additional physical damage reduction on body armor and shields depends on the base."
              : ""),
          ids,
          quality === "crafted"
        );
      }
    }
  }
  for (const [kind, rune, id] of [
    ["weapon", "r02", 167],
    ["armor", "r01", 168],
  ]) {
    const entry = catalog.recipes.find((item) => item.key === `fix_quality_${kind}`);
    assert(entry);
    entry.ingredients = [
      part(`low_quality_${kind}`),
      part(runeKeys.get(rune)),
      part("any_chipped_gem"),
    ];
    entry.tags = ["upgrade_u", "base", ...(kind === "armor" ? armorTags : ["weapon"])];
    entry.notes = localized(
      "Восстанавливает обычное качество без повышения ступени основы.",
      "Restores normal quality without upgrading the base tier."
    );
    check(
      [id],
      [`${kind === "armor" ? "armo" : "weap"},low`, rune, "gem0"],
      "usetype,nor"
    );
  }
  const runeGems = [
    "gcy",
    "gcv",
    "gcb",
    "gcr",
    "gcg",
    "gcw",
    "gfy",
    "gfv",
    "gfb",
    "gfr",
    "gfg",
    "gfw",
    "gsy",
    "gsv",
    "gsb",
    "gsr",
    "gsg",
    "gsw",
    "gly",
    "gzv",
    "glb",
    "glr",
    "glg",
  ];
  function materialUpgrade(
    key,
    input,
    output,
    inputKey,
    outputKey,
    count,
    nameRu,
    nameEn,
    tag,
    changed = false,
    originalGem = null
  ) {
    const native = rows
      .map((row, id) => ({ row, id }))
      .filter(
        ({ row }) =>
          row.enabled === "1" &&
          row.output === output &&
          row["input 1"].startsWith(`${input},qty=`) &&
          !row["input 2"]
      );
    const ids = [];
    for (const multiplier of [1, 2, 3]) {
      const match = native.find(
        ({ row }) => row["input 1"] === `${input},qty=${count * multiplier}`
      );
      assert(match, `Missing bulk upgrade: ${key} ×${multiplier}`);
      ids.push(
        ...check([match.id], [`${input},qty=${count * multiplier}`], output, {
          "output b": multiplier >= 2 ? output : "",
          "output c": multiplier === 3 ? output : "",
        })
      );
    }
    const entry = recipe(
      key,
      nameRu,
      nameEn,
      ["upgrade_u", tag],
      [part(inputKey, count)],
      [part(outputKey)],
      `${changed ? "В Blizzless самоцветы для повышения рун не нужны. " : ""}Пакетные варианты: ${count * 2} → 2; ${count * 3} → 3.`,
      `${changed ? "Blizzless rune upgrades do not require gems. " : ""}Bulk variants: ${count * 2} → 2; ${count * 3} → 3.`,
      ids
    );
    if (changed) {
      entry.status = "changed";
      entry.blizzlessVersion = 1;
      entry.original = {
        ...entry,
        notes: localized("", ""),
        status: "unchanged",
        blizzlessVersion: null,
        ingredients: [part(inputKey, count), part(gemKeys.get(originalGem))],
      };
    }
  }
  for (let number = 1; number < runeNames.length; number++) {
    const input = `r${String(number).padStart(2, "0")}`;
    const output = `r${String(number + 1).padStart(2, "0")}`;
    materialUpgrade(
      `upgrade_rune_${runeNames[number - 1][0].toLowerCase()}`,
      input,
      output,
      runeKeys.get(input),
      runeKeys.get(output),
      number <= 20 ? 3 : 2,
      `Повышение руны: ${runeNames[number - 1][0]} → ${runeNames[number][0]}`,
      `Upgrade Rune: ${runeNames[number - 1][0]} → ${runeNames[number][0]}`,
      "runes",
      number >= 10,
      runeGems[number - 10]
    );
  }
  for (const [type, , codes] of gemTypes) {
    for (let grade = 0; grade < 4; grade++) {
      const result = catalog.ingredients.find(
        (item) => item.key === gemKeys.get(codes[grade + 1])
      );
      materialUpgrade(
        `upgrade_gem_${type}_${gemGrades[grade][0]}`,
        codes[grade],
        codes[grade + 1],
        gemKeys.get(codes[grade]),
        result.key,
        3,
        `Улучшение самоцвета: ${result.name.ru}`,
        `Upgrade Gem: ${result.name.en}`,
        "gems"
      );
    }
  }
  for (const [key, ru, en] of [
    ["rare", "Редкие", "Rare"],
    ["runes", "Руны", "Runes"],
    ["gems", "Самоцветы", "Gems"],
  ])
    if (!catalog.recipeTags.some((tag) => tag.key === key))
      catalog.recipeTags.push({ key, name: localized(ru, en) });
}
