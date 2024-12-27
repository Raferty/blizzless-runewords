<template>
  <table class="table">
    <thead>
      <tr>
        <th
          v-for="(item, index) in store.interface.table.headers[
            store.currentLang
          ]"
          :key="index"
          :class="{
            'table__th--name': item === 'Runeword' || item === 'Рунное слово',
            'table__th--level': item === 'Level' || item === 'Уровень',
          }"
        >
          <template v-if="item === 'Runeword' || item === 'Рунное слово'">
            <span class="sortable" @click="sortField = 'name'">{{ item }}</span>
            <span v-if="sortField === 'name'" class="sort">
              <svg
                width="0.5em"
                height="1em"
                viewBox="0 0 256 512"
                class="ux-icon ux-icon--fw"
              >
                <path
                  d="M168 345.941V44c0-6.627-5.373-12-12-12h-56c-6.627 0-12 5.373-12 12v301.941H41.941c-21.382 0-32.09 25.851-16.971 40.971l86.059 86.059c9.373 9.373 24.569 9.373 33.941 0l86.059-86.059c15.119-15.119 4.411-40.971-16.971-40.971H168z"
                  fill="currentColor"
                ></path>
              </svg>
            </span>
          </template>
          <template v-else-if="item === 'Level' || item === 'Уровень'">
            <span class="sortable" @click="sortField = 'level'">{{
              item
            }}</span>
            <span v-if="sortField === 'level'" class="sort">
              <svg
                width="0.5em"
                height="1em"
                viewBox="0 0 256 512"
                class="ux-icon ux-icon--fw"
              >
                <path
                  d="M168 345.941V44c0-6.627-5.373-12-12-12h-56c-6.627 0-12 5.373-12 12v301.941H41.941c-21.382 0-32.09 25.851-16.971 40.971l86.059 86.059c9.373 9.373 24.569 9.373 33.941 0l86.059-86.059c15.119-15.119 4.411-40.971-16.971-40.971H168z"
                  fill="currentColor"
                ></path>
              </svg>
            </span>
          </template>
          <template v-else>
            <span>{{ item }}</span>
          </template>
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
            @click="$emit('select', item)"
            class="name"
            >{{ item.name[store.currentLang] }}</span
          >
          <span v-if="item.reworked" class="reworked">{{
            store.interface.markers.reworked[store.currentLang]
          }}</span>
          <span v-if="item.ladder" class="chips">{{
            store.interface.markers.ladder[store.currentLang]
          }}</span>
          <span v-if="item?.bugged?.status" class="warning"
            >!!! {{ store.interface.markers.bugged[store.currentLang] }}</span
          >
        </td>
        <template v-for="(rune, index) in item.runes" :key="index">
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
          <template v-for="(type, index) in item.types" :key="index">
            {{ getTypeName(type)
            }}<template v-if="index < item?.types.length - 1">, </template>
          </template>

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
    ref="modal"
    class="modal"
    :style="`left: ${x + 40}px; top: ${y + 20}px`"
  >
    <h3 class="modal__title">{{ currentItem.name[store.currentLang] }}</h3>
    <div class="modal__type">
      <template v-for="(type, index) in currentItem.types" :key="index">
        {{ getTypeName(type)
        }}<template v-if="index < currentItem?.types.length - 1">, </template>
      </template>
    </div>
    <div class="modal__runes">
      <template v-for="(rune, index) in currentItem.runes" :key="index">
        <span class="modal__rune">
          <img
            :src="`/blizzless-runewords/` + findRune(rune)?.image_url"
            :alt="findRune(rune)?.name[store.currentLang]"
            class="modal__image"
          />
          <span class="rune">{{
            findRune(rune)?.name[store.currentLang]
          }}</span>
        </span>
      </template>
    </div>
    <div
      class="modal__property"
      v-for="prop in currentItem.stats[store.currentLang]"
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
    <br />
    <template v-if="currentItem?.bugged?.status">
      <h3 class="modal__title">Bugged</h3>
      <div
        class="modal__property modal__property--bugged"
        v-for="prop in currentItem?.bugged?.message"
      >
        {{ prop }}
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { RUNES, ITEM_TYPES } from "@/shared/constants";
import { useInfoStore } from "@/store/index.js";
import { useElementSize } from '@vueuse/core'

const store = useInfoStore();

defineEmits(["select"]);

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

const findRune = (id) => {
  return RUNES.find((rune) => rune.id === id);
};

const getRuneName = (id) => {
  return RUNES.find((rune) => rune.id === parseInt(id)).name[store.currentLang];
};

const getTypeName = (id) => {
  return ITEM_TYPES.find((rune) => rune.id === parseInt(id)).name[
    store.currentLang
  ];
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

const modal = ref(null);
const { modalHeight } = useElementSize(modal)

const showModal = ref(false);
const currentItem = ref([]);

const x = ref(0);
const y = ref(0);

const update = (e) => {
  x.value = e.pageX;
  y.value = e.pageY;
};

const handleMouseEnter = (item) => {
  showModal.value = true;
  currentItem.value = item;
};

const handleMouseLeave = () => {
  showModal.value = false;
  currentItem.value = [];
};

function useSortArrayBoolean(array, field) {
  return array.sort((a, b) => {
    if (a[field] && !b[field]) {
      return -1;
    } else if (!a[field] && b[field]) {
      return 1;
    } else {
      return 0;
    }
  });
}

function useSortArrayByField(array, field) {
  const withDot = field.includes(".");

  if (withDot) {
    const [field1, field2] = field.split(".");

    return array.sort((a, b) => {
      // nulls sort after anything else
      if (a[field1][field2] === null) {
        return 1;
      }
      if (b[field1][field2] === null) {
        return -1;
      }

      if (a[field1][field2] < b[field1][field2]) {
        return -1;
      }

      if (a[field1][field2] > b[field1][field2]) {
        return 1;
      }

      return 0;
    });
  } else {
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
}

const sortField = ref("name");

const sortedItems = computed(() => {
  let items = [];

  switch (sortField.value) {
    case "name":
      items = useSortArrayByField(props.items, `name.${store.currentLang}`);
      break;
    case "level":
      items = useSortArrayByField(props.items, `level`);
      break;
  }

  return useSortArrayBoolean(items, "complete");
});

onMounted(() => {
  window.addEventListener("mousemove", update);
  window.addEventListener("touchstart", update);
});
onUnmounted(() => window.removeEventListener("mousemove", update));


</script>

<style lang="scss">
.table {
  width: 100%;
  font-size: 14px;
  border-collapse: collapse;

  display: block;
  overflow-x: auto;

  @media (min-width: 1024px) {
    display: table;
  }

  th {
    padding: 4px;
    text-align: left;
    line-height: 100%;
    white-space: nowrap;
  }

  tr {
    border-bottom: 1px solid #e5e7eb;
  }

  td {
    padding: 7px 5px;
    text-align: left;
    border-bottom: 1px solid #24221c;
  }

  &__th {
    &--name,
    &--level {
      display: flex;
      align-items: center;
      gap: 2px;
    }
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

  &__types {
    color: #888;
  }
}

.name {
  color: #ecd2a8;
}

.modal {
  padding: 24px;
  position: absolute;
  min-width: 22rem;
  max-width: 490px;
  border: 1px solid #bab197;
  background-color: rgba(#000, 0.8);

  &__title {
    color: #ecd2a8;
    text-align: center;
    margin-bottom: 0.5rem;
    font-size: 1.4em;
    line-height: 1em;
  }

  &__type {
    text-align: center;
    font-size: 0.875em;
    margin-bottom: 0.5rem;
    color: #888;
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
}

.sortable {
  cursor: pointer;
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
  color: #fff;
  font-size: 12px;
  padding: 2px 4px;
  background-color: #501008;
  border-radius: 4px;
}

.reworked {
  font-size: 12px;
  color: #fff;
  padding: 2px 4px;
  border-radius: 4px;
  background-color: rgba(#007bff, 0.8);
}

.warning {
  font-size: 12px;
  color: #000;
  padding: 2px 4px;
  border-radius: 4px;
  background-color: rgba(#ffc107, 0.8);
}
</style>
