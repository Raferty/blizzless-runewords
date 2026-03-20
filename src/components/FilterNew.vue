<template>
  <div class="filter">
    <div class="filter__block">
      <div class="filter__title">New:</div>

      <div
        class="filter__item"
        :class="{ 'filter__item--active': modelValue === true }"
        @click="toggle()"
      >
        new
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue?: boolean | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean | null): void;
}>();

function toggle(): void {
  emit("update:modelValue", props.modelValue === true ? null : true);
}
</script>

<style lang="scss" scoped>
.filter {
  &__title {
    margin-right: 4px;
  }

  &__block {
    display: flex;
    padding: 4px;
    gap: 4px;
  }

  &__item {
    font-size: 14px;
    line-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 90px;
    height: 24px;
    color: var(--color-text-inverse);
    background-color: var(--color-notfound);
    border: 1px solid var(--color-notfound);
    cursor: pointer;

    &--active {
      color: var(--color-text-inverse);
      background-color: var(--color-success-alt);
      border-color: var(--color-success-alt);
    }
  }
}
</style>
