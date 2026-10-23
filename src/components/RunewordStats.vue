<template>
  <div class="item-stats">
    <div
      v-if="sections.length > 1"
      class="base-tabs"
      role="tablist"
      :aria-label="t('Основа предмета', 'Item base')"
    >
      <button
        v-for="(section, index) in sections"
        :id="`${uid}-tab-${index}`"
        :key="index"
        role="tab"
        :aria-selected="selected === index"
        :aria-controls="`${uid}-panel`"
        :tabindex="selected === index ? 0 : -1"
        :class="{ 'is-active': selected === index }"
        @click="select(index)"
        @keydown="onKeydown($event, index)"
      >
        {{ section.title }}
      </button>
    </div>
    <div
      :id="`${uid}-panel`"
      :role="sections.length > 1 ? 'tabpanel' : undefined"
      :aria-labelledby="sections.length > 1 ? `${uid}-tab-${selected}` : undefined"
      :tabindex="sections.length > 1 ? 0 : undefined"
    >
      <p v-if="sections.length === 1 && sections[0].title" class="item-stats__base">
        {{ sections[0].title }}
      </p>
      <!-- HTML comes only from trusted, bundled stat strings. -->
      <p v-for="(line, index) in sections[selected].lines" :key="index" v-html="line"></p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { useRunewordsStore } from "@/store";
import { useText } from "@/composables/useText";
import { splitStatSections } from "@/utils/runeword";
const props = defineProps<{ lines: string[]; runewordId?: number }>();
const words = useRunewordsStore();
const t = useText();
const uid = useId();
const localSelection = ref(0);
const sections = computed(() => splitStatSections(props.lines));
const selected = computed(() =>
  Math.min(
    props.runewordId === undefined
      ? localSelection.value
      : (words.baseSelections[props.runewordId] ?? 0),
    sections.value.length - 1
  )
);
function select(index: number) {
  if (props.runewordId === undefined) localSelection.value = index;
  else words.baseSelections[props.runewordId] = index;
}
function onKeydown(event: KeyboardEvent, index: number) {
  const last = sections.value.length - 1;
  const next =
    event.key === "ArrowRight"
      ? (index + 1) % (last + 1)
      : event.key === "ArrowLeft"
        ? (index + last) % (last + 1)
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? last
            : null;
  if (next === null) return;
  event.preventDefault();
  select(next);
  (event.currentTarget as HTMLElement).parentElement
    ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
    [next]?.focus();
}
</script>
<style scoped lang="scss">
.item-stats {
  font-size: 12px;
  line-height: 1.65;
  color: var(--color-success);
}
.base-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin: 0 0 12px;
}
.base-tabs button {
  padding: 5px 9px;
  font-size: 11px;
  line-height: 1.3;
  color: #c8d4dd;
  border-color: #53616c;
}
.base-tabs button.is-active {
  color: #ffe866;
  border-color: #ffdf00;
}
.item-stats__base {
  margin-bottom: 8px;
  color: var(--color-muted);
}
</style>
