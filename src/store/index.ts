import { defineStore } from "pinia";
import type { Lang } from "@/types";

interface TableHeaders {
  ru: string[];
  en: string[];
}

interface InterfaceState {
  table: {
    headers: TableHeaders;
  };
  markers: {
    ladder: { ru: string; en: string };
    new: { ru: string; en: string };
    reworked: { ru: string; en: string };
    bugged: { ru: string; en: string };
  };
  search: {
    placeholder: { ru: string; en: string };
  };
  runelist: {
    clear: { ru: string; en: string };
  };
  hints: {
    title: { ru: string; en: string };
  };
}

interface InfoState {
  lang: Lang;
  interface: InterfaceState;
}

export const useInfoStore = defineStore({
  id: "info-store",

  state: (): InfoState => {
    return {
      lang: "en",
      interface: {
        table: {
          headers: {
            ru: [
              "Рунное слово",
              "Руна",
              "Руна",
              "Руна",
              "Руна",
              "Руна",
              "Руна",
              "Тип предмета",
              "Уровень",
            ],
            en: [
              "Runeword",
              "Rune",
              "Rune",
              "Rune",
              "Rune",
              "Rune",
              "Rune",
              "Item Types",
              "Level",
            ],
          },
        },
        markers: {
          ladder: {
            ru: "ладдер",
            en: "L",
          },
          new: {
            ru: "новый",
            en: "new",
          },
          reworked: {
            ru: "переработан",
            en: "reworked",
          },
          bugged: {
            ru: "багнут",
            en: "bugged atm",
          },
        },
        search: {
          placeholder: {
            ru: "Поиск по названию или типу предмета",
            en: "Search by name or item type",
          },
        },
        runelist: {
          clear: {
            ru: "Сбросить",
            en: "Clear",
          },
        },
        hints: {
          title: {
            ru: "Подсказки",
            en: "Hints",
          },
        },
      },
    };
  },

  actions: {
    setLang(lang: Lang): void {
      this.lang = lang;
      localStorage.setItem("lang", lang);
    },
  },

  getters: {
    currentLang: (state): Lang => state.lang,
  },
});

export { useRunewordsStore } from "./runewords";
