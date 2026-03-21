import type { Lang } from "@/types/lang";

/** Текущий язык UI из `localStorage` (как в Pinia `useInfoStore`). */
export function getStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("lang") ?? "en") as Lang;
}
