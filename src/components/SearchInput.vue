<template>
  <div class="search">
    <input
      :value="modelValue"
      type="text"
      class="search__input"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();
</script>

<style lang="scss" scoped>
.search {
  margin-bottom: 16px;

  &__input {
    width: 100%;
    padding: 8px;
    font-size: 16px;
    color: var(--color-border);
    background-color: var(--color-bg);
    border: 1px solid var(--color-border-input);
    border-radius: 4px;

    &::-webkit-input-placeholder {
      transition: all 0.4s ease;
    }

    &:focus::-webkit-input-placeholder {
      opacity: 0;
    }
  }
}
</style>
