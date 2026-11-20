import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { access } from "node:fs/promises";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { createServer } from "vite";

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
};
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const { plannerClasses, plannerSkills, difficulties, quests } =
    await server.ssrLoadModule("/src/shared/planner.ts");
  const {
    encodeSharedBuild,
    decodeSharedBuild,
    createBuildShareUrl,
    maxSharedBuildBytes,
  } = await server.ssrLoadModule("/src/utils/planner-share.ts");
  const {
    createBuild: createStarterBuild,
    createDefaultBuild,
    parsePlannerItem,
    parseBuild,
    encodeBuild,
    decodeBuild,
    buildStats,
    buildAtLevel,
    charmFits,
    skillPlan,
    skillsAfterRemoval,
    skillBudget,
    requiredSkillLevel,
    spentSkills,
    spentAttributes,
    attributeBudget,
    mercenaryLevelCap,
    goldCapacity,
    inventoryCells,
  } = await server.ssrLoadModule("/src/utils/planner.ts");
  // Formula and placement fixtures below supply their own inventory.
  const createBuild = (classId) => ({ ...createStarterBuild(classId), charms: [] });
  const { usePlannerStore } = await server.ssrLoadModule("/src/store/planner.ts");
  const { wowheadTreeArtwork, wowheadSkillSprite } = await server.ssrLoadModule(
    "/src/utils/planner-skill-art.ts"
  );
  const art = (await server.ssrLoadModule("/src/shared/planner-wowhead-art.json"))
    .default;
  assert.equal(art.trees.length, 21);
  for (const image of [
    ...art.trees.map((tree) => tree.image),
    ...Object.values(art.icons),
  ])
    await access(new URL(`../public/${image}`, import.meta.url));
  for (const tree of [0, 1, 2]) assert(wowheadTreeArtwork("paladin", tree));
  assert.deepEqual(wowheadTreeArtwork("necromancer", 0), {
    image: "images/planner/wowhead/trees/necromancer3.webp",
    adaptation: "necromancer-curses",
  });
  assert.equal(plannerSkills.find((skill) => skill.id === 86).row, 6);
  assert.deepEqual(plannerSkills.find((skill) => skill.id === 86).requires, [81]);
  assert.deepEqual(wowheadTreeArtwork("druid", 0), {
    image: "images/planner/wowhead/trees/druid3.webp",
    adaptation: "druid-summoning",
  });
  assert.deepEqual(wowheadTreeArtwork("druid", 1), {
    image: "images/planner/wowhead/trees/druid2.webp",
    adaptation: "druid-shapeshifting",
  });
  for (const { classId, tree } of art.trees)
    assert(
      wowheadTreeArtwork(classId, tree),
      `${classId} tree ${tree} has native artwork`
    );
  const solarCreeper = plannerSkills.find((skill) => skill.id === 231);
  assert.equal(solarCreeper.tree, 0);
  assert.equal(solarCreeper.row, 5);
  assert.deepEqual(solarCreeper.requires, [222]);
  const callOfTheWild = plannerSkills.find((skill) => skill.id === 241);
  assert.equal(callOfTheWild.tree, 1);
  assert.equal(callOfTheWild.row, 6);
  assert.deepEqual(callOfTheWild.requires, [243]);
  assert.equal(wowheadTreeArtwork("warlock", 0), undefined);
  const { nativeSkillTreeArtwork } = await server.ssrLoadModule(
    "/src/utils/planner-native-skill-art.ts"
  );
  for (const tree of [0, 1, 2]) {
    const skills = plannerSkills.filter(
      (skill) => skill.classId === "warlock" && skill.tree === tree
    );
    const artwork = nativeSkillTreeArtwork(skills);
    assert(artwork, `Warlock tree ${tree} uses native connections`);
    assert.equal(artwork.sockets.length, 10);
    for (const part of [...artwork.sockets, ...artwork.arrows]) {
      assert(part.x >= 0 && part.y >= 0, "Connections stay below the tree header");
      assert(part.x + part.width <= 740 && part.y + part.height <= 1046);
      await access(new URL(`../public/${part.image}`, import.meta.url));
    }
  }
  assert.equal(
    wowheadSkillSprite(plannerSkills.find((skill) => skill.id === 86)),
    undefined
  );
  const { parseCatalogHash } = await server.ssrLoadModule("/src/utils/navigation.ts");
  assert.equal(plannerClasses.length, 8);
  assert.equal(plannerSkills.length, 240);
  assert.equal(new Set(plannerSkills.map((s) => s.id)).size, 240);
  const completeQuests = (build, completed = true) => {
    for (const { value } of difficulties)
      for (const { key } of quests) build.quests[value][key] = completed;
  };
  for (const character of plannerClasses) {
    const starter = createStarterBuild(character.id);
    assert.deepEqual(parseBuild(starter), starter, "Starter items fit without overlaps");
    assert.deepEqual(
      starter.charms.map((item) => item.baseCode),
      ["box", "tbk", "cm1", "cm2"]
    );
    assert.equal(starter.charms.find((item) => item.baseCode === "tbk").quantity, 20);
    assert.equal(new Set(starter.charms.flatMap(inventoryCells)).size, 9);
    assert.equal(buildStats(starter).skillBonus, 4);
    const skills = plannerSkills.filter((s) => s.classId === character.id);
    assert.equal(skills.length, 30);
    for (let tree = 0; tree < 3; tree++)
      assert.equal(
        skills.filter((s) => s.tree === tree).length,
        character.id === "druid" ? [9, 11, 10][tree] : 10
      );
    assert.equal(new Set(skills.map((s) => `${s.tree}-${s.row}-${s.column}`)).size, 30);
    for (const skill of skills) {
      assert(skill.name.ru && skill.name.en);
      assert(skill.description.ru && skill.description.en);
      await access(new URL(`../public/${skill.icon}`, import.meta.url));
      assert([1, 6, 12, 18, 24, 30].includes(skill.requiredLevel));
      assert.equal(skill.maxPoints, 20);
      for (const id of skill.requires)
        assert(
          skills.some(
            (s) =>
              s.id === id &&
              s.requiredLevel <= skill.requiredLevel &&
              s.tree === skill.tree
          ),
          "Tree reset relies on Blizzless prerequisites staying within their tree"
        );
    }
    const fresh = createBuild(character.id);
    assert(
      Object.values(fresh.quests).every((rewards) =>
        Object.values(rewards).every(Boolean)
      ),
      "New characters start with all quest rewards on all difficulties"
    );
    assert.equal(skillBudget(fresh), 101);
    assert.equal(attributeBudget(fresh), 460);
    assert.equal(
      buildStats(fresh).life,
      Math.floor(character.life + 89 * character.lifePerLevel + 60)
    );
    completeQuests(fresh, false);
    fresh.level = 1;
    assert.equal(buildStats(fresh).life, character.life);
    assert.equal(buildStats(fresh).mana, character.mana);
    assert.equal(buildStats(fresh).stamina, character.stamina);
    fresh.level = 99;
    completeQuests(fresh);
    assert.equal(skillBudget(fresh), 110);
    assert.equal(attributeBudget(fresh), 505);
    assert.deepEqual(parseBuild(fresh), fresh);
    for (const rewards of [false, true]) {
      const full = createBuild(character.id);
      full.level = 99;
      completeQuests(full, rewards);
      const budget = attributeBudget(full);
      full.attributes = {
        strength: Math.floor(budget * 0.4),
        dexterity: Math.floor(budget * 0.2),
        vitality: budget - Math.floor(budget * 0.4) - Math.floor(budget * 0.2),
        energy: 0,
      };
      full.equipment.head = {
        name: "Retained helmet",
        quality: "normal",
        requiredLevel: 30,
        notes: "Preserve gear when lowering level",
        bonuses: {},
      };
      for (const skill of skills) {
        let plan = skillPlan(full, skill);
        while (plan) {
          for (const id of plan) full.skills[id] = (full.skills[id] ?? 0) + 1;
          plan = skillPlan(full, skill);
        }
      }
      const original = structuredClone(full);
      for (const level of [99, 75, 30, 12, 6, 1]) {
        const lower = buildAtLevel(full, level);
        assert.equal(lower.level, level);
        assert.equal(spentAttributes(lower), attributeBudget(lower));
        assert.equal(
          lower.attributes.energy,
          0,
          "Unallocated attributes stay unallocated"
        );
        assert(spentSkills(lower) <= skillBudget(lower));
        assert(requiredSkillLevel(lower) <= level);
        assert.deepEqual(lower.equipment, full.equipment);
        assert.deepEqual(lower.quests, full.quests);
        assert.equal(lower.mercenary.level, Math.min(full.mercenary.level, level));
        assert.deepEqual(parseBuild(lower), lower);
        if (level === 1 && !rewards) {
          assert.equal(spentSkills(lower), 0);
          assert.equal(spentAttributes(lower), 0);
        }
      }
      assert.deepEqual(
        full,
        original,
        "Changing level never mutates the source snapshot"
      );
    }
    for (const skill of skills) {
      const build = createBuild(character.id);
      const plan = skillPlan(build, skill);
      assert(plan?.length > 0);
      for (const id of plan) build.skills[id] = 1;
      assert.deepEqual(parseBuild(build), build);
    }
  }
  for (const id of ["sorceress", "necromancer", "warlock"])
    assert.equal(plannerClasses.find((c) => c.id === id).manaPerEnergy, 3);
  assert.equal(plannerSkills.find((s) => s.id === 86).name.en, "Focus Minions");
  assert.equal(plannerSkills.find((s) => s.id === 86).requiredLevel, 30);
  assert.equal(plannerSkills.find((s) => s.id === 241).name.en, "Call of The Wild");
  assert.equal(plannerSkills.find((s) => s.id === 241).tree, 1);
  assert.deepEqual(plannerSkills.find((s) => s.id === 249).requires, [244]);
  const { runewordTemplates, runewordBonuses } = await server.ssrLoadModule(
    "/src/utils/planner-runewords.ts"
  );
  const { useRunewordsStore } = await server.ssrLoadModule("/src/store/runewords.ts");
  setActivePinia(createPinia());
  for (const word of useRunewordsStore().sortedRunewords)
    assert(runewordTemplates(word.name.en).length, word.name.en);
  const spirit = runewordTemplates("Spirit").find((r) => r.kind === "shield");
  const spiritMinimum = runewordBonuses(spirit, 0);
  assert.equal(spiritMinimum.bonuses.mana, 89);
  assert.equal(spiritMinimum.bonuses.fcr, 25);
  assert.equal(spiritMinimum.bonuses.fhr, 55);
  assert.equal(spiritMinimum.bonuses.vitality, 22);
  assert.equal(spiritMinimum.bonuses.lightningResist, 35);
  assert.equal(spiritMinimum.bonuses.fireResist, undefined);
  assert.equal(runewordBonuses(spirit, 1).bonuses.fcr, 35);
  const wonder = runewordBonuses(runewordTemplates("Wonder")[0], 0);
  assert.equal(wonder.bonuses.magicFind, 30, "Includes socketed Ist rune");
  assert.equal(wonder.bonuses.fireResist, 20);
  const temptation = runewordBonuses(runewordTemplates("Temptation")[0], 0);
  assert.equal(temptation.classBonuses.warlock, 3);
  const goldBuild = createBuild();
  assert.equal(goldBuild.gold, 0);
  assert.equal(goldCapacity(1), 10000);
  assert.equal(goldCapacity(99), 990000);
  goldBuild.gold = 123456;
  assert.equal(decodeBuild(encodeBuild(goldBuild)).gold, 123456);
  assert.equal(buildAtLevel(goldBuild, 1).gold, 10000);
  assert.equal(buildAtLevel(goldBuild, 99).gold, 123456);
  const oldGoldBuild = { ...goldBuild };
  delete oldGoldBuild.gold;
  assert.equal(parseBuild(oldGoldBuild).gold, 0);
  for (const gold of [-1, 1.5, 900001, Infinity, NaN, "123", null])
    assert.throws(() => parseBuild({ ...goldBuild, gold }));

  const warlock = createBuild("warlock");
  warlock.equipment.offHand = {
    name: "Temptation",
    quality: "runeword",
    requiredLevel: 67,
    notes: "",
    ...temptation,
  };
  assert.equal(buildStats(warlock).classSkills, 3);
  warlock.classId = "sorceress";
  assert.equal(
    buildStats(warlock).classSkills,
    0,
    "Class bonuses only affect their class"
  );
  assert.deepEqual(parseBuild(warlock), warlock);
  assert.deepEqual(parseCatalogHash("#/planner"), { section: "planner" });
  assert.deepEqual(parseCatalogHash("#/planner?build=example"), { section: "planner" });
  for (const [hero, mercenary] of [
    [1, 1],
    [90, 90],
    [98, 98],
    [99, 98],
  ]) {
    assert.equal(mercenaryLevelCap(hero), mercenary);
    const capped = createBuild();
    capped.level = hero;
    capped.mercenary.level = mercenary;
    assert.equal(parseBuild(capped).mercenary.level, mercenary);
  }
  const legacyMercenary = createBuild();
  legacyMercenary.name = "Legacy build with a level-99 mercenary";
  legacyMercenary.level = 99;
  legacyMercenary.mercenary.level = 99;
  const normalizedMercenary = parseBuild(legacyMercenary);
  assert.equal(normalizedMercenary.mercenary.level, 98);
  assert.deepEqual(
    normalizedMercenary,
    {
      ...legacyMercenary,
      mercenary: { ...legacyMercenary.mercenary, level: 98 },
    },
    "Legacy imports preserve all other build fields"
  );
  const build = createBuild("sorceress");
  completeQuests(build, false);
  build.level = 1;
  assert.equal(skillBudget(build), 0);
  assert.equal(
    skillPlan(
      build,
      plannerSkills.find((s) => s.id === 36)
    ),
    null
  );
  build.quests.normal.den = true;
  assert.deepEqual(
    skillPlan(
      build,
      plannerSkills.find((s) => s.id === 36)
    ),
    [36]
  );
  build.skills[36] = 1;
  assert.equal(
    skillPlan(
      build,
      plannerSkills.find((s) => s.id === 36)
    ),
    null,
    "Character level limits skill rank"
  );
  build.level = 90;
  build.skills[47] = 1;
  const cascaded = skillsAfterRemoval(build, 36);
  assert.equal(cascaded[36], undefined);
  assert.equal(
    cascaded[47],
    undefined,
    "Removing the prerequisite's last point removes its descendants"
  );
  assert.equal(
    build.skills[36],
    1,
    "Removal planning does not mutate the original build"
  );
  build.skills[36] = 2;
  const reduced = skillsAfterRemoval(build, 36);
  assert.equal(reduced[36], 1);
  assert.equal(reduced[47], 1, "A retained prerequisite keeps descendants");
  assert.equal(skillsAfterRemoval(build, 36, true)[47], undefined);
  build.skills[47] = 20;
  assert.equal(
    skillPlan(
      build,
      plannerSkills.find((s) => s.id === 47)
    ),
    null
  );

  const makeItem = (name, bonuses) => ({
    name,
    quality: "unique",
    requiredLevel: 1,
    notes: "",
    bonuses,
  });
  const { socketedBonuses, itemRequiredLevel } = await server.ssrLoadModule(
    "/src/utils/planner-sockets.ts"
  );
  const socketItem = {
    ...makeItem("Socketed helm", {}),
    quality: "normal",
    baseCode: "uh9",
    sockets: 3,
    socketedItems: ["gpr", null, "r24"],
  };
  assert.deepEqual(parsePlannerItem(socketItem), socketItem);
  assert.deepEqual(socketedBonuses(socketItem).bonuses, { life: 38, magicFind: 25 });
  assert.equal(itemRequiredLevel(socketItem), 51);
  assert.equal(itemRequiredLevel({ ...socketItem, socketedItems: ["gpr"] }), 18);
  assert.equal(itemRequiredLevel({ ...socketItem, socketedItems: [] }), 1);
  assert.deepEqual(
    socketedBonuses({ ...socketItem, socketedItems: ["gpr", "gpr"] }).bonuses,
    { life: 76 }
  );
  assert.deepEqual(socketedBonuses({ ...socketItem, baseCode: "uit" }).bonuses, {
    fireResist: 40,
    magicFind: 25,
  });
  assert.deepEqual(socketedBonuses({ ...socketItem, baseCode: "7cr" }).bonuses, {
    magicFind: 30,
  });
  assert.deepEqual(
    socketedBonuses({ ...socketItem, quality: "runeword" }).bonuses,
    {},
    "Runeword aggregate already includes rune effects"
  );
  for (const invalid of [
    { socketedItems: ["unknown"] },
    { socketedItems: ["r24", undefined] },
    { socketedItems: new Array(2) },
    { socketedItems: ["r24", null, "gpr", null] },
    { socketedItems: "r24" },
    { sockets: 0 },
    { quality: "runeword" },
  ])
    assert.throws(() => parsePlannerItem({ ...socketItem, ...invalid }));
  const socketBuild = createBuild("paladin");
  const emptySocketStats = buildStats(socketBuild);
  socketBuild.equipment.head = socketItem;
  socketBuild.equipment.swapMain = { ...socketItem, baseCode: "7cr" };
  socketBuild.mercenary.equipment.head = socketItem;
  socketBuild.stash.push(socketItem);
  assert.equal(buildStats(socketBuild).life, emptySocketStats.life + 38);
  assert.equal(
    buildStats(socketBuild).bonuses.magicFind,
    25,
    "Inactive swaps, mercenary and stash inserts are excluded"
  );
  socketBuild.weaponSet = 1;
  assert.equal(buildStats(socketBuild).bonuses.magicFind, 55);
  assert.deepEqual(
    decodeBuild(encodeBuild(socketBuild)),
    socketBuild,
    "Socket contents and empty positions survive sharing"
  );
  build.equipment.mainHand = makeItem("Primary", {
    life: 10,
    mana: 20,
    vitality: 5,
    energy: 5,
    fcr: 20,
    fireResist: 200,
  });
  build.equipment.swapMain = makeItem("Swap", { life: 30, allSkills: 2 });
  build.mercenary.equipment.armor = makeItem("Mercenary only", { life: 1000 });
  build.stash.push(makeItem("Stash only", { life: 1000 }));
  const primary = buildStats(build);
  assert.equal(primary.life, 40 + 89 + 10 + 5 * 2);
  assert.equal(primary.mana, 35 + 89 * 2 + 20 + 5 * 3);
  assert.equal(primary.bonuses.fcr, 20);
  assert.equal(primary.resists[0].value, 75);
  assert.equal(primary.resists[0].uncapped, 100);
  assert.equal(primary.resists[1].value, -100);
  build.weaponSet = 1;
  assert.equal(buildStats(build).life, 40 + 89 + 30);
  assert.equal(buildStats(build).bonuses.fcr, 0);
  assert.equal(buildStats(build).bonuses.allSkills, 2);
  const charm = {
    ...makeItem("Талисман", { mana: 12 }),
    id: "charm-1",
    height: 3,
    position: 0,
  };
  assert(charmFits([], 0, 3));
  assert(!charmFits([], 20, 3));
  assert(!charmFits([], -1, 1));
  assert(!charmFits([charm], 10, 2));
  assert(charmFits([charm], 1, 3));
  assert(charmFits([charm], 0, 3, charm.id));
  build.charms = [charm];
  assert.equal(buildStats(build).mana, 35 + 89 * 2 + 12);
  build.name = "Ледяная сфера 🧊 / <script>";
  build.notes = "Первая строка\nSecond line";
  assert.deepEqual(decodeBuild(encodeBuild(build)), build, "Unicode sharing round trip");
  const compressed = await encodeSharedBuild(build);
  assert(compressed.startsWith("gz1."));
  assert(compressed.length < encodeBuild(build).length);
  assert.deepEqual(await decodeSharedBuild(compressed), build);
  assert.deepEqual(await decodeSharedBuild(encodeBuild(build)), build);
  await assert.rejects(decodeSharedBuild("gz1.broken"));
  await assert.rejects(decodeSharedBuild(compressed.slice(0, -8)));
  const bomb = await new Response(
    new Blob(["x".repeat(maxSharedBuildBytes + 1)])
      .stream()
      .pipeThrough(new CompressionStream("gzip"))
  ).arrayBuffer();
  await assert.rejects(
    decodeSharedBuild("gz1." + Buffer.from(bomb).toString("base64url")),
    /size/
  );
  const invalid = (change) => {
    const copy = structuredClone(build);
    change(copy);
    assert.throws(() => parseBuild(copy));
  };
  invalid((b) => (b.version = 2));
  invalid((b) => (b.classId = "unknown"));
  invalid((b) => (b.level = 100));
  const fullStash = createBuild("paladin");
  fullStash.stash = Array.from({ length: 208 }, (_, stashPosition) => ({
    name: "El",
    quality: "normal",
    baseCode: "r01",
    requiredLevel: 1,
    bonuses: {},
    notes: "",
    stashPosition,
  }));
  assert.equal(parseBuild(fullStash).stash.length, 208);
  assert.equal(decodeBuild(encodeBuild(fullStash)).stash.length, 208);
  assert.deepEqual(
    await decodeSharedBuild(await encodeSharedBuild(fullStash)),
    fullStash,
    "Compressed links preserve the full native stash"
  );
  const shareSnapshot = {
    ...structuredClone(socketBuild),
    name: "Полный билд 🛡️",
    gameSave: { mode: "rotw", legacyExpansion: false },
    author: "Тестовый автор",
    description: "Экипировка, запасное оружие, наёмник и полный сундук",
    strengths: "Сопротивления",
    weaknesses: "Неизвестны",
    lootFilter: "Показывать руны и уникальные вещи",
    notes: "Первая строка\nSecond line",
    stash: fullStash.stash.map((item) => ({
      ...item,
      notes: "Проверка полного сундука. ".repeat(40),
    })),
  };
  const waypointKey = Object.keys(shareSnapshot.waypoints.hell)[0];
  shareSnapshot.waypoints.hell[waypointKey] = false;
  const expectedShare = parseBuild(shareSnapshot);
  assert(new TextEncoder().encode(JSON.stringify(expectedShare)).length > 90000);
  const generating = createBuildShareUrl(expectedShare);
  const beforeEdit = structuredClone(expectedShare);
  expectedShare.name = "Edited while link is generating";
  const shareUrl = new URL(await generating);
  assert.equal(shareUrl.origin, "https://raferty.github.io");
  assert.equal(shareUrl.pathname, "/blizzless-runewords/");
  assert.equal(shareUrl.search, "");
  const sharedToken = new URLSearchParams(shareUrl.hash.split("?")[1]).get("build");
  assert(sharedToken.startsWith("gz1."));
  assert.deepEqual(
    await decodeSharedBuild(sharedToken),
    beforeEdit,
    "Share stores the entire snapshot before async generation, including native metadata and all 208 stash items"
  );
  assert.notEqual(
    await createBuildShareUrl(expectedShare),
    shareUrl.href,
    "Changed builds receive a different link"
  );
  const originalCompression = globalThis.CompressionStream;
  try {
    globalThis.CompressionStream = undefined;
    assert.deepEqual(
      await decodeSharedBuild(await encodeSharedBuild(build)),
      build,
      "Small snapshots fall back to legacy links without compression"
    );
    await assert.rejects(
      encodeSharedBuild(expectedShare),
      /size/,
      "Oversized uncompressed links are rejected, never truncated"
    );
  } finally {
    globalThis.CompressionStream = originalCompression;
  }
  await assert.rejects(
    encodeSharedBuild({ ...build, notes: "x".repeat(maxSharedBuildBytes + 1) }),
    /size/
  );
  assert.throws(() =>
    parseBuild({ ...fullStash, stash: [...fullStash.stash, fullStash.stash[0]] })
  );
  invalid((b) => (b.level = 6.5));
  invalid((b) => (b.attributes.vitality = 999));
  invalid((b) => (b.skills[47] = 21));
  invalid((b) => (b.skills[36] = 0));
  invalid((b) => (b.skills[251] = 1));
  invalid((b) => b.charms.push({ ...charm, id: "overlap" }));
  invalid((b) => (b.charms[0].position = 39));
  invalid((b) => (b.equipment.mainHand.bonuses.life = "100"));
  invalid((b) => (b.primarySkills = [251]));
  invalid((b) => (b.mercenary.type = "unknown"));
  invalid((b) => (b.mercenary.level = 100));
  invalid((b) => (b.mercenary.level = 0));
  invalid((b) => (b.mercenary.level = 89.5));
  assert.throws(() => decodeBuild("%broken%"));
  assert.throws(() => decodeBuild("A".repeat(120001)));
  const unknown = structuredClone(build);
  unknown.equipment.mainHand.bonuses.untrusted = 999;
  unknown.untrusted = "ignored";
  assert.deepEqual(parseBuild(unknown), build, "Unknown fields are not propagated");

  setActivePinia(createPinia());
  const store = usePlannerStore();
  store.setMercenaryLevel(99);
  assert.equal(store.build.mercenary.level, 90, "Mercenary can match the hero");
  assert.equal(
    store.updateConfiguration((b) => (b.level = 99)),
    true
  );
  store.setMercenaryLevel(99);
  assert.equal(store.build.mercenary.level, 98, "Mercenary cannot reach level 99");
  assert.equal(
    store.updateConfiguration((b) => (b.level = 80)),
    true
  );
  assert.equal(
    store.build.mercenary.level,
    80,
    "Lowering hero level also caps mercenary"
  );
  store.setMercenaryLevel(0);
  store.setMercenaryLevel(79.5);
  assert.equal(
    store.build.mercenary.level,
    80,
    "Invalid values preserve mercenary level"
  );
  assert.equal(
    store.updateConfiguration((b) => (b.level = 90)),
    true
  );
  store.build.name = "Сохранённый черновик";
  store.addSkill(
    plannerSkills.find((s) => s.id === 64),
    true
  );
  assert.equal(store.build.skills[64], 20);
  assert(spentSkills(store.build) <= skillBudget(store.build));
  const allocated = structuredClone(JSON.parse(JSON.stringify(store.build)));
  assert.equal(
    store.updateConfiguration((b) => (b.level = 1)),
    false
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(store.build)),
    allocated,
    "Rejected configuration preserves build"
  );
  store.changeAttribute("vitality", 999);
  assert.equal(store.build.attributes.vitality, attributeBudget(store.build));
  const beforeLevelChange = JSON.parse(JSON.stringify(store.build));
  assert.equal(store.setLevel(1), true);
  assert.equal(store.build.level, 1);
  assert.equal(store.build.skills[64], undefined, "Level-30 skill is refunded");
  assert.equal(store.build.attributes.vitality, attributeBudget(store.build));
  assert.equal(store.message, "levelAdjusted");
  assert.deepEqual(parseBuild(store.build), JSON.parse(JSON.stringify(store.build)));
  const levelOne = JSON.parse(JSON.stringify(store.build));
  for (const invalidLevel of [0, 100, 1.5, NaN, Infinity]) {
    assert.equal(store.setLevel(invalidLevel), false);
    assert.deepEqual(JSON.parse(JSON.stringify(store.build)), levelOne);
  }
  assert.equal(store.setLevel(99), true);
  assert.deepEqual(store.build.attributes, levelOne.attributes);
  assert.deepEqual(
    store.build.skills,
    levelOne.skills,
    "Raising level does not spend points"
  );
  assert(store.loadBuild(beforeLevelChange));
  store.selectClass("paladin");
  completeQuests(store.build, false);
  assert.equal(store.build.classId, "paladin");
  assert.equal(spentSkills(store.build), 0);
  assert.equal(requiredSkillLevel(store.build), 1);
  store.addSkill(
    plannerSkills.find((s) => s.id === 118),
    true
  );
  assert.equal(store.build.skills[118], 20);
  assert.equal(spentSkills(store.build), 23);
  assert.equal(requiredSkillLevel(store.build), 43, "Holy Shock 20 needs level 43");
  store.addSkill(plannerSkills.find((s) => s.id === 96));
  assert.equal(
    store.build.skills[96],
    1,
    "One ordinary click starts at one point, never eleven"
  );
  store.addSkill(plannerSkills.find((s) => s.id === 96));
  assert.equal(store.build.skills[96], 2);
  store.removeSkill(96);
  assert.equal(store.build.skills[96], 1);
  const beforeTreeReset = JSON.parse(JSON.stringify(store.build));
  store.removeSkill(98);
  assert.equal(
    spentSkills(store.build),
    1,
    "Removing Might cascades through Holy Shock and refunds all dependent points"
  );
  assert.equal(store.build.skills[96], 1, "Other branches survive prerequisite removal");
  store.addSkill(
    plannerSkills.find((s) => s.id === 118),
    true
  );
  store.resetSkillTree(1);
  assert.equal(spentSkills(store.build), 1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(store.build)),
    {
      ...beforeTreeReset,
      skills: { 96: 1 },
    },
    "Resetting offensive auras preserves the combat tree and all other fields"
  );
  assert.equal(
    requiredSkillLevel(store.build),
    2,
    "One point needs one level-up without quest rewards"
  );
  store.build.quests.normal.den = true;
  assert.equal(
    requiredSkillLevel(store.build),
    1,
    "Quest skill rewards count toward required level"
  );
  assert.deepEqual(parseBuild(store.build), JSON.parse(JSON.stringify(store.build)));
  store.resetSkillTree(0);
  assert.equal(spentSkills(store.build), 0);
  store.selectClass("sorceress");
  assert.equal(store.build.name, "Сохранённый черновик");
  assert.equal(store.build.skills[64], 20);
  store.build.equipment.head = structuredClone(socketItem);
  store.saveBuild();
  store.build.name = "Changed after save";
  assert.equal(
    store.saved[0].build.name,
    "Сохранённый черновик",
    "Snapshots are independent"
  );
  await nextTick();
  setActivePinia(createPinia());
  const restored = usePlannerStore();
  assert.equal(restored.build.name, "Changed after save");
  assert.equal(restored.saved.length, 1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(restored.build.equipment.head)),
    socketItem,
    "Socket inserts survive autosave"
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(restored.saved[0].build.equipment.head)),
    socketItem,
    "Socket inserts survive saved build snapshots"
  );
  assert.equal(restored.loadBuild({}), false);
  assert.equal(
    restored.build.name,
    "Changed after save",
    "Invalid imports preserve current build"
  );
  let replacedUrl = "";
  globalThis.window = {
    location: {
      hash: `#/planner?build=${encodeBuild(build)}`,
      pathname: "/blizzless-runewords/",
      search: "",
    },
    history: { replaceState: (_data, _title, url) => (replacedUrl = url) },
  };
  restored.loadSharedHash();
  assert.equal(restored.build.name, build.name);
  assert.equal(
    replacedUrl,
    "/blizzless-runewords/#/planner",
    "Shared snapshot becomes a local draft URL"
  );
  const compressedBuild = { ...build, name: "Compressed shared character" };
  window.location.hash = `#/planner?build=${await encodeSharedBuild(compressedBuild)}`;
  await restored.loadSharedHash();
  assert.equal(restored.build.name, compressedBuild.name);
  restored.build.name = "Edited after opening shared link";
  await restored.loadSharedHash();
  assert.equal(
    restored.build.name,
    compressedBuild.name,
    "The same shared link can be opened again to restore its snapshot"
  );
  memory.set(
    "blizzless-planner-v1",
    JSON.stringify({
      active: legacyMercenary.classId,
      drafts: { [legacyMercenary.classId]: legacyMercenary },
      saved: [{ id: "legacy", savedAt: "2026-10-26", build: legacyMercenary }],
    })
  );
  setActivePinia(createPinia());
  const migrated = usePlannerStore();
  assert.deepEqual(
    { ...JSON.parse(JSON.stringify(migrated.build)), charms: [] },
    normalizedMercenary,
    "Inventory migration preserves the rest of the draft"
  );
  assert.deepEqual(
    migrated.build.charms.map((item) => ({ ...item, position: undefined })),
    createDefaultBuild(legacyMercenary.classId).charms.map((item) => ({
      ...item,
      position: undefined,
    })),
    "Unversioned drafts receive the starter inventory during migration"
  );
  assert.deepEqual(
    parseBuild(migrated.build),
    JSON.parse(JSON.stringify(migrated.build))
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(migrated.saved[0].build)),
    normalizedMercenary
  );
  memory.set(
    "blizzless-planner-v1",
    JSON.stringify({
      active: legacyMercenary.classId,
      defaultInventoryVersion: 1,
      drafts: { [legacyMercenary.classId]: legacyMercenary },
      saved: [],
    })
  );
  setActivePinia(createPinia());
  assert.deepEqual(
    JSON.parse(JSON.stringify(usePlannerStore().build)),
    normalizedMercenary,
    "Versioned drafts preserve a deliberately empty inventory"
  );
  memory.set(
    "blizzless-planner-v1",
    JSON.stringify({ active: "__proto__", drafts: {}, saved: [] })
  );
  setActivePinia(createPinia());
  assert.equal(
    usePlannerStore().build.classId,
    "sorceress",
    "Unknown stored active class is ignored"
  );
  memory.set(
    "blizzless-planner-v1",
    JSON.stringify({
      active: "paladin",
      drafts: { paladin: createBuild("amazon") },
      saved: [],
    })
  );
  setActivePinia(createPinia());
  assert.equal(
    usePlannerStore().build.classId,
    "sorceress",
    "Draft must match its class key"
  );
  // A full reset restores the active class's utility items and full progress,
  // while preserving snapshots, other classes and the native format.
  await nextTick();
  const resetFixture = createDefaultBuild("paladin");
  resetFixture.name = "Reset fixture";
  resetFixture.level = 99;
  resetFixture.hardcore = true;
  resetFixture.gameSave = { mode: "rotw", legacyExpansion: false };
  resetFixture.attributes.vitality = 30;
  resetFixture.skills = { 96: 1 };
  resetFixture.primarySkills = [96];
  completeQuests(resetFixture, false);
  for (const points of Object.values(resetFixture.waypoints))
    for (const key of Object.keys(points)) points[key] = false;
  resetFixture.charms.find((item) => item.baseCode === "tbk").quantity = 4;
  resetFixture.charms.push({
    id: "reset-extra-charm",
    name: "Small Charm",
    baseCode: "cm1",
    quality: "magic",
    requiredLevel: 1,
    itemLevel: 1,
    bonuses: { life: 5 },
    notes: "",
    position: 39,
    height: 1,
  });
  resetFixture.gold = 990000;
  resetFixture.equipment.head = structuredClone(socketItem);
  resetFixture.stash = [structuredClone(socketItem)];
  resetFixture.mercenary = {
    type: "desert-might",
    level: 98,
    equipment: { head: structuredClone(socketItem) },
  };
  for (const key of [
    "notes",
    "author",
    "description",
    "strengths",
    "weaknesses",
    "lootFilter",
  ])
    resetFixture[key] = "Clear this text";
  const otherDraft = { ...createDefaultBuild("sorceress"), name: "Other draft" };
  const snapshots = [
    { id: "reset-snapshot", savedAt: "2026-11-20T12:00:00Z", build: resetFixture },
  ];
  memory.set(
    "blizzless-planner-v1",
    JSON.stringify({
      active: "paladin",
      defaultInventoryVersion: 1,
      drafts: { paladin: resetFixture, sorceress: otherDraft },
      saved: snapshots,
    })
  );
  setActivePinia(createPinia());
  const resetStore = usePlannerStore();
  resetStore.resetCharacter();
  assert.equal(resetStore.build.classId, "paladin");
  assert.equal(resetStore.build.level, 90);
  assert.equal(resetStore.build.difficulty, "normal");
  assert.equal(resetStore.build.hardcore, true);
  assert.deepEqual(resetStore.build.gameSave, resetFixture.gameSave);
  assert.equal(spentAttributes(resetStore.build), 0);
  assert.equal(spentSkills(resetStore.build), 0);
  assert.deepEqual(resetStore.build.equipment, {});
  assert.deepEqual(
    JSON.parse(JSON.stringify(resetStore.build.charms)),
    createDefaultBuild("paladin").charms
  );
  assert.deepEqual(resetStore.build.stash, []);
  assert.deepEqual(resetStore.build.primarySkills, []);
  assert.equal(resetStore.build.gold, 0);
  assert.deepEqual(resetStore.build.mercenary, {
    type: "none",
    level: 90,
    equipment: {},
  });
  for (const key of [
    "name",
    "notes",
    "author",
    "description",
    "strengths",
    "weaknesses",
    "lootFilter",
  ])
    assert.equal(resetStore.build[key], "");
  for (const progress of [
    ...Object.values(resetStore.build.quests),
    ...Object.values(resetStore.build.waypoints),
  ])
    assert(Object.values(progress).every((value) => value === true));
  assert.deepEqual(JSON.parse(JSON.stringify(resetStore.saved)), snapshots);
  assert.deepEqual(JSON.parse(JSON.stringify(resetStore.drafts.sorceress)), otherDraft);
  const blank = JSON.parse(JSON.stringify(resetStore.build));
  assert.deepEqual(parseBuild(blank), blank);
  resetStore.selectClass("sorceress");
  assert.equal(resetStore.build.name, "Other draft");
  resetStore.selectClass("paladin");
  assert.deepEqual(JSON.parse(JSON.stringify(resetStore.build)), blank);
  await nextTick();
  setActivePinia(createPinia());
  assert.deepEqual(
    JSON.parse(JSON.stringify(usePlannerStore().build)),
    blank,
    "Reset utility items and completed progress persist across reloads"
  );
  assert.deepEqual(JSON.parse(JSON.stringify(usePlannerStore().saved)), snapshots);
  for (const character of plannerClasses) {
    resetStore.selectClass(character.id);
    resetStore.build.charms = [];
    completeQuests(resetStore.build, false);
    resetStore.resetCharacter();
    const reset = JSON.parse(JSON.stringify(resetStore.build));
    assert.deepEqual(reset.charms, createDefaultBuild(character.id).charms);
    const torch = reset.charms.find((item) => item.catalogId === "unique400");
    assert.deepEqual(torch.classBonuses, { [character.id]: 3 });
    assert.equal(torch.skillClass, character.id);
    assert.equal(reset.charms.find((item) => item.baseCode === "tbk").quantity, 20);
    assert.equal(skillBudget(reset), 101);
    assert.equal(attributeBudget(reset), 460);
    for (const progress of [
      ...Object.values(reset.quests),
      ...Object.values(reset.waypoints),
    ])
      assert(Object.values(progress).every(Boolean));
    assert.deepEqual(parseBuild(reset), reset);
  }
  await nextTick();
  console.log(
    "Planner checks passed: Blizzless 1.3.2, 8 classes, 240 skills, 240 icons, server dependencies and attributes, 105 runeword templates, budgets, swap, charms, validated imports and persistence."
  );
} finally {
  await server.close();
}
