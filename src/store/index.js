import { defineStore } from "pinia";

export const useInfoStore = defineStore({
  id: "info-store",

  state: () => {
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
            ru: "Поиск по названию",
            en: "Search by name",
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
    setLang(lang) {
      this.lang = lang;
      localStorage.setItem("lang", lang);
    },
  },

  getters: {
    currentLang: (state) => state.lang,
  },
});
