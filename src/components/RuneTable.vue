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
        v-for="item in items"
        :key="item.id"
        :class="[isComplete(selected, item.runes) ? 'complete' : '']"
      >
        <td>{{ item.id }}</td>
        <td class="table__name">
          <span
            @mouseenter="handleMouseEnter(item)"
            @mouseleave="handleMouseLeave(item)"
            >{{ item.name }}</span
          >
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
        <td>{{ item.types.join(", ") }}</td>
        <td>{{ item.level }}</td>
      </tr>
    </tbody>
  </table>

  <div
    v-if="showModal"
    class="modal"
    :style="`left: ${x + 40}px; top: ${y + 20}px`"
  >
    {{ currentItem }}
    <h3 class="modal__title">{{ currentItem.name }}</h3>
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
</script>

<style lang="scss" scoped>
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
      cursor: pointer;
    }
  }
}

.modal {
  padding: 32px;
  position: absolute;
  // left: 40px;
  // top: 40px;
  min-width: 22rem;
  max-width: 460px;
  border: 1px solid #bab197;
  background-color: rgba(#000, 0.8);

  &__title {
    color: #8a8062;
    text-align: center;
    margin-bottom: 0.5rem;
    font-size: 1.4em;
    line-height: 1em;
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
</style>
