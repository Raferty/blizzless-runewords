import { defineStore } from 'pinia';

export const useInfoStore = defineStore({
  id: 'info-store',

  state: () => {
    return {
      lang: 'en',
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
            ]
          }
        }
      }
    };
  },

  actions: {
    setLang(lang) {
      this.lang = lang;
      localStorage.setItem('lang', lang);
    }
  },

  getters: {
    currentLang: (state) => state.lang,
  },

});
