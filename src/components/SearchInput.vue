<template>
  <div class="search">
    <svg
      class="search__icon"
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
    <input
      ref="input"
      :value="modelValue"
      type="search"
      :placeholder="placeholder"
      :aria-label="t('Поиск', 'Search')"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown.esc="$emit('update:modelValue', '')"
    />
    <button
      v-if="modelValue"
      class="search__clear"
      :aria-label="t('Очистить поиск', 'Clear search')"
      @click="$emit('update:modelValue', '')"
    >
      ×
    </button>
    <kbd aria-hidden="true">/</kbd>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useText } from "@/composables/useText";
defineProps<{ modelValue: string; placeholder?: string }>();
defineEmits<{ (e: "update:modelValue", value: string): void }>();
const t = useText();
const input = ref<HTMLInputElement | null>(null);
function focusSearch(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  if (
    event.key === "/" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !target.closest(
      "input, textarea, select, [role=combobox], [role=listbox], [contenteditable], [role=dialog], dialog[open]"
    )
  ) {
    event.preventDefault();
    input.value?.focus();
  }
}
onMounted(() => window.addEventListener("keydown", focusSearch));
onBeforeUnmount(() => window.removeEventListener("keydown", focusSearch));
</script>
<style scoped lang="scss">
.search {
  display: flex;
  flex: 1;
  gap: 9px;
  align-items: center;
  min-width: 100px;
  height: 35px;
  padding: 0 10px;
  background: #10151a;
  border: 1px var(--border-style) #445360;
  border-radius: 7px;
}
.search:focus-within {
  border-color: var(--color-accent);
}
.search__icon {
  display: block;
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: var(--color-accent);
}
input {
  width: 100%;
  min-width: 0;
  font-size: 12px;
  color: var(--color-text);
  outline: none;
  background: transparent;
  border: 0;
}
input::-webkit-search-cancel-button {
  display: none;
}
input::placeholder {
  color: var(--color-muted);
}
kbd {
  padding: 0 4px;
  color: #8a9da9;
  border: 1px var(--border-style) #39454f;
  border-radius: 3px;
}
.search__clear {
  padding: 0 3px;
  font-size: 18px;
  line-height: 1;
  background: transparent;
  border: 0;
}
</style>
