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
    background: transparent;
    padding: 0;
    align-items: flex-start;
    justify-content: flex-start;
  }

  &__wrapper {
    position: relative;
    width: 100%;
    max-width: 490px;
    min-width: min(22rem, 100%);
    border: 1px solid var(--color-border);
    background-color: var(--color-bg);
    padding: 20px;
  }

  &--tooltip &__wrapper {
    padding: 0;
    border: none;
    min-width: 0;
    max-width: none;
    width: auto;
    background: transparent;
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
