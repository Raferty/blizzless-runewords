/** Localized string (ru/en) */
export interface LocalizedName {
  ru: string;
  en: string;
}

/** Runeword item (list/table in App) */
export interface RunewordItem {
  id: number;
  name: LocalizedName;
  runes: number[];
  types?: number[];
  level: number;
  [key: string]: unknown;
}

/** Runeword row in table (with optional display fields) */
export interface RunewordTableItem extends RunewordItem {
  complete?: boolean;
  stats?: Record<string, string[]>;
  bugged?: { status?: boolean; message?: string[] };
  excluded?: string[];
  classes?: string[];
}

/** Runeword for card modal (all optional, supports "old" version) */
export interface RunewordCardItem {
  id?: number;
  name?: LocalizedName;
  runes?: number[];
  types?: number[];
  level?: number;
  stats?: Record<string, string[]>;
  bugged?: { status?: boolean; message?: string[] };
  excluded?: string[];
  classes?: string[];
  old?: {
    types?: number[];
    runes?: number[];
    stats?: Record<string, string[]>;
  };
  [key: string]: unknown;
}
