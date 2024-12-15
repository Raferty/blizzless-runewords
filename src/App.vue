<template>
  <TheHeader />
  <main class="main">
    <aside class="aside">
      Runes
      <RuneList :runes="RUNES" @select="(e: any) => SelectedRunes = e" />
    </aside>
    <section class="wrapper">
      <RuneTable :items="RUNEWORDS" :runes="RUNES" :selected="SelectedRunes" />
    </section>
  </main>
  <TheFooter />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RUNEWORDS } from "@/shared/runewords";
import RUNES from "@/shared/constants";

import TheHeader from "./components/TheHeader.vue";
import TheFooter from "./components/TheFooter.vue";
import RuneList from "./components/RuneList.vue";
import RuneTable from "./components/RuneTable.vue";

const SelectedRunes = ref([]);
</script>

<style lang="scss" scoped>
.aside {
  width: 144px;
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
</style>
