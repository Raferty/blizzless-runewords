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
        <div class="wrapper__container">
          <div class="search">
            <input
              v-model="search"
              type="text"
              class="search__input"
              :placeholder="
                store.interface.search.placeholder[store.currentLang]
              "
            />
          </div>

          <div class="filter">
            <div class="filter__block">
              <div class="filter__title">Sockets:</div>
              <div class="filter__item" :class="{'filter__item--active': socketFilter.includes(2) }" @click="setSocket(2)">2</div>
              <div class="filter__item" :class="{'filter__item--active': socketFilter.includes(3) }" @click="setSocket(3)">3</div>
              <div class="filter__item" :class="{'filter__item--active': socketFilter.includes(4) }" @click="setSocket(4)">4</div>
              <div class="filter__item" :class="{'filter__item--active': socketFilter.includes(5) }" @click="setSocket(5)">5</div>
              <div class="filter__item" :class="{'filter__item--active': socketFilter.includes(6) }" @click="setSocket(6)">6</div>
              <div class="filter__item filter__item--all" @click="setSocket()">all</div>
            </div>
          </div>

          <RuneTable
            :items="filteredRunewords"
            :runes="RUNES"
            :selected="SelectedRunes"
            @select="handleRuneWord"
          />

          <div class="hints">
            <h3 class="hints__title">
              {{ store.interface.hints.title[store.currentLang] }}
            </h3>

            <div class="hints__block">
              <span class="chips">{{
                store.interface.markers.ladder[store.currentLang]
              }}</span>
              -
              {{
                store.currentLang === "ru"
                  ? `Работает только на лестнице :D`
                  : `Ladder only runewords.`
              }}
            </div>

            <div class="hints__block">
              <span class="new">{{
                store.interface.markers.new[store.currentLang]
              }}</span>
              -
              {{
                store.currentLang === "ru"
                  ? `Новый рунворд разработанный командой Blizzless. В разработке`
                  : `New runeword designed by Blizzless team. In development now`
              }}
            </div>

            <div class="hints__block">
              <span class="reworked">{{
                store.interface.markers.reworked[store.currentLang]
              }}</span>
              -
              {{
                store.currentLang === "ru"
                  ? `Переработан командой «безМетелицы»`
                  : `Reworked runeword by Blizzless team.`
              }}
            </div>

            <div class="hints__block">
              <span class="warning"
                >!!!
                {{ store.interface.markers.bugged[store.currentLang] }}</span
              >
              -
              {{
                store.currentLang === "ru"
                  ? `В данный момент работает некорректно. Скоро будет исправлен`
                  : `Bugged at this moment. Will be fix soon`
              }}.
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
import { RUNES } from "@/shared/constants";

import TheHeader from "./components/TheHeader.vue";
import TheFooter from "./components/TheFooter.vue";
import RuneList from "./components/RuneList.vue";
import RuneTable from "./components/RuneTable.vue";
import RuneWordCard from "./components/RuneWordCard.vue";

import { useInfoStore } from "@/store/index.js";

const store = useInfoStore();

const currentWidth = ref(0);

const initLang = (lang) => {
  document.querySelector("html").setAttribute("lang", lang);
};

const handleResize = () => {
  currentWidth.value = window.innerWidth;
};

onMounted(() => {
  handleResize();

  initLang(localStorage.getItem("lang") || "en");
  store.setLang(localStorage.getItem("lang") || "en");

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

const socketFilter = ref([]);

const setSocket = (value) => {
  const Index = socketFilter.value.findIndex(i => i === value);

  if(value) {
    if(Index === -1) {
    socketFilter.value.push(value);
  } else {
    socketFilter.value.splice(Index, 1)
  }
  } else {
    socketFilter.value = [];
  }

}

const filteredRunewords = computed(() => {
  return search.value
    ? sortedRunewords.value.filter(
        (word) =>
          word.name.ru.toLowerCase().includes(search.value.toLowerCase()) ||
          word.name.en.toLowerCase().includes(search.value.toLowerCase())
      ).filter(i => socketFilter.value.length ? socketFilter.value.includes(i.runes.length) : i.runes.length)
    : sortedRunewords.value.filter(i => socketFilter.value.length ? socketFilter.value.includes(i.runes.length) : i.runes.length);
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

  &__container {
    @media (min-width: 1024px) {
      margin-left: 32px;
    }
  }
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

.filter {
  margin-bottom: 16px;

  &__title {margin-right: 4px;}

  &__block {
    display: flex;
    padding: 4px;
    gap: 4px;
  }

  &__item {
    font-size: 14px;
    line-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: #fff;
    background-color:#844 ;
    border: 1px solid #844;
    cursor: pointer;

    &--active {
      color: #fff;
      background-color: #44aa44;
      border-color: #44aa44;
    }

    &--all {
      border-color: #ffc107cc;
      background-color: #ffc107cc;
      color: #000;
    }
  }
}
</style>
