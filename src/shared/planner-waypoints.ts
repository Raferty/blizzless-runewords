// Bit positions follow the 39 waypoint flags in each difficulty's .d2s block.
// Act V displays Halls of Pain before Glacial Trail; their saved bits are reversed.
export const waypointActs = [
  {
    act: 1,
    waypoints: [
      { key: "rogueEncampment", bit: 0, ru: "Лагерь разбойниц", en: "Rogue Encampment" },
      { key: "coldPlains", bit: 1, ru: "Холодные равнины", en: "Cold Plains" },
      { key: "stonyField", bit: 2, ru: "Каменистое поле", en: "Stony Field" },
      { key: "darkWood", bit: 3, ru: "Тёмный лес", en: "Dark Wood" },
      { key: "blackMarsh", bit: 4, ru: "Чёрные топи", en: "Black Marsh" },
      { key: "outerCloister", bit: 5, ru: "Внешний монастырь", en: "Outer Cloister" },
      { key: "jail1", bit: 6, ru: "Тюрьма — уровень 1", en: "Jail Level 1" },
      { key: "innerCloister", bit: 7, ru: "Внутренний монастырь", en: "Inner Cloister" },
      { key: "catacombs2", bit: 8, ru: "Катакомбы — уровень 2", en: "Catacombs Level 2" },
    ],
  },
  {
    act: 2,
    waypoints: [
      { key: "lutGholein", bit: 9, ru: "Лут Голейн", en: "Lut Gholein" },
      { key: "sewers2", bit: 10, ru: "Канализация — уровень 2", en: "Sewers Level 2" },
      { key: "dryHills", bit: 11, ru: "Сухие холмы", en: "Dry Hills" },
      {
        key: "hallsOfTheDead2",
        bit: 12,
        ru: "Залы мёртвых — уровень 2",
        en: "Halls of the Dead Level 2",
      },
      { key: "farOasis", bit: 13, ru: "Дальний оазис", en: "Far Oasis" },
      { key: "lostCity", bit: 14, ru: "Затерянный город", en: "Lost City" },
      {
        key: "palaceCellar1",
        bit: 15,
        ru: "Подвалы дворца — уровень 1",
        en: "Palace Cellar Level 1",
      },
      { key: "arcaneSanctuary", bit: 16, ru: "Тайное святилище", en: "Arcane Sanctuary" },
      { key: "canyonOfTheMagi", bit: 17, ru: "Каньон магов", en: "Canyon of the Magi" },
    ],
  },
  {
    act: 3,
    waypoints: [
      { key: "kurastDocks", bit: 18, ru: "Доки Кураста", en: "Kurast Docks" },
      { key: "spiderForest", bit: 19, ru: "Паучий лес", en: "Spider Forest" },
      { key: "greatMarsh", bit: 20, ru: "Великое болото", en: "Great Marsh" },
      { key: "flayerJungle", bit: 21, ru: "Джунгли свежевателей", en: "Flayer Jungle" },
      { key: "lowerKurast", bit: 22, ru: "Нижний Кураст", en: "Lower Kurast" },
      { key: "kurastBazaar", bit: 23, ru: "Базар Кураста", en: "Kurast Bazaar" },
      { key: "upperKurast", bit: 24, ru: "Верхний Кураст", en: "Upper Kurast" },
      { key: "travincal", bit: 25, ru: "Травинкал", en: "Travincal" },
      {
        key: "duranceOfHate2",
        bit: 26,
        ru: "Узилище Ненависти — уровень 2",
        en: "Durance of Hate Level 2",
      },
    ],
  },
  {
    act: 4,
    waypoints: [
      {
        key: "pandemoniumFortress",
        bit: 27,
        ru: "Крепость Пандемония",
        en: "The Pandemonium Fortress",
      },
      {
        key: "cityOfTheDamned",
        bit: 28,
        ru: "Город проклятых",
        en: "City of the Damned",
      },
      { key: "riverOfFlame", bit: 29, ru: "Река пламени", en: "River of Flame" },
    ],
  },
  {
    act: 5,
    waypoints: [
      { key: "harrogath", bit: 30, ru: "Харрогат", en: "Harrogath" },
      { key: "frigidHighlands", bit: 31, ru: "Ледяное нагорье", en: "Frigid Highlands" },
      { key: "arreatPlateau", bit: 32, ru: "Плато Арреат", en: "Arreat Plateau" },
      {
        key: "crystallinePassage",
        bit: 33,
        ru: "Кристальный проход",
        en: "Crystalline Passage",
      },
      { key: "hallsOfPain", bit: 35, ru: "Залы боли", en: "Halls of Pain" },
      { key: "glacialTrail", bit: 34, ru: "Ледяная тропа", en: "Glacial Trail" },
      { key: "frozenTundra", bit: 36, ru: "Мёрзлая тундра", en: "Frozen Tundra" },
      { key: "ancientsWay", bit: 37, ru: "Путь Древних", en: "The Ancients’ Way" },
      {
        key: "worldstoneKeep2",
        bit: 38,
        ru: "Крепость Камня Мира — уровень 2",
        en: "Worldstone Keep Level 2",
      },
    ],
  },
] as const;

export const waypoints = waypointActs.flatMap((act) => [...act.waypoints]);
export type WaypointId = (typeof waypoints)[number]["key"];
