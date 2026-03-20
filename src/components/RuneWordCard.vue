<template>
  <div class="runeword">
    <div v-if="runeword?.marked" class="runeword__new">new</div>
    <div v-if="runeword?.reworked" class="runeword__reworked">reworked</div>
    <h3 class="runeword__title">{{ runeword.name?.[store.currentLang] }}</h3>
    <div class="runeword__type">
      <template v-for="(type, index) in runeword.types ?? []" :key="index">
        {{ getTypeName(type)
        }}<template v-if="index < (runeword.types?.length ?? 0) - 1">, </template>
      </template>
    </div>
    <div class="runeword__runes">
      <template v-for="(rune, index) in runeword.runes ?? []" :key="index">
        <span class="runeword__rune">
          <img
            :src="`/blizzless-runewords/` + findRune(rune)?.image_url"
            :alt="findRune(rune)?.name?.[store.currentLang]"
            class="runeword__image"
          />
          <span class="rune">{{ findRune(rune)?.name?.[store.currentLang] }}</span>
        </span>
      </template>
    </div>
    <template v-if="runeword.stats">
      <div
        v-for="(prop, index) in runeword.stats[store.currentLang]"
        :key="`stat-${index}`"
        class="runeword__property"
      >
        <template v-if="prop.includes('#')">
          <span class="modal__property--type">{{
            prop.substring(1, prop.length - 1)
          }}</span>
        </template>
        <template v-else>
          <!-- eslint-disable-next-line vue/no-v-html -- trusted game strings -->
          <span v-html="prop"></span>
        </template>
      </div>
    </template>
    <br />
    <template v-if="runeword?.bugged?.status">
      <h3 class="modal__title">Bugged</h3>
      <div
        v-for="(prop, index) in runeword?.bugged?.message ?? []"
        :key="`bug-${index}`"
        class="modal__property modal__property--bugged"
      >
        {{ prop }}
      </div>
    </template>
    <template v-if="showOld && runeword?.old">
      <br />
      <hr />
      <br />
      <h2 class="runeword__original">Original version</h2>
      <div v-if="runeword?.old?.types" class="runeword__type">
        <template v-for="(type, index) in runeword?.old?.types ?? []" :key="index">
          {{ getTypeName(type)
          }}<template v-if="index < (runeword?.old?.types?.length ?? 0) - 1">, </template>
        </template>
      </div>
      <div v-if="runeword?.old?.runes" class="runeword__runes">
        <template v-for="(rune, index) in runeword?.old?.runes ?? []" :key="index">
          <span class="runeword__rune">
            <img
              :src="`/blizzless-runewords/` + findRune(rune)?.image_url"
              :alt="findRune(rune)?.name?.[store.currentLang]"
              class="runeword__image"
            />
            <span class="rune">{{ findRune(rune)?.name?.[store.currentLang] }}</span>
          </span>
        </template>
      </div>
      <template v-if="runeword?.old?.stats">
        <div
          v-for="(prop, index) in runeword.old.stats[store.currentLang]"
          :key="`old-stat-${index}`"
          class="runeword__property runeword__property--original"
        >
          <template v-if="prop.includes('#')">
            <span class="modal__property--type">{{
              prop.substring(1, prop.length - 1)
            }}</span>
          </template>
          <template v-else>
            <!-- eslint-disable-next-line vue/no-v-html -- trusted game strings -->
            <span v-html="prop"></span>
          </template>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useInfoStore } from "@/store";
import { useRunes } from "@/composables/useRunes";
import type { RunewordCardItem } from "@/types";

const store = useInfoStore();
const { findRune, getTypeName } = useRunes();

withDefaults(
  defineProps<{
    runeword?: RunewordCardItem;
    showOld?: boolean;
  }>(),
  {
    runeword: () => ({}),
    showOld: false,
  }
);
</script>

<style lang="scss">
.runeword {
  width: 100%;

  &__reworked {
    padding: 2px 4px;
    border-radius: 2px;
    display: inline-block;
    background-color: var(--color-reworked-bg);
    position: absolute;
    top: 1px;
    right: 1px;
  }

  &__new {
    padding: 2px 4px;
    border-radius: 2px;
    display: inline-block;
    background-color: #4a4;
    position: absolute;
    top: 1px;
    left: 1px;
  }

  &__wrapper {
    padding: 24px;
    position: relative;
  }

  &__close {
    position: absolute;
    right: 12px;
    top: 10px;
    color: var(--color-danger);
    cursor: pointer;
  }

  &__original {
    text-align: center;
    margin-bottom: 16px;
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
    margin-bottom: 2px;
    font-size: 0.875em;
    text-align: center;
    color: var(--color-success);

    &--original {
      color: var(--color-link);
    }

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

  &__wrapper {
    padding: 0;
  }
}
</style>
