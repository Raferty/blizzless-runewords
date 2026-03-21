import type { LocalizedName } from "./runeword";

/**
 * Узел иерархии предметов D2/D2R (см. `docs/diablo-2-resurrected-item-types.md`).
 * Верхний уровень — категории из §1; листья с `itemTypeId` — числовые id типов (1–24, см. док.).
 */
export interface ItemTypeTaxonomyNode {
  /** Стабильный ключ для кода и i18n */
  key: string;
  name: LocalizedName;
  /**
   * Ссылка на тот же числовой id, что в данных рунвордов и константах `ITEM_TYPE_*`.
   */
  itemTypeId?: number;
  /** Агрегаты 4 / 6 / 12 для условий рунвордов */
  isAggregate?: boolean;
  /** Контент Blizzless / RotW, не ванильный D2R */
  extension?: "rotw";
  /** Дочерние узлы; отсутствует у «внешних» категорий без поддерева в коде */
  children?: ItemTypeTaxonomyNode[];
}

/**
 * Явные зависимости между агрегатами и подмножествами (док. §4–5).
 */
export interface ItemTypeTaxonomyRelations {
  weaponAggregates: {
    /** «Любое оружие» — широкий класс для рунвордов (обычно 12) */
    allWeapons: { itemTypeId: number };
    /** Подмножества: ближний / дальний бой (обычно 4 / 6) */
    melee: { itemTypeId: number };
    missile: { itemTypeId: number };
    /**
     * Логика: при проверке базы `12` покрывает любое оружие;
     * `4` и `6` — взаимодополняющие агрегаты ближнего и дальнего боя для рунвордов.
     */
    note: LocalizedName;
  };
}
