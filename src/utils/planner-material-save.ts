import { BitReader } from "@d2runewizard/d2s/lib/binary/bitreader";
import { readItems, writeItems } from "@d2runewizard/d2s/lib/d2/items";
import { write as writeStash } from "@d2runewizard/d2s/lib/d2/stash";
import type { types } from "@d2runewizard/d2s";
import { unzipSync, zipSync } from "fflate";
import slots from "@/shared/planner-material-slots.json";
import { materialSlotLimit } from "@/shared/planner";
import type { PlannerBuild } from "@/types/planner";

const version = 105;
const headerSize = 64;
const sharedGridPages = 9;
const magic = 0xaa55aa55;
const codes = new Set(slots.map((slot) => slot.code));
export const maxStashSize = 4_000_000;
const config = { disableItemEnhancements: true, extendedStash: true };
const stashName = (hardcore: boolean) =>
  `ModernSharedStash${hardcore ? "Hard" : "Soft"}CoreV2.d2i`;

function materialSection(bytes: Uint8Array, hardcore: boolean) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + headerSize <= bytes.length) {
    const length = view.getUint32(offset + 16, true);
    if (
      view.getUint32(offset, true) !== magic ||
      view.getUint32(offset + 8, true) !== version ||
      view.getUint32(offset + 4, true) !== (hardcore ? 0 : 2) ||
      length < headerSize ||
      length > bytes.length - offset
    )
      break;
    if (
      bytes[offset + 20] === 1 &&
      bytes[offset + 64] === 74 &&
      bytes[offset + 65] === 77
    )
      return { offset, end: offset + length };
    offset += length;
  }
  throw new Error("Invalid RotW materials stash");
}

export function materialSaveCodec(
  constants: types.IConstantData,
  baseFor: (code: string) => { simple: boolean; quest: boolean }
) {
  // Custom quest items can share a vanilla code but use a different bit layout.
  const materialConstants = {
    ...constants,
    other_items: { ...constants.other_items },
    stackables: { ...constants.stackables },
  };
  for (const code of codes) {
    materialConstants.other_items[code] = {
      ...materialConstants.other_items[code],
      c: baseFor(code).quest ? ["Quest"] : [],
    };
    materialConstants.stackables[code] = false;
  }

  async function readMaterials(bytes: Uint8Array, hardcore: boolean) {
    const { offset, end } = materialSection(bytes, hardcore);
    const payload = Uint8Array.from(bytes.subarray(offset + headerSize, end));
    if (
      payload.length < 4 ||
      new DataView(payload.buffer).getUint16(2, true) > codes.size
    )
      throw new Error("Invalid materials page");
    const reader = new BitReader(payload.buffer);
    const items = await readItems(reader, version, materialConstants, config);
    if (reader.offset !== payload.length * 8)
      throw new Error("Invalid materials payload");
    const counts = Object.fromEntries(slots.map(({ code }) => [code, 0]));
    for (const item of items) {
      const count = item.amount_in_shared_stash ?? 1;
      if (
        !codes.has(item.type) ||
        counts[item.type] ||
        count < 1 ||
        count > materialSlotLimit
      )
        throw new Error("Unsupported material stack");
      counts[item.type] = count;
    }
    return counts;
  }

  async function makeArchive(
    build: PlannerBuild,
    name: string,
    character: Uint8Array,
    original?: Uint8Array
  ) {
    const items: types.IItem[] = [];
    for (const { code } of slots) {
      const count = build.materials[code];
      if (!Number.isInteger(count) || count < 0 || count > materialSlotLimit)
        throw new Error("Invalid material count");
      if (!count) continue;
      const base = baseFor(code);
      items.push({
        type: code,
        identified: 1,
        version: "101",
        simple_item: Number(base.simple),
        quality: 2,
        level: 1,
        id: crypto.getRandomValues(new Uint32Array(1))[0],
        location_id: 0,
        alt_position_id: 5,
        categories: base.quest ? ["Quest"] : [],
        magic_attributes: [],
        nr_of_items_in_sockets: 0,
        _unknown_data: { chest_stackable: 1 },
        amount_in_shared_stash: count,
      } as unknown as types.IItem);
    }
    let stash: Uint8Array;
    if (original) {
      await readMaterials(original, build.hardcore);
      const { offset, end } = materialSection(original, build.hardcore);
      const payload = await writeItems(items, version, materialConstants, config);
      stash = new Uint8Array(
        original.length - (end - offset - headerSize) + payload.length
      );
      stash.set(original.subarray(0, offset + headerSize));
      new DataView(stash.buffer).setUint32(
        offset + 16,
        headerSize + payload.length,
        true
      );
      stash.set(payload, offset + headerSize);
      stash.set(original.subarray(end), offset + headerSize + payload.length);
      // Repair the shorter layout emitted by older planner exports.
      if (
        offset === 5 * 68 &&
        original.length - end === 84 &&
        original[end + 20] === 0 &&
        new DataView(original.buffer, original.byteOffset + end).getUint32(64, true) === 0xc0eaedc0
      ) {
        const emptyPage = new Uint8Array(68);
        emptyPage.set(original.subarray(0, 12));
        emptyPage[16] = 68;
        emptyPage.set([74, 77], headerSize);
        const missingPages = sharedGridPages - 5;
        const expanded = new Uint8Array(stash.length + missingPages * 68 + 64);
        expanded.set(stash.subarray(0, offset));
        for (let index = 0; index < missingPages; index++)
          expanded.set(emptyPage, offset + index * 68);
        expanded.set(stash.subarray(offset), offset + missingPages * 68);
        const chronicleOffset = expanded.length - 148;
        expanded[chronicleOffset + 16] = 148;
        expanded[chronicleOffset + 20] = 2;
        stash = expanded;
      }
    } else {
      const pages = Array.from({ length: sharedGridPages + 1 }, (_, index) => ({
        name: "",
        type: 0,
        isStackable: Number(index === sharedGridPages),
        items: index === sharedGridPages ? items : [],
      }));
      stash = await writeStash(
        {
          version: "105",
          type: 0,
          pageCount: pages.length,
          sharedGold: 0,
          hardcore: build.hardcore,
          pages,
          chronicle: {
            setItems: [],
            uniqueItems: [],
            runewords: [],
            _unknown_data: {
              envelopePadding: Uint8Array.of(2, ...new Uint8Array(43)),
              trailing: new Uint8Array(64),
              originalCounts: { setItems: 0, uniqueItems: 0, runewords: 0 },
            },
          },
        },
        materialConstants,
        version,
        config
      );
    }
    const verified = await readMaterials(stash, build.hardcore);
    if (slots.some(({ code }) => verified[code] !== build.materials[code]))
      throw new Error("Material verification failed");
    return zipSync({ [`${name}.d2s`]: character, [stashName(build.hardcore)]: stash });
  }
  return { readMaterials, makeArchive };
}

export function unpackMaterialArchive(bytes: Uint8Array) {
  let total = 0;
  const files = unzipSync(bytes, {
    filter: (entry) => {
      if (!/^[^/\\]+\.(d2s|d2i)$/i.test(entry.name)) return false;
      total += entry.originalSize;
      if (total > maxStashSize) throw new Error("Save archive too large");
      return true;
    },
  });
  const entries = Object.entries(files);
  const hero = entries.find(([name]) => /\.d2s$/i.test(name));
  const stash = entries.find(([name]) => /\.d2i$/i.test(name));
  if (entries.length !== 2 || !hero || !stash)
    throw new Error("Expected one character and one stash");
  return { character: hero[1], stash: stash[1] };
}
