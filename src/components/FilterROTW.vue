<template>
  <div class="filter">
    <div class="filter__block">
      <div
        class="filter__item"
        :class="{ 'filter__item--active': modelValue === true }"
        @click="toggle()"
      >
        RotW
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
    gap: 4px;
    padding: 4px;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    height: 24px;
    padding: 0 8px;
    font-size: 14px;
    line-height: 100%;
    color: var(--color-text-inverse);
    cursor: pointer;
    background-color: var(--color-notfound);
    border: 1px solid var(--color-notfound);

    &--active {
      color: var(--color-text-inverse);
      background-color: var(--color-success-alt);
      border-color: var(--color-success-alt);
    }
  }
}
</style>
