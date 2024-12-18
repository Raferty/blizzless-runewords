<template>
  <TheHeader />
  <main class="main">
    <aside class="aside">
      <div class="aside__title">Runes</div>
      <RuneList :runes="RUNES" @select="(e: any) => SelectedRunes = e" />
    </aside>
    <section class="wrapper">
      <div class="search">
        <input v-model="search" type="text" class="search__input" placeholder="Search by name">
      </div>

      <RuneTable :items="filteredRunewords" :runes="RUNES" :selected="SelectedRunes" />

      <div class="hints">
        <h3 class="hints__title">Hints</h3>

        <span class="chips">L</span> - Ladder only runewords
      </div>
    </section>
  </main>
  <TheFooter />
</template>

<script setup>
import { ref, computed } from "vue";
import { RUNEWORDS } from "@/shared/runewords";
import RUNES from "@/shared/constants";

import TheHeader from "./components/TheHeader.vue";
import TheFooter from "./components/TheFooter.vue";
import RuneList from "./components/RuneList.vue";
import RuneTable from "./components/RuneTable.vue";

const search = ref('');
const SelectedRunes = ref(JSON.parse(localStorage.getItem('selectedRunes')) || []);


const filteredRunewords = computed(() => search.value ? RUNEWORDS.filter((word) => word.name.toLowerCase().includes(search.value.toLowerCase())) : RUNEWORDS );
</script>

<style lang="scss" scoped>
.aside {
  width: 144px;

  &__title {
    font-weight: 700;
    padding: 4px;
    font-size: 14px;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 4px;
  }
}

.main {
  display: flex;
  margin: 0 auto;
  max-width: 1100px;
}

.wrapper {
  flex: 1;
  margin-left: 32px;
}

.hints {
  margin-top: 32px;
  margin-bottom: 32px;
  margin-bottom: 400px;

  &__title {
    margin-bottom: 16px;
  }
}

.search {
  margin-bottom: 16px;

  &__input {
    width: 100%;
    font-size: 16px;
    border-radius: 4px;
    color: #bab197;
    background-color: #000;
    border: 1px solid #8a8062;
    padding: 8px;

    &::-webkit-input-placeholder {
      transition: all 0.4s ease;
    }

    &:focus::-webkit-input-placeholder {
      opacity: 0;
    }
  }
}
</style>
