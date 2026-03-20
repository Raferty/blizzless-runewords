/**
 * Pure runeword-related helpers
 */

/** Returns true if all rune ids in `what` are present in `where` */
export function isComplete(where: number[], what: number[]): boolean {
  for (let i = 0; i < what.length; i++) {
    if (where.indexOf(what[i]) === -1) return false;
  }
  return true;
}
