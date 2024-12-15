<template>
  {{ RUNES }}
  <table class="table">
    <thead>
      <tr>
        <th v-for="item in headers" :key="headers">
          {{ item }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in items" :key="item.id">
        <td>{{ item.name }}</td>

        <td>{{ item.runes }}</td>

        <template v-for="rune in item.runes" :key="rune">
          <td>
            {{ getRuneName(rune) }}
          </td>
        </template>

        <!-- <td>rune 1</td>
        <td>rune 2</td>
        <td>rune 3</td>
        <td>rune 4</td>
        <td>rune 5</td>
        <td>rune 6</td> -->
        <td>{{ item.types.join(", ") }}</td>
        <td>{{ item.level }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
import { ref, computed } from "vue";
import { RUNES } from "@/shared/constants";

console.log("RUNES", RUNES);

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
  return props.runes.filter((rune) => rune.id === parseInt(id));
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
}
</style>
