<template>
  <section v-if="profile" class="planner-base-skills">
    <h3>{{ t("Навыки основы", "Base skills") }}</h3>
    <p>
      {{
        t("Сохраняются при создании рунного слова.", "Retained when creating a runeword.")
      }}
    </p>
    <div v-for="(row, index) in rows" :key="index" class="planner-base-skills__row">
      <UiSelect
        :model-value="row.id"
        :options="options(row.id)"
        :aria-label="`${t('Навык основы', 'Base skill')} ${index + 1}`"
        @update:model-value="select(index, $event)"
      />
      <input
        v-if="row.id"
        type="number"
        min="1"
        max="3"
        :value="row.value"
        :aria-label="`${t('Уровень навыка основы', 'Base skill rank')} ${index + 1}`"
        @change="rank(index, $event)"
      />
    </div>
    <label v-if="tabOptions.length" class="planner-label">
      {{ t("Бонус к ветке навыков", "Skill tree bonus") }}
      <UiSelect
        :model-value="
          item.baseSkillTab ? `${item.baseSkillTab.tab}:${item.baseSkillTab.value}` : ''
        "
        :options="[{ value: '', label: t('Без бонуса', 'No bonus') }, ...tabOptions]"
        :aria-label="t('Бонус основы к ветке', 'Base skill tree bonus')"
        @update:model-value="selectTab"
      />
    </label>
  </section>
</template>
<script setup lang="ts">
import { computed } from "vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import { useText } from "@/composables/useText";
import { useInfoStore } from "@/store";
import { plannerClasses } from "@/shared/planner";
import { baseSkillOptions, baseSkillProfile } from "@/utils/planner-base-skills";
import type { PlannerItem } from "@/types/planner";
const props = defineProps<{ item: PlannerItem }>();
const emit = defineEmits<{
  skills: [value: Record<string, number>];
  tab: [value: PlannerItem["baseSkillTab"]];
}>();
const t = useText(),
  info = useInfoStore();
const profile = computed(() => baseSkillProfile(props.item));
const skills = computed(() => baseSkillOptions(props.item));
const rows = computed(() => {
  const selected = Object.entries(props.item.baseSkills || {}).map(([id, value]) => ({
    id,
    value,
  }));
  return skills.value.length
    ? [
        ...selected,
        ...Array.from({ length: 3 - selected.length }, () => ({ id: "", value: 3 })),
      ]
    : [];
});
const options = (current: string) => [
  { value: "", label: t("Не выбран", "None") },
  ...skills.value
    .filter((skill) => String(skill.id) === current || !props.item.baseSkills?.[skill.id])
    .map((skill) => ({ value: String(skill.id), label: skill.name[info.currentLang] })),
];
const tabOptions = computed(() =>
  Array.from(
    new Map(
      profile.value?.skillTabs.flatMap((mod) =>
        Array.from({ length: mod.max - mod.min + 1 }, (_, i) => {
          const value = mod.min + i;
          return [
            `${mod.tab}:${value}`,
            {
              value: `${mod.tab}:${value}`,
              label: `+${value} ${plannerClasses[Math.floor(mod.tab / 3)]?.trees[mod.tab % 3]?.[info.currentLang] || ""}`,
            },
          ];
        })
      ) as [string, { value: string; label: string }][]
    ).values()
  )
);
function select(index: number, id: string) {
  const next = { ...props.item.baseSkills };
  if (rows.value[index].id) delete next[rows.value[index].id];
  if (id) next[id] = rows.value[index].value;
  emit("skills", next);
}
function rank(index: number, event: Event) {
  const value = Math.max(
    1,
    Math.min(3, Math.trunc(Number((event.target as HTMLInputElement).value) || 1))
  );
  emit("skills", { ...props.item.baseSkills, [rows.value[index].id]: value });
}
function selectTab(value: string) {
  const [tab, rank] = value.split(":").map(Number);
  emit("tab", value ? { tab, value: rank } : undefined);
}
</script>
<style scoped>
.planner-base-skills {
  padding: 12px;
  margin: 12px 0;
  border: 1px solid #444;
  border-radius: 6px;
}
.planner-base-skills h3 {
  color: #c7b377;
}
.planner-base-skills p {
  margin: 6px 0 10px;
  font-size: 12px;
  color: #aaa;
}
.planner-base-skills__row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}
.planner-base-skills__row > :first-child {
  flex: 1;
  min-width: 0;
}
.planner-base-skills__row input {
  width: 64px;
}
</style>
