<template>
  <span class="planner-mercenary-identity" :title="label">
    <img
      v-if="mercenary?.act"
      class="planner-mercenary-portrait"
      :src="`${base}images/planner/mercenaries/act${mercenary.act}.png`"
      alt=""
      width="26"
      height="26"
    />
    <PlannerIcon v-else class="planner-mercenary-portrait" name="helm" />
    <img
      v-if="skill"
      class="planner-mercenary-specialization"
      :src="`${base}${skill.icon}`"
      alt=""
      width="26"
      height="26"
    />
    <span class="planner-mercenary-name">{{ label }}</span>
  </span>
</template>
<script setup lang="ts">
import { computed } from "vue";
import PlannerIcon from "./PlannerIcon.vue";
import { mercenaries, plannerSkills } from "@/shared/planner";

const props = defineProps<{ type: string; label: string }>();
const base = import.meta.env.BASE_URL;
const mercenary = computed(() => mercenaries.find((m) => m.value === props.type));
const skill = computed(() =>
  plannerSkills.find((s) => s.id === mercenary.value?.skillId)
);
</script>
