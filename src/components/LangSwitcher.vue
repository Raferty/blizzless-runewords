<template>
  <button
    type="button"
    class="lang is-active"
    :aria-label="switchLabel"
    :title="switchLabel"
    :lang="currentLang"
    @click="setLang(currentLang === 'en' ? 'ru' : 'en')"
  >
    {{ currentLang.toUpperCase() }}
  </button>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useLangSwitcher } from "@/composables/useLangSwitcher";
const { currentLang, setLang } = useLangSwitcher();
const switchLabel = computed(() =>
  currentLang.value === "ru" ? "Переключить на английский" : "Switch to Russian"
);
</script>
<style scoped lang="scss">
.lang {
  min-width: 32px;
  padding: 5px 7px;
  font-size: 11px;
}
</style>
