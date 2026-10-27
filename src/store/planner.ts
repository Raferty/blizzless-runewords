import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
import { plannerClasses, plannerSkills } from "@/shared/planner";
import {
  attributeBudget,
  addDefaultInventory,
  buildAtLevel,
  cloneBuild,
  createDefaultBuild,
  decodeBuild,
  mercenaryLevelCap,
  parseBuild,
  skillPlan,
  skillsAfterRemoval,
  spentAttributes,
  spentSkills,
} from "@/utils/planner";
import type {
  Attribute,
  ClassId,
  PlannerBuild,
  PlannerSkill,
  SavedBuild,
} from "@/types/planner";

const storageKey = "blizzless-planner-v1";
export const usePlannerStore = defineStore("planner", () => {
  const build = ref(createDefaultBuild());
  const drafts = ref<Partial<Record<ClassId, PlannerBuild>>>({});
  const saved = ref<SavedBuild[]>([]);
  const message = ref("");
  const storageAvailable = ref(true);
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (raw) {
      for (const character of plannerClasses) {
        if (raw.drafts?.[character.id]) {
          try {
            const draft = parseBuild(raw.drafts[character.id]);
            if (draft.classId === character.id) {
              if (!raw.defaultInventoryVersion) addDefaultInventory(draft);
              drafts.value[character.id] = draft;
            }
          } catch {
            /* Keep other valid drafts. */
          }
        }
      }
      if (Array.isArray(raw.saved)) {
        for (const entry of raw.saved.slice(0, 50)) {
          try {
            if (typeof entry.id !== "string" || typeof entry.savedAt !== "string")
              continue;
            saved.value.push({
              id: entry.id,
              savedAt: entry.savedAt,
              build: parseBuild(entry.build),
            });
          } catch {
            /* Ignore invalid entries without discarding valid builds. */
          }
        }
      }
      const active = plannerClasses.find((character) => character.id === raw.active)?.id;
      build.value = cloneBuild((active && drafts.value[active]) || createDefaultBuild());
    }
  } catch {
    storageAvailable.value = false;
  }
  function persist() {
    try {
      drafts.value[build.value.classId] = cloneBuild(build.value);
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          active: build.value.classId,
          defaultInventoryVersion: 1,
          drafts: drafts.value,
          saved: saved.value,
        })
      );
      storageAvailable.value = true;
    } catch {
      storageAvailable.value = false;
    }
  }
  watch(build, persist, { deep: true });
  watch(saved, persist, { deep: true });
  const character = computed(() =>
    plannerClasses.find((c) => c.id === build.value.classId)!
  );
  const mercenaryLevelLimit = computed(() => mercenaryLevelCap(build.value.level));
  function setMercenaryLevel(level: number) {
    if (Number.isInteger(level) && level >= 1)
      build.value.mercenary.level = Math.min(level, mercenaryLevelLimit.value);
  }
  function selectClass(classId: ClassId) {
    drafts.value[build.value.classId] = cloneBuild(build.value);
    build.value = cloneBuild(drafts.value[classId] ?? createDefaultBuild(classId));
  }
  function updateConfiguration(change: (next: PlannerBuild) => void) {
    const next = cloneBuild(build.value);
    change(next);
    try {
      build.value = parseBuild(next);
      return true;
    } catch {
      message.value = "budget";
      return false;
    }
  }
  function setLevel(level: number) {
    try {
      const next = buildAtLevel(build.value, level);
      const refunded =
        spentSkills(next) < spentSkills(build.value) ||
        spentAttributes(next) < spentAttributes(build.value);
      build.value = next;
      message.value = refunded ? "levelAdjusted" : "";
      return true;
    } catch {
      message.value = "invalidLevel";
      return false;
    }
  }
  function changeAttribute(key: Attribute, delta: number) {
    const available = attributeBudget(build.value) - spentAttributes(build.value);
    build.value.attributes[key] +=
      delta > 0
        ? Math.min(delta, available)
        : -Math.min(-delta, build.value.attributes[key]);
  }
  function addSkill(skill: PlannerSkill, maximum = false) {
    let plan = skillPlan(build.value, skill);
    while (plan) {
      for (const id of plan) build.value.skills[id] = (build.value.skills[id] ?? 0) + 1;
      if (!maximum) break;
      plan = skillPlan(build.value, skill);
    }
  }
  function removeSkill(id: number, all = false) {
    build.value.skills = skillsAfterRemoval(build.value, id, all);
  }
  function resetSkillTree(tree: number) {
    if (![0, 1, 2].includes(tree)) return;
    let skills = build.value.skills;
    for (const skill of plannerSkills)
      if (skill.classId === build.value.classId && skill.tree === tree)
        skills = skillsAfterRemoval({ ...build.value, skills }, skill.id, true);
    build.value.skills = skills;
  }
  function saveBuild() {
    if (saved.value.length >= 50) {
      message.value = "limit";
      return;
    }
    saved.value.unshift({
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      build: cloneBuild(build.value),
    });
    message.value = "saved";
  }
  function loadBuild(value: unknown) {
    try {
      const next = parseBuild(value);
      drafts.value[build.value.classId] = cloneBuild(build.value);
      build.value = next;
      message.value = "loaded";
      return true;
    } catch {
      message.value = "invalid";
      return false;
    }
  }
  let lastSharedHash = "";
  function loadSharedHash() {
    const hash = window.location.hash;
    const encoded = new URLSearchParams(hash.split("?")[1] ?? "").get("build");
    if (!encoded || hash === lastSharedHash) return;
    lastSharedHash = hash;
    try {
      if (loadBuild(decodeBuild(encoded))) {
        // Once imported, the draft should survive edits and a page reload.
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}#/planner`
        );
      }
    } catch {
      message.value = "invalid";
    }
  }
  return {
    build,
    character,
    mercenaryLevelLimit,
    drafts,
    saved,
    message,
    storageAvailable,
    selectClass,
    updateConfiguration,
    setLevel,
    setMercenaryLevel,
    changeAttribute,
    addSkill,
    removeSkill,
    resetSkillTree,
    saveBuild,
    loadBuild,
    loadSharedHash,
  };
});
