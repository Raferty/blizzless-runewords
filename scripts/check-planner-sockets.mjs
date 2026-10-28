import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { createServer } from "vite";
import { read } from "@d2runewizard/d2s";
import { constants as defaults } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const planner = await server.ssrLoadModule("/src/utils/planner.ts");
  const { createGameSaveExporter, gameSaveEntries } = await server.ssrLoadModule(
    "/src/utils/planner-game-save.ts"
  );
  const { socketInserts, socketedBonuses } = await server.ssrLoadModule(
    "/src/utils/planner-sockets.ts"
  );
  const { socketPropertyLines } = await server.ssrLoadModule(
    "/src/utils/planner-item-catalog.ts"
  );
  const data = JSON.parse(await readFile("public/data/planner-save/data.json"));
  const codec = createGameSaveExporter(
    data,
    JSON.parse(await readFile("public/data/planner-save/strings.json"))
  );
  const constants = structuredClone(defaults);
  for (const [name, stat] of Object.entries(data.itemStatCost))
    constants.magical_properties[stat.id] = {
      ...constants.magical_properties[stat.id],
      s: name,
      sB: stat.savebits,
      sA: stat.saveadd,
      sP: stat.saveparambits,
      cB: stat.csvbits,
      // Assert decoded numbers; vanilla description strings omit Blizzless stats.
      dF: 0,
      e: Number(stat.encode ?? constants.magical_properties[stat.id]?.e ?? 0),
    };
  const jewels = socketInserts.filter((i) => i.baseCode);
  assert.equal(jewels.length, 14);
  for (const insert of jewels) {
    await access(`public${insert.image_url}`);
    const values = Object.fromEntries(
      Object.entries(insert.ranges).map(([key, range]) => [
        key,
        Math.floor((range.min + range.max) / 2),
      ])
    );
    const item = {
      name: "Bone Visage",
      baseCode: "uh9",
      quality: "normal",
      requiredLevel: 63,
      notes: "",
      bonuses: {},
      sockets: 3,
      socketedItems: [null, insert.code, "r22"],
      socketPropertyValues: { 1: values },
    };
    const build = planner.createBuild("sorceress");
    build.equipment.head = item;
    assert.deepEqual(planner.decodeBuild(planner.encodeBuild(build)), build);
    const effect = socketedBonuses(item);
    const native = codec.socketBonuses(insert.code, "helm", values);
    assert.equal(effect.bonuses.magicFind ?? 0, native.bonuses.magicFind ?? 0);
    assert.deepEqual(effect.skillBonuses, native.skillBonuses);
    assert(socketPropertyLines(codec, insert.code, "helm", 90, values).length >= 4);
    if (insert.group === "jewel") assert.equal(effect.bonuses.magicFind, 25);
    const key = Object.keys(values)[0];
    assert.throws(() =>
      planner.parsePlannerItem({
        ...item,
        socketPropertyValues: { 1: { [key]: insert.ranges[key].max + 1 } },
      })
    );
    const options = { name: "SocketTest", choices: {}, rolls: {} };
    for (const entry of gameSaveEntries(build)) {
      options.choices[entry.key] = codec.defaultChoice(entry, build);
      options.rolls[entry.key] = "planned";
    }
    const bytes = await codec.exportCharacter(build, options);
    const saved = await read(bytes, constants, {
      disableItemEnhancements: true,
      extendedStash: true,
    });
    const parent = saved.items.find((i) => i.type === "uh9");
    assert.equal(parent.total_nr_of_sockets, 3);
    assert.equal(parent.socketed_items.length, 2);
    const [child, rune] = parent.socketed_items;
    assert.equal(child.type, insert.baseCode);
    assert.equal(child.quality, 7);
    assert.equal(child.unique_id, data.uniqueItems[insert.code].saveId);
    assert.equal(child.simple_item, 0);
    assert(child.magic_attributes.length >= 4);
    assert.equal(rune.type, "r22");
    if (insert.group === "jewel") {
      const mf = child.magic_attributes.find(
        (s) => s.id === data.itemStatCost.item_magicbonus.id
      );
      assert.deepEqual(mf.values, [25]);
    }
  }
  assert(
    socketPropertyLines(codec, "unique395", "helm").includes(
      "Adds 37 Poison Damage Over 2 Seconds"
    )
  );
  console.log(
    "14 jewel variants: socket selection data, images, custom rolls, summary, JSON and independent .d2s readback passed."
  );
} finally {
  await server.close();
}
