import { readFile } from "node:fs/promises";

// The catalog is based on the October launcher. Apply only to that snapshot
// so later launcher changes take precedence when the catalog is refreshed.
export const octoberManifest = 1792771561313;
export const bartucChanges = JSON.parse(
  await readFile(new URL("./data/bartuc-item-changes.json", import.meta.url))
);

export function applyBartucItemChanges(data) {
  for (const [table, changes] of Object.entries(bartucChanges)) {
    for (const [name, fields] of Object.entries(changes)) {
      const row = Object.values(data[table]).find((r) => (r.index ?? r.name) === name);
      if (!row) throw new Error(`Missing ${table} entry for ${name}`);
      for (const [key, value] of Object.entries(fields)) {
        if (value === null) delete row[key];
        else row[key] = value;
      }
    }
  }
}
