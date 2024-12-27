<template>
  <div class="runeword" :class="classes">
    <h3  :class="[type === 'original' ? `runeword__original`: `runeword__title`]">{{ name }}</h3>
    <div class="runeword__level"></div>
    <div class="runeword__type">
      <template v-for="(type, index) in runeword?.types" :key="index">
        {{ getTypeName(type)
        }}<template v-if="index < runeword?.types.length - 1">, </template>
      </template>
    </div>
    <div class="runeword__runes">
      <template v-for="(rune, index) in runeword.runes" :key="index">
        <span class="runeword__rune">
          <img
            :src="`/blizzless-runewords/` + useFindRuneById(rune)?.image_url"
            :alt="useFindRuneById(rune)?.name"
            class="runeword__image"
          />
          <span class="rune">{{
            useFindRuneById(rune)?.name[store.currentLang]
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
    <template v-if="runeword?.bugged?.status">
      <h3 class="runeword__title runeword__bugged">Bugged</h3>
      <div
        class="runeword__property runeword__property--bugged"
        v-for="prop in runeword?.bugged?.message"
      >
        {{ prop }}
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { storeToRefs } from 'pinia';
import { ITEM_TYPES } from "@/shared/constants";

import { useFindRuneById } from '@/composables/useFindRuneById.js'
import { useInfoStore } from "@/store/index.js";

const props = defineProps({
  name: {
    type: String,
    defualt: '',
  },
  runeword: {
    type: Object,
    default: () => {
      return {};
    }
  },
  type: {
    type: String,
    validator(value) {
      return ['original', 'modified'].indexOf(value) !== -1;
    },
    default: 'modified',
  },
});

const store = useInfoStore();

const { currentLang } = storeToRefs(store);

const getTypeName = (id) => {
  return ITEM_TYPES.find((rune) => rune.id === parseInt(id)).name[
    store.currentLang
  ];
};

const classes = computed(() => ({
  [`--${props.type}`]: true,
}));

</script>

<style lang="scss" scoped>
.runeword {
  &__title {
    color: #ecd2a8;
    text-align: center;
    margin-bottom: 0.5rem;
    font-size: 1.4em;
    line-height: 1em;
  }

  &__bugged {
    margin-top: 16px;
  }

  &__original {
    text-align: center;
    margin-bottom: 16px;
  }

  &__type {
    text-align: center;
    font-size: 0.875em;
    margin-bottom: 0.5rem;
    color: #888;
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

  &__property {
    text-align: center;
    color: #5cbd4b;

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

  &__image {
    max-width: 32px;
    margin-right: 4px;
  }

  &.--original & {
    &__property {
      color: #6e6eff;
    }
  }
}
</style>
