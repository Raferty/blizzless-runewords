<template>
  <div class="filter">
    <div class="filter__block">
      <div class="filter__title">Reworked:</div>

      <div
        class="filter__item"
        :class="{ 'filter__item--active': modelValue === 'unchanged' }"
        @click="toggle('unchanged')"
      >
        unchanged
      </div>

      <div
        class="filter__item"
        :class="{ 'filter__item--active': modelValue === 'changed' }"
        @click="toggle('changed')"
      >
        changed
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue?: "unchanged" | "changed" | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: "unchanged" | "changed" | null): void;
}>();

function toggle(value: "unchanged" | "changed"): void {
  emit("update:modelValue", props.modelValue === value ? null : value);
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
