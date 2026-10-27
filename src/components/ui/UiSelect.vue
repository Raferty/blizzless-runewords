<template>
  <div
    ref="root"
    class="ui-select"
    :data-state="isOpen ? 'open' : 'closed'"
    :data-active="active || undefined"
  >
    <button
      :id="id ?? selectId"
      ref="trigger"
      class="ui-select__trigger"
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? dropdownId : undefined"
      :aria-activedescendant="isOpen ? optionId(activeIndex) : undefined"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :disabled="disabled"
      @click="toggleOptions"
      @keydown="handleKeydown"
    >
      <span class="ui-select__value">
        <slot name="value" :option="selectedOption" :label="displayValue">
          {{ displayValue }}
        </slot>
      </span>
      <svg
        class="ui-select__chevron"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="m4 6 4 4 4-4"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <Teleport :to="teleportTarget">
      <ul
        v-if="isOpen"
        :id="dropdownId"
        ref="panel"
        class="ui-select__dropdown"
        :class="dropdownClass"
        role="listbox"
        :aria-label="ariaLabel"
        :aria-labelledby="ariaLabelledby"
        :style="floatingStyle"
      >
        <li
          v-for="(option, index) in options"
          :id="optionId(index)"
          :key="index"
          class="ui-select__option"
          :class="{ 'ui-select__option--highlighted': index === activeIndex }"
          role="option"
          :aria-selected="option.value === modelValue"
          @pointermove="activeIndex = index"
          @pointerdown.prevent
          @click="selectOption(index)"
        >
          <slot name="option" :option="option">
            <span>{{ option.label }}</span>
          </slot>
          <svg
            v-if="option.value === modelValue"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m3 8 3 3 7-7"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </li>
      </ul>
    </Teleport>
  </div>
</template>
<script setup lang="ts" generic="T extends SelectValue">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  type CSSProperties,
} from "vue";
import type { SelectOption, SelectValue } from "@/types/select";

// Single-selection adaptation of dominant-ui's UiSelect combobox/listbox pattern.
const props = withDefaults(
  defineProps<{
    modelValue: T;
    options: SelectOption<T>[];
    id?: string;
    ariaLabel?: string;
    ariaLabelledby?: string;
    active?: boolean;
    disabled?: boolean;
    dropdownClass?: string;
  }>(),
  {
    id: undefined,
    ariaLabel: undefined,
    ariaLabelledby: undefined,
    active: false,
    disabled: false,
    dropdownClass: undefined,
  }
);
defineSlots<{
  option?(props: { option: SelectOption<T> }): unknown;
  value?(props: { option: SelectOption<T> | undefined; label: string }): unknown;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", value: T): void;
  (e: "change", value: T): void;
}>();
const selectId = useId();
const dropdownId = `${selectId}-listbox`;
const optionId = (index: number) => `${dropdownId}-option-${index}`;
const root = ref<HTMLElement | null>(null);
// Native modal dialogs make body portals inert and paint above them.
const teleportTarget = ref<HTMLElement | string>("body");
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const isOpen = ref(false);
const activeIndex = ref(0);
const floatingStyle = ref<CSSProperties>({});
const selectedIndex = computed(() =>
  props.options.findIndex((option) => option.value === props.modelValue)
);
const displayValue = computed(() => props.options[selectedIndex.value]?.label ?? "");
const selectedOption = computed(() => props.options[selectedIndex.value]);

function positionDropdown() {
  if (!trigger.value) return;
  const rect = trigger.value.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(Math.max(rect.width, 220), viewportWidth - 16);
  const spaceBelow = viewportHeight - rect.bottom - 13;
  const spaceAbove = rect.top - 13;
  const desiredHeight = Math.min(280, props.options.length * 34 + 8);
  const above = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
  floatingStyle.value = {
    left: `${Math.max(8, Math.min(rect.left, viewportWidth - width - 8))}px`,
    width: `${width}px`,
    maxHeight: `${Math.max(0, Math.min(280, above ? spaceAbove : spaceBelow))}px`,
    top: above ? undefined : `${rect.bottom + 5}px`,
    bottom: above ? `${viewportHeight - rect.top + 5}px` : undefined,
  };
}
function revealActiveOption() {
  panel.value
    ?.querySelectorAll<HTMLElement>("[role=option]")
    [activeIndex.value]?.scrollIntoView({ block: "nearest" });
}
function openOptions(index = selectedIndex.value >= 0 ? selectedIndex.value : 0) {
  if (props.disabled || !props.options.length) return;
  activeIndex.value = index;
  positionDropdown();
  isOpen.value = true;
  nextTick(revealActiveOption);
}
function closeOptions(restoreFocus = true) {
  isOpen.value = false;
  typedText = "";
  if (restoreFocus) trigger.value?.focus({ preventScroll: true });
}
function toggleOptions() {
  if (isOpen.value) closeOptions();
  else openOptions();
}
function selectOption(index: number) {
  const option = props.options[index];
  if (!option || props.disabled) return;
  emit("update:modelValue", option.value);
  emit("change", option.value);
  closeOptions();
}

let typedText = "";
let lastTypedAt = 0;
function findTypedOption(key: string) {
  const now = Date.now();
  typedText = `${now - lastTypedAt > 600 ? "" : typedText}${key.toLocaleLowerCase()}`;
  lastTypedAt = now;
  const repeated = [...typedText].every((letter) => letter === typedText[0]);
  const query = repeated ? typedText[0] : typedText;
  const start = query.length === 1 ? activeIndex.value + 1 : activeIndex.value;
  for (let offset = 0; offset < props.options.length; offset++) {
    const index = (start + offset) % props.options.length;
    if (props.options[index].label.toLocaleLowerCase().startsWith(query)) {
      activeIndex.value = index;
      break;
    }
  }
}
function handleKeydown(event: KeyboardEvent) {
  if (props.disabled) return;
  if (["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    event.preventDefault();
    if (!isOpen.value) {
      openOptions(
        event.key === "End"
          ? props.options.length - 1
          : event.key === "Home"
            ? 0
            : undefined
      );
      return;
    }
    if (event.key === "Enter" || event.key === " ") selectOption(activeIndex.value);
    else if (event.key === "Home") activeIndex.value = 0;
    else if (event.key === "End") activeIndex.value = props.options.length - 1;
    else
      activeIndex.value =
        (activeIndex.value + (event.key === "ArrowDown" ? 1 : props.options.length - 1)) %
        props.options.length;
  } else if (event.key === "Escape" && isOpen.value) {
    event.preventDefault();
    event.stopPropagation();
    closeOptions();
  } else if (event.key === "Tab") closeOptions(false);
  else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    if (!isOpen.value) openOptions();
    findTypedOption(event.key);
  }
}
function onOutside(event: Event) {
  const target = event.target as Node | null;
  if (
    isOpen.value &&
    target &&
    !root.value?.contains(target) &&
    !panel.value?.contains(target)
  )
    closeOptions(false);
}
function onViewportChange(event: Event) {
  if (
    !isOpen.value ||
    (event.target instanceof Node && panel.value?.contains(event.target))
  )
    return;
  const rect = trigger.value?.getBoundingClientRect();
  if (
    !rect ||
    rect.bottom <= 0 ||
    rect.top >= window.innerHeight ||
    rect.right <= 0 ||
    rect.left >= document.documentElement.clientWidth
  ) {
    closeOptions(false);
    return;
  }
  positionDropdown();
}
watch(activeIndex, () => {
  if (isOpen.value) nextTick(revealActiveOption);
});
watch(
  () => [props.modelValue, props.options] as const,
  () => {
    if (!isOpen.value) return;
    if (!props.options.length) {
      closeOptions(false);
      return;
    }
    activeIndex.value = Math.max(0, selectedIndex.value);
    positionDropdown();
    nextTick(revealActiveOption);
  }
);
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeOptions(false);
  }
);
onMounted(() => {
  teleportTarget.value = root.value?.closest("dialog") ?? "body";
  document.addEventListener("pointerdown", onOutside, true);
  document.addEventListener("focusin", onOutside);
  window.addEventListener("resize", onViewportChange);
  window.addEventListener("scroll", onViewportChange, true);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onOutside, true);
  document.removeEventListener("focusin", onOutside);
  window.removeEventListener("resize", onViewportChange);
  window.removeEventListener("scroll", onViewportChange, true);
});
</script>
<style scoped lang="scss">
.ui-select {
  min-width: 0;
}
.ui-select__trigger {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 28px;
  padding: 5px 9px;
  font-size: 11px;
  line-height: 16px;
  color: var(--color-text);
  text-align: left;
  background: #26313a;
  border: 1px var(--border-style) #44515c;
  border-radius: 4px;
}
.ui-select__trigger:hover {
  background: #2c3944;
  border-color: #668393;
}
.ui-select__value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ui-select__chevron {
  flex-shrink: 0;
  color: var(--color-muted);
}
.ui-select[data-state="open"] .ui-select__trigger {
  border-color: var(--color-accent);
}
.ui-select[data-state="open"] .ui-select__chevron {
  transform: rotate(180deg);
}
.ui-select[data-active] .ui-select__trigger {
  color: #ffe866;
  background: #29270b;
  border-color: #ffdf00;
  box-shadow: none;
}
.ui-select[data-active] .ui-select__chevron {
  color: #ffe866;
}
.ui-select__dropdown {
  position: fixed;
  z-index: 12000;
  padding: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  font-size: 12px;
  line-height: 1.4;
  color: var(--color-text);
  list-style: none;
  scrollbar-color: #536570 #1d242c;
  scrollbar-width: thin;
  background: var(--color-panel);
  border: 1px var(--border-style) #536570;
  border-radius: 5px;
  box-shadow: 0 12px 30px rgb(0 0 0 / 55%);
}
.ui-select__option {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 7px 8px;
  overflow-wrap: anywhere;
  cursor: pointer;
  border-radius: 3px;
}
.ui-select__option--highlighted {
  background: #2c404d;
}
.ui-select__option[aria-selected="true"] {
  color: #ffe866;
  background: #29270b;
}
.ui-select__option[aria-selected="true"].ui-select__option--highlighted {
  outline: 1px var(--border-style) #756b1f;
  outline-offset: -1px;
}
.ui-select__option svg {
  flex-shrink: 0;
}
</style>
