<template>
  <section
    class="planner-panel planner-skills-panel"
    :aria-label="t('Дерево навыков', 'Skill tree')"
  >
    <div class="planner-trees">
      <section
        v-for="treeIndex in treeOrder"
        :key="treeIndex"
        class="planner-tree"
        :style="{ '--class-color': store.character.color }"
      >
        <PlannerSkillBackground />
        <button
          class="planner-tree-reset"
          :disabled="!treePoints(treeIndex)"
          :aria-label="`${t('Сбросить ветку', 'Reset tree')}: ${store.character.trees[treeIndex][lang]}`"
          :title="t('Сбросить ветку', 'Reset tree')"
          @click="store.resetSkillTree(treeIndex)"
        />
        <div class="planner-tree-title">
          <h4>{{ store.character.trees[treeIndex][lang] }}</h4>
          <span
            >{{ treePoints(treeIndex) }} {{ t("очков вложено", "points spent") }}</span
          >
        </div>
        <div class="planner-tree-grid">
          <PlannerSkillBranches
            v-if="treeGraphics[treeIndex]"
            :art="treeGraphics[treeIndex]"
          />
          <PlannerNativeSkillBranches
            v-else-if="nativeGraphics[treeIndex]"
            :art="nativeGraphics[treeIndex]"
          />
          <svg
            v-else
            class="planner-tree-lines"
            viewBox="0 0 1162 1507"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <marker
                :id="`${uid}-arrow-${treeIndex}`"
                viewBox="36 297 80 64"
                refX="76"
                refY="359"
                markerWidth="64"
                markerHeight="48"
                markerUnits="userSpaceOnUse"
                orient="0"
              >
                <image :href="`${base}${skillFrameTexture}`" width="740" height="1046" />
              </marker>
            </defs>
            <path
              v-for="edge in edges(treeIndex)"
              :key="edge.key"
              :d="edge.path"
              :class="{ 'planner-tree-lines--learned': edge.learned }"
              :marker-end="`url(#${uid}-arrow-${treeIndex})`"
            />
          </svg>
          <template v-if="!treeGraphics[treeIndex] && !nativeGraphics[treeIndex]">
            <svg
              v-for="skill in classSkills.filter((s) => s.tree === treeIndex)"
              :key="`frame-${skill.id}`"
              class="planner-tree-slot"
              :style="{
                left: `${17.5 + (skill.column - 1) * 23}%`,
                top: `${18 + (skill.row - 1) * 12}%`,
              }"
              viewBox="0 0 216 156"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <image :href="`${base}${skillFrameTexture}`" width="740" height="1046" />
            </svg>
          </template>
          <button
            v-for="skill in classSkills.filter((s) => s.tree === treeIndex)"
            :key="skill.id"
            class="planner-skill"
            :class="{
              'planner-skill--learned': store.build.skills[skill.id],
              'planner-skill--boosted': hasEquipmentBonus(skill),
              'planner-skill--selected':
                selectedId !== undefined && selected?.id === skill.id,
              'planner-skill--locked': store.build.level < skill.requiredLevel,
              'planner-skill--fallback': !skillSprites[skill.id],
            }"
            :style="{
              left: `${18.25 + (skill.column - 1) * 23}%`,
              top: `${18.75 + (skill.row - 1) * 12}%`,
            }"
            :aria-label="skillLabel(skill)"
            :aria-describedby="selected?.id === skill.id ? `${uid}-tooltip` : undefined"
            @pointerenter="hoverSkill(skill, $event)"
            @pointerleave="leaveSkill"
            @pointerdown="pointerType = $event.pointerType"
            @focus="focusSkill(skill, $event)"
            @blur="blurSkill"
            @click="learn(skill, $event)"
            @contextmenu.prevent="remove(skill, $event)"
            @keydown.delete.prevent="store.removeSkill(skill.id, $event.shiftKey)"
          >
            <span
              v-if="skillSprites[skill.id]"
              class="planner-skill-image planner-skill-image--sprite"
              :style="{ backgroundImage: `url('${base}${skillSprites[skill.id]}')` }"
              aria-hidden="true"
            />
            <img
              v-else
              class="planner-skill-image"
              :src="`${base}${skill.icon}`"
              alt=""
              width="34"
              height="34"
            />
            <span class="planner-skill-name sr-only">{{ skill.name[lang] }}</span>
            <span
              class="planner-skill-rank"
              :style="{
                '--rank-row-shift':
                  treeGraphics[treeIndex] || nativeGraphics[treeIndex]
                    ? `${(skill.row - 1) * 2}%`
                    : '0%',
              }"
              >{{ skillRank(skill) }}</span
            >
          </button>
        </div>
        <div class="planner-tree-bonus">
          <strong
            >{{ treeBonus(treeIndex) >= 0 ? "+" : "" }}{{ treeBonus(treeIndex) }}</strong
          >
          {{ t("от снаряжения", "from equipment") }}
        </div>
      </section>
    </div>
    <div class="planner-skill-toolbar">
      <p>
        <kbd>SHIFT</kbd> {{ t("+ клик — максимум", "+ click — max") }}<br /><kbd>{{
          t("ПКМ", "RMB")
        }}</kbd>
        {{ t("−1 очко", "−1 point") }}<br /><kbd>CTRL</kbd>
        {{ t("базовые уровни", "base skill levels") }}
      </p>
      <div>
        <span
          class="planner-required-level"
          :title="
            t(
              'Уровень для этого распределения навыков',
              'Level required for this skill allocation'
            )
          "
        >
          {{ t("Требуемый уровень", "Required level") }}:
          <strong>{{ requiredSkillLevel(store.build) }}</strong>
        </span>
        <strong
          >{{ t("Свободных очков", "Remaining points") }}:
          {{ skillBudget(store.build) - spentSkills(store.build) }}</strong
        ><button @click="store.build.skills = {}">
          ↶ {{ t("Сбросить навыки", "Reset skills") }}
        </button>
      </div>
    </div>
    <PlannerSkillTooltip
      v-if="selected"
      :id="`${uid}-tooltip`"
      :skill="selected"
      :rank="store.build.skills[selected.id] ?? 0"
      :bonus="treeBonus(selected.tree)"
      :can-learn="!!skillPlan(store.build, selected)"
      :interactive="tooltipMode === 'touch'"
      :anchor="tooltipAnchor"
      @close="closeTooltip"
    />
  </section>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";
import PlannerSkillBackground from "./PlannerSkillBackground.vue";
import PlannerSkillBranches from "./PlannerSkillBranches.vue";
import PlannerNativeSkillBranches from "./PlannerNativeSkillBranches.vue";
import { nativeSkillTreeArtwork } from "@/utils/planner-native-skill-art";
import PlannerSkillTooltip from "./PlannerSkillTooltip.vue";
import { useInfoStore } from "@/store";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
import { plannerSkills } from "@/shared/planner";
import {
  buildStats,
  requiredSkillLevel,
  skillPlan,
  skillBudget,
  spentSkills,
} from "@/utils/planner";
import type { PlannerSkill } from "@/types/planner";
import {
  skillFrameTexture,
  wowheadSkillSprite,
  wowheadTreeArtwork,
} from "@/utils/planner-skill-art";
const store = usePlannerStore();
const info = useInfoStore();
const t = useText();
const lang = computed(() => info.currentLang);
const selectedId = ref<number>();
const showBaseRanks = ref(false);
const tooltipMode = ref<"pointer" | "keyboard" | "touch">("pointer");
const tooltipAnchor = ref({ left: 0, right: 0, top: 0, bottom: 0 });
let pointerType = "mouse";
const uid = useId().replace(/[^a-z0-9]/gi, "");
const treeOrder = computed(() =>
  store.build.classId === "warlock" ? [0, 1, 2] : [2, 1, 0]
);
const classSkills = computed(() =>
  plannerSkills.filter((s) => s.classId === store.build.classId)
);
const treeGraphics = computed(() =>
  [0, 1, 2].map((tree) => wowheadTreeArtwork(store.build.classId, tree))
);
const nativeGraphics = computed(() =>
  store.build.classId === "warlock"
    ? [0, 1, 2].map((tree) =>
        nativeSkillTreeArtwork(classSkills.value.filter((skill) => skill.tree === tree))
      )
    : []
);
const skillSprites = computed(() =>
  Object.fromEntries(
    classSkills.value.map((skill) => [skill.id, wowheadSkillSprite(skill)])
  )
);
const selected = computed(() => classSkills.value.find((s) => s.id === selectedId.value));
const stats = computed(() => buildStats(store.build));
const base = import.meta.env.BASE_URL;
const treeBonus = (tree: number) =>
  stats.value.skillBonus + stats.value.treeBonuses[tree];
function skillRank(skill: PlannerSkill) {
  const rank = store.build.skills[skill.id] ?? 0;
  return rank + (rank && !showBaseRanks.value ? treeBonus(skill.tree) : 0);
}
function hasEquipmentBonus(skill: PlannerSkill) {
  return skillRank(skill) > (store.build.skills[skill.id] ?? 0);
}
function skillLabel(skill: PlannerSkill) {
  const rank = store.build.skills[skill.id] ?? 0;
  const name = skill.name[lang.value];
  return hasEquipmentBonus(skill)
    ? `${name}: ${skillRank(skill)} (${t("вложено очков", "base skill level")}: ${rank}/${skill.maxPoints}, +${treeBonus(skill.tree)} ${t("от снаряжения", "from equipment")})`
    : `${name}: ${skillRank(skill)}/${skill.maxPoints}`;
}
const treePoints = (tree: number) =>
  classSkills.value
    .filter((s) => s.tree === tree)
    .reduce((sum, s) => sum + (store.build.skills[s.id] ?? 0), 0);
function inspectSkill(
  skill: PlannerSkill,
  event: Event,
  mode: "pointer" | "keyboard" | "touch"
) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
  tooltipAnchor.value = {
    left: bounds.left,
    right: bounds.right,
    top: bounds.top,
    bottom: bounds.bottom,
  };
  tooltipMode.value = mode;
  selectedId.value = skill.id;
}
function hoverSkill(skill: PlannerSkill, event: PointerEvent) {
  if (event.pointerType !== "touch") inspectSkill(skill, event, "pointer");
}
function focusSkill(skill: PlannerSkill, event: FocusEvent) {
  if ((event.currentTarget as HTMLElement).matches(":focus-visible"))
    inspectSkill(skill, event, "keyboard");
}
function leaveSkill() {
  if (tooltipMode.value === "pointer") closeTooltip();
}
function blurSkill() {
  if (tooltipMode.value === "keyboard") closeTooltip();
}
function closeTooltip() {
  selectedId.value = undefined;
}
function learn(skill: PlannerSkill, event: MouseEvent) {
  store.addSkill(skill, event.shiftKey);
  inspectSkill(
    skill,
    event,
    event.detail === 0 ? "keyboard" : pointerType === "touch" ? "touch" : "pointer"
  );
}
function remove(skill: PlannerSkill, event: MouseEvent) {
  store.removeSkill(skill.id, event.shiftKey);
  inspectSkill(skill, event, "pointer");
}
function keyDown(event: KeyboardEvent) {
  if (event.key === "Control") showBaseRanks.value = true;
  if (event.key === "Escape") closeTooltip();
}
function keyUp(event: KeyboardEvent) {
  if (event.key === "Control") showBaseRanks.value = false;
}
function windowBlur() {
  showBaseRanks.value = false;
  closeTooltip();
}
function scrollOrResize(event: Event) {
  if (
    !(event.target instanceof Element) ||
    !event.target.closest(".planner-skill-tooltip")
  )
    closeTooltip();
}
function outsidePointer(event: PointerEvent) {
  if (
    !(event.target instanceof Element) ||
    !event.target.closest(".planner-skill, .planner-skill-tooltip")
  )
    closeTooltip();
}
watch(() => store.build.classId, closeTooltip);
onMounted(() => {
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", windowBlur);
  window.addEventListener("scroll", scrollOrResize, true);
  window.addEventListener("resize", scrollOrResize);
  window.addEventListener("pointerdown", outsidePointer);
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", keyDown);
  window.removeEventListener("keyup", keyUp);
  window.removeEventListener("blur", windowBlur);
  window.removeEventListener("scroll", scrollOrResize, true);
  window.removeEventListener("resize", scrollOrResize);
  window.removeEventListener("pointerdown", outsidePointer);
});
function edges(tree: number) {
  return classSkills.value
    .filter((s) => s.tree === tree)
    .flatMap((skill) =>
      skill.requires.flatMap((id) => {
        const parent = classSkills.value.find((s) => s.id === id)!;
        if (parent.tree !== tree) return [];
        const x1 = (24.25 + (parent.column - 1) * 23) * 11.62;
        const y1 = (18.75 + (parent.row - 1) * 12 + 9.11) * 15.07;
        const x2 = (24.25 + (skill.column - 1) * 23) * 11.62;
        const y2 = (18.75 + (skill.row - 1) * 12) * 15.07;
        return [
          {
            key: `${id}-${skill.id}`,
            learned: !!store.build.skills[skill.id],
            path: `M${x1} ${y1 - 4} V${y2 - 35} H${x2} V${y2 - 8}`,
          },
        ];
      })
    );
}
</script>
