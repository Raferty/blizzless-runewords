/**
 * Pure array utilities
 */

export function sortByField<T extends Record<string, unknown>>(
  array: T[],
  field: string
): T[] {
  const copy = [...array];
  const withDot = field.includes(".");
  if (withDot) {
    const [field1, field2] = field.split(".");
    return copy.sort((a, b) => {
      const aVal = (a[field1] as Record<string, unknown>)?.[field2];
      const bVal = (b[field1] as Record<string, unknown>)?.[field2];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  }
  return copy.sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });
}

export function splitToNChunks<T>(array: T[], n: number): T[][] {
  const result: T[][] = [];
  const copy = [...array];
  for (let i = n; i > 0; i--) {
    result.push(copy.splice(0, Math.ceil(copy.length / i)));
  }
  return result;
}
