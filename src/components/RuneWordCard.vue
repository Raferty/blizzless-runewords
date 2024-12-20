<template>
  <div v-if="modelValue" class="runeword">
    <div class="runeword__wrapper">
      <div class="runeword__close" @click="$emit('update:modelValue', false)">
        Close
      </div>
      <h3 class="runeword__title">{{ runeword.name[store.currentLang] }}</h3>
      <div class="runeword__type">{{ runeword.types.join(", ") }}</div>
      <div class="runeword__runes">
        <template v-for="rune in runeword.runes" :key="rune">
          <span class="runeword__rune">
            <img
              :src="`/blizzless-runewords/` + findRune(rune)?.image_url"
              :alt="findRune(rune)?.name"
              class="runeword__image"
            />
            {{ findRune(rune)?.name[store.currentLang] }}
          </span>
        </template>
      </div>
      <div class="runeword__property" v-for="prop in runeword.stats">
        <template v-if="prop.includes('#')">
          <span class="modal__property--type">{{
            prop.substring(1, prop.length - 1)
          }}</span>
        </template>
        <template v-else>
          {{ prop }}
        </template>
      </div>
      <br />
      <template v-if="runeword?.bugged?.status">
        <h3 class="modal__title">Bugged</h3>
        <div
          class="modal__property modal__property--bugged"
          v-for="prop in runeword?.bugged?.message"
        >
          {{ prop }}
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { RUNES } from "@/shared/constants";
import { useInfoStore } from '@/store/index.js';

const store = useInfoStore();

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  runeword: {
    type: Object,
    default: () => {
      return {};
    },
  },
});

const localVisible = ref(props.modelValue);

const findRune = (id) => {
  return RUNES.find((rune) => rune.id === id);
};
</script>

<style lang="scss" scoped>
.runeword {
  right: 12px;
  top: 132px;
  position: fixed;
  min-width: 22rem;
  max-width: 490px;
  border: 1px solid #bab197;
  background-color: rgba(#000, 0.8);

  &__wrapper {
    padding: 24px;
    position: relative;
  }

  &__close {
    position: absolute;
    right: 12px;
    top: 10px;
    color: #ae2a1a;
    cursor: pointer;
  }

  &__title {
    color: #8a8062;
    text-align: center;
    margin-bottom: 0.5rem;
    font-size: 1.4em;
    line-height: 1em;
  }

  &__type {
    text-align: center;
    font-size: 0.875em;
    margin-bottom: 0.5rem;
    color: #bd8547;
  }

  &__property {
    text-align: center;
    color: #5cbd4b;

    &--type {
      display: block;
      color: #74706c;
      margin-top: 16px;
    }

    &--bugged {
      color: #ae2a1a;
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
