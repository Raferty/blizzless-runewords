<template>
  <TheHeader />
  <main class="main">
    <div class="main__container container">
      <aside class="aside">
        <div class="aside__container">
          <RuneList :runes="RUNES" @select="(e: any) => SelectedRunes = e" />
        </div>
      </aside>
      <section class="wrapper">
        <div class="container">
          <div class="search">
            <input
              v-model="search"
              type="text"
              class="search__input"
              placeholder="Search by name"
            />
          </div>

          <RuneTable
            :items="filteredRunewords"
            :runes="RUNES"
            :selected="SelectedRunes"
            @select="handleRuneWord"
          />

          <div class="hints">
            <h3 class="hints__title">Hints</h3>

            <div class="hints__block">
              <span class="chips">L</span> - Ladder only runewords.
            </div>

            <div class="hints__block">
              <span class="reworked">Reworked</span> - Reworked runeword by
              Blizzless team.
            </div>

            <div class="hints__block">
              <span class="warning">!!! Bugged atm</span> - Bugged at this
              moment. Will be fix soon.
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>
  <TheFooter />

  <RuneWordCard v-model="currentCard" :runeword="currentRuneWord" />
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { RUNEWORDS } from "@/shared/runewords";
import RUNES from "@/shared/constants";

import TheHeader from "./components/TheHeader.vue";
import TheFooter from "./components/TheFooter.vue";
import RuneList from "./components/RuneList.vue";
import RuneTable from "./components/RuneTable.vue";
import RuneWordCard from "./components/RuneWordCard.vue";

const currentWidth = ref(0);

const handleResize = () => {
  currentWidth.value = window.innerWidth;
};

onMounted(() => {
  handleResize();

  if (import.meta.client) {
    window.addEventListener("resize", handleResize);
  }
});

const search = ref("");
const SelectedRunes = ref(
  JSON.parse(localStorage.getItem("selectedRunes")) || []
);

const isComplete = (where, what) => {
  for (var i = 0; i < what.length; i++) {
    if (where.indexOf(what[i]) == -1) return false;
  }
  return true;
};

const sortedRunewords = computed(() => {
  let result = [];

  RUNEWORDS.forEach((item) => {
    if (isComplete(SelectedRunes.value, item.runes)) {
      result.push({
        ...item,
        complete: true,
      });
    } else {
      result.push({
        ...item,
      });
    }
  });

  return result;
});

const filteredRunewords = computed(() => {
  return search.value
    ? sortedRunewords.value.filter((word) =>
        word.name.toLowerCase().includes(search.value.toLowerCase())
      )
    : sortedRunewords.value;
});

const currentCard = ref(false);
const currentRuneWord = ref({});

const handleRuneWord = (evt) => {
  currentRuneWord.value = evt;

  if (currentWidth.value >= 1024) {
    currentCard.value = true;
  }
};
</script>

<style lang="scss" scoped>
.aside {
  width: 100%;
  margin-bottom: 16px;

  @media (min-width: 1024px) {
    margin-bottom: 0;
    width: 144px;
  }

  &__container {
    position: sticky;
    top: 15px;

    padding-top: 55px;
    padding-left: 8px;
    padding-right: 8px;

    @media (min-width: 1024px) {
      padding-left: 0;
      padding-right: 0;
    }
  }
}

.container {
  padding-left: 8px;
  padding-right: 8px;

  @media (min-width: 1024px) {
    padding-left: 16px;
    padding-right: 16px;
  }
}

.main {
  //margin: 0 auto;
  max-width: 1100px;

  &__container {
    display: flex;
    flex-direction: column;

    @media (min-width: 1024px) {
      flex-direction: row;
    }
  }
}

.wrapper {
  flex: 1;

  // @media (min-width: 1024px) {
  //   margin-left: 32px;
  // }
}

.hints {
  margin-top: 32px;
  margin-bottom: 32px;
  margin-bottom: 400px;

  &__title {
    margin-bottom: 16px;
  }

  &__block {
    margin-bottom: 16px;
  }
}

.search {
  margin-bottom: 16px;

  &__input {
    width: 100%;
    font-size: 16px;
    border-radius: 4px;
    color: #bab197;
    background-color: #000;
    border: 1px solid #8a8062;
    padding: 8px;

    &::-webkit-input-placeholder {
      transition: all 0.4s ease;
    }

    &:focus::-webkit-input-placeholder {
      opacity: 0;
    }
  }
}
</style>
