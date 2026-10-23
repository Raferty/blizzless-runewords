export type SelectValue = string | number | null;

export interface SelectOption<T extends SelectValue = SelectValue> {
  label: string;
  value: T;
}
