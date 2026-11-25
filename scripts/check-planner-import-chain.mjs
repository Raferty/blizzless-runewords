import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
try {
  const planner = await server.ssrLoadModule("/src/utils/planner.ts");
  const shared = await server.ssrLoadModule("/src/utils/planner-share.ts");
  const native = await server.ssrLoadModule("/src/utils/planner-game-save.ts");
  const data = JSON.parse(await readFile("public/data/planner-save/data.json"));
  const codec = native.createGameSaveExporter(
    data,
    JSON.parse(await readFile("public/data/planner-save/strings.json"))
  );
  const item = (name, quality, baseCode, extra = {}) => ({
    name,
    quality,
    baseCode,
    requiredLevel: 1,
    itemLevel: 99,
    bonuses: {},
    notes: "",
    ...extra,
  });
  const build = { ...planner.createBuild("paladin"), level: 99, charms: [] };
  build.equipment.mainHand = item("Hiram's Treason", "unique", "7pi", {
    catalogId: "unique703",
  });
  build.equipment.amulet = item("Caster Amulet", "crafted", "amu", {
    craftId: "caster_amulet",
    itemLevel: 98,
    propertyRoll: 1,
    bonuses: { mana: 20, fcr: 10 },
    affixes: [
      { id: "mp564", values: [0] },
      { id: "mp330", values: [20] },
      { id: "ms173", values: [0] },
      { id: "ms317", values: [60] },
    ],
  });
  build.equipment.armor = item("Principle", "runeword", "utp", {
    runewordId: 57,
    baseKind: "armor",
  });
  build.equipment.offHand = item("Spirit", "runeword", "pab", {
    runewordId: 13,
    baseKind: "shield",
    propertyRoll: 1,
    bonuses: { fireResist: 45, coldResist: 80, lightningResist: 80, poisonResist: 80 },
  });
  build.stash = [
    item("Hiram's Treason", "unique", "7pi", {
      catalogId: "unique703",
      propertyValues: { 2: 2 },
    }),
    item("Eternity", "runeword", "7wa", {
      runewordId: 73,
      baseKind: "weapon",
      propertyRoll: 1,
    }),
    item("Andariel's Visage", "unique", "usk", {
      catalogId: "unique345",
      ethereal: true,
      sockets: 1,
      socketedItems: ["j15fr"],
    }),
    ...["xa1", "xa2", "xa3", "xa4", "xa5"].map((code, index) =>
      item(code, "normal", code, { stashPosition: 130 + index })
    ),
    item("Wisp", "unique", "rin", { catalogId: "unique319", propertyRoll: 1 }),
  ];
  const options = (b) => ({
    name: "ChainCheck",
    rolls: {},
    choices: Object.fromEntries(
      native.gameSaveEntries(b).map((e) => [e.key, codec.defaultChoice(e, b)])
    ),
  });
  function snapshot(bytes) {
    const { profile, items } = codec.readCharacter(bytes);
    const normalize = (id) => {
      if (typeof id === "string") return id;
      const i = items[id];
      return {
        base: i.base,
        unique: i.unique,
        quality: i.quality,
        ethereal: i.ethereal,
        sockets: i.sockets,
        stats: Object.fromEntries(
          Object.entries(i.stats)
            .filter(([, v]) => v)
            .sort()
        ),
        children: i.socketedItems.map(normalize),
      };
    };
    return {
      equipment: Object.fromEntries(
        Object.entries(profile.items).map(([k, id]) => [k, normalize(id)])
      ),
      stash: profile.stash.map((id) => (id === undefined ? null : normalize(id))),
    };
  }
  const { itemPropertyLines } = await server.ssrLoadModule(
    "/src/utils/planner-item-catalog.ts"
  );
  const swordguard = item("Swordguard", "unique", "9fb", { catalogId: "unique167" });
  for (const level of [1, 46, 99])
    assert(
      itemPropertyLines(codec, swordguard, level, "paladin").includes(
        `+${level * 7} Defense (Based on Character Level)`
      )
    );
  for (const [name, id, values] of [
    ["Brand", 79, { 1: 350 }],
    ["Brand", 79, { 1: 411 }],
    ["Brand", 79, { 1: 450 }],
    ["Wrath", 75, { 1: 300, 7: 6 }],
    ["Wrath", 75, { 1: 381, 7: 10 }],
    ["Wrath", 75, { 1: 400, 7: 18 }],
  ]) {
    let fixture = {
      ...planner.createBuild("paladin"),
      charms: [],
      stash: [
        item(name, "runeword", "6s7", {
          runewordId: id,
          baseKind: "weapon",
          propertyValues: values,
        }),
      ],
    };
    for (let pass = 0; pass < 2; pass++) {
      const bytes = await codec.exportCharacter(fixture, options(fixture));
      fixture = (await codec.importGameFile(bytes)).build;
      const word = fixture.stash[0];
      assert.deepEqual(word.propertyValues, values, name);
      const lines = itemPropertyLines(codec, word, 99, "paladin");
      assert(
        lines.some((line) => line.includes(`${values[1]}% Enhanced Damage`)),
        lines.join("\n")
      );
      if (values[7])
        assert(
          lines.some((line) => line.includes(`+${values[7]} to Enchant`)),
          lines.join("\n")
        );
    }
  }
  let cycles = 0;
  for (const mode of ["expansion", "rotw"])
    for (const legacyExpansion of [false, true])
      for (const hardcore of [false, true]) {
        const fixture = { ...build, hardcore, gameSave: { mode, legacyExpansion } };
        let bytes = await codec.exportCharacter(fixture, options(fixture));
        const expected = snapshot(bytes);
        assert.equal(expected.equipment.rarm.unique, "unique704");
        assert.equal(expected.equipment.rarm.base, "7pi");
        for (let index = 0; index < 5; index++) {
          const shard = expected.stash[130 + index];
          assert.equal(typeof shard === "string" ? shard : shard.base, `xa${index + 1}`);
        }
        assert.equal(expected.equipment.neck.stats["item_addclassskills#3"], 2);
        assert.equal(expected.equipment.neck.stats.manarecoverybonus, 10);
        assert.equal(expected.equipment.neck.stats.item_fastercastrate, 20);
        assert.equal(expected.equipment.larm.stats.coldresist, 45);
        assert(expected.stash.some((i) => i?.stats["item_nonclassskill#388"] === 2));
        for (let cycle = 0; cycle < 3; cycle++) {
          let restored = codec.importCharacter(bytes);
          assert.deepEqual(restored.gameSave, { mode, legacyExpansion });
          assert.equal(restored.hardcore, hardcore);
          assert.equal(restored.equipment.amulet.classBonuses.paladin, 2);
          assert.equal(restored.equipment.offHand.bonuses.coldResist, 80);
          assert(
            restored.stash.some(
              (i) => i.catalogId === "unique703" && i.propertyValues?.[2] === 2
            ),
            "The spare Hiram also displays its imported +2 roll"
          );
          // Both download backups and shared links must keep the native metadata.
          restored = planner.parseBuild(JSON.parse(JSON.stringify(restored)));
          restored = await shared.decodeSharedBuild(
            await shared.encodeSharedBuild(restored)
          );
          bytes = await codec.exportCharacter(restored, options(restored));
          assert.equal(bytes[248], mode === "rotw" ? 3 : 2);
          assert.equal(bytes[20], (legacyExpansion ? 32 : 0) | (hardcore ? 4 : 0));
          assert.deepEqual(
            snapshot(bytes),
            expected,
            `cycle ${cycle + 1}, ${mode}, legacy=${legacyExpansion}, hardcore=${hardcore}`
          );
          cycles++;
        }
      }
  const imported = codec.importCharacter(
    await codec.exportCharacter(build, options(build))
  );
  imported.equipment.amulet.classBonuses.paladin = 1;
  imported.equipment.amulet.bonuses.mana = 40;
  imported.equipment.mainHand.propertyValues[2] = 2;
  const edited = snapshot(await codec.exportCharacter(imported, options(imported)));
  assert.equal(edited.equipment.neck.stats["item_addclassskills#3"], 1);
  assert.equal(edited.equipment.neck.stats.maxmana, 40);
  assert.equal(edited.equipment.neck.stats.manarecoverybonus, 10);
  assert.equal(edited.equipment.rarm.stats["item_nonclassskill#388"], 2);
  assert.throws(() =>
    planner.parseBuild({ ...build, gameSave: { mode: "invalid", legacyExpansion: true } })
  );
  assert.throws(() =>
    planner.parsePlannerItem({
      ...build.equipment.mainHand,
      importedStats: { signature: "x", values: { invalid: 0.5 } },
    })
  );
  console.log(
    `Import/export chain: ${cycles} repeated cycles preserve mode, class skills, crafts, runewords, procs, charges and socketed ethereal gear; edits remain effective.`
  );
} finally {
  await server.close();
}
