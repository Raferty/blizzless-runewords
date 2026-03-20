import { computed, watch, type ComputedRef } from "vue";
import { useInfoStore } from "@/store";
import type { Lang } from "@/types";

let didInit = false;

export function useLangSwitcher(): {
  currentLang: ComputedRef<Lang>;
  setLang: (lang: Lang) => void;
} {
  const store = useInfoStore();

  const setHtmlLang = (lang: Lang): void => {
    document.querySelector("html")?.setAttribute("lang", lang);
  };

  if (!didInit) {
    didInit = true;

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lang") as Lang | null;
      const lang: Lang = saved === "ru" ? "ru" : "en";

      store.setLang(lang);
      setHtmlLang(lang);
    }
  }

  watch(
    () => store.currentLang,
    (lang) => {
      setHtmlLang(lang);
    },
    { flush: "sync" }
  );

  const currentLang = computed(() => store.currentLang);

  const setLang = (lang: Lang): void => {
    store.setLang(lang);
  };

  return { currentLang, setLang };
}
