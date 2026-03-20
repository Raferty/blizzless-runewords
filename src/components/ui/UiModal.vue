<template>
  <div
    v-if="modelValue"
    class="ui-modal"
    :class="{ 'ui-modal--tooltip': mode === 'tooltip' }"
    role="presentation"
    @click.self="onBackdropClick"
  >
    <div class="ui-modal__wrapper" role="dialog" aria-modal="true" @click.stop>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";

const props = defineProps<{
  modelValue: boolean;
  mode?: "fixed" | "tooltip";
  closable?: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

function onBackdropClick(): void {
  if (props.closable) {
    emit("close");
  }
}

function onEscapeKeydown(e: KeyboardEvent): void {
  if (e.key !== "Escape") return;
  if (!props.closable) return;
  e.preventDefault();
  emit("close");
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      window.addEventListener("keydown", onEscapeKeydown);
    } else {
      window.removeEventListener("keydown", onEscapeKeydown);
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onEscapeKeydown);
});
</script>

<style lang="scss">
.ui-modal {
  position: fixed;
  inset: 0;
  z-index: 11000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background-color: rgba(0, 0, 0, 0.75);

  &--tooltip {
    align-items: flex-start;
    justify-content: flex-start;
    padding: 0;
    background: transparent;
  }

  &__wrapper {
    position: relative;
    width: 100%;
    min-width: min(22rem, 100%);
    max-width: 490px;
    padding: 20px;
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
  }

  &--tooltip &__wrapper {
    width: auto;
    min-width: 0;
    max-width: none;
    padding: 0;
    background: transparent;
    border: none;
  }

  &__title {
    margin-bottom: 0.5rem;
    font-size: 1.4em;
    line-height: 1em;
    color: var(--color-title);
    text-align: center;
  }

  &__type {
    margin-bottom: 0.5rem;
    font-size: 0.875em;
    color: var(--color-muted);
    text-align: center;
  }

  &__property {
    color: var(--color-success);
    text-align: center;

    &--type {
      display: block;
      margin-top: 16px;
      color: var(--color-text);
    }

    &--bugged {
      color: var(--color-danger);
    }
  }

  &__runes {
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
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
