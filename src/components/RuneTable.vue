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
      <tr v-for="item in items" :key="item.id">
        <td>{{ item.name }}</td>
        <td>rune 1</td>
        <td>rune 2</td>
        <td>rune 3</td>
        <td>rune 4</td>
        <td>rune 5</td>
        <td>rune 6</td>
        <td>{{ item.types }}</td>
        <td>{{ item.level }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => {
      return [];
    }
  }
});

const headers = ['Runeword', 'Rune', 'Rune', 'Rune', 'Rune', 'Rune', 'Rune', 'Item Types', 'Level']
</script>

<style lang="scss" scoped>
.table {
  width: 100%;
  font-size: 14px;
  border-collapse: collapse;
  border: 1px solid rgba(181,56,26,.5);

  th {
    padding: 4px;
    text-align: left;
  }

  td {
    padding: 4px;
    text-align: left;
  }
}
</style>
