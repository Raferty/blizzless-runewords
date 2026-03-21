/** Rune from constants (RUNES list) */
export interface RuneItem {
  id: number;
  name: Record<string, string>;
  image_url: string;
  [key: string]: unknown;
}
