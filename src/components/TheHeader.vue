<template>
  <header class="header">
    <div class="container header__container">
      <div class="header__logo">
        <img src="/images/logo.png" alt="Blizzless runewords" class="header__image" />
        <h1 class="title title--h1 header__title">Blizzless runewords</h1>
      </div>

      <div class="header__actions">
        <p class="header__date">
          {{ store.interface.header.updatedAt[store.currentLang] }}
          <time :datetime="releaseDate">{{ formattedReleaseDate }}</time>
        </p>
        <LangSwitcher />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import LangSwitcher from "@/components/LangSwitcher.vue";
import { useInfoStore } from "@/store";

const store = useInfoStore();
const releaseDate = import.meta.env.VITE_RELEASE_DATE;
const formattedReleaseDate = releaseDate.split("-").reverse().join(".");
</script>

<style lang="scss" scoped>
.header {
  padding: 8px 0;
  margin-bottom: 8px;
  border-bottom: 2px solid var(--color-border);

  @media (min-width: 1024px) {
    margin-bottom: 16px;
  }

  &__title {
    color: var(--color-title);
  }

  &__container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
    justify-content: space-between;
  }

  &__image {
    width: 32px;
    height: 32px;
  }

  &__logo {
    display: flex;
    gap: 16px;
    align-items: center;
    min-width: 0;
  }

  &__actions {
    display: flex;
    flex-shrink: 0;
    gap: 16px;
    align-items: center;
    margin-left: auto;
  }

  &__date {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    color: var(--color-muted);
    white-space: nowrap;
  }
}

.container {
  padding-right: 8px;
  padding-left: 8px;

  @media (min-width: 1024px) {
    padding-right: 16px;
    padding-left: 16px;
  }
}

.title {
  font-size: 22px;
  line-height: 110%;

  @media (min-width: 1024px) {
    font-size: 28px;
  }
}
</style>
