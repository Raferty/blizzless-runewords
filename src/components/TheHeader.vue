<template>
  <header class="header">
    <a class="brand" :href="base" aria-label="Blizzless runewords">
      <img :src="`${base}images/snowflake.png`" alt="" width="33" height="33" />
      <h1>BLIZZLESS<small>DIABLO II: RUNEWIZARD</small></h1>
    </a>
    <nav class="section-nav" :aria-label="t('Разделы', 'Sections')">
      <a
        href="#/runewords"
        :aria-current="section === 'runewords' ? 'page' : undefined"
        >{{ t("Рунные слова", "Runewords") }}</a
      >
      <a href="#/recipes" :aria-current="section === 'recipes' ? 'page' : undefined">{{
        t("Рецепты", "Recipes")
      }}</a>
      <a href="#/planner" :aria-current="section === 'planner' ? 'page' : undefined">{{
        t("Планнер", "Planner")
      }}</a>
    </nav>
    <SearchInput
      v-if="section !== 'planner'"
      :model-value="search"
      :placeholder="searchPlaceholder"
      @update:model-value="$emit('update:search', $event)"
    />
    <div v-else class="header__spacer" aria-hidden="true" />
    <div class="header__links">
      <a
        href="https://discord.gg/TJgm9ZAhwW"
        target="_blank"
        rel="noopener noreferrer"
        >Discord ↗</a
      >
      <a
        href="https://t.me/Raferty"
        target="_blank"
        rel="noopener noreferrer"
        >Bugs or suggestions ↗</a
      >
    </div>
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
import { useInfoStore } from "@/store";
import { useText } from "@/composables/useText";
import type { CatalogRoute } from "@/utils/navigation";
defineProps<{
  search: string;
  searchPlaceholder: string;
  section: CatalogRoute["section"];
}>();
defineEmits<{ (event: "update:search", value: string): void }>();
const store = useInfoStore();
const t = useText();
const base = import.meta.env.BASE_URL;
const releaseDate = import.meta.env.VITE_RELEASE_DATE;
const formattedReleaseDate = releaseDate.split("-").reverse().join(".");
</script>
<style scoped lang="scss">
.header {
  display: grid;
  grid-template-columns: auto auto minmax(100px, 1fr) auto auto;
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
  margin: 0;
}
.section-nav {
  display: flex;
  gap: 4px;
  align-items: center;
  white-space: nowrap;
}
.section-nav a {
  padding: 7px 10px;
  font-size: 12px;
  color: var(--color-muted);
  border: 1px var(--border-style) transparent;
  border-radius: 4px;
}
.section-nav a:hover {
  color: var(--color-title);
  background: var(--color-panel);
}
.section-nav a[aria-current="page"] {
  color: #ffe866;
  background: #29270b;
  border-color: #756b1f;
}
.header__links {
  display: flex;
  gap: 14px;
  align-items: center;
  font-size: 11px;
  white-space: nowrap;
}
.header__links a {
  color: var(--color-muted);
}
.header__links a:hover {
  color: var(--color-title);
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
@media (max-width: 1100px) {
  .header {
    grid-template-columns: auto auto minmax(100px, 1fr) auto;
    gap: 10px;
    padding: 8px 12px;
  }
  h1 {
    font-size: 15px;
  }
  small,
  .header__links {
    display: none;
  }
  .header__actions {
    gap: 9px;
  }
}
@media (max-width: 900px) {
  .header__spacer {
    display: none;
  }
  .header {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .header__actions {
    grid-row: 1;
    grid-column: 2;
  }
  .section-nav {
    grid-row: 2;
    grid-column: 1;
  }
  .search {
    grid-row: 2;
    grid-column: 2;
  }
}
@media (max-width: 600px) {
  .section-nav {
    grid-column: 1 / -1;
  }
  .search {
    grid-row: 3;
    grid-column: 1 / -1;
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
@media (max-width: 374px) {
  .header {
    gap: 8px;
  }
  .brand {
    gap: 6px;
  }
  .brand img {
    width: 24px;
    height: 24px;
  }
  h1 {
    font-size: 12px;
    letter-spacing: 1.5px;
  }
  .header__actions {
    gap: 6px;
  }
}
</style>
