<template>
  <header class="header">
    <a class="brand" :href="base" aria-label="Blizzless runewords">
      <img :src="`${base}images/snowflake.png`" alt="" width="33" height="33" />
      <h1>BLIZZLESS<small>DIABLO II: RUNEWIZARD</small></h1>
    </a>
    <SearchInput
      v-model="words.search"
      :placeholder="t('Название, руна или тип предмета…', 'Name, rune or item type…')"
    />
    <a
      class="discord"
      href="https://discord.gg/TJgm9ZAhwW"
      target="_blank"
      rel="noopener noreferrer"
      >Discord ↗</a
    >
    <div class="header__actions">
      <p class="header__date">
        {{ store.interface.header.updatedAt[store.currentLang] }}
        <time :datetime="releaseDate">{{ formattedReleaseDate }}</time>
      </p>
      <LangSwitcher />
    </div>
  </header>
</template>
<script setup lang="ts">
import LangSwitcher from "@/components/LangSwitcher.vue";
import SearchInput from "@/components/SearchInput.vue";
import { useInfoStore, useRunewordsStore } from "@/store";
import { useText } from "@/composables/useText";
const store = useInfoStore();
const words = useRunewordsStore();
const t = useText();
const base = import.meta.env.BASE_URL;
const releaseDate = import.meta.env.VITE_RELEASE_DATE;
const formattedReleaseDate = releaseDate.split("-").reverse().join(".");
</script>
<style scoped lang="scss">
.header {
  display: flex;
  gap: 18px;
  align-items: center;
  min-height: 60px;
  padding: 9px 18px;
  border-bottom: 1px var(--border-style) var(--color-border);
}
.brand {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}
.brand img {
  width: 33px;
  height: 33px;
  object-fit: contain;
}
h1 {
  font-family: Diablo, serif;
  font-size: 17px;
  line-height: 1.3;
  color: var(--color-title);
  letter-spacing: 3px;
}
small {
  display: block;
  margin-top: 4px;
  font-family: "Segoe UI", Arial, sans-serif;
  font-size: 7px;
  color: var(--color-muted);
  letter-spacing: 1.4px;
}
.search {
  margin: 0 8px 0 20px;
}
.discord {
  font-size: 11px;
  color: var(--color-muted);
  white-space: nowrap;
}
.header__actions {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;
  margin-left: auto;
}
.header__date {
  font-size: 10px;
  color: var(--color-muted);
  white-space: nowrap;
}
@media (max-width: 900px) {
  .header {
    gap: 9px;
    padding: 8px 12px;
  }
  h1 {
    font-size: 15px;
  }
  small,
  .discord {
    display: none;
  }
  .search {
    margin: 0;
  }
  .header__actions {
    gap: 9px;
  }
}
@media (max-width: 600px) {
  .header {
    flex-wrap: wrap;
  }
  .search {
    flex-basis: 100%;
    order: 3;
  }
  .header__date {
    font-size: 9px;
  }
  h1 {
    font-size: 13px;
    letter-spacing: 2px;
  }
  .brand img {
    width: 28px;
    height: 28px;
  }
}
</style>
