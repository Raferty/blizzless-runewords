<template>
  <div class="runelist">
    <div class="runelist__wrapper">
      <div
        v-for="(runePart, partIndex) in splittedRunes"
        :key="partIndex"
        class="runelist__part"
      >
        <div
          v-for="rune in runePart"
          :key="rune.id"
          class="runelist__item"
          :class="{ '--active': isActive(rune.id) }"
          @click="selectRune(rune.id)"
        >
          <img
            :src="`/blizzless-runewords/` + rune.image_url"
            :alt="rune.name[store.currentLang]"
            class="runelist__image"
          />
          <span class="runelist__name">
            {{ rune.name[store.currentLang] }}
          </span>
        </div>
      </div>
    </div>
    <div class="runelist__actions">
      <button class="button" @click="clearRunes">
        {{ store.interface.runelist.clear[store.currentLang] }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useInfoStore, useRunewordsStore } from "@/store";
import { splitToNChunks } from "@/utils/array";

const store = useInfoStore();
const runewordsStore = useRunewordsStore();

const emit = defineEmits<{
  (e: "select", value: number[]): void;
}>();

const selectedRunes = ref<number[]>(
  JSON.parse(localStorage.getItem("selectedRunes") ?? "[]") ?? []
);

const isActive = (id: number): boolean => {
  return selectedRunes.value.includes(id);
};

const selectRune = (id: number): void => {
  const index = selectedRunes.value.indexOf(id);
  if (index === -1) {
    selectedRunes.value.push(id);
  } else {
    selectedRunes.value.splice(index, 1);
  }
  localStorage.setItem("selectedRunes", JSON.stringify(selectedRunes.value));
  emit("select", selectedRunes.value);
};

const clearRunes = (): void => {
  selectedRunes.value = [];
  localStorage.setItem("selectedRunes", JSON.stringify([]));
  emit("select", selectedRunes.value);
};

const splittedRunes = computed(() => splitToNChunks([...runewordsStore.runes], 3));
</script>

<style lang="scss" scoped>
.runelist {
  margin-bottom: 16px;

  &__wrapper {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 16px;

    @media (min-width: 1024px) {
      flex-direction: row;
    }
  }

  // &__title {
  //   font-weight: 700;
  //   padding: 4px;
  //   font-size: 14px;
  //   border-bottom: 1px solid #e5e7eb;
  //   margin-bottom: 4px;
  // }

  &__part {
    display: flex;
    flex-direction: row;
    gap: 4px;

    @media (min-width: 1024px) {
      flex-direction: column;
    }
  }

  &__item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: center;
    border: 1px solid transparent;
    border-radius: 2px;

    &:hover {
      cursor: pointer;
    }

    &.--active {
      border: 1px solid var(--color-rune-active-border);
    }
  }

  &__image {
    width: 48px;
  }

  &__name {
    width: 48px;
    padding-bottom: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    line-height: 1.1;
    color: var(--color-text);
    text-align: center;
    white-space: nowrap;
  }
}

.button {
  display: block;
  display: block;
  width: 100%;
  padding: 4px 8px;
  color: var(--color-text-inverse);
  cursor: pointer;
  background-color: var(--color-danger);
  border: 1px solid var(--color-danger);
  border-radius: 4px;
}
</style>
