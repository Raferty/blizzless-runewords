import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";
import { read } from "@d2runewizard/d2s";
import { constants } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
try {
  const { createBuild, parseBuild, cloneBuild, encodeBuild, decodeBuild } =
    await server.ssrLoadModule("/src/utils/planner.ts");
  const { waypoints } = await server.ssrLoadModule("/src/shared/planner-waypoints.ts");
  const { createGameSaveExporter, saveChecksum } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const load = async (name) =>
    JSON.parse(
      await readFile(new URL(`../public/data/planner-save/${name}.json`, import.meta.url))
    );
  const exporter = createGameSaveExporter(await load("data"), await load("strings"));
  const build = createBuild();
  assert.equal(waypoints.length, 39);
  assert.equal(new Set(waypoints.map((point) => point.key)).size, 39);
  assert.deepEqual(
    waypoints.map((point) => point.bit).sort((a, b) => a - b),
    Array.from({ length: 39 }, (_, index) => index)
  );
  assert(
    Object.values(build.waypoints).every((points) => Object.values(points).every(Boolean))
  );
  const legacy = cloneBuild(build);
  delete legacy.waypoints;
  assert.deepEqual(parseBuild(legacy).waypoints, build.waypoints);
  const invalid = cloneBuild(build);
  invalid.waypoints.normal.coldPlains = "false";
  assert.throws(() => parseBuild(invalid), /waypoint/);
  delete invalid.waypoints.normal.coldPlains;
  assert.throws(() => parseBuild(invalid), /waypoint/);

  // Expected keys come from the independent save reader, in native bit order.
  const nativeKeys = [
    [
      "rogue_encampement",
      "cold_plains",
      "stony_field",
      "dark_woods",
      "black_marsh",
      "outer_cloister",
      "jail_lvl_1",
      "inner_cloister",
      "catacombs_lvl_2",
    ],
    [
      "lut_gholein",
      "sewers_lvl_2",
      "dry_hills",
      "halls_of_the_dead_lvl_2",
      "far_oasis",
      "lost_city",
      "palace_cellar_lvl_1",
      "arcane_sanctuary",
      "canyon_of_the_magi",
    ],
    [
      "kurast_docks",
      "spider_forest",
      "great_marsh",
      "flayer_jungle",
      "lower_kurast",
      "kurast_bazaar",
      "upper_kurast",
      "travincal",
      "durance_of_hate_lvl_2",
    ],
    ["the_pandemonium_fortress", "city_of_the_damned", "river_of_flame"],
    [
      "harrogath",
      "frigid_highlands",
      "arreat_plateau",
      "crystalline_passage",
      "glacial_trail",
      "halls_of_pain",
      "frozen_tundra",
      "the_ancients_way",
      "worldstone_keep_lvl_2",
    ],
  ];
  const acts = ["act_i", "act_ii", "act_iii", "act_iv", "act_v"];
  for (const mode of ["all", "none", "mixed"]) {
    for (const [index, points] of Object.values(build.waypoints).entries())
      for (const { key, bit } of waypoints)
        points[key] = mode === "all" || (mode === "mixed" && (bit + index) % 2 === 0);
    assert.deepEqual(
      parseBuild(JSON.parse(JSON.stringify(build))).waypoints,
      build.waypoints
    );
    assert.deepEqual(decodeBuild(encodeBuild(build)).waypoints, build.waypoints);
    const before = JSON.stringify(build);
    const bytes = await exporter.exportCharacter(build, {
      name: "Waypoints",
      choices: {},
      rolls: {},
    });
    assert.equal(new DataView(bytes.buffer).getUint32(12, true), saveChecksum(bytes));
    const saved = await read(bytes, constants, {
      disableItemEnhancements: true,
      extendedStash: true,
    });
    for (const [index, difficulty] of ["normal", "nm", "hell"].entries()) {
      const actual = acts.flatMap((act, i) =>
        nativeKeys[i].map((key) => saved.header.waypoints[difficulty][act][key])
      );
      assert.deepEqual(
        actual,
        Array.from(
          { length: 39 },
          (_, bit) => mode === "all" || (mode === "mixed" && (bit + index) % 2 === 0)
        )
      );
    }
    assert.equal(JSON.stringify(build), before);
  }
  console.log(
    "Waypoints: legacy defaults, validation, JSON/share and .d2s flags passed."
  );
} finally {
  await server.close();
}
