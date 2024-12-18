<template>
  <table class="table">
    <thead>
      <tr>
        <th v-for="item in headers" :key="headers">
          {{ item }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="item in sortedItems"
        :key="item.id"
        :class="[isComplete(selected, item.runes) ? 'complete' : '']"
      >
        <td class="table__name">
          <span
            @mouseenter="handleMouseEnter(item)"
            @mouseleave="handleMouseLeave(item)"
            >{{ item.name }}</span
          >
          <span v-if="item.reworked" class="reworked">reworked</span>
          <span v-if="item.ladder" class="chips">L</span>
          <span v-if="item?.bugged?.status" class="warning">!!! bugged atm</span>
        </td>
        <template v-for="rune in item.runes" :key="rune">
          <template v-if="isFound(rune)">
            <td class="found">
              {{ getRuneName(rune) }}
            </td>
          </template>
          <template v-else>
            <td class="notfound">
              {{ getRuneName(rune) }}
            </td>
          </template>
        </template>

        <template v-for="n in RUNELENGTH - item.runes.length" :key="n">
          <td>&nbsp;</td>
        </template>
        <td class="table__types">
          {{ item.types.join(", ") }}
          <template v-if="item.excluded && item.excluded.length > 0">
            <span class="table__classes">({{ item.excluded }})</span>
          </template>
          <template v-if="item.classes && item.classes.length > 0">
            <span class="table__classes">({{ item.classes.join(", ") }})</span>
          </template>
        </td>
        <td>{{ item.level }}</td>
      </tr>
    </tbody>
  </table>

  <div
    v-if="showModal"
    class="modal"
    :style="`left: ${x + 40}px; top: ${y + 20}px`"
  >
    <h3 class="modal__title">{{ currentItem.name }}</h3>
    <div class="modal__type">{{ currentItem.types.join(', ') }}</div>
    <div class="modal__property" v-for="prop in currentItem.stats">
      <template v-if="prop.includes('#')">
        <span class="modal__property--type">{{ prop.substring(1, prop.length - 1) }}</span>
      </template>
      <template v-else>
        {{ prop }}
      </template>
    </div>
    <br />
    <template v-if="currentItem?.bugged?.status">
      <h3 class="modal__title">Bugged</h3>
      <div class="modal__property modal__property--bugged" v-for="prop in currentItem?.bugged?.message">
        {{ prop }}
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import RUNES from "@/shared/constants";

const RUNELENGTH = 6;

const props = defineProps({
  items: {
    type: Array,
    default: () => {
      return [];
    },
  },
  runes: {
    type: Array,
    default: () => {
      return [];
    },
  },
  selected: {
    type: Array,
    default: () => {
      return [];
    },
  },
});

const headers = [
  "Runeword",
  "Rune",
  "Rune",
  "Rune",
  "Rune",
  "Rune",
  "Rune",
  "Item Types",
  "Level",
];

const getRuneName = (id) => {
  return RUNES.find((rune) => rune.id === parseInt(id)).name;
};

const isFound = (id) => {
  return props.selected.includes(id);
};

const isComplete = (where, what) => {
  for (var i = 0; i < what.length; i++) {
    if (where.indexOf(what[i]) == -1) return false;
  }
  return true;
};

const showModal = ref(false);
const currentItem = ref([]);

const x = ref(0);
const y = ref(0);

const update = (e) => {
  x.value = e.pageX;
  y.value = e.pageY;
};

onMounted(() => window.addEventListener("mousemove", update));
onUnmounted(() => window.removeEventListener("mousemove", update));

const handleMouseEnter = (item) => {
  showModal.value = true;
  currentItem.value = item;
};

const handleMouseLeave = () => {
  showModal.value = false;
  currentItem.value = [];
};

function useSortArrayByField(array, field) {
  return array.sort((a, b) => {
    // nulls sort after anything else
    if (a[field] === null) {
      return 1;
    }
    if (b[field] === null) {
      return -1;
    }

    if (a[field] < b[field]) {
      return -1;
    }

    if (a[field] > b[field]) {
      return 1;
    }

    return 0;
  });
}

const sortedItems = computed(() => useSortArrayByField(props.items, 'level'));
</script>

<style lang="scss">
.table {
  width: 100%;
  font-size: 14px;
  border-collapse: collapse;

  th {
    padding: 4px;
    text-align: left;
  }

  tr {
    border-bottom: 1px solid #e5e7eb;
  }

  td {
    padding: 7px 5px;
    text-align: left;
    border-bottom: 1px solid #24221c;
  }

  &__name {
    position: relative;

    span {
      display: inline-block;
      cursor: pointer;
      margin-right: 8px;
    }
  }

  &__classes {
    display: block;
    color: #bd8547;
  }
}

.modal {
  padding: 32px;
  position: absolute;
  min-width: 22rem;
  max-width: 490px;
  border: 1px solid #bab197;
  background-color: rgba(#000, 0.8);

  &__title {
    color: #8a8062;
    text-align: center;
    margin-bottom: 0.5rem;
    font-size: 1.4em;
    line-height: 1em;
  }

  &__type {
    text-align: center;
    font-size: .875em;
    margin-bottom: .5rem;
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
}

.found {
  color: #44aa44;
}
.notfound {
  color: #844;
}

.complete {
  background-color: #200000;
}

.chips {
  text-align: center;
  display: inline-block;
  width: 16px;
  color: #fff;
  background-color: #501008;
  border-radius: 4px;
}

.reworked {
  font-size: 12px;
  color: #fff;
  padding: 2px 4px;
  border-radius: 4px;
  background-color: #007bff;
}

.warning {
  font-size: 12px;
  color: #000;
  padding: 2px 4px;
  border-radius: 4px;
  background-color: #ffc107;
}
</style>
