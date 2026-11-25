import assert from "node:assert/strict";

const localized = (ru, en) => ({ ru, en });
const part = (key, count = 1) => ({ key, count, notes: localized("", "") });
const armorTags = ["armor", "helm", "gloves", "boots", "belt", "shields"];
/** Item upgrades are checked against the mod table; rune/gem upgrades are excluded. */
export function augmentCubeUpgrades({ catalog, rows, check, ingredient, recipe, image }) {
  const excluded = (entry) => /^upgrade_(?:rune|gem)_/.test(entry.key);
  const removed = catalog.recipes.filter(excluded);
  catalog.recipes = catalog.recipes.filter((entry) => !excluded(entry));
  const parts = (entry) => [
    ...entry.ingredients,
    ...entry.result,
    ...(entry.original ? [...entry.original.ingredients, ...entry.original.result] : []),
  ];
  const removedIngredients = new Set(removed.flatMap(parts).map((part) => part.key));
  const retainedIngredients = new Set(
    catalog.recipes.flatMap(parts).map((part) => part.key)
  );
  catalog.ingredients = catalog.ingredients.filter(
    (entry) => !removedIngredients.has(entry.key) || retainedIngredients.has(entry.key)
  );
  catalog.recipeTags = catalog.recipeTags.filter(
    (entry) => !["runes", "gems"].includes(entry.key)
  );
  if (!catalog.ingredients.some((entry) => entry.key === "rune_el"))
    ingredient("rune_el", "Руна Эль", "El Rune", ["rune"], "images/el.webp");
  const runeKeys = new Map([
    ["r01", "rune_el"],
    ["r02", "rune_eld"],
    ["r06", "ith_rune"],
    ["r07", "rune_tal"],
    ["r08", "rune_ral"],
    ["r09", "rune_ort"],
    ["r10", "rune_thul"],
    ["r11", "rune_amn"],
    ["r12", "rune_sol"],
    ["r13", "rune_shael"],
    ["r14", "dol_rune"],
    ["r15", "rune_hel"],
    ["r16", "io_rune"],
    ["r17", "rune_lum"],
    ["r18", "rune_ko"],
    ["r19", "rune_fal"],
    ["r20", "rune_lem"],
    ["r21", "rune_pul"],
    ["r22", "rune_um"],
  ]);
  const gemKeys = new Map([
    ["gpw", "gem_perfect_diamond"],
    ["gpg", "gem_perfect_emerald"],
    ["gpb", "gem_perfect_sapphire"],
    ["gpv", "gem_perfect_amethyst"],
    ["gpr", "gem_perfect_ruby"],
    ["gpy", "gem_perfect_topaz"],
  ]);
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
  if (!catalog.recipeTags.some((tag) => tag.key === "rare"))
    catalog.recipeTags.push({ key: "rare", name: localized("Редкие", "Rare") });
}
