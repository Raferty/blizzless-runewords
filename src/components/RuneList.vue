<template>
  <div class="runelist">
    <div class="runelist__wrapper">
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
          <img
            :src="`/blizzless-runewords/` + rune.image_url"
            :alt="rune.name"
            class="runelist__image"
          />
        </div>
      </div>
    </div>
    <div class="runelist__actions">
      <button class="button" @click="clearRunes">Clear</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  runes: {
    type: Array,
    default: () => {
      return [];
    },
  },
});

const emit = defineEmits(["select"]);

const selectedRunes = ref(
  JSON.parse(localStorage.getItem("selectedRunes")) || []
);

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

  localStorage.setItem("selectedRunes", JSON.stringify(selectedRunes.value));
  emit("select", selectedRunes.value);
};

const clearRunes = () => {
  selectedRunes.value = [];

  localStorage.setItem("selectedRunes", JSON.stringify([]));
  emit("select", selectedRunes.value);
};

function splitToNChunks(array, n) {
  let result = [];
  for (let i = n; i > 0; i--) {
    result.push(array.splice(0, Math.ceil(array.length / i)));
  }
  return result;
}

const splittedRunes = computed(() => splitToNChunks([...props.runes], 3));
</script>

<style lang="scss" scoped>
.runelist {
  margin-bottom: 16px;

  &__wrapper {
    gap: 4px;
    display: flex;
    flex-direction: column;
    margin-bottom: 16px;

    @media (min-width: 1024px) {
      flex-direction: row;
    }
  }

  &__title {
    font-weight: 700;
    padding: 4px;
    font-size: 14px;
    border-bottom: 1px solid #e5e7eb;
    margin-bottom: 4px;
  }

  &__part {
    gap: 4px;
    display: flex;
    flex-direction: row;

    @media (min-width: 1024px) {
      flex-direction: column;
    }
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

.button {
  cursor: pointer;
  width: 100%;
  display: block;
  padding: 4px 8px;
  border: 1px solid #ae2a1a;
  border-radius: 4px;
  display: block;
  color: #fff;
  background-color: #ae2a1a;
}
</style>
