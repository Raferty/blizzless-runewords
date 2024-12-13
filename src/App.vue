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
import { RUNEWORDS } from '@/shared/runewords';

import RuneList from './components/RuneList.vue';
import RuneTable from './components/RuneTable.vue';

</script>

<style lang="scss" scoped>
.aside {
  width: 140px;
}

.main {
  display: flex;
}

.wrapper {
  flex: 1;
  margin-left: 32px;
}
</style>
