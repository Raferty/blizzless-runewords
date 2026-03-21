/**
 * Pure runeword-related helpers
 */

/** Returns true if all rune ids in `what` are present in `where` */
export function isComplete(where: number[], what: number[]): boolean {
  const have = new Set(where);
  return what.every((id) => have.has(id));
}
