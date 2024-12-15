<template>
  <div class="runelist">
    <div
      v-for="runePart in splittedRunes"
      :key="runePart"
      class="runelist__part"
    >
      <div
        v-for="rune in runePart"
        :key="rune.id"
        class="runelist__item"
        :class="{ '--active': isActive(rune.id) }"
        @click="selectRune(rune.id)"
      >
        <img :src="rune.image_url" :alt="rune.name" class="runelist__image" />
      </div>
    </div>
  </div>
  <div>
    <button @click="clearRunes">Clear</button>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { RUNES } from "@/shared/constants";

console.log("RUNES", RUNES);

const emit = defineEmits(["select"]);

const selectedRunes = ref([]);

const isActive = (id) => {
  const index = selectedRunes.value.findIndex((rune) => rune === id);

  return index === -1 ? false : true;
};

const selectRune = (id) => {
  const index = selectedRunes.value.findIndex((rune) => rune === id);

  if (index === -1) {
    selectedRunes.value.push(id);
  } else {
    selectedRunes.value.splice(index, 1);
  }

  emit("select", selectedRunes.value);
};

const clearRunes = () => {
  selectedRunes.value = [];
};

function splitToNChunks(array, n) {
  let result = [];
  for (let i = n; i > 0; i--) {
    result.push(array.splice(0, Math.ceil(array.length / i)));
  }
  return result;
}

const splittedRunes = computed(() => splitToNChunks(RUNES, 3));
</script>

<style lang="scss" scoped>
.runelist {
  gap: 4px;
  display: flex;

  &__part {
    gap: 4px;
    display: flex;
    flex-direction: column;
  }

  &__item {
    border-radius: 2px;
    border: 1px solid transparent;

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
