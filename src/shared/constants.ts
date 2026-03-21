import type { Lang } from "../types/lang";
import type {
  ItemTypeTaxonomyNode,
  ItemTypeTaxonomyRelations,
} from "../types/item-taxonomy";

export const RUNES = [
  {
    id: 1,
    name: {
      ru: "Эл",
      en: "El",
    },
    image_url: "/images/el.webp",
    properties: {
      ru: {
        weapon: ["+50 to Attack Rating", "+1 to Light Radius"],
        armor: ["+1 to Light Radius", "+15 Defense"],
        helm: ["+1 to Light Radius", "+15 Defense"],
        shield: ["+1 to Light Radius", "+15 Defense"],
      },
      en: {
        weapon: ["+50 to Attack Rating", "+1 to Light Radius"],
        armor: ["+1 to Light Radius", "+15 Defense"],
        helm: ["+1 to Light Radius", "+15 Defense"],
        shield: ["+1 to Light Radius", "+15 Defense"],
      },
    },
  },
  {
    id: 2,
    name: {
      ru: "Элд",
      en: "Eld",
    },
    image_url: "/images/eld.webp",
    properties: {
      ru: {
        weapon: ["+75% Damage to Undead", "+50 to Attack Rating against Undead"],
        armor: ["Lowers Stamina drain by 15%"],
        helm: ["Lowers Stamina drain by 15%"],
        shield: ["+7% Blocking"],
      },
      en: {
        weapon: ["+75% Damage to Undead", "+50 to Attack Rating against Undead"],
        armor: ["Lowers Stamina drain by 15%"],
        helm: ["Lowers Stamina drain by 15%"],
        shield: ["+7% Blocking"],
      },
    },
  },
  {
    id: 3,
    name: {
      ru: "Тир",
      en: "Tir",
    },
    image_url: "/images/tir.webp",
    properties: {
      ru: {
        weapon: ["+2 to Mana After Each Kill"],
        armor: ["+2 to Mana After Each Kill"],
        helm: ["+2 to Mana After Each Kill"],
        shield: ["+2 to Mana After Each Kill"],
      },
      en: {
        weapon: ["+2 to Mana After Each Kill"],
        armor: ["+2 to Mana After Each Kill"],
        helm: ["+2 to Mana After Each Kill"],
        shield: ["+2 to Mana After Each Kill"],
      },
    },
  },
  {
    id: 4,
    name: {
      ru: "Неф",
      en: "Nef",
    },
    image_url: "/images/nef.webp",
    properties: {
      ru: {
        weapon: ["Knockback"],
        armor: ["+30 Defense vs. Missile"],
        helm: ["+30 Defense vs. Missile"],
        shield: ["+30 Defense vs. Missile"],
      },
      en: {
        weapon: ["Knockback"],
        armor: ["+30 Defense vs. Missile"],
        helm: ["+30 Defense vs. Missile"],
        shield: ["+30 Defense vs. Missile"],
      },
    },
  },
  {
    id: 5,
    name: {
      ru: "Эт",
      en: "Eth",
    },
    image_url: "/images/eth.webp",
    properties: {
      ru: {
        weapon: ["-25% Target Defense"],
        armor: ["Regenerate Mana 15%"],
        helm: ["Regenerate Mana 15%"],
        shield: ["Regenerate Mana 15%"],
      },
      en: {
        weapon: ["-25% Target Defense"],
        armor: ["Regenerate Mana 15%"],
        helm: ["Regenerate Mana 15%"],
        shield: ["Regenerate Mana 15%"],
      },
    },
  },
  {
    id: 6,
    name: {
      ru: "Ит",
      en: "Ith",
    },
    image_url: "/images/ith.webp",
    properties: {
      ru: {
        weapon: ["+9 to Maximum Damage"],
        armor: ["15% Damage Taken Goes to Mana"],
        helm: ["15% Damage Taken Goes to Mana"],
        shield: ["15% Damage Taken Goes to Mana"],
      },
      en: {
        weapon: ["+9 to Maximum Damage"],
        armor: ["15% Damage Taken Goes to Mana"],
        helm: ["15% Damage Taken Goes to Mana"],
        shield: ["15% Damage Taken Goes to Mana"],
      },
    },
  },
  {
    id: 7,
    name: {
      ru: "Тал",
      en: "Tal",
    },
    image_url: "/images/tal.webp",
    properties: {
      ru: {
        weapon: ["+75 Poison damage over 5 seconds"],
        armor: ["Poison Resist +30%"],
        helm: ["Poison Resist +30%"],
        shield: ["Poison Resist +35%"],
      },
      en: {
        weapon: ["+75 Poison damage over 5 seconds"],
        armor: ["Poison Resist +30%"],
        helm: ["Poison Resist +30%"],
        shield: ["Poison Resist +35%"],
      },
    },
  },
  {
    id: 8,
    name: {
      ru: "Рал",
      en: "Ral",
    },
    image_url: "/images/ral.webp",
    properties: {
      ru: {
        weapon: ["Adds 5-30 Fire Damage"],
        armor: ["Fire Resist +30%"],
        helm: ["Fire Resist +30%"],
        shield: ["Fire Resist +35%"],
      },
      en: {
        weapon: ["Adds 5-30 Fire Damage"],
        armor: ["Fire Resist +30%"],
        helm: ["Fire Resist +30%"],
        shield: ["Fire Resist +35%"],
      },
    },
  },
  {
    id: 9,
    name: {
      ru: "Орт",
      en: "Ort",
    },
    image_url: "/images/ort.webp",
    properties: {
      ru: {
        weapon: ["Adds 1-50 Lightning Damage"],
        armor: ["Lightning Resist +30%"],
        helm: ["Lightning Resist +30%"],
        shield: ["Lightning Resist +35%"],
      },
      en: {
        weapon: ["Adds 1-50 Lightning Damage"],
        armor: ["Lightning Resist +30%"],
        helm: ["Lightning Resist +30%"],
        shield: ["Lightning Resist +35%"],
      },
    },
  },
  {
    id: 10,
    name: {
      ru: "Тул",
      en: "Thul",
    },
    image_url: "/images/thul.webp",
    properties: {
      ru: {
        weapon: ["Adds 3-14 Cold Damage"],
        armor: ["Cold Resist +30%"],
        helm: ["Cold Resist +30%"],
        shield: ["Cold Resist +35%"],
      },
      en: {
        weapon: ["Adds 3-14 Cold Damage"],
        armor: ["Cold Resist +30%"],
        helm: ["Cold Resist +30%"],
        shield: ["Cold Resist +35%"],
      },
    },
  },
  {
    id: 11,
    name: {
      ru: "Амн",
      en: "Amn",
    },
    image_url: "/images/amn.webp",
    properties: {
      ru: {
        weapon: ["7% Life Stolen Per Hit"],
        armor: ["Attacker takes damage of 14"],
        helm: ["Attacker takes damage of 14"],
        shield: ["Attacker takes damage of 14"],
      },
      en: {
        weapon: ["7% Life Stolen Per Hit"],
        armor: ["Attacker takes damage of 14"],
        helm: ["Attacker takes damage of 14"],
        shield: ["Attacker takes damage of 14"],
      },
    },
  },
  {
    id: 12,
    name: {
      ru: "Сол",
      en: "Sol",
    },
    image_url: "/images/sol.webp",
    properties: {
      ru: {
        weapon: ["+9 to Minimum Damage"],
        armor: ["Damage Reduced by 7"],
        helm: ["Damage Reduced by 7"],
        shield: ["Damage Reduced by 7"],
      },
      en: {
        weapon: ["+9 to Minimum Damage"],
        armor: ["Damage Reduced by 7"],
        helm: ["Damage Reduced by 7"],
        shield: ["Damage Reduced by 7"],
      },
    },
  },
  {
    id: 13,
    name: {
      ru: "Шаэл",
      en: "Shael",
    },
    image_url: "/images/shael.webp",
    properties: {
      ru: {
        weapon: ["+20% Increased Attack Speed"],
        armor: ["+20% Faster Hit Recovery"],
        helm: ["+20% Faster Hit Recovery"],
        shield: ["20% Increased Chance of Blocking"],
      },
      en: {
        weapon: ["+20% Increased Attack Speed"],
        armor: ["+20% Faster Hit Recovery"],
        helm: ["+20% Faster Hit Recovery"],
        shield: ["20% Increased Chance of Blocking"],
      },
    },
  },
  {
    id: 14,
    name: {
      ru: "Дол",
      en: "Dol",
    },
    image_url: "/images/dol.webp",
    properties: {
      ru: {
        weapon: ["Hit Causes Monster to Flee 25%"],
        armor: ["Replenish Life +7"],
        helm: ["Replenish Life +7"],
        shield: ["Replenish Life +7"],
      },
      en: {
        weapon: ["Hit Causes Monster to Flee 25%"],
        armor: ["Replenish Life +7"],
        helm: ["Replenish Life +7"],
        shield: ["Replenish Life +7"],
      },
    },
  },
  {
    id: 15,
    name: {
      ru: "Хел",
      en: "Hel",
    },
    image_url: "/images/hel.webp",
    properties: {
      ru: {
        weapon: ["Requirements -20%"],
        armor: ["Requirements -15%"],
        helm: ["Requirements -15%"],
        shield: ["Requirements -15%"],
      },
      en: {
        weapon: ["Hit Causes Monster to Flee 25%"],
        armor: ["Replenish Life +7"],
        helm: ["Replenish Life +7"],
        shield: ["Replenish Life +7"],
      },
    },
  },
  {
    id: 16,
    name: {
      ru: "Ио",
      en: "Io",
    },
    image_url: "/images/io.webp",
    properties: {
      ru: {
        weapon: ["+10 to Vitality"],
        armor: ["+10 to Vitality"],
        helm: ["+10 to Vitality"],
        shield: ["+10 to Vitality"],
      },
      en: {
        weapon: ["+10 to Vitality"],
        armor: ["+10 to Vitality"],
        helm: ["+10 to Vitality"],
        shield: ["+10 to Vitality"],
      },
    },
  },
  {
    id: 17,
    name: {
      ru: "Лум",
      en: "Lum",
    },
    image_url: "/images/lum.webp",
    properties: {
      ru: {
        weapon: ["+10 to Energy"],
        armor: ["+10 to Energy"],
        helm: ["+10 to Energy"],
        shield: ["+10 to Energy"],
      },
      en: {
        weapon: ["+10 to Energy"],
        armor: ["+10 to Energy"],
        helm: ["+10 to Energy"],
        shield: ["+10 to Energy"],
      },
    },
  },
  {
    id: 18,
    name: {
      ru: "Ко",
      en: "Ko",
    },
    image_url: "/images/ko.webp",
    properties: {
      ru: {
        weapon: ["+10 to Dexterity"],
        armor: ["+10 to Dexterity"],
        helm: ["+10 to Dexterity"],
        shield: ["+10 to Dexterity"],
      },
      en: {
        weapon: ["+10 to Dexterity"],
        armor: ["+10 to Dexterity"],
        helm: ["+10 to Dexterity"],
        shield: ["+10 to Dexterity"],
      },
    },
  },
  {
    id: 19,
    name: {
      ru: "Фал",
      en: "Fal",
    },
    image_url: "/images/fal.webp",
    properties: {
      ru: {
        weapon: ["+10 to Strength"],
        armor: ["+10 to Strength"],
        helm: ["+10 to Strength"],
        shield: ["+10 to Strength"],
      },
      en: {
        weapon: ["+10 to Strength"],
        armor: ["+10 to Strength"],
        helm: ["+10 to Strength"],
        shield: ["+10 to Strength"],
      },
    },
  },
  {
    id: 20,
    name: {
      ru: "Лем",
      en: "Lem",
    },
    image_url: "/images/lem.webp",
    properties: {
      ru: {
        weapon: ["75% Extra Gold from Monsters"],
        armor: ["50% Extra Gold from Monsters"],
        helm: ["50% Extra Gold from Monsters"],
        shield: ["50% Extra Gold from Monsters"],
      },
      en: {
        weapon: ["75% Extra Gold from Monsters"],
        armor: ["50% Extra Gold from Monsters"],
        helm: ["50% Extra Gold from Monsters"],
        shield: ["50% Extra Gold from Monsters"],
      },
    },
  },
  {
    id: 21,
    name: {
      ru: "Пул",
      en: "Pul",
    },
    image_url: "/images/pul.webp",
    properties: {
      ru: {
        weapon: ["+75% Damage to Demons", "+100 to Attack Rating against Demons"],
        armor: ["+30% Enhanced Defense"],
        helm: ["+30% Enhanced Defense"],
        shield: ["+30% Enhanced Defense"],
      },
      en: {
        weapon: ["+75% Damage to Demons", "+100 to Attack Rating against Demons"],
        armor: ["+30% Enhanced Defense"],
        helm: ["+30% Enhanced Defense"],
        shield: ["+30% Enhanced Defense"],
      },
    },
  },
  {
    id: 22,
    name: {
      ru: "Ум",
      en: "Um",
    },
    image_url: "/images/um.webp",
    properties: {
      ru: {
        weapon: ["25% Chance of Open Wounds"],
        armor: ["All Resistances +15"],
        helm: ["All Resistances +15"],
        shield: ["All Resistances +22"],
      },
      en: {
        weapon: ["25% Chance of Open Wounds"],
        armor: ["All Resistances +15"],
        helm: ["All Resistances +15"],
        shield: ["All Resistances +22"],
      },
    },
  },
  {
    id: 23,
    name: {
      ru: "Мал",
      en: "Mal",
    },
    image_url: "/images/mal.webp",
    properties: {
      ru: {
        weapon: ["Prevent Monster Heal"],
        armor: ["Magic Damage Reduced by 7"],
        helm: ["Magic Damage Reduced by 7"],
        shield: ["Magic Damage Reduced by 7"],
      },
      en: {
        weapon: ["Prevent Monster Heal"],
        armor: ["Magic Damage Reduced by 7"],
        helm: ["Magic Damage Reduced by 7"],
        shield: ["Magic Damage Reduced by 7"],
      },
    },
  },
  {
    id: 24,
    name: {
      ru: "Ист",
      en: "Ist",
    },
    image_url: "/images/ist.webp",
    properties: {
      ru: {
        weapon: ["30% Better Chance of Getting Magic Items"],
        armor: ["25% Better Chance of Getting Magic Items"],
        helm: ["25% Better Chance of Getting Magic Items"],
        shield: ["25% Better Chance of Getting Magic Items"],
      },
      en: {
        weapon: ["30% Better Chance of Getting Magic Items"],
        armor: ["25% Better Chance of Getting Magic Items"],
        helm: ["25% Better Chance of Getting Magic Items"],
        shield: ["25% Better Chance of Getting Magic Items"],
      },
    },
  },
  {
    id: 25,
    name: {
      ru: "Гул",
      en: "Gul",
    },
    image_url: "/images/gul.webp",
  },
  {
    id: 26,
    name: {
      ru: "Векс",
      en: "Vex",
    },
    image_url: "/images/vex.webp",
  },
  {
    id: 27,
    name: {
      ru: "Ом",
      en: "Ohm",
    },
    image_url: "/images/ohm.webp",
  },
  {
    id: 28,
    name: {
      ru: "Ло",
      en: "Lo",
    },
    image_url: "/images/lo.webp",
  },
  {
    id: 29,
    name: {
      ru: "Сур",
      en: "Sur",
    },
    image_url: "/images/sur.webp",
  },
  {
    id: 30,
    name: {
      ru: "Бер",
      en: "Ber",
    },
    image_url: "/images/ber.webp",
  },
  {
    id: 31,
    name: {
      ru: "Джа",
      en: "Jah",
    },
    image_url: "/images/jah.webp",
  },
  {
    id: 32,
    name: {
      ru: "Чам",
      en: "Cham",
    },
    image_url: "/images/cham.webp",
  },
  {
    id: 33,
    name: {
      ru: "Зод",
      en: "Zod",
    },
    image_url: "/images/zod.webp",
  },
];

/**
 * Иерархия типов предметов по `docs/diablo-2-resurrected-item-types.md`:
 * верхний уровень (§1) → вложенность (оружие §2, доспехи §3) → листья с числовым `itemTypeId` (1–24).
 */
export const ITEM_TYPES: ItemTypeTaxonomyNode[] = [
  {
    key: "equipment",
    name: { ru: "Экипировка", en: "Equipment" },
    children: [
      {
        key: "weapons",
        name: { ru: "Оружие", en: "Weapons" },
        children: [
          {
            key: "weapon_aggregates",
            name: {
              ru: "Агрегаты для рунвордов",
              en: "Runeword weapon aggregates",
            },
            children: [
              {
                key: "weapons_all",
                name: { ru: "Оружие", en: "Weapons" },
                itemTypeId: 12,
                isAggregate: true,
              },
              {
                key: "melee_weapons",
                name: {
                  ru: "Оружие ближнего боя",
                  en: "Melee Weapons",
                },
                itemTypeId: 4,
                isAggregate: true,
              },
              {
                key: "missile_weapons",
                name: {
                  ru: "Оружие дальнего боя",
                  en: "Missile Weapons",
                },
                itemTypeId: 6,
                isAggregate: true,
              },
            ],
          },
          {
            key: "weapon_subtypes",
            name: {
              ru: "Классы оружия (подтипы баз)",
              en: "Weapon base classes (subtypes)",
            },
            children: [
              { key: "axes", name: { ru: "Топоры", en: "Axes" }, itemTypeId: 1 },
              { key: "maces", name: { ru: "Булавы", en: "Maces" }, itemTypeId: 2 },
              { key: "swords", name: { ru: "Мечи", en: "Swords" }, itemTypeId: 3 },
              { key: "staves", name: { ru: "Посохи", en: "Staves" }, itemTypeId: 5 },
              {
                key: "scepters",
                name: { ru: "Скипетры", en: "Scepters" },
                itemTypeId: 7,
              },
              { key: "claws", name: { ru: "Когти", en: "Claws" }, itemTypeId: 8 },
              {
                key: "polearms",
                name: { ru: "Древковое оружие", en: "Polearms" },
                itemTypeId: 9,
              },
              { key: "clubs", name: { ru: "Дубины", en: "Clubs" }, itemTypeId: 10 },
              { key: "hammers", name: { ru: "Молоты", en: "Hammers" }, itemTypeId: 11 },
              { key: "spears", name: { ru: "Копья", en: "Spears" }, itemTypeId: 13 },
              { key: "wands", name: { ru: "Жезлы", en: "Wands" }, itemTypeId: 14 },
              { key: "daggers", name: { ru: "Кинжалы", en: "Daggers" }, itemTypeId: 15 },
            ],
          },
          {
            key: "class_specific_weapons",
            name: {
              ru: "Классовое оружие",
              en: "Class-specific weapons",
            },
            children: [
              {
                key: "katars",
                name: { ru: "Катары", en: "Katars" },
                itemTypeId: 19,
              },
              {
                key: "sorceress_orbs",
                name: {
                  ru: "Сферы волшебницы",
                  en: "Sorceress Orbs",
                },
                itemTypeId: 22,
              },
            ],
          },
        ],
      },
      {
        key: "shields",
        name: { ru: "Щиты", en: "Shields" },
        children: [
          {
            key: "shields_common",
            name: { ru: "Щиты", en: "Shields" },
            itemTypeId: 16,
          },
          {
            key: "paladin_shields",
            name: {
              ru: "Щиты паладина",
              en: "Paladin Shields",
            },
            itemTypeId: 20,
          },
        ],
      },
      {
        key: "armor",
        name: { ru: "Доспехи", en: "Armor" },
        children: [
          {
            key: "body_armors",
            name: {
              ru: "Нагрудная броня",
              en: "Body Armors",
            },
            itemTypeId: 17,
          },
          {
            key: "helms",
            name: { ru: "Шлемы", en: "Helms" },
            itemTypeId: 18,
          },
          {
            key: "gloves_boots_belts",
            name: {
              ru: "Перчатки, пояса, обувь (нет отдельного itemTypeId в данных)",
              en: "Gloves, Belts, Boots (no itemTypeId in app data)",
            },
          },
        ],
      },
      {
        key: "class_head_armor",
        name: {
          ru: "Классовая броня головы",
          en: "Class-specific head armor",
        },
        children: [
          {
            key: "necro_shrunken_heads",
            name: {
              ru: "Головы вуду (усыхшие головы)",
              en: "Voodoo Heads (Shrunken Heads)",
            },
            itemTypeId: 21,
          },
          {
            key: "druid_pelts",
            name: {
              ru: "Маски друида",
              en: "Druid Pelts",
            },
            itemTypeId: 23,
          },
        ],
      },
      {
        key: "rotw_extensions",
        name: {
          ru: "Расширения Blizzless / RotW",
          en: "Blizzless / RotW extensions",
        },
        children: [
          {
            key: "grimoires",
            name: { ru: "Гримуары", en: "Grimoires" },
            itemTypeId: 24,
            extension: "rotw",
          },
        ],
      },
    ],
  },
  {
    key: "jewelry",
    name: { ru: "Бижутерия", en: "Jewelry" },
    children: [
      {
        key: "rings",
        name: { ru: "Кольца", en: "Rings" },
      },
      {
        key: "amulets",
        name: { ru: "Амулеты", en: "Amulets" },
      },
    ],
  },
  {
    key: "charms",
    name: { ru: "Чармы", en: "Charms" },
    children: [
      {
        key: "grand_charms",
        name: { ru: "Большие чармы", en: "Grand Charms" },
      },
      {
        key: "large_charms",
        name: { ru: "Средние чармы", en: "Large Charms" },
      },
      {
        key: "small_charms",
        name: { ru: "Малые чармы", en: "Small Charms" },
      },
    ],
  },
  {
    key: "consumables",
    name: { ru: "Расходники", en: "Consumables" },
    children: [
      { key: "potions", name: { ru: "Зелья", en: "Potions" } },
      { key: "scrolls", name: { ru: "Свитки", en: "Scrolls" } },
      { key: "keys", name: { ru: "Ключи", en: "Keys" } },
      {
        key: "ammo",
        name: { ru: "Стрелы и болты", en: "Arrows and Bolts" },
      },
      { key: "gold", name: { ru: "Золото", en: "Gold" } },
    ],
  },
  {
    key: "cube_and_recipes",
    name: {
      ru: "Куб и рецепты",
      en: "Horadric Cube & recipes",
    },
    children: [
      { key: "horadric_cube", name: { ru: "Куб Хорадрима", en: "Horadric Cube" } },
      { key: "gems", name: { ru: "Гемы", en: "Gems" } },
      { key: "runes", name: { ru: "Руны (как материал)", en: "Runes (as items)" } },
      { key: "misc_recipes", name: { ru: "Прочее", en: "Misc." } },
    ],
  },
  {
    key: "quest",
    name: { ru: "Квестовые предметы", en: "Quest items" },
    children: [
      {
        key: "quest_uniques",
        name: {
          ru: "Уникальные предметы сюжета",
          en: "Unique quest items",
        },
      },
    ],
  },
  {
    key: "other",
    name: { ru: "Прочее", en: "Other" },
    children: [
      {
        key: "jewels",
        name: { ru: "Jewels", en: "Jewels" },
      },
      {
        key: "runes_as_loot",
        name: {
          ru: "Руны как отдельный тип лута",
          en: "Runes as loot category",
        },
      },
    ],
  },
];

/**
 * Ищет `itemTypeId` у первого узла с заданным `key` в дереве `ITEM_TYPES` (обход в глубину).
 */
export function findTaxonomyItemTypeId(
  nodes: ItemTypeTaxonomyNode[],
  key: string
): number | undefined {
  for (const node of nodes) {
    if (node.key === key && node.itemTypeId !== undefined) {
      return node.itemTypeId;
    }
    if (node.children?.length) {
      const found = findTaxonomyItemTypeId(node.children, key);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function collectTaxonomyNodesByItemTypeId(
  nodes: ItemTypeTaxonomyNode[],
  acc = new Map<number, ItemTypeTaxonomyNode>()
): Map<number, ItemTypeTaxonomyNode> {
  for (const node of nodes) {
    if (node.itemTypeId !== undefined) {
      acc.set(node.itemTypeId, node);
    }
    if (node.children?.length) {
      collectTaxonomyNodesByItemTypeId(node.children, acc);
    }
  }
  return acc;
}

/** Кэш id → узел таксономии (O(1) для UI и поиска). */
export const TAXONOMY_NODE_BY_ITEM_TYPE_ID = collectTaxonomyNodesByItemTypeId(ITEM_TYPES);

/**
 * Узел таксономии по числовому `itemTypeId` (без обхода дерева).
 */
export function findTaxonomyNodeByItemTypeId(
  itemTypeId: number
): ItemTypeTaxonomyNode | undefined {
  return TAXONOMY_NODE_BY_ITEM_TYPE_ID.get(itemTypeId);
}

/** Локализованное имя типа предмета для UI / поиска. */
export function getItemTypeDisplayName(itemTypeId: number, lang: Lang): string {
  return findTaxonomyNodeByItemTypeId(itemTypeId)?.name[lang] ?? "";
}

/**
 * Единая таблица: ключ узла в `ITEM_TYPES` → суффикс имени → fallback id (док. §4).
 */
const ITEM_TYPE_SPEC = [
  ["weapons_all", "WEAPONS", 12],
  ["melee_weapons", "MELEE_WEAPONS", 4],
  ["missile_weapons", "MISSILE_WEAPONS", 6],
  ["axes", "AXES", 1],
  ["maces", "MACES", 2],
  ["swords", "SWORDS", 3],
  ["staves", "STAVES", 5],
  ["scepters", "SCEPTERS", 7],
  ["claws", "CLAWS", 8],
  ["polearms", "POLEARMS", 9],
  ["clubs", "CLUBS", 10],
  ["hammers", "HAMMERS", 11],
  ["spears", "SPEARS", 13],
  ["wands", "WANDS", 14],
  ["daggers", "DAGGERS", 15],
  ["shields_common", "SHIELDS", 16],
  ["body_armors", "BODY_ARMORS", 17],
  ["helms", "HELMS", 18],
  ["katars", "KATARS", 19],
  ["paladin_shields", "PALADIN_SHIELDS", 20],
  ["necro_shrunken_heads", "VOODOO_HEADS", 21],
  ["sorceress_orbs", "SORCERESS_ORBS", 22],
  ["druid_pelts", "DRUID_PELTS", 23],
  ["grimoires", "GRIMOIRES", 24],
] as const;

type ItemTypeIdSuffix = (typeof ITEM_TYPE_SPEC)[number][1];

/**
 * Все числовые id типов предметов (ключи таксономии → id 1–24).
 */
export const ITEM_TYPE_ID = Object.fromEntries(
  ITEM_TYPE_SPEC.map(([taxKey, suffix, fb]) => [
    suffix,
    findTaxonomyItemTypeId(ITEM_TYPES, taxKey) ?? fb,
  ])
) as Record<ItemTypeIdSuffix, number>;

export const ITEM_TYPE_WEAPONS = ITEM_TYPE_ID.WEAPONS;
export const ITEM_TYPE_MELEE_WEAPONS = ITEM_TYPE_ID.MELEE_WEAPONS;
export const ITEM_TYPE_MISSILE_WEAPONS = ITEM_TYPE_ID.MISSILE_WEAPONS;
export const ITEM_TYPE_AXES = ITEM_TYPE_ID.AXES;
export const ITEM_TYPE_MACES = ITEM_TYPE_ID.MACES;
export const ITEM_TYPE_SWORDS = ITEM_TYPE_ID.SWORDS;
export const ITEM_TYPE_STAVES = ITEM_TYPE_ID.STAVES;
export const ITEM_TYPE_SCEPTERS = ITEM_TYPE_ID.SCEPTERS;
export const ITEM_TYPE_CLAWS = ITEM_TYPE_ID.CLAWS;
export const ITEM_TYPE_POLEARMS = ITEM_TYPE_ID.POLEARMS;
export const ITEM_TYPE_CLUBS = ITEM_TYPE_ID.CLUBS;
export const ITEM_TYPE_HAMMERS = ITEM_TYPE_ID.HAMMERS;
export const ITEM_TYPE_SPEARS = ITEM_TYPE_ID.SPEARS;
export const ITEM_TYPE_WANDS = ITEM_TYPE_ID.WANDS;
export const ITEM_TYPE_DAGGERS = ITEM_TYPE_ID.DAGGERS;
export const ITEM_TYPE_SHIELDS = ITEM_TYPE_ID.SHIELDS;
export const ITEM_TYPE_BODY_ARMORS = ITEM_TYPE_ID.BODY_ARMORS;
export const ITEM_TYPE_HELMS = ITEM_TYPE_ID.HELMS;
export const ITEM_TYPE_KATARS = ITEM_TYPE_ID.KATARS;
export const ITEM_TYPE_PALADIN_SHIELDS = ITEM_TYPE_ID.PALADIN_SHIELDS;
export const ITEM_TYPE_VOODOO_HEADS = ITEM_TYPE_ID.VOODOO_HEADS;
export const ITEM_TYPE_SORCERESS_ORBS = ITEM_TYPE_ID.SORCERESS_ORBS;
export const ITEM_TYPE_DRUID_PELTS = ITEM_TYPE_ID.DRUID_PELTS;
export const ITEM_TYPE_GRIMOIRES = ITEM_TYPE_ID.GRIMOIRES;

/**
 * Зависимости агрегатов оружия (см. док. §5).
 */
export const ITEM_TYPES_RELATIONS: ItemTypeTaxonomyRelations = {
  weaponAggregates: {
    allWeapons: { itemTypeId: ITEM_TYPE_ID.WEAPONS },
    melee: { itemTypeId: ITEM_TYPE_ID.MELEE_WEAPONS },
    missile: { itemTypeId: ITEM_TYPE_ID.MISSILE_WEAPONS },
    note: {
      ru: "В данных рунворда `Weapons` (12) — «любое оружие»; `Melee` (4) и `Missile` (6) — агрегаты ближнего и дальнего боя, не смешивать с подтипами 1–15.",
      en: "`Weapons` (12) is the broad weapon group; `Melee` (4) and `Missile` (6) are runeword aggregates—distinct from base subtypes 1–15.",
    },
  },
};
