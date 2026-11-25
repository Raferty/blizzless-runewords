import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { read as readIndependent } from "@d2runewizard/d2s";
import { constants } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";

// Header values cross-checked against D2SSharp's game-created v105 fixtures:
// Roka/Soska: status 0x20, GameVersion 2, ending in "kf\0" (no demon data).
// ChaosSC (Warlock): status 0x28 (dead), GameVersion 3, with a demon section.
// https://github.com/ResurrectedTrader/D2SSharp/tree/main/src/D2SSharp.Tests/Resources/105
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
try {
  const { createBuild: createStarterBuild, encodeBuild, decodeBuild } = await server.ssrLoadModule(
    "/src/utils/planner.ts"
  );
  // Header fixtures have no item choices; inventory contents are tested separately.
  const createBuild = (classId) => ({ ...createStarterBuild(classId), charms: [] });
  const { plannerClasses } = await server.ssrLoadModule("/src/shared/planner.ts");
  const { createGameSaveExporter, saveChecksum } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const data = JSON.parse(await readFile("public/data/planner-save/data.json", "utf8"));
  const locale = JSON.parse(
    await readFile("public/data/planner-save/strings.json", "utf8")
  );
  const codec = createGameSaveExporter(data, locale);
  const options = { name: "ModeCheck", choices: {}, rolls: {} };
  async function check(build, gameMode, expectedMode) {
    const before = JSON.stringify(build);
    const bytes = await codec.exportCharacter(build, { ...options, gameMode });
    const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    assert.equal(bytes[20], build.hardcore ? 0x24 : 0x20);
    assert.equal(bytes[248], expectedMode);
    assert.equal(header.getUint32(4, true), 105);
    assert.equal(header.getUint32(8, true), bytes.length);
    assert.equal(header.getUint32(12, true), saveChecksum(bytes));
    const expectedEnd =
      expectedMode === 3 ? [107, 102, 0, 1, 0, 108, 102, 0, 0] : [107, 102, 0];
    assert.deepEqual(Array.from(bytes.slice(-expectedEnd.length)), expectedEnd);
    const parsed = await readIndependent(bytes, constants, {
      disableItemEnhancements: true,
      extendedStash: true,
    });
    assert.equal(parsed.header.status.expansion, true);
    assert.equal(parsed.header.status.hardcore, build.hardcore);
    assert.equal(
      parsed.header.class,
      plannerClasses.find((c) => c.id === build.classId).name.en
    );
    assert.equal(parsed.header.level, build.level);
    assert.equal(JSON.stringify(build), before);
  }
  for (const { id } of plannerClasses) {
    for (const hardcore of [false, true]) {
      const build = createBuild(id);
      build.hardcore = hardcore;
      build.level = hardcore ? 1 : 99;
      await check(build, undefined, 3);
    }
  }
  await check(createBuild("paladin"), "rotw", 3);
  await check(createBuild("paladin"), "expansion", 2);
  for (const stashGold of [0, 12345]) {
    const build = createBuild("paladin");
    build.level = 90;
    build.experience = 1618524940;
    build.stashGold = stashGold;
    const original = await codec.exportCharacter(build, options);
    const imported = decodeBuild(encodeBuild(codec.importCharacter(original)));
    assert.equal(imported.stashGold, stashGold);
    assert.equal(imported.experience, build.experience);
    const roundTrip = await codec.exportCharacter(imported, options);
    const saved = await readIndependent(roundTrip, constants, { disableItemEnhancements: true });
    assert.equal(saved.attributes.stashed_gold ?? 0, stashGold);
    assert.equal(saved.attributes.experience, build.experience);
    imported.level++;
    const changed = codec.importCharacter(await codec.exportCharacter(imported, options));
    assert.equal(changed.experience, Number(data.experience[90].amazon));
    assert.equal(changed.stashGold, stashGold);
  }
  const highLevel = createBuild("barbarian");
  highLevel.level = 99;
  highLevel.experience = Number(data.experience[98].amazon) + 1;
  const highBytes = await codec.exportCharacter(highLevel, options);
  assert.equal(codec.importCharacter(highBytes).experience, highLevel.experience);
  const valid = await codec.exportCharacter(createBuild("paladin"), options);
  for (const version of [99, 105]) {
    for (const invalidField of [8, 12]) {
      const bytes = valid.slice();
      const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      header.setUint32(4, version, true);
      if (invalidField === 8) header.setUint32(8, bytes.length + 1, true);
      header.setUint32(12, saveChecksum(bytes) ^ (invalidField === 12 ? 1 : 0), true);
      await assert.rejects(
        codec.importGameFile(bytes),
        (error) => error.code === "validation"
      );
    }
  }
  await assert.rejects(
    codec.exportCharacter(createBuild("warlock"), { ...options, gameMode: "expansion" }),
    (error) => error.code === "gameMode"
  );
  console.log("Save mode: 18 exports verified; Warlock cannot export as LoD.");
} finally {
  await server.close();
}
