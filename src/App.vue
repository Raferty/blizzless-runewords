<template>
  <TheHeader />
  <main class="main">
    <aside class="aside">
      Runes
      <RuneList @select="(e: any) => console.log('select', e)" />
    </aside>
    <section class="wrapper">
      <RuneTable :items="RUNEWORDS" />
    </section>
  </main>
  <TheFooter />
</template>

<script setup lang="ts">
import { RUNEWORDS } from "@/shared/runewords";

import TheHeader from "./components/TheHeader.vue";
import TheFooter from "./components/TheFooter.vue";
import RuneList from "./components/RuneList.vue";
import RuneTable from "./components/RuneTable.vue";
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
