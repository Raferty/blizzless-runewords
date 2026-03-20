<template>
  <div
    v-if="modelValue"
    class="ui-modal"
    :class="{ 'ui-modal-tooltip': mode === 'tooltip' }"
  >
    <div class="ui-modal__wrapper">
      <div v-if="closable" class="ui-modal__close" @click="$emit('close')">Close</div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  (e: "close"): void;
}>();

defineProps<{
  modelValue: boolean;
  mode?: "fixed" | "tooltip";
  closable?: boolean;
}>();
</script>

<style lang="scss">
.ui-modal {
  padding: 24px;
  position: absolute;
  min-width: 22rem;
  max-width: 490px;
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-overlay);

  &-tooltip {
    position: static;
    right: auto;
    top: auto;
    min-width: 0;
    width: 100%;
  }

  &-tooltip &__wrapper {
    padding: 0;
  }

  &__title {
    color: var(--color-title);
    text-align: center;
    margin-bottom: 0.5rem;
    font-size: 1.4em;
    line-height: 1em;
  }

  &__type {
    text-align: center;
    font-size: 0.875em;
    margin-bottom: 0.5rem;
    color: var(--color-muted);
  }

  &__property {
    text-align: center;
    color: var(--color-success);

    &--type {
      display: block;
      color: var(--color-text);
      margin-top: 16px;
    }

    &--bugged {
      color: var(--color-danger);
    }
  }

  &__runes {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    gap: 8px;
  }

  &__rune {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__image {
    max-width: 32px;
    margin-right: 4px;
  }
}
</style>
