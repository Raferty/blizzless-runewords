<template>
  <div class="ui-card">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<style lang="scss" scoped>
.ui-card {
  color: #fff;
  background-color: #0a0e17;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid #24221c;
  width: 100%;
  max-width: 100%;
  position: relative;
}
</style>
