<template>
  <div class="runelist">
    <div v-for="rune in RUNES" :key="rune.id" class="runelist__item" :class="{'--active': isActive(rune.id)}" @click="selectRune(rune.id)">
      <img :src="rune.image_url" :alt="rune.name" class="runelist__image">
    </div>
  </div>
  <div>
    <button @click="clearRunes">Clear</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { RUNES } from '@/shared/constants';

const emit = defineEmits(['select'])

const selectedRunes = ref([]);

const isActive = (id) => {
  const index = selectedRunes.value.findIndex(rune => rune === id);

  return index === -1 ? false: true;
}

const selectRune = (id) => {
  const index = selectedRunes.value.findIndex(rune => rune === id);

  if(index === -1) {
    selectedRunes.value.push(id);
  } else {
    selectedRunes.value.splice(index, 1);
  }

  emit('select', selectedRunes.value)
}

const clearRunes = () => {
  selectedRunes.value = [];
}
</script>

<style lang="scss" scoped>
.runelist {
  column-count: 3;

  &__item {
    width: 32px;
    display: inline-block;

    &:hover {
      cursor: pointer;
    }

    &.--active {
      border: 1px solid #ffd100;
    }
  }

  &__image {
    width: 48px;
  }
}
</style>
