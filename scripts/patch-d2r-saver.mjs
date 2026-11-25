import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// d2r-saver 0.2.0 omits the quest-item difficulty field before the socket count.
// Keep the dependency pinned and verify the complete upstream file before patching.
const file = new URL(
  "../node_modules/d2r-saver/dist/formats/item-parser.js",
  import.meta.url
);
const original = "e7ad29f319e4aa18169ab60dc88068d7c5ce7dcb96a11e00f9371d8cec9c4393";
const before =
  "        const base = (gd.items[baseId] || {});\n        let socketedItemsCount = 0;";
const after =
  "        const base = (gd.items[baseId] || {});\n        // Planner: quest difficulty precedes the one-bit socket count.\n        const questItem = base.questdiffcheck && isSubType(gd, base.type, 'ques');\n        if (questItem) reader.skipbits(gd.itemStatCost.questitemdifficulty.savebits);\n        let socketedItemsCount = 0;";
const countBefore =
  "            socketedItemsCount = reader.bits(3);\n            const types = itemGetTypes(gd, baseId);";
const countAfter =
  "            socketedItemsCount = reader.bits(questItem ? 1 : 3);\n            const types = itemGetTypes(gd, baseId);";
const registerBefore =
  "        else if ((gd.items[item.base] && itemTypeTreeFilter(gd.items[item.base].type)) ||";
const legacyRegisterAfter =
  "        else if ((gd.items[item.base] && (itemTypeTreeFilter(gd.items[item.base].type) || questItem)) ||";
const questRegisterAfter =
  "        else if ((gd.items[item.base] && (itemTypeTreeFilter(gd.items[item.base].type) || isSubType(gd, gd.items[item.base].type, 'ques'))) ||";
const registerAfter = questRegisterAfter.replace(
  "itemTypeTreeFilter(",
  "base.type === 'elix' || itemTypeTreeFilter("
);
// Keep separate records for preset stacks with different quantities. Cube and
// belt records must also include the complete bytes of any socketed children.
const locationBefore = "        // ── Validate / store / emit";
const locationAfter =
  `        if (((location === 0 || location === 4) && storage === 4) || location === 2 ||
            (location !== 6 && base.stackable && presetItemIds.has(item.base))) {
            item.binaryOffset.end = reader.bitpos;
            items[idIn] = item;
            emitLocation(idIn, location, bodyloc, storage, invrow, invcol, item, handler);
            return;
        }
` + locationBefore;
// Preserve the base modifier IDs even when a runeword masks the base quality.
const baseModifiers = [
  [
    "mods.push(`am${mkid(reader.bits(11))}`);",
    "item.autoAffixId = reader.bits(11); mods.push(`am${mkid(item.autoAffixId)}`);",
  ],
  [
    "mods.push(`qm${mkid(reader.bits(3))}`);",
    "item.superiorId = reader.bits(3); mods.push(`qm${mkid(item.superiorId)}`);",
  ],
  [
    "if (runeword)\n                parseStats();",
    "if (runeword) { item.baseStats = { ...stats }; parseStats(); }",
  ],
];
const source = await readFile(file, "utf8");
const unpatched = baseModifiers
  .reduce((text, [before, after]) => text.replace(after, before), source)
  .replace(locationAfter, locationBefore)
  .replace(after, before)
  .replace(countAfter, countBefore)
  .replace(registerAfter, registerBefore)
  .replace(questRegisterAfter, registerBefore)
  .replace(legacyRegisterAfter, registerBefore);
if (createHash("sha256").update(unpatched).digest("hex") !== original)
  throw Error("d2r-saver item parser changed; review the planner reader patches");
const patched = baseModifiers
  .reduce((text, [before, after]) => text.replace(before, after), unpatched)
  .replace(locationBefore, locationAfter)
  .replace(before, after)
  .replace(countBefore, countAfter)
  .replace(registerBefore, registerAfter);
if (source !== patched) {
  await writeFile(file, patched);
  console.log("Patched d2r-saver 0.2.0 item reader");
}

// Each corpse has its own 12-byte descriptor immediately before its item list.
const readerFile = new URL("../node_modules/d2r-saver/dist/formats/d2s-reader.js", import.meta.url);
const readerSource = await readFile(readerFile, "utf8");
const oldLoop = "        reader.skip(corpses * 12);\n        for (let i = 0; i < corpses; ++i) {";
const newLoop = "        for (let i = 0; i < corpses; ++i) {\n            reader.skip(12);";
const originalReader = readerSource.replace(newLoop, oldLoop);
if (createHash("sha256").update(originalReader).digest("hex") !== "817a52c8d5e4687ca3551e77d4655949b6b017ecc8eba9d82a5e0d6f1ffada6c")
  throw Error("d2r-saver character reader changed; review corpse decoding");
if (readerSource.includes(oldLoop)) await writeFile(readerFile, readerSource.replace(oldLoop, newLoop));
