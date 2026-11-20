import type { PlannerBuild } from "@/types/planner";
import { decodeBuild, parseBuild } from "./planner";

const prefix = "gz1.";
const maxEncodedLength = 120000;
const maxLegacyBytes = 90000;
// Imported item metadata and a full stash can exceed the old uncompressed limit.
export const maxSharedBuildBytes = 1024 * 1024;
const encodeBytes = (bytes: Uint8Array) =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export async function encodeSharedBuild(build: PlannerBuild): Promise<string> {
  const snapshot = new TextEncoder().encode(JSON.stringify(build));
  if (snapshot.length > maxSharedBuildBytes) throw new Error("size");
  const legacy = snapshot.length <= maxLegacyBytes ? encodeBytes(snapshot) : undefined;
  if (typeof CompressionStream !== "undefined") {
    try {
      const stream = new Blob([snapshot])
        .stream()
        .pipeThrough(new CompressionStream("gzip"));
      const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
      const encoded = prefix + encodeBytes(bytes);
      if (
        encoded.length <= maxEncodedLength &&
        (!legacy || encoded.length < legacy.length)
      )
        return encoded;
    } catch {
      // Older browsers can still generate legacy links for smaller snapshots.
    }
  }
  if (legacy) return legacy;
  throw new Error("size");
}

export async function createBuildShareUrl(build: PlannerBuild) {
  const url = new URL("https://raferty.github.io/blizzless-runewords/");
  const encoded = await encodeSharedBuild(build);
  url.search = "";
  url.hash = `/planner?build=${encoded}`;
  return url.href;
}

export async function decodeSharedBuild(encoded: string): Promise<PlannerBuild> {
  if (!encoded.startsWith(prefix)) return decodeBuild(encoded);
  if (encoded.length > maxEncodedLength) throw new Error("size");
  const bytes = Uint8Array.from(
    atob(encoded.slice(prefix.length).replace(/-/g, "+").replace(/_/g, "/")),
    (c) => c.charCodeAt(0)
  );
  const reader = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
    .getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxSharedBuildBytes) {
        await reader.cancel();
        throw new Error("size");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const json = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    json.set(chunk, offset);
    offset += chunk.length;
  }
  return parseBuild(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(json)));
}
