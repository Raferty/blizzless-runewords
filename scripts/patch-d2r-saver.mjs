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
const registerAfter =
  "        else if ((gd.items[item.base] && (itemTypeTreeFilter(gd.items[item.base].type) || questItem)) ||";
const source = await readFile(file, "utf8");
const unpatched = source
  .replace(after, before)
  .replace(countAfter, countBefore)
  .replace(registerAfter, registerBefore);
if (createHash("sha256").update(unpatched).digest("hex") !== original)
  throw Error("d2r-saver item parser changed; review the quest-difficulty patch");
const patched = unpatched
  .replace(before, after)
  .replace(countBefore, countAfter)
  .replace(registerBefore, registerAfter);
if (source !== patched) {
  await writeFile(file, patched);
  console.log("Patched d2r-saver 0.2.0 quest-item reader");
}
