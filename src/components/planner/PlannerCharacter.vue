<template>
  <aside class="planner-character">
    <PlannerPanel class="planner-stats-panel" :title="t('Характеристики', 'Stats')">
      <template #actions>
        <button @click="$emit('quests')">
          <UiIcon name="quests" /> {{ t("Задания", "Quests") }}
        </button>
      </template>
      <div class="planner-stats-difficulty">
        <button
          v-for="difficulty in difficulties"
          :key="difficulty.value"
          :aria-pressed="store.build.difficulty === difficulty.value"
          @click="store.build.difficulty = difficulty.value"
        >
          {{ t(difficulty.ru, difficulty.en) }}
        </button>
      </div>
      <PlannerClassSelect />
      <label class="planner-stat-search"
        ><UiIcon name="search" /><input
          v-model="query"
          type="search"
          :placeholder="t('Поиск характеристик', 'Search stats')"
          :aria-label="t('Поиск характеристик', 'Search stats')"
      /></label>
      <div class="planner-character-title">
        <img
          :src="`${base}images/planner/classes/${store.build.classId}.png`"
          alt=""
          width="32"
          height="38"
        />
        <div>
          <span class="planner-eyebrow">{{ t("ПЕРСОНАЖ", "CHARACTER") }}</span>
          <h3>{{ store.character.name[lang] }}</h3>
          <p>
            {{ t("Уровень", "Level") }} {{ store.build.level }} ·
            {{ store.build.hardcore ? "Hardcore" : "Softcore" }}
          </p>
        </div>
      </div>
      <div class="planner-vitals">
        <div>
          <span>{{ t("Жизнь", "Life") }}</span
          ><strong>{{ stats.life }}</strong>
        </div>
        <div>
          <span>{{ t("Мана", "Mana") }}</span
          ><strong>{{ stats.mana }}</strong>
        </div>
        <div>
          <span>{{ t("Выносл.", "Stamina") }}</span
          ><strong>{{ stats.stamina }}</strong>
        </div>
      </div>
      <div class="planner-section-label">
        {{ t("Характеристики", "Attributes")
        }}<button
          :disabled="!spentAttributes(store.build)"
          @click="
            store.build.attributes = { strength: 0, dexterity: 0, vitality: 0, energy: 0 }
          "
        >
          {{ t("Сброс", "Reset") }}
        </button>
      </div>
      <div
        v-for="attribute in attributes.filter((a) => matches(a.ru, a.en))"
        :key="attribute.key"
        class="planner-attribute"
      >
        <div>
          <span>{{ t(attribute.ru, attribute.en) }}</span
          ><small
            >{{ store.character.base[attribute.key] }} +
            {{ store.build.attributes[attribute.key]
            }}<template v-if="stats.bonuses[attribute.key]">
              + {{ stats.bonuses[attribute.key] }}</template
            ></small
          >
        </div>
        <strong>{{ stats.attributes[attribute.key] }}</strong>
        <button
          :aria-label="`${t('Уменьшить', 'Decrease')} ${t(attribute.ru, attribute.en)}`"
          :disabled="!store.build.attributes[attribute.key]"
          @click="store.changeAttribute(attribute.key, $event.shiftKey ? -10 : -1)"
        >
          <UiIcon name="minus" />
        </button>
        <button
          :aria-label="`${t('Увеличить', 'Increase')} ${t(attribute.ru, attribute.en)}`"
          :disabled="!remainingAttributes"
          @click="store.changeAttribute(attribute.key, $event.shiftKey ? 10 : 1)"
        >
          <UiIcon name="plus" />
        </button>
      </div>
      <div class="planner-point-budget">
        <span>{{ t("Свободных очков", "Unspent points") }}</span
        ><strong>{{ remainingAttributes }}</strong>
      </div>
      <p class="planner-help">
        {{ t("Shift + клик: 10 очков", "Shift + click: 10 points") }}
      </p>
      <div class="planner-section-label">
        {{ t("Сопротивления", "Resistances")
        }}<span
          >{{
            difficulties.find((d) => d.value === store.build.difficulty)?.penalty
          }}%</span
        >
      </div>
      <div
        v-for="(resist, i) in stats.resists"
        v-show="matches(resistLabels[i].ru, resistLabels[i].en)"
        :key="resist.key"
        class="planner-resistance"
        :class="`planner-resistance--${i}`"
      >
        <span>{{ t(resistLabels[i].ru, resistLabels[i].en) }}</span>
        <div><span :style="{ width: `${(resist.value + 100) / 1.75}%` }" /></div>
        <strong :title="`${t('Без ограничения', 'Uncapped')}: ${resist.uncapped}%`"
          >{{ resist.value }}%</strong
        >
      </div>
      <p class="planner-help">
        {{
          t(
            "Лимит: −100…75%. Аня учитывается по отмеченным заданиям.",
            "Cap: −100…75%. Anya follows your quest selections."
          )
        }}
      </p>
      <div class="planner-section-label">
        {{ t("Введённые бонусы", "Entered bonuses") }}
      </div>
      <dl class="planner-summary-list">
        <dt>{{ t("Навыки класса", "Class skills") }}</dt>
        <dd>{{ stats.classSkills }}</dd>
        <template
          v-for="field in bonusFields.filter(
            (f) =>
              ['allSkills', 'fcr', 'fhr', 'ias', 'frw', 'magicFind'].includes(f.key) &&
              matches(f.ru, f.en)
          )"
          :key="field.key"
          ><dt>{{ t(field.ru, field.en) }}</dt>
          <dd>{{ stats.bonuses[field.key] }}{{ field.percent ? "%" : "" }}</dd></template
        >
      </dl>
    </PlannerPanel>
  </aside>
</template>
<script setup lang="ts">
import UiIcon from "@/components/ui/UiIcon.vue";
import { computed, ref } from "vue";
import PlannerClassSelect from "./PlannerClassSelect.vue";
import PlannerPanel from "./PlannerPanel.vue";
import { useInfoStore } from "@/store";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
import { attributes, bonusFields, difficulties } from "@/shared/planner";
import { attributeBudget, buildStats, spentAttributes } from "@/utils/planner";
const store = usePlannerStore();
const info = useInfoStore();
const lang = computed(() => info.currentLang);
const t = useText();
defineEmits<{ quests: [] }>();
const base = import.meta.env.BASE_URL;
const query = ref("");
const matches = (ru: string, en: string) =>
  `${ru} ${en}`.toLowerCase().includes(query.value.trim().toLowerCase());
const stats = computed(() => buildStats(store.build));
const remainingAttributes = computed(
  () => attributeBudget(store.build) - spentAttributes(store.build)
);
const resistLabels = [
  { ru: "Огонь", en: "Fire" },
  { ru: "Холод", en: "Cold" },
  { ru: "Молния", en: "Lightning" },
  { ru: "Яд", en: "Poison" },
];
</script>
