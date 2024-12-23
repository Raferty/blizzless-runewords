<template>
  <header class="header">
    <div class="container header__container">
      <div class="header__logo">
        <img
          src="/images/logo.png"
          alt="Blizzless runewords"
          class="header__image"
        />
        <h1 class="title title--h1 header__title">Blizzless runewords</h1>
      </div>

      <div class="lang">
        <div
          class="lang__item"
          :class="{ 'lang__item--active': store.currentLang === 'en' }"
          @click="setLang('en')"
        >
          EN
        </div>
        <div
          class="lang__item"
          :class="{ 'lang__item--active': store.currentLang === 'ru' }"
          @click="setLang('ru')"
        >
          RU
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useInfoStore } from "@/store/index.js";

const store = useInfoStore();

const setLang = (lang: string) => {
  document.querySelector("html").setAttribute("lang", lang || "ru");
  store.setLang(lang);
};
</script>

<style lang="scss" scoped>
.header {
  //margin: 0 auto;
  max-width: 1100px;
  padding: 16px 0;
  border-bottom: 4px solid #bab197;
  margin-bottom: 16px;

  @media (min-width: 1024px) {
    margin-bottom: 32px;
  }

  &__title {
    color: #ecd2a8;
  }

  &__container {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__image {
    width: 48px;
    height: 48px;
  }

  &__logo {
    display: flex;
    gap: 16px;
    align-items: center;
    //color: #242c53;
  }
}

.lang {
  display: flex;
  align-items: center;
  gap: 12px;

  &__item {
    color: #844;
    cursor: pointer;

    &--active {
      color: #44aa44;
    }
  }
}

.container {
  padding-left: 8px;
  padding-right: 8px;

  @media (min-width: 1024px) {
    padding-left: 16px;
    padding-right: 16px;
  }
}

.title {
  font-size: 28px;
  line-height: 110%;

  @media (min-width: 1024px) {
    font-size: 34px;
  }
}
</style>
