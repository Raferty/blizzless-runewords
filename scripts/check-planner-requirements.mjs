import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: "custom",
});
try {
  const { createGameSaveExporter } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const { itemRequirements } = await server.ssrLoadModule(
    "/src/utils/planner-item-requirements.ts"
  );
  const { createBuild, buildStats } = await server.ssrLoadModule("/src/utils/planner.ts");
  const native = createGameSaveExporter(
    JSON.parse(await readFile("public/data/planner-save/data.json")),
    JSON.parse(await readFile("public/data/planner-save/strings.json"))
  );
  const build = createBuild("paladin");
  build.charms = [];
  build.level = 99;
  const item = (baseCode, extra = {}) => ({
    name: baseCode,
    baseCode,
    quality: "normal",
    requiredLevel: 1,
    notes: "",
    bonuses: {},
    ...extra,
  });
  const check = (value, level = build.level) =>
    itemRequirements(native, value, build.classId, buildStats(build).attributes, level);
  const req = (value, key) =>
    check(value).attributes.find((row) => row.key === key)?.required ?? 0;
  const shako = item("uap");
  assert.equal(check(shako).unmet, true, "Unallocated strength cannot wear a Shako");
  build.attributes.strength = 24;
  assert.equal(check(shako).unmet, true);
  build.attributes.strength = 25;
  assert.equal(check(shako).unmet, false, "Exactly 50 strength meets the requirement");
  build.attributes.strength = 0;
  build.equipment.ringLeft = item("rin", { bonuses: { strength: 25 } });
  assert.equal(check(shako).unmet, false, "Equipped bonuses count toward requirements");
  build.equipment = {};
  build.stash = [item("rin", { bonuses: { strength: 200 } })];
  assert.equal(check(shako).unmet, true, "Stash bonuses do not count");
  build.stash = [];
  build.equipment.mainHand = item("hax", { bonuses: { strength: 25 } });
  assert.equal(check(shako).unmet, false);
  build.weaponSet = 1;
  assert.equal(check(shako).unmet, true, "Inactive weapon bonuses do not count");
  build.equipment = {};
  build.weaponSet = 0;
  const blade = item("7cr");
  assert.equal(req(blade, "dexterity"), 136);
  assert.equal(
    req(item("7cr", { sockets: 1, socketedItems: ["r15"] }), "dexterity"),
    109,
    "Hel applies the weapon requirement reduction"
  );
  assert.equal(
    req(item("7cr", { sockets: 1, socketedItems: ["r15"], ethereal: true }), "dexterity"),
    99,
    "Ethereal reduction follows the percentage"
  );
  assert.equal(
    req(item("utp", { sockets: 1, socketedItems: ["r15"] }), "strength"),
    88,
    "Hel has a different armor reduction"
  );
  assert.equal(
    req(item("cap", { ethereal: true }), "strength"),
    0,
    "Requirements cannot become negative"
  );
  assert.equal(
    req(
      item("crs", { name: "Silence", quality: "runeword", baseKind: "weapon" }),
      "strength"
    ),
    35,
    "Runewords include the Hel rune exactly once"
  );
  assert.deepEqual(
    check(item("uar", { quality: "unique", catalogId: "unique311" })).attributes,
    [],
    "Tyrael's Might removes its base armor's attribute requirements"
  );
  assert.equal(
    req(item("xap", { quality: "unique", catalogId: "unique248" }), "strength"),
    20,
    "Upgraded unique art uses the selected base requirement"
  );
  assert.equal(
    check(item(undefined, { name: "Harlequin Crest", quality: "unique" })).level.required,
    62,
    "Legacy unique names resolve their base and level"
  );
  assert.equal(
    check(item("rin", { requiredLevel: 80 }), 79).unmet,
    true,
    "Level requirements also warn"
  );
  assert.equal(
    check(item("rin")).unmet,
    false,
    "No attribute requirements are invented for jewelry"
  );
  build.attributes.dexterity = 116;
  assert.equal(
    check(blade).unmet,
    false,
    "Exactly 136 dexterity meets the weapon requirement"
  );
  build.attributes.dexterity = 115;
  assert.equal(check(blade).unmet, true);
  const fallback = itemRequirements(
    undefined,
    shako,
    build.classId,
    buildStats(build).attributes,
    1
  );
  assert.equal(fallback.unmet, false, "Missing native data does not invent requirements");
  console.log(
    "Item requirements: allocation boundaries, gear and weapon swaps, stash exclusion, Hel, ethereal, upgraded/legacy bases and level passed."
  );
} finally {
  await server.close();
}
