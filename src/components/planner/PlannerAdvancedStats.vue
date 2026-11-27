<template>
  <div class="planner-section-label">
    {{ t("Бонусы экипировки", "Equipment bonuses") }}
  </div>
  <p class="planner-help">
    {{
      t(
        "Экипировка, сокеты и талисманы выбранного комплекта оружия.",
        "Equipment, sockets and charms of the selected weapon set."
      )
    }}
  </p>
  <p v-if="!summary" class="planner-help" role="status">
    {{ t("Загрузка бонусов…", "Loading bonuses…") }}
  </p>
  <template v-else>
    <details
      v-for="group in filteredGroups"
      :key="group.id"
      class="planner-bonus-group"
      :open="group.id !== 'effects' || !!query.trim()"
    >
      <summary>
        <UiIcon name="chevron-down" />
        <span>{{ group.label }}</span
        ><small>{{ group.rows.length }}</small>
      </summary>
      <dl class="planner-summary-list">
        <template v-for="row in group.rows" :key="row.key">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </template>
      </dl>
      <p v-if="group.id === 'effects'" class="planner-help">
        {{
          t(
            "Указаны свойства предметов. Срабатывания зависят от события, эффекты оружия — от используемой руки и атаки.",
            "Item properties. Procs depend on their trigger; weapon effects depend on the hand and attack used."
          )
        }}
      </p>
    </details>
    <p v-if="!filteredGroups.length" class="planner-help">
      {{ t("Бонусы не найдены", "No matching bonuses") }}
    </p>
    <p v-if="summary.warnings.length" class="planner-help" role="status">
      {{ t("Не удалось рассчитать свойства", "Could not calculate properties") }}:
      {{ summary.warnings.join(", ") }}
    </p>
  </template>
</template>
<script setup lang="ts">
import { computed } from "vue";
import UiIcon from "@/components/ui/UiIcon.vue";
import { useText } from "@/composables/useText";
import { useInfoStore } from "@/store";
import type { PlannerBuild } from "@/types/planner";
import type { GameSaveExporter } from "@/utils/planner-game-save";
import { advancedBuildStats } from "@/utils/planner-advanced-stats";

const props = defineProps<{
  build: PlannerBuild;
  native?: GameSaveExporter;
  query: string;
}>();
const info = useInfoStore();
const t = useText();
const summary = computed(
  () => props.native && advancedBuildStats(props.build, props.native, info.currentLang)
);
const filteredGroups = computed(() => {
  const query = props.query.trim().toLowerCase();
  return (summary.value?.groups ?? [])
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) =>
        `${group.label} ${row.label} ${row.value}`.toLowerCase().includes(query)
      ),
    }))
    .filter((group) => group.rows.length);
});
</script>
