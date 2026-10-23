<template>
  <div class="lang" :aria-label="currentLang === 'ru' ? 'Язык' : 'Language'">
    <button
      v-for="lang in ['en', 'ru'] as const"
      :key="lang"
      :aria-pressed="currentLang === lang"
      :lang="lang"
      @click="setLang(lang)"
    >
      {{ lang.toUpperCase() }}
    </button>
  </div>
</template>
<script setup lang="ts">
import { useLangSwitcher } from "@/composables/useLangSwitcher";
const { currentLang, setLang } = useLangSwitcher();
</script>
<style scoped lang="scss">
.lang {
  display: flex;
  gap: 3px;
  align-items: center;
}
button {
  padding: 5px 7px;
  font-size: 11px;
}
</style>
