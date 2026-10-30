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
      <p class="planner-tooltip-status">
        {{
          rank
            ? `${t("Текущий уровень", "Current skill level")}: ${rank + bonus}`
            : t("Навык ещё не изучен", "You have not learned this skill yet")
        }}
      </p>
      <h4>{{ skill.name[lang] }}</h4>
      <p class="planner-tooltip-description">{{ skill.description[lang] }}</p>
      <p class="planner-tooltip-requirement">
        {{ t("Требуемый уровень", "Required level") }}: {{ skill.requiredLevel }}
      </p>
      <div class="planner-tooltip-ranks">
        <p>
          {{ t("Вложено очков", "Base skill level") }}: {{ rank }} / {{ skill.maxPoints }}
        </p>
        <p v-if="rank && bonus" class="planner-tooltip-bonus">
          {{ t("Бонус снаряжения", "Equipment bonus") }}: +{{ bonus }}
        </p>
        <p v-if="!canLearn" class="planner-tooltip-limit">
          {{
            t(
              "Недостаточно очков или достигнут предел уровня.",
              "Not enough points or the level limit has been reached."
            )
          }}
        </p>
      </div>
      <div v-if="skill.requires.length" class="planner-tooltip-section">
        <p>{{ t("Требуемые навыки", "Required skills") }}:</p>
        <ul>
          <li v-for="requiredId in skill.requires" :key="requiredId">
            {{ skillName(requiredId) }}
          </li>
        </ul>
      </div>
      <div v-if="skill.synergies.length" class="planner-tooltip-section">
        <p>
          {{ skill.name[lang] }} {{ t("получает бонусы от", "receives bonuses from") }}:
        </p>
        <ul>
          <li v-for="synergyId in skill.synergies" :key="synergyId">
            {{ skillName(synergyId) }}
          </li>
        </ul>
      </div>
      <p class="planner-tooltip-hint">
        {{
          t(
            "ЛКМ: +1 · ПКМ: −1 · Shift: максимум",
            "Left click: +1 · Right click: −1 · Shift: max"
          )
        }}
      </p>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
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
watch(() => [props.anchor, props.skill, props.rank, props.bonus, lang.value], place, {
  flush: "post",
});
</script>
