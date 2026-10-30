import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createServer } from "vite";
import { read } from "@d2runewizard/d2s";
import { constants as defaults } from "@d2runewizard/d2s/lib/data/versions/105_constant_data.js";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false },
  appType: "custom",
});
try {
  const supplies = await server.ssrLoadModule("/src/utils/planner-supplies.ts");
  const planner = await server.ssrLoadModule("/src/utils/planner.ts");
  const { stageStashItems, gridItemCells, stashSize } = await server.ssrLoadModule(
    "/src/utils/planner-stash.ts"
  );
  const { createItemCatalog } = await server.ssrLoadModule(
    "/src/utils/planner-item-catalog.ts"
  );
  const { plannerItemImage, plannerItemDimensions } = await server.ssrLoadModule(
    "/src/utils/planner-item-art.ts"
  );
  const { createGameSaveExporter, gameSaveEntries, saveChecksum } =
    await server.ssrLoadModule("/src/utils/planner-game-save.ts");
  const bytes = await readFile("public/data/planner-save/data.json");
  const data = JSON.parse(bytes);
  const snapshot = JSON.parse(await readFile("src/shared/planner-supplies.json"));
  assert.equal(
    snapshot.source.gameDataSha256,
    createHash("sha256").update(bytes).digest("hex")
  );
  const native = createGameSaveExporter(
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
      e: stat.encode ?? constants.magical_properties[stat.id]?.e,
    };
  let saves = 0;
  async function verify(build, items) {
    const staged = stageStashItems(build, items);
    assert(staged, "the complete batch fits");
    const original = JSON.stringify(build);
    const next = planner.parseBuild({ ...build, stash: staged });
    assert.deepEqual(planner.decodeBuild(planner.encodeBuild(next)), next);
    const choices = Object.fromEntries(
      gameSaveEntries(next).map((entry) => [entry.key, native.defaultChoice(entry, next)])
    );
    const output = await native.exportCharacter(next, {
      name: "SupplyTest",
      choices,
      rolls: {},
    });
    assert.equal(
      new DataView(output.buffer, output.byteOffset, output.byteLength).getUint32(
        12,
        true
      ),
      saveChecksum(output)
    );
    const parsed = await read(output, constants, {
      disableItemEnhancements: true,
      extendedStash: true,
    });
    assert.equal(parsed.items.length, staged.length);
    assert.deepEqual(
      parsed.items.map((item) => item.type),
      staged.map((item) => item.baseCode)
    );
    const occupied = new Set();
    parsed.items.forEach((item, index) => {
      const expected = staged[index];
      if (!item.simple_item)
        assert.equal(
          item.quality,
          expected.quality === "unique" ? 7 : expected.quality === "magic" ? 4 : 2
        );
      assert.equal(item.alt_position_id, 5);
      assert.equal(
        item.position_y * stashSize.columns + item.position_x,
        expected.stashPosition
      );
      const size = plannerItemDimensions(expected);
      const cells = gridItemCells(expected.stashPosition, ...size);
      assert(cells.every((cell) => !occupied.has(cell)));
      cells.forEach((cell) => occupied.add(cell));
      if (["qey", "qhr", "qbr"].includes(item.type)) {
        assert.equal(item.simple_item, 1);
        assert.equal(
          item.quest_difficulty,
          ["normal", "nightmare", "hell"].indexOf(build.difficulty)
        );
      }
      if (expected.catalogId)
        assert.equal(item.unique_id, data.uniqueItems[expected.catalogId].saveId);
      if (data.misc[item.type]?.compactsave) assert.equal(item.simple_item, 1);
    });
    // Both readers must stay aligned across compact quest items, unique weapons and materials.
    const own = native.readCharacter(output);
    assert.equal(own.warnings.length, 0);
    const ownItems = own.profile.stash
      .filter((id) => id !== undefined)
      .map((id) => own.items[id]);
    assert.equal(ownItems.length, staged.length);
    assert.deepEqual(
      ownItems.map((item) => item.base),
      staged.map((item) => item.baseCode)
    );
    assert.equal(
      JSON.stringify(build),
      original,
      "staging and export leave the original build intact"
    );
    saves++;
    return parsed;
  }
  const build = planner.createBuild("sorceress");
  build.level = 99;
  const catalog = createItemCatalog(native, build, { key: "stash", owner: "stash" }, []);
  const loose = Object.keys(supplies.stashSupplies).map((code) => {
    const item = supplies.createStashSupply(native, code);
    assert(
      catalog.items.some(
        (row) => row.bases.includes(code) && row.quality === item.quality
      ),
      `${code} is selectable`
    );
    assert(plannerItemImage(item), `${code} has native artwork`);
    assert(plannerItemDimensions(item), `${code} has dimensions`);
    for (const owner of ["hero", "mercenary", "charm"])
      assert(
        !native
          .choices(
            {
              key: "blocked",
              owner,
              slot: owner === "charm" ? undefined : "mainHand",
              height: 1,
              item,
            },
            build
          )
          .some((row) => row.base === code),
        `${code} is stash only`
      );
    return item;
  });
  for (let i = 0; i < loose.length; i += 50) await verify(build, loose.slice(i, i + 50));
  assert.equal(loose.filter((item) => /^r\d\d$/.test(item.baseCode)).length, 33);
  assert.equal(
    loose.filter((item) => supplies.stashSupplies[item.baseCode].category === "gem")
      .length,
    35
  );
  for (const difficulty of ["normal", "nightmare", "hell"]) {
    const questBuild = { ...build, difficulty };
    await verify(
      questBuild,
      supplies.stashKits.flatMap((kit) =>
        kit.codes.map((code) => supplies.createStashSupply(native, code))
      )
    );
  }
  assert.deepEqual(supplies.stashKits.find((kit) => kit.id === "respec").codes, [
    "toa",
    "tes",
    "ceh",
    "bet",
    "fed",
  ]);
  assert.deepEqual(supplies.stashKits.find((kit) => kit.id === "organs").codes, [
    "dhn",
    "bey",
    "mbr",
  ]);
  assert(
    !supplies.recipeInputs["Envenomed Dagger"],
    "disabled recipes cannot add ingredients"
  );
  let variants = 0;
  for (const [key, rows] of Object.entries(supplies.recipeInputs)) {
    for (const [index, row] of rows.entries()) {
      const codes = row.parts.map((part) => part.codes[0]);
      const items = supplies.createRecipeIngredients(native, key, index, codes);
      assert.equal(
        items.length,
        row.parts.reduce((n, part) => n + part.count, 0)
      );
      await verify(build, items);
      assert.throws(() =>
        supplies.createRecipeIngredients(native, key, index, ["bg1", ...codes.slice(1)])
      );
      variants++;
    }
  }
  const caster = supplies.recipeInputs.caster_amulet[0];
  const parts = supplies.createRecipeIngredients(
    native,
    "caster_amulet",
    0,
    caster.parts.map((part) => part.codes[0])
  );
  assert.deepEqual(
    parts.map((item) => item.baseCode),
    ["amu", "jew", "r08", "gpv"]
  );
  assert.deepEqual(
    parts.map((item) => item.quality),
    ["magic", "magic", "normal", "normal"]
  );
  const sphere = supplies.recipeInputs.hora_sphere[0];
  assert.deepEqual(
    supplies
      .createRecipeIngredients(
        native,
        "hora_sphere",
        0,
        sphere.parts.map((part) => part.codes[0])
      )
      .map((item) => item.baseCode),
    Array(12).fill("cr1")
  );
  const occupiedBuild = structuredClone(build);
  occupiedBuild.stash = Array.from({ length: 99 }, () =>
    supplies.createStashSupply(native, "r01")
  );
  const before = JSON.stringify(occupiedBuild);
  assert.equal(stageStashItems(occupiedBuild, parts), undefined);
  assert.equal(
    JSON.stringify(occupiedBuild),
    before,
    "item limit cannot partially add ingredients"
  );
  occupiedBuild.stash = Array.from({ length: 34 }, (_, i) => ({
    ...supplies.createStashSupply(native, "qf1"),
    stashPosition: Math.floor(i / 8) * 48 + (i % 8) * 2,
  }));
  assert.equal(
    stageStashItems(occupiedBuild, parts),
    undefined,
    "invalid/overflowed layouts cannot lose existing items"
  );
  occupiedBuild.stash = occupiedBuild.stash.slice(0, 32);
  occupiedBuild.stash.push(
    ...Array.from({ length: 16 }, (_, i) => ({
      ...supplies.createStashSupply(native, "r01"),
      stashPosition: 192 + i,
    }))
  );
  const full = JSON.stringify(occupiedBuild);
  assert.equal(occupiedBuild.stash.length, 48, "the item-count limit is not the blocker");
  assert.equal(
    stageStashItems(occupiedBuild, parts),
    undefined,
    "a valid full grid rejects the entire recipe"
  );
  assert.equal(JSON.stringify(occupiedBuild), full);
  console.log(
    `Planner supplies: ${loose.length} loose bases, 4 sets, ${Object.keys(supplies.recipeInputs).length} recipes / ${variants} variants, ${saves} independent native saves`
  );
} finally {
  await server.close();
}
