<template>
  <div class="runeword">
    <div v-if="runeword?.patch === 'rotw'" class="runeword__rotw">rotw</div>
    <div v-if="runeword?.marked" class="runeword__new">custom</div>
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
        :class="prop.includes('#') ? 'runeword__property--type' : ''"
      >
        <template v-if="prop.includes('#')">
          {{ prop.substring(1, prop.length - 1) }}
        </template>
        <template v-else>
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
          :class="prop.includes('#') ? 'runeword__property--type' : ''"
        >
          <template v-if="prop.includes('#')">
            {{ prop.substring(1, prop.length - 1) }}
          </template>
          <template v-else>
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
    position: absolute;
    top: 1px;
    right: 1px;
    display: inline-block;
    padding: 2px 4px;
    color: var(--color-text-inverse);
    background-color: var(--color-reworked-bg);
    border-radius: 2px;
  }

  &__new {
    position: absolute;
    top: 1px;
    left: 1px;
    display: inline-block;
    padding: 2px 4px;
    background-color: #4a4;
    border-radius: 2px;
  }

  &__rotw {
    position: absolute;
    top: 1px;
    right: 1px;
    display: inline-block;
    padding: 2px 4px;
    color: var(--color-text-inverse);
    background-color: var(--color-rotw);
    border-radius: 2px;
  }

  &__wrapper {
    position: relative;
    padding: 24px;
  }

  &__close {
    position: absolute;
    top: 10px;
    right: 12px;
    color: var(--color-danger);
    cursor: pointer;
  }

  &__original {
    margin-bottom: 16px;
    text-align: center;
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
    margin-bottom: 2px;
    font-size: 0.875em;
    color: var(--color-success);
    text-align: center;

    &--original {
      color: var(--color-link);
    }

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
    flex-wrap: wrap;
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

  &__wrapper {
    padding: 0;
  }
}
</style>
