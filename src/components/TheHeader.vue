<template>
  <header class="header">
    <div class="container">
      <h1 class="title title--h1">Blizzless D2Resurrected runewords</h1>
    </div>
  </header>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.header {
  display: flex;
  //margin: 0 auto;
  max-width: 1100px;
  padding: 16px 0;
  border-bottom: 4px solid #bab197;
  margin-bottom: 16px;

  @media (min-width: 1024px) {
    margin-bottom: 32px;
  }
}

.container {
  padding-left: 8px;
  padding-right: 8px;

  @media (min-width: 1024px) {
    padding-left: 16px;
    padding-right: 16px;
  }
}

.title {
  font-size: 28px;

  @media (min-width: 1024px) {
    font-size: 48px;
  }
}
</style>
