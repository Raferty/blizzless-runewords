<template>
  <header class="header">
    <div class="container header__container">
      <div class="header__logo">
        <img src="/images/logo.png" alt="Blizzless runewords" class="header__image" />
        <h1 class="title title--h1 header__title">Blizzless runewords</h1>
      </div>

      <LangSwitcher />
    </div>
  </header>
</template>

<script setup lang="ts">
import LangSwitcher from "@/components/LangSwitcher.vue";
</script>

<style lang="scss" scoped>
.header {
  padding: 8px 0;
  border-bottom: 2px solid var(--color-border);
  margin-bottom: 8px;

  @media (min-width: 1024px) {
    margin-bottom: 16px;
  }

  &__title {
    color: var(--color-title);
  }

  &__container {
    display: flex;
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
  font-size: 22px;
  line-height: 110%;

  @media (min-width: 1024px) {
    font-size: 28px;
  }
}
</style>
