import { useInfoStore } from "@/store";

export function useText() {
  const store = useInfoStore();
  return (ru: string, en: string): string => (store.currentLang === "ru" ? ru : en);
}
