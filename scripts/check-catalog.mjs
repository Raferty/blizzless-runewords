import assert from "node:assert/strict";
import { createServer } from "vite";
import { createPinia, setActivePinia } from "pinia";

// Exercise the same TS modules and aliases as the app, without adding a test runtime.
const storage = new Map();
const previousStorage = globalThis.localStorage;
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
const server = await createServer({
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
});
try {
  const { splitStatSections, matchesItemType } = await server.ssrLoadModule(
    "/src/utils/runeword.ts"
  );
  const { ITEM_TYPE_ID: T } = await server.ssrLoadModule("/src/shared/constants.ts");
  const { useRunewordsStore, useInfoStore } =
    await server.ssrLoadModule("/src/store/index.ts");
  setActivePinia(createPinia());
  const words = useRunewordsStore();
  const info = useInfoStore();

  assert.equal(words.sortedRunewords.length, 104);
  assert.equal(new Set(words.sortedRunewords.map((word) => word.id)).size, 104);
  assert.equal(words.sortedRunewords.filter((word) => word.reworked).length, 51);
  assert.equal(words.sortedRunewords.filter((word) => word.marked).length, 5);
  assert.equal(words.sortedRunewords.filter((word) => word.patch === "rotw").length, 6);

  const fortitude = words.sortedRunewords.find((word) => word.name.en === "Fortitude");
  const fortitudeStats = splitStatSections(fortitude.stats.en);
  assert.deepEqual(
    fortitudeStats.map((section) => section.title),
    ["Weapons", "Body Armor"]
  );
  assert(fortitudeStats[0].lines.includes("+9 To Minimum Damage"));
  assert(!fortitudeStats[1].lines.includes("+9 To Minimum Damage"));
  assert(fortitudeStats[1].lines.includes("+15 Defense"));
  assert(!fortitudeStats[0].lines.includes("+15 Defense"));
  assert.deepEqual(
    splitStatSections([
      "Shared bonus",
      "#Weapons#",
      "Weapon bonus",
      "#Shields#",
      "Shield bonus",
    ]),
    [
      { title: "Weapons", lines: ["Shared bonus", "Weapon bonus"] },
      { title: "Shields", lines: ["Shared bonus", "Shield bonus"] },
    ]
  );
  assert.deepEqual(splitStatSections([]), [{ title: "", lines: [] }]);
  assert.deepEqual(splitStatSections(["Bonus"]), [{ title: "", lines: ["Bonus"] }]);

  assert(matchesItemType([T.WEAPONS], T.SWORDS));
  assert(matchesItemType([T.MELEE_WEAPONS], T.AXES));
  assert(matchesItemType([T.SHIELDS], T.PALADIN_SHIELDS));
  assert(!matchesItemType([T.BODY_ARMORS], T.SWORDS));
  assert(!matchesItemType([T.WEAPONS], T.HELMS));
  assert(!matchesItemType([T.SHIELDS], T.KATARS));

  words.setSelectedRunes([8, 9, 7]);
  assert.equal(
    words.filteredRunewords.length,
    104,
    "Rune selection must preserve all table rows"
  );
  assert(words.orderedRunewords[0].complete, "Complete recipes must sort first");
  assert(
    words.gridFilteredRunewords.every((word) =>
      word.runes.some((id) => [8, 9, 7].includes(id))
    )
  );
  words.resetFilters();

  words.searchDebounced = "zod";
  assert(words.filteredRunewords.length > 0);
  assert(
    words.filteredRunewords.every((word) => word.runes.includes(33)),
    "Search should include rune names"
  );
  words.resetFilters();
  words.itemTypeFilter = T.SWORDS;
  assert(words.filteredRunewords.some((word) => word.id === fortitude.id));
  assert(!words.filteredRunewords.some((word) => word.name.en === "Enigma"));
  words.resetFilters();

  words.reworkedFilter = "changed";
  assert.equal(words.filteredRunewords.length, 51);
  words.rotwFilter = true;
  assert.equal(words.filteredRunewords.length, 3, "Version filters combine");
  words.resetFilters();
  words.toggleFavorite(fortitude.id);
  words.favoritesOnly = true;
  assert.deepEqual(
    words.filteredRunewords.map((word) => word.id),
    [fortitude.id]
  );
  assert.deepEqual(JSON.parse(storage.get("blizzless-favorites")), [fortitude.id]);
  words.toggleFavorite(fortitude.id);
  assert.equal(words.filteredRunewords.length, 0);
  words.resetFilters();
  assert.equal(words.filteredRunewords.length, 104);

  info.setLang("en");
  words.sortBy = "level";
  assert(
    words.orderedRunewords.every(
      (word, index, all) => !index || word.level >= all[index - 1].level
    )
  );
  words.sortDirection = "desc";
  assert(
    words.orderedRunewords.every(
      (word, index, all) => !index || word.level <= all[index - 1].level
    )
  );
  words.setSort("sockets");
  assert.equal(words.sortDirection, "asc", "A new sort starts in ascending order");
  const ascendingSockets = words.orderedRunewords;
  assert.equal(ascendingSockets[0].runes.length, 2);
  assert.equal(ascendingSockets.at(-1).runes.length, 6);
  words.setSort("sockets");
  assert.equal(words.sortDirection, "desc", "Repeating the same sort reverses direction");
  assert.deepEqual(
    words.orderedRunewords.map((word) => word.id),
    ascendingSockets.map((word) => word.id).reverse()
  );
  console.log(
    "Catalog checks passed: 104 recipes, base-specific stats, filters, rune selection, favorites and sorting."
  );
} finally {
  await server.close();
  if (previousStorage === undefined) delete globalThis.localStorage;
  else globalThis.localStorage = previousStorage;
}
