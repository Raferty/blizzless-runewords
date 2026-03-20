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
  position: relative;
  width: 100%;
  max-width: 100%;
  padding: 16px;
  color: #fff;
  background-color: #0a0e17;
  border: 1px solid #24221c;
  border-radius: 8px;
  box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
}
</style>
