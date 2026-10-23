<template>
  <article class="runeword" :class="{ 'runeword--detail': showOld }">
    <h3 class="runeword__title">
      <button
        v-if="!showOld"
        class="runeword__open"
        aria-haspopup="dialog"
        @click="$emit('select')"
      >
        {{ runeword.name?.[store.currentLang] }}</button
      ><template v-else>{{ runeword.name?.[store.currentLang] }}</template>
    </h3>
    <p v-if="showOld" class="runeword__translation">
      {{ runeword.name?.[store.currentLang === "en" ? "ru" : "en"] }}
    </p>
    <RunewordBadges :item="runeword" />
    <p v-if="!showOld" class="runeword__type">
      {{ types
      }}<span v-if="runeword.classes?.length"> ({{ runeword.classes.join(", ") }})</span>
    </p>
    <div class="runeword__runes" :aria-label="t('Порядок рун', 'Rune order')">
      <span
        v-for="(rune, index) in runeword.runes ?? []"
        :key="index"
        class="runeword__rune"
      >
        <small v-if="showOld">{{ index + 1 }}</small>
        <img
          :src="runeImage(rune)"
          alt=""
          :width="showOld ? 40 : 27"
          :height="showOld ? 46 : 28"
        />
        <span
          :class="words.selectedRunes.includes(rune) ? 'rune--found' : 'rune--missing'"
          >{{ findRune(rune)?.name[store.currentLang] }}</span
        >
      </span>
    </div>
    <dl v-if="showOld" class="runeword__specs">
      <div>
        <dt>{{ t("Основа", "Base") }}</dt>
        <dd>{{ types }}</dd>
      </div>
      <div>
        <dt>{{ t("Сокеты", "Sockets") }}</dt>
        <dd>{{ runeword.runes?.length }}</dd>
      </div>
      <div>
        <dt>{{ t("Требуемый уровень", "Required level") }}</dt>
        <dd>{{ runeword.level }}</dd>
      </div>
      <div v-if="runeword.classes?.length">
        <dt>{{ t("Класс", "Class") }}</dt>
        <dd>{{ runeword.classes.join(", ") }}</dd>
      </div>
      <div v-if="runeword.excluded?.length">
        <dt>{{ t("Исключения", "Excluded") }}</dt>
        <dd>{{ runeword.excluded }}</dd>
      </div>
    </dl>
    <h4 v-if="showOld" class="runeword__label">
      {{ t("Свойства предмета", "Item properties") }}
    </h4>
    <RunewordStats
      :lines="runeword.stats?.[store.currentLang] ?? []"
      :runeword-id="runeword.id"
    />
    <p
      v-for="message in runeword.bugged?.message ?? []"
      :key="message"
      class="runeword__warning"
    >
      {{ message }}
    </p>
    <details v-if="showOld && runeword.old" class="runeword__original">
      <summary>{{ t("Оригинальная версия", "Original version") }}</summary>
      <p v-if="runeword.old.types">
        {{ runeword.old.types.map(getTypeName).join(", ") }}
      </p>
      <p v-if="runeword.old.runes">
        {{ runeword.old.runes.map(getRuneName).join(" · ") }}
      </p>
      <RunewordStats :lines="runeword.old.stats?.[store.currentLang] ?? []" />
    </details>
    <template v-if="showOld">
      <button class="runeword__copy" @click="copyRecipe">
        {{
          copyState === "copied"
            ? t("Скопировано ✓", "Copied ✓")
            : copyState === "error"
              ? t("Не удалось скопировать", "Could not copy")
              : t("Скопировать рецепт", "Copy recipe")
        }}
      </button>
      <p class="runeword__note">
        {{
          t(
            "Вставляйте руны слева направо в указанном порядке.",
            "Insert runes from left to right in the order shown."
          )
        }}
      </p>
    </template>
    <div v-else class="runeword__footer">
      <span>{{ t("Уровень", "Level") }} {{ runeword.level }}</span
      ><span>{{ runeword.runes?.length }} {{ t("сок.", "sockets") }}</span
      ><button
        :aria-label="t('Открыть рунное слово', 'Open runeword')"
        @click="$emit('select')"
      >
        ↗
      </button>
    </div>
  </article>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { useInfoStore, useRunewordsStore } from "@/store";
import { useRunes } from "@/composables/useRunes";
import { useText } from "@/composables/useText";
import RunewordStats from "@/components/RunewordStats.vue";
import RunewordBadges from "@/components/RunewordBadges.vue";
import type { RunewordCardItem } from "@/types";
const props = withDefaults(
  defineProps<{ runeword?: RunewordCardItem; showOld?: boolean }>(),
  { runeword: () => ({}), showOld: false }
);
defineEmits<{ (e: "select"): void }>();
const store = useInfoStore();
const words = useRunewordsStore();
const t = useText();
const { findRune, getTypeName, getRuneName } = useRunes();
const types = computed(() => (props.runeword.types ?? []).map(getTypeName).join(", "));
const runeImage = (id: number) =>
  `${import.meta.env.BASE_URL}${findRune(id)?.image_url.replace(/^\//, "") ?? ""}`;
const copyState = ref<"idle" | "copied" | "error">("idle");
async function copyRecipe() {
  try {
    await navigator.clipboard.writeText(
      `${props.runeword.name?.en}: ${(props.runeword.runes ?? []).map((id) => findRune(id)?.name.en).join(" + ")}`
    );
    copyState.value = "copied";
  } catch {
    copyState.value = "error";
  }
}
</script>
<style scoped lang="scss">
.runeword {
  width: 100%;
  padding: 16px 14px;
  text-align: center;
}
.runeword__title {
  font-size: 19px;
  line-height: 1.3;
  color: var(--color-title);
}
.runeword__open {
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
}
.runeword__open::after {
  position: absolute;
  inset: 0;
  content: "";
  border-radius: 4px;
}
.runeword__open:focus-visible {
  outline: 0;
}
.runeword__open:focus-visible::after {
  outline: 2px var(--border-style) var(--color-accent);
  outline-offset: 3px;
}
.runeword :deep(.base-tabs),
.runeword__footer button {
  position: relative;
  z-index: 1;
}
.badges {
  justify-content: center;
  margin-top: 7px;
}
.badges:empty {
  display: none;
}
.runeword__type {
  margin-top: 5px;
  font-size: 11px;
  color: var(--color-muted);
}
.runeword__runes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: center;
  margin: 13px 0;
}
.runeword__rune {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  font-size: 12px;
  color: #c5d9e2;
}
.runeword__rune img {
  width: 27px;
  height: 28px;
  object-fit: contain;
}
.runeword__footer {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  margin-top: 14px;
  font-size: 10px;
  color: var(--color-muted);
  border-top: 1px var(--border-style) var(--color-border);
}
.runeword__footer button {
  padding: 0 4px;
  color: var(--color-accent);
  background: transparent;
  border: 0;
}
.runeword__warning {
  margin-top: 10px;
  font-size: 11px;
  color: var(--color-danger);
}
.runeword--detail {
  padding: 19px 20px 16px;
  text-align: left;
}
.runeword--detail .runeword__title {
  font-size: 30px;
}
.runeword__translation {
  margin-top: 3px;
  font-size: 12px;
  color: var(--color-muted);
}
.runeword--detail .badges {
  justify-content: flex-start;
}
.runeword--detail .runeword__runes {
  gap: 20px;
  padding: 17px 6px;
  margin: 21px 0;
  background: #11181e;
  border: 1px var(--border-style) var(--color-border);
  border-radius: 4px;
}
.runeword--detail .runeword__rune {
  position: relative;
  flex-direction: column;
  gap: 4px;
}
.runeword--detail .runeword__rune img {
  width: 40px;
  height: 46px;
}
.runeword__rune small {
  font-size: 9px;
  color: var(--color-muted);
}
.runeword__specs {
  padding: 13px 0;
  font-size: 11px;
  border-top: 1px var(--border-style) var(--color-border);
  border-bottom: 1px var(--border-style) var(--color-border);
}
.runeword__specs > div {
  display: grid;
  grid-template-columns: 145px 1fr;
  gap: 12px;
  margin: 4px 0;
}
dt {
  color: var(--color-muted);
}
.runeword__label {
  margin: 18px 0 12px;
  font-size: 10px;
  font-weight: 400;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
}
.runeword--detail :deep(.item-stats) {
  font-size: 14px;
  line-height: 1.7;
}
.runeword--detail :deep(.base-tabs) {
  justify-content: flex-start;
}
.runeword__original {
  padding-top: 14px;
  margin-top: 20px;
  color: var(--color-muted);
  border-top: 1px var(--border-style) var(--color-border);
}
summary {
  margin-bottom: 10px;
  font-size: 12px;
  cursor: pointer;
}
.runeword__original > p {
  margin-bottom: 8px;
  font-size: 11px;
}
.runeword__copy {
  width: 100%;
  padding: 9px;
  margin-top: 20px;
  font-size: 12px;
  color: #d1e3ec;
  background: #2c404d;
  border-color: #536570;
}
.runeword__note {
  margin-top: 10px;
  font-size: 10px;
  color: var(--color-muted);
  text-align: center;
}
@media (max-width: 600px) {
  .runeword--detail {
    padding: 16px;
  }
  .runeword--detail .runeword__runes {
    gap: 15px;
  }
  .runeword__specs > div {
    grid-template-columns: 120px 1fr;
  }
}
</style>
