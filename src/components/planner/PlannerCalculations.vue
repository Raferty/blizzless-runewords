<template>
  <section
    class="planner-calculations"
    :aria-label="t('Расчёт урона билда', 'Build damage calculations')"
  >
    <p v-if="loading" role="status">
      {{ t("Загружаем игровые данные…", "Loading game data…") }}
    </p>
    <div v-else-if="failed" role="alert">
      <p>
        {{
          t("Не удалось загрузить данные расчёта.", "Could not load calculation data.")
        }}
      </p>
      <button @click="load">{{ t("Повторить", "Retry") }}</button>
    </div>
    <template v-else-if="result">
      <div class="calculation-summary">
        <div>
          <span>{{ t("Активное оружие", "Active weapon") }}</span
          ><strong>{{ result.weapon || t("Без оружия", "Unarmed") }}</strong>
        </div>
        <div>
          <span>{{ t("Скорость заклинаний", "Cast speed") }}</span
          ><strong
            >{{ result.fcr }}% FCR
            <small v-if="result.castFrames"
              >· {{ result.castFrames }} {{ t("кадр.", "frames") }}</small
            ></strong
          >
        </div>
      </div>
      <p v-if="result.dualWield" class="calculation-note">
        {{
          t(
            "Два оружия: показан удар основной рукой. Чередование рук не моделируется.",
            "Dual wield: shows a main-hand hit. Alternating hands is not simulated."
          )
        }}
      </p>
      <details class="calculation-settings">
        <summary>
          {{ t("Цель и активные эффекты", "Target and active effects")
          }}<UiIcon name="chevron-down" />
        </summary>
        <div class="calculation-controls">
          <label class="calculation-aura"
            >{{ t("Активная аура персонажа", "Active character aura") }}
            <select v-model="aura">
              <option value="auto">
                {{ t("Автоматически по билду", "Automatic from build") }}
              </option>
              <option value="none">{{ t("Без ауры", "No aura") }}</option>
              <option
                v-for="skill in result.auraCandidates"
                :key="skill.id"
                :value="String(skill.id)"
              >
                {{ skill.name[lang] }}
              </option>
            </select>
          </label>
          <label
            >{{ t("Базовое здоровье трупа", "Corpse base life") }}
            <input
              v-model.number="corpseLife"
              type="number"
              min="1"
              max="10000000"
              @change="corpseLife = clamp(corpseLife, 1, 10000000)"
            />
          </label>
          <label v-for="element in damageElements" :key="element"
            >{{ elementName(element) }} {{ t("сопр., %", "res., %") }}
            <input
              v-model.number="resistance[element]"
              type="number"
              min="-100"
              max="100"
              @change="resistance[element] = clamp(resistance[element], -100, 100)"
            />
          </label>
        </div>
        <p>
          {{
            t(
              "Сопротивления задаются после проклятий и аур цели. Пробивание от экипировки применяется дополнительно; иммунитет 100% сохраняется.",
              "Enter resistances after target curses and auras. Equipment pierce applies afterwards; 100% immunity is preserved."
            )
          }}
        </p>
      </details>
      <div class="calculation-toolbar">
        <span>{{
          t("Урон после сопротивлений цели", "Damage after target resistances")
        }}</span>
        <label
          ><input v-model="includeUnlearned" type="checkbox" />{{
            t("Все навыки", "All skills")
          }}</label
        >
      </div>
      <div class="calculation-cards">
        <article
          v-for="row in result.rows"
          :key="`${store.build.classId}-${row.id}`"
          class="calculation-card"
          :class="{ 'calculation-card--inactive': row.note === 'unlearned' }"
        >
          <div class="calculation-icon">
            <img
              :src="`${base}${row.skill?.icon ?? 'images/skills/skillicon_2.88c7e55dccaa.avif'}`"
              alt=""
              width="48"
              height="48"
            />
          </div>
          <div class="calculation-content">
            <h4>
              {{ row.skill?.name[lang] || t("Атака", "Attack")
              }}<span v-if="row.skill"> · {{ t("Ур.", "Lv.") }} {{ row.level }}</span>
            </h4>
            <p v-if="row.skill && row.level" class="calculation-ranks">
              {{ row.hardLevel }} {{ t("вложено", "invested")
              }}<template v-if="row.level !== row.hardLevel">
                + {{ row.level - row.hardLevel }}
                {{ t("от предметов", "from equipment") }}</template
              >
            </p>
            <p v-if="row.requires" class="calculation-required">
              {{
                row.requires === "shield"
                  ? t("Требуется щит", "Requires a shield")
                  : t("Требуется оружие", "Requires a weapon")
              }}
            </p>
            <div v-if="row.parts.length" class="calculation-metrics">
              <div class="calculation-damage">
                <span>{{
                  row.note === "summon"
                    ? t("Урон одного существа", "Damage per summon")
                    : row.note === "poison"
                      ? t("Урон за время действия", "Damage over duration")
                      : row.note === "buff"
                        ? t("Бонус к урону", "Added damage")
                        : row.note === "pulse"
                          ? t("Урон импульса", "Pulse damage")
                          : row.note === "retaliation"
                            ? t("Ответный урон", "Retaliation damage")
                            : t("Урон за попадание", "Damage per hit")
                }}</span
                ><strong>{{ range(row.min, row.max) }}</strong>
              </div>
              <div
                v-for="part in row.parts"
                :key="part.element"
                class="calculation-element"
                :class="`calculation-element--${part.element}`"
              >
                <span>{{ elementName(part.element) }}</span
                ><b>{{ range(part.min, part.max) }}</b>
              </div>
              <div v-if="row.duration">
                <span>{{ t("Длительность", "Duration") }}</span
                ><b>{{ number(row.duration, 2) }} {{ t("сек.", "sec") }}</b>
              </div>
              <div v-if="row.frames">
                <span>{{ t("Темп действий", "Action rate") }}</span
                ><b
                  >{{ row.frames }} {{ t("кадр.", "frames") }} ·
                  {{ number(25 / row.frames, 2) }}/{{ t("сек.", "sec") }}</b
                >
              </div>
              <div v-if="row.dps !== undefined" class="calculation-dps">
                <span>{{ t("Средний урон в секунду", "Average damage per second") }}</span
                ><strong>{{ number(row.dps, 1) }}</strong>
              </div>
            </div>
            <p v-if="row.count" class="calculation-note">
              {{ t("Максимум существ", "Maximum summons") }}: {{ row.count }}
            </p>
            <p v-if="row.note" class="calculation-note">
              {{
                row.note === "summon" && !row.parts.length
                  ? t(
                      "Призыв. Урон этого существа пока не рассчитан.",
                      "Summon. Damage for this creature is not calculated yet."
                    )
                  : note(row.note)
              }}<template v-if="row.note === 'support' && row.active">
                · {{ t("Активно", "Active") }}</template
              >
            </p>
            <p v-if="row.mana && row.note !== 'unlearned'" class="calculation-note">
              {{ t("Мана", "Mana") }}: {{ number(row.mana, 2) }}
            </p>
            <details v-if="row.parts.length" class="calculation-breakdown">
              <summary>{{ t("Разбор урона", "Damage breakdown") }}</summary>
              <div v-for="part in row.parts" :key="part.element">
                <b>{{ elementName(part.element) }}</b>
                <span
                  >{{ t("До сопротивлений", "Before resistance") }}:
                  {{ range(part.baseMin, part.baseMax) }}</span
                >
                <span v-if="part.synergy"
                  >{{ t("Синергии", "Synergies") }}: +{{ part.synergy }}%</span
                >
                <span v-if="part.mastery"
                  >{{ t("Мастерство", "Mastery") }}: +{{ part.mastery }}%</span
                >
                <span
                  >{{ t("Итоговое сопротивление", "Effective resistance") }}:
                  {{ part.resistance }}%</span
                >
              </div>
            </details>
          </div>
        </article>
      </div>
      <p class="calculation-footnote">
        {{
          t(
            "DPS — одно успешное попадание за действие. Вероятность попадания, критические удары, Crushing Blow, дополнительные снаряды, условные бонусы комплектов и усиливающие баффы не включены. Для призывов и сложных серий DPS не рассчитывается.",
            "DPS assumes one successful hit per action. Hit chance, critical strikes, Crushing Blow, extra projectiles, conditional set bonuses and damage buffs are excluded. Summons and complex sequences have no DPS estimate."
          )
        }}
      </p>
      <p v-if="result.warnings.length" class="calculation-required">
        {{ t("Не удалось учесть свойства", "Could not include properties for") }}:
        {{ result.warnings.join(", ") }}
      </p>
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref, shallowRef, watch } from "vue";
import { useInfoStore } from "@/store";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
import type { GameSaveExporter } from "@/utils/planner-game-save";
import {
  calculateBuildDamage,
  damageElements,
  type DamageElement,
  type SkillDamage,
} from "@/utils/planner-damage";
import UiIcon from "@/components/ui/UiIcon.vue";
const store = usePlannerStore();
const info = useInfoStore();
const t = useText();
const lang = computed(() => info.currentLang);
const base = import.meta.env.BASE_URL;
const native = shallowRef<GameSaveExporter>();
const loading = ref(true);
const failed = ref(false);
const aura = ref("auto");
const corpseLife = ref(10000);
const resistance = reactive<Record<DamageElement, number>>({
  physical: 0,
  fire: 0,
  ltng: 0,
  cold: 0,
  pois: 0,
  mag: 0,
});
const includeUnlearned = ref(false);
const clamp = (value: unknown, min: number, max: number) =>
  Math.min(max, Math.max(min, Number(value) || 0));
const result = computed(() =>
  native.value
    ? calculateBuildDamage(native.value, store.build, {
        auraId:
          aura.value === "auto"
            ? undefined
            : aura.value === "none"
              ? null
              : Number(aura.value),
        corpseLife: clamp(corpseLife.value, 1, 10000000),
        resistance: Object.fromEntries(
          damageElements.map((e) => [e, clamp(resistance[e], -100, 100)])
        ),
        includeUnlearned: includeUnlearned.value,
      })
    : undefined
);
const number = (value: number, digits = 0) =>
  value.toLocaleString(lang.value === "ru" ? "ru-RU" : "en-US", {
    maximumFractionDigits: digits,
  });
const range = (min: number, max: number) =>
  min === max ? number(min) : `${number(min)}–${number(max)}`;
watch(
  () => result.value?.auraCandidates.map((skill) => String(skill.id)).join(","),
  () => {
    if (
      aura.value !== "auto" &&
      aura.value !== "none" &&
      !result.value?.auraCandidates.some((skill) => String(skill.id) === aura.value)
    )
      aura.value = "auto";
  }
);
const elementName = (element: DamageElement) =>
  ({
    physical: t("Физический", "Physical"),
    fire: t("Огонь", "Fire"),
    ltng: t("Молния", "Lightning"),
    cold: t("Холод", "Cold"),
    pois: t("Яд", "Poison"),
    mag: t("Магия", "Magic"),
  })[element];
const note = (kind: NonNullable<SkillDamage["note"]>) =>
  ({
    summon: t(
      "Урон одного удара. Скорость и поведение призыва не включены.",
      "One attack. Summon speed and behaviour are not included."
    ),
    corpse: t(
      "Урон зависит от заданного базового здоровья трупа.",
      "Damage uses the corpse base life entered above."
    ),
    poison: t(
      "Урон яда за полное время действия; повторные наложения не складываются.",
      "Poison damage over its full duration; repeated applications do not stack."
    ),
    periodic: t(
      "Урон одного воздействия. DPS зависит от длительности контакта и частоты попаданий.",
      "Damage per effect. DPS depends on contact duration and hit frequency."
    ),
    buff: t(
      "Добавляет урон к атакам. Автоматически к атаке не применяется.",
      "Adds damage to attacks. Not automatically applied to Attack."
    ),
    retaliation: t(
      "Урон ответного удара. Частота зависит от атак противника.",
      "Retaliation damage. Frequency depends on enemy attacks."
    ),
    area: t(
      "Урон одного попадания по площади. Число попаданий зависит от позиции цели.",
      "Damage per area hit. Hit count depends on target position."
    ),
    pulse: t("Урон одного импульса ауры.", "Damage per aura pulse."),
    sequence: t(
      "Урон одного попадания. Скорость серии не рассчитана.",
      "Damage per hit. Sequence speed is not calculated."
    ),
    support: t("Вспомогательный навык", "Support skill"),
    unlearned: t("Навык не изучен", "Skill not learned"),
    unsupported: t(
      "Для этого навыка точный расчёт пока недоступен.",
      "An exact calculation is not yet available for this skill."
    ),
  })[kind];
async function load() {
  loading.value = true;
  failed.value = false;
  try {
    native.value = await (
      await import("@/utils/planner-game-save")
    ).loadGameSaveExporter();
  } catch {
    failed.value = true;
  } finally {
    loading.value = false;
  }
}
onMounted(load);
</script>
<style scoped lang="scss">
.planner-calculations {
  min-width: 0;
  color: #ccc;
}
.calculation-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 4px 4px 18px;
  > div {
    display: grid;
    gap: 6px;
  }
  span {
    font-size: 12px;
    color: #96948e;
  }
  strong {
    font-size: 14px;
    color: #e0cf9b;
  }
  small {
    font-weight: 400;
    color: #aaa;
  }
}
.calculation-settings {
  margin-bottom: 16px;
  background: #161616;
  border: 1px solid #303030;
  border-radius: 10px;
  > summary {
    display: flex;
    justify-content: space-between;
    padding: 12px 14px;
    font-size: 13px;
    color: #c8b884;
    cursor: pointer;
    list-style: none;
    &::-webkit-details-marker {
      display: none;
    }
  }
  > p {
    padding: 0 14px;
    font-size: 12px;
    line-height: 1.6;
    color: #999;
  }
}
.calculation-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 4px 14px 12px;
  label {
    display: grid;
    gap: 6px;
    font-size: 12px;
    color: #aaa;
  }
  input,
  select {
    width: 100%;
    min-width: 0;
    min-height: 38px;
    padding: 8px;
    color: #ddd;
    background: #0d0d0d;
    border: 1px solid #3d3d3d;
    border-radius: 6px;
  }
  .calculation-aura {
    grid-column: span 2;
  }
}
.calculation-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  padding: 0 4px 12px;
  font-size: 12px;
  color: #999;
  label {
    display: flex;
    gap: 7px;
    align-items: center;
  }
  input {
    accent-color: #c5ac70;
  }
}
.calculation-cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  max-height: max(400px, 70dvh);
  padding-right: 5px;
  overflow-y: auto;
  scrollbar-color: #444 #111;
  scrollbar-width: thin;
}
.calculation-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  min-width: 0;
  padding: 18px;
  background: #181818;
  border: 1px solid #33322e;
  border-radius: 12px;
  &--inactive {
    opacity: 0.55;
  }
}
.calculation-icon {
  flex: 0 0 48px;
  width: 48px;
  height: 48px;
  color: #c3ac72;
  background: #24221c;
  border: 1px solid #4e4736;
  border-radius: 3px;
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.calculation-content {
  flex: 1;
  min-width: 0;
  h4 {
    margin: 0 0 7px;
    font-size: 17px;
    font-weight: 600;
    line-height: 1.4;
    color: #ddcd9a;
    span {
      font-weight: 400;
      color: #999;
    }
  }
}
.calculation-ranks {
  margin: 0 0 12px;
  font-size: 11px;
  color: #888;
}
.calculation-metrics {
  display: grid;
  gap: 7px;
  > div {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    justify-content: space-between;
    font-size: 12px;
    line-height: 1.5;
  }
  b,
  strong {
    color: #eee;
  }
  .calculation-damage {
    margin-bottom: 3px;
    font-size: 14px;
    strong {
      font-size: 19px;
    }
  }
  .calculation-dps {
    padding-top: 7px;
    margin-top: 4px;
    border-top: 1px solid #30302c;
    strong {
      color: #e0cf94;
    }
  }
}
.calculation-element {
  &--fire {
    color: #edaa85;
  }
  &--ltng {
    color: #e0d48d;
  }
  &--cold {
    color: #96c8e2;
  }
  &--pois {
    color: #a0c88b;
  }
  &--mag {
    color: #c5ace0;
  }
}
.calculation-note,
.calculation-required {
  margin: 9px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: #999;
}
.calculation-required {
  color: #ec997d;
}
.calculation-breakdown {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.6;
  summary {
    color: #9db6bf;
    cursor: pointer;
  }
  > div {
    display: grid;
    gap: 3px;
    padding-top: 9px;
    color: #999;
    b {
      color: #ccc;
    }
  }
}
.calculation-footnote {
  padding: 5px 4px;
  margin: 14px 0 0;
  font-size: 12px;
  line-height: 1.7;
  color: #8d8d89;
}
@media (width <= 480px) {
  .calculation-card {
    gap: 10px;
    padding: 13px;
  }
  .calculation-icon {
    flex-basis: 36px;
    width: 36px;
    height: 36px;
  }
  .calculation-controls {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .calculation-content h4 {
    font-size: 15px;
  }
}
</style>
