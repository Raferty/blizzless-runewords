<template>
  <div v-if="modelValue" class="runeword">
    <div class="runeword__wrapper">
      <div class="runeword__close" @click="$emit('update:modelValue', false)">
        Close
      </div>
      <h3 class="runeword__title">{{ runeword.name[store.currentLang] }}</h3>
      <div class="runeword__type">
        <template v-for="(type, index) in runeword.types" :key="index">
          {{ getTypeName(type)
          }}<template v-if="index < runeword?.types.length - 1">, </template>
        </template>
      </div>
      <div class="runeword__runes">
        <template v-for="(rune, index) in runeword.runes" :key="index">
          <span class="runeword__rune">
            <img
              :src="`/blizzless-runewords/` + findRune(rune)?.image_url"
              :alt="findRune(rune)?.name"
              class="runeword__image"
            />
            <span class="rune">{{
              findRune(rune)?.name[store.currentLang]
            }}</span>
          </span>
        </template>
      </div>
      <div
        class="runeword__property"
        v-for="prop in runeword.stats[store.currentLang]"
      >
        <template v-if="prop.includes('#')">
          <span class="modal__property--type">{{
            prop.substring(1, prop.length - 1)
          }}</span>
        </template>
        <template v-else>
          <span v-html="prop"></span>
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
      <template v-if="runeword?.old">
        <br />
        <hr />
        <br />
        <h2 class="runeword__original">Original version</h2>
        <div v-if="runeword?.old.types" class="runeword__type">
          <template v-for="(type, index) in runeword?.old.types" :key="index">
            {{ getTypeName(type)
            }}<template v-if="index < runeword?.old.types.length - 1"
              >,
            </template>
          </template>
        </div>
        <div v-if="runeword?.old.runes" class="runeword__runes">
          <template v-for="(rune, index) in runeword?.old.runes" :key="index">
            <span class="runeword__rune">
              <img
                :src="`/blizzless-runewords/` + findRune(rune)?.image_url"
                :alt="findRune(rune)?.name"
                class="runeword__image"
              />
              <span class="rune">{{
                findRune(rune)?.name[store.currentLang]
              }}</span>
            </span>
          </template>
        </div>
        <div
          class="runeword__property runeword__property--original"
          v-for="prop in runeword?.old.stats[store.currentLang]"
        >
          <template v-if="prop.includes('#')">
            <span class="modal__property--type">{{
              prop.substring(1, prop.length - 1)
            }}</span>
          </template>
          <template v-else>
            <span v-html="prop"></span>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { RUNES, ITEM_TYPES } from "@/shared/constants";
import { useInfoStore } from "@/store/index.js";

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

const getTypeName = (id) => {
  return ITEM_TYPES.find((rune) => rune.id === parseInt(id)).name[
    store.currentLang
  ];
};
</script>

<style lang="scss" scoped>
.runeword {
  right: 12px;
  top: 115px;
  position: fixed;
  min-width: 22rem;
  width: 490px;
  border: 1px solid #bab197;
  background-color: rgba(#000, 0.8);
  max-height: calc(100% - 125px);
  overflow-y: auto;

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

  &__original {
    text-align: center;
    margin-bottom: 16px;
  }

  &__title {
    color: #ecd2a8;
    text-align: center;
    margin-bottom: 0.5rem;
    font-size: 1.4em;
    line-height: 1em;
  }

  &__type {
    text-align: center;
    font-size: 0.875em;
    margin-bottom: 0.5rem;
    color: #888;
  }

  &__property {
    text-align: center;
    color: #5cbd4b;
    margin-bottom: 4px;

    &--original {
      color: #6e6eff;
    }

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
