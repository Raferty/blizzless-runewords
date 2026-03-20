<template>
  <div class="lang">
    <div
      class="lang__item"
      :class="{ 'lang__item--active': currentLang === 'en' }"
      @click="setLang('en')"
    >
      EN
    </div>
    <div
      class="lang__item"
      :class="{ 'lang__item--active': currentLang === 'ru' }"
      @click="setLang('ru')"
    >
      RU
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLangSwitcher } from "@/composables/useLangSwitcher";

const { currentLang, setLang } = useLangSwitcher();
</script>

<style lang="scss" scoped>
.lang {
  display: flex;
  gap: 12px;
  align-items: center;

  &__item {
    color: var(--color-notfound);
    cursor: pointer;

    &--active {
      color: var(--color-success-alt);
    }
  }
}
</style>
