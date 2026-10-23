<template>
  <span class="badges">
    <span v-if="item.reworked" class="badge">{{ t("Переработан", "Reworked") }}</span>
    <span v-if="item.marked" class="badge badge--new">Blizzless</span>
    <span v-if="item.patch === 'rotw'" class="badge badge--rotw">RotW</span>
    <span v-if="item.bugged?.status" class="badge badge--warning">{{
      t("Ошибка", "Bugged")
    }}</span>
  </span>
</template>
<script setup lang="ts">
import { useText } from "@/composables/useText";
import type { RunewordCardItem } from "@/types";
defineProps<{ item: RunewordCardItem }>();
const t = useText();
</script>
