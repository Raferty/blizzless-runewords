<template>
  <div class="filter">
    <div class="filter__block">
      <div class="filter__title">Sockets:</div>
      <div
        v-for="n in 5"
        :key="n"
        class="filter__item"
        :class="{ 'filter__item--active': modelValue.includes(n + 1) }"
        @click="toggleSocket(n + 1)"
      >
        {{ n + 1 }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue?: number[];
  }>(),
  {
    modelValue: () => [],
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: number[]): void;
}>();

function toggleSocket(value: number): void {
  const arr = [...props.modelValue];
  const index = arr.indexOf(value);
  if (index === -1) {
    arr.push(value);
  } else {
    arr.splice(index, 1);
  }
  emit("update:modelValue", arr);
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
    width: 24px;
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
