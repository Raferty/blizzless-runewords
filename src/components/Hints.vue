<template>
  <div class="hints">
    <h3 class="hints__title">{{ store.interface.hints.title[store.currentLang] }}</h3>

    <div class="hints__block">
      <span class="chips">{{ store.interface.markers.ladder[store.currentLang] }}</span>
      -
      {{
        store.currentLang === "ru"
          ? `Работает только на лестнице :D`
          : `Ladder only runewords.`
      }}
    </div>

    <div class="hints__block">
      <span class="new">{{ store.interface.markers.new[store.currentLang] }}</span>
      -
      {{
        store.currentLang === "ru"
          ? `Новый рунворд разработанный командой Blizzless. В разработке`
          : `New runeword designed by Blizzless team. In development now`
      }}
    </div>

    <div class="hints__block">
      <span class="reworked">{{
        store.interface.markers.reworked[store.currentLang]
      }}</span>
      -
      {{
        store.currentLang === "ru"
          ? `Переработан командой «безМетелицы»`
          : `Reworked runeword by Blizzless team.`
      }}
    </div>

    <div class="hints__block">
      <span class="warning"
        >!!! {{ store.interface.markers.bugged[store.currentLang] }}</span
      >
      -
      {{
        store.currentLang === "ru"
          ? `В данный момент работает некорректно. Скоро будет исправлен`
          : `Bugged at this moment. Will be fix soon`
      }}.
    </div>
  </div>
</template>

<script setup lang="ts">
import { useInfoStore } from "@/store";

defineOptions({ name: "TheHints" });

const store = useInfoStore();
</script>

<style lang="scss" scoped>
.hints {
  margin-top: 32px;
  margin-bottom: 32px;
  margin-bottom: 400px;

  &__title {
    margin-bottom: 16px;
  }

  &__block {
    margin-bottom: 16px;
  }
}
</style>
