<template>
  <Teleport to="body">
    <div
      :id="id"
      ref="tooltip"
      class="planner-skill-tooltip"
      :class="{
        'planner-skill-tooltip--unlearned': !rank,
        'planner-skill-tooltip--interactive': interactive,
      }"
      :role="interactive ? 'dialog' : 'tooltip'"
      :aria-label="interactive ? skill.name[lang] : undefined"
      :style="{ ...position, visibility: ready ? 'visible' : 'hidden' }"
    >
      <button
        v-if="interactive"
        class="planner-tooltip-close"
        :aria-label="t('Закрыть описание навыка', 'Close skill description')"
        @click="$emit('close')"
      >
        <UiIcon name="close" />
      </button>
      <h4>{{ skill.name[lang] }}</h4>
      <p class="planner-tooltip-description">{{ skill.description[lang] }}</p>
      <div v-if="fixed.length" class="planner-tooltip-section">
        <p v-for="(line, i) in fixed" :key="i">{{ line }}</p>
      </div>
      <div v-if="rank" class="planner-tooltip-section">
        <p>
          {{ t("Текущий уровень навыка", "Current Skill Level") }}: {{ rank + bonus }}
          ({{ t("вложено", "base points:") }} {{ rank }})
        </p>
        <p v-for="(line, i) in current?.effects" :key="i">{{ line }}</p>
      </div>
      <div v-if="rank < skill.maxPoints" class="planner-tooltip-section">
        <p>
          {{ t("Следующий уровень", "Next Level")
          }}<template v-if="!rank">: {{ 1 + bonus }}</template>
        </p>
        <p v-for="(line, i) in nextLevel?.effects" :key="i">{{ line }}</p>
      </div>
      <div v-if="synergies.length" class="planner-tooltip-section">
        <p class="planner-tooltip-synergies">
          {{ skill.name[lang] }} {{ t("получает бонусы от", "Receives Bonuses From") }}:
        </p>
        <p v-for="(line, i) in synergies" :key="i">{{ line }}</p>
      </div>
      <div
        v-if="!rank && !canLearn"
        class="planner-tooltip-section planner-tooltip-limit"
      >
        <p>{{ t("Требуемый уровень", "Required level") }}: {{ skill.requiredLevel }}</p>
        <p v-if="skill.requires.length">
          {{ t("Требуемые навыки", "Required skills") }}:
          {{ skill.requires.map(skillName).join(", ") }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { describeSkill } from "@/utils/planner-skill-description";
import { usePlannerGameData } from "@/composables/usePlannerGameData";
import { usePlannerStore } from "@/store/planner";
import UiIcon from "@/components/ui/UiIcon.vue";
import { computed, onMounted, ref, watch } from "vue";
import { useInfoStore } from "@/store";
import { useText } from "@/composables/useText";
import { plannerSkills } from "@/shared/planner";
import type { PlannerSkill } from "@/types/planner";

const props = defineProps<{
  id: string;
  skill: PlannerSkill;
  rank: number;
  bonus: number;
  canLearn: boolean;
  interactive: boolean;
  anchor: { left: number; right: number; top: number; bottom: number };
}>();
defineEmits<{ close: [] }>();
const info = useInfoStore();
const lang = computed(() => info.currentLang);
const t = useText();
const tooltip = ref<HTMLDivElement>();
const ready = ref(false);
const position = ref({ left: "12px", top: "12px" });
const skillName = (id: number) =>
  plannerSkills.find((skill) => skill.id === id)!.name[lang.value];

const store = usePlannerStore();
const native = usePlannerGameData();
const details = (next: boolean) =>
  native.value &&
  describeSkill(
    native.value,
    store.build,
    props.skill,
    props.rank + props.bonus + Number(next),
    next,
    lang.value
  );
const current = computed(() => (props.rank ? details(false) : undefined));
const nextLevel = computed(() =>
  props.rank < props.skill.maxPoints ? details(true) : undefined
);
const fixed = computed(() => (current.value ?? nextLevel.value)?.fixed ?? []);
const synergies = computed(() => {
  const lines = (current.value ?? nextLevel.value)?.synergies;
  return lines?.length ? lines : props.skill.synergies.map(skillName);
});

function place() {
  if (!tooltip.value) return;
  const { width, height } = tooltip.value.getBoundingClientRect();
  const margin = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let left = props.anchor.right + margin;
  if (left + width > viewportWidth - margin) left = props.anchor.left - width - margin;
  left = Math.max(margin, Math.min(left, viewportWidth - width - margin));
  const top =
    props.interactive && viewportWidth < 650
      ? viewportHeight - height - margin
      : props.anchor.top - 24;
  position.value = {
    left: `${left}px`,
    top: `${Math.max(margin, Math.min(top, viewportHeight - height - margin))}px`,
  };
  ready.value = true;
}
onMounted(place);
watch(
  () => [
    props.anchor,
    props.skill,
    props.rank,
    props.bonus,
    current.value,
    nextLevel.value,
    lang.value,
  ],
  place,
  {
    flush: "post",
  }
);
</script>
