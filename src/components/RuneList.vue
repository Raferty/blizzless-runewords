<template>
  <div class="runelist">
    <div class="runelist__top">
      <h2>{{ t("Руны", "Runes") }}</h2>
      <span>{{ words.selectedRunes.length }} / 33</span>
    </div>
    <p class="runelist__hint">
      {{ t("Выберите руны для поиска рецептов", "Choose runes to find recipes") }}
    </p>
    <div class="runelist__grid" :aria-label="t('Выбор рун', 'Rune selection')">
      <button
        v-for="rune in words.runes"
        :key="rune.id"
        :aria-pressed="words.selectedRunes.includes(rune.id)"
        class="runelist__item"
        @click="toggle(rune.id)"
      >
        <span class="runelist__rank" aria-hidden="true">{{
          String(rune.id).padStart(2, "0")
        }}</span>
        <img
          :src="`${base}${rune.image_url.replace(/^\//, '')}`"
          alt=""
          width="33"
          height="33"
        />
        <span>{{ rune.name[info.currentLang] }}</span>
      </button>
    </div>
    <button class="runelist__clear" @click="words.setSelectedRunes([])">
      {{ t("Сбросить выбор", "Clear selection") }} ↺
    </button>
  </div>
</template>
<script setup lang="ts">
import { useInfoStore, useRunewordsStore } from "@/store";
import { useText } from "@/composables/useText";
const info = useInfoStore();
const words = useRunewordsStore();
const t = useText();
const base = import.meta.env.BASE_URL;
function toggle(id: number) {
  words.setSelectedRunes(
    words.selectedRunes.includes(id)
      ? words.selectedRunes.filter((r) => r !== id)
      : [...words.selectedRunes, id]
  );
}
</script>
<style scoped lang="scss">
.runelist__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
h2 {
  font-size: 16px;
  color: var(--color-title);
}
.runelist__top > span {
  padding: 2px 5px;
  font-size: 10px;
  color: #cbd6dd;
  background: #243039;
  border-radius: 3px;
}
.runelist__hint {
  margin: 5px 0 8px;
  font-size: 10px;
  line-height: 1.4;
  color: var(--color-muted);
}
.runelist__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
}
.runelist__item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1px;
  align-items: center;
  justify-content: center;
  height: clamp(36px, calc((100svh - 198px) / 11), 54px);
  font-size: 11px;
  line-height: 1.2;
  background: var(--color-panel);
}
.runelist__item img {
  width: 33px;
  height: clamp(19px, calc((100svh - 420px) / 10), 33px);
  object-fit: contain;
}
.runelist__rank {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 7px;
  color: var(--color-muted);
}
.runelist__item[aria-pressed="true"] {
  color: #ffe866;
  background: #29270b;
  border-color: #ffdf00;
}
.runelist__item[aria-pressed="true"]::before {
  position: absolute;
  top: 2px;
  left: 4px;
  font-size: 9px;
  color: #ffdf00;
  content: "✓";
}
.runelist__clear {
  width: 100%;
  padding: 5px 8px;
  margin-top: 8px;
  font-size: 10px;
  color: #b9c7d2;
}
@media (max-width: 600px) {
  .runelist__grid {
    grid-template-columns: repeat(11, minmax(0, 1fr));
    gap: 3px;
  }
  .runelist__item {
    height: 42px;
    font-size: 10px;
  }
  .runelist__item img {
    height: 25px;
  }
  .runelist__rank {
    display: none;
  }
  .runelist__clear {
    width: auto;
  }
}
@media (max-width: 374px) {
  .runelist__grid {
    grid-template-columns: repeat(9, minmax(0, 1fr));
  }
}
</style>
