import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { writeFile } from "node:fs/promises";

// Animation lengths/speeds come from the same launcher revision as Skills.txt.
const sha256 = "d121311e24e9c73e027a656a58489e08cbdc8d3fc79e1dc8e46f66446ff1cb47";
const url = "https://blizzless.info/api/launcher-mods/blobs/" + sha256;
const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
if (!response.ok) throw new Error(`Animation data: HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash("sha256").update(bytes).digest("hex") !== sha256)
  throw new Error("Animation data checksum mismatch");
const classes = {
  amazon: "AM",
  sorceress: "SO",
  necromancer: "NE",
  paladin: "PA",
  barbarian: "BA",
  druid: "DZ",
  assassin: "AI",
  warlock: "WK",
};
const animations = {};
let offset = 0;
for (let bucket = 0; bucket < 256; bucket++) {
  const count = bytes.readUInt32LE(offset);
  offset += 4;
  for (let i = 0; i < count; i++, offset += 160) {
    const name = bytes.toString("ascii", offset, offset + 8).replace(/\0.*$/, "");
    if (
      Object.values(classes).includes(name.slice(0, 2)) &&
      /^(SC|A1|A2|S1)$/.test(name.slice(2, 4))
    )
      animations[name] = {
        frames: bytes.readUInt32LE(offset + 8),
        speed: bytes.readUInt32LE(offset + 12),
      };
  }
}
if (offset !== bytes.length) throw new Error("Unexpected animation layout");
for (const code of Object.values(classes))
  if (!animations[code + "SCHTH"]) throw new Error(`Missing ${code} cast animation`);
await writeFile(
  new URL("../src/shared/planner-combat.json", import.meta.url),
  JSON.stringify(
    {
      source: { url, sha256, manifestVersion: 1792771561313 },
      classes,
      animations,
    },
    null,
    2
  ) + "\n"
);
console.log(`Combat animations: ${Object.keys(animations).length} player records`);
