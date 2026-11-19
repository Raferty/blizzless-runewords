import type { PlannerBuild } from "@/types/planner";
import { decodeBuild, encodeBuild, parseBuild } from "./planner";

const prefix = "gz1.";
// Match the decoded size allowed by legacy base64 links (120,000 characters).
const maxBytes = 90000;

export async function encodeSharedBuild(build: PlannerBuild): Promise<string> {
  const legacy = encodeBuild(build);
  const json = new Blob([JSON.stringify(build)]);
  if (typeof CompressionStream === "undefined" || json.size > maxBytes) return legacy;
  try {
    const stream = json.stream().pipeThrough(new CompressionStream("gzip"));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    const encoded =
      prefix +
      btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
    return encoded.length < legacy.length ? encoded : legacy;
  } catch {
    return legacy;
  }
}

export async function decodeSharedBuild(encoded: string): Promise<PlannerBuild> {
  if (!encoded.startsWith(prefix)) return decodeBuild(encoded);
  if (encoded.length > 120000) throw new Error("size");
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
      if (size > maxBytes) {
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
