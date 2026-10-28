<template>
  <div class="planner-socket-editor" @keydown.esc="escape">
    <div v-for="index in count" :key="index" class="planner-socket-row">
      <div class="planner-socket-row-heading">
        <button
          ref="triggers"
          type="button"
          :disabled="readonly"
          :aria-expanded="opened === index"
          :aria-controls="opened === index ? `${uid}-${index}` : undefined"
          @click="toggle(index)"
        >
          <img
            v-if="selected(index)"
            :src="base + selected(index)!.image_url.slice(1)"
            alt=""
          />
          <i v-else class="planner-socket-empty" aria-hidden="true" />
          <span
            ><small>{{ t("Сокет", "Socket") }} {{ index }}</small
            >{{ selected(index)?.name[lang] || t("Пустой сокет", "Empty Socket") }}</span
          >
          <span v-if="!readonly" aria-hidden="true">{{
            opened === index ? "⌃" : "⌄"
          }}</span>
        </button>
        <button
          v-if="selected(index) && !readonly"
          type="button"
          :aria-label="`${t('Удалить вставку из сокета', 'Remove insert from socket')} ${index}`"
          @click="choose(index, null)"
        >
          ×
        </button>
      </div>
      <div
        v-if="opened === index && !readonly"
        :id="`${uid}-${index}`"
        class="planner-socket-picker"
      >
        <input
          ref="searchInput"
          v-model="search"
          type="search"
          :placeholder="
            t('Поиск рун, камней и фасетов…', 'Search runes, gems and jewels…')
          "
          :aria-label="t('Поиск вставки', 'Search socket insert')"
        />
        <div class="planner-socket-filters" :aria-label="t('Тип вставки', 'Insert type')">
          <button
            v-for="filter in filters"
            :key="filter.key"
            type="button"
            :aria-pressed="group === filter.key"
            @click="group = filter.key"
          >
            {{ t(filter.ru, filter.en) }}
          </button>
        </div>
        <div class="planner-socket-options">
          <button
            v-for="insert in options"
            :key="insert.code"
            type="button"
            :data-kind="insert.group"
            :aria-pressed="modelValue[index - 1] === insert.code"
            @click="choose(index, insert.code)"
          >
            <img :src="base + insert.image_url.slice(1)" alt="" />
            <span
              >{{ insert.name[lang]
              }}<small
                >{{ t("Уровень", "Level") }} {{ insert.requiredLevel }}</small
              ></span
            >
          </button>
          <p v-if="!options.length" class="planner-muted">
            {{ t("Ничего не найдено.", "No matches.") }}
          </p>
        </div>
      </div>
    </div>
    <div
      v-if="!readonly && modelValue.some(Boolean)"
      class="planner-socket-properties"
      :aria-label="t('Свойства вставок', 'Socket insert properties')"
    >
      <template v-for="index in count" :key="index">
        <template v-if="selected(index)">
          <template v-if="jewelItem(index)">
            <p class="planner-socket-jewel-name">{{ selected(index)!.name[lang] }}</p>
            <PlannerPropertyEditor
              :item="jewelItem(index)!"
              :native="native"
              :character-level="characterLevel"
              character-class="amazon"
              @values="setValues(index, $event)"
            />
          </template>
          <p v-for="(line, n) in properties(index)" v-else :key="n">{{ line }}</p>
        </template>
      </template>
    </div>
    <p v-if="readonly" class="planner-muted">
      {{
        t(
          "Руны рунного слова заданы его рецептом.",
          "Runeword runes follow its fixed recipe."
        )
      }}
    </p>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from "vue";
import { useInfoStore } from "@/store";
import { useText } from "@/composables/useText";
import PlannerPropertyEditor from "./PlannerPropertyEditor.vue";
import {
  socketInserts,
  socketInsertByCode,
  socketCategory,
  socketInsertItem,
} from "@/utils/planner-sockets";
import { socketPropertyLines } from "@/utils/planner-item-catalog";
import type { GameSaveExporter } from "@/utils/planner-game-save";
import type { PlannerItem } from "@/types/planner";

const props = defineProps<{
  item: PlannerItem;
  count: number;
  modelValue: (string | null)[];
  native: GameSaveExporter;
  characterLevel: number;
  readonly?: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: (string | null)[]];
  values: [value: NonNullable<PlannerItem["socketPropertyValues"]>];
}>();
const info = useInfoStore();
const lang = computed(() => info.currentLang);
const t = useText();
const uid = useId();
const base = import.meta.env.BASE_URL;
const opened = ref<number>();
const search = ref("");
const group = ref("all");
const triggers = ref<HTMLButtonElement[]>([]);
const searchInput = ref<HTMLInputElement[]>([]);
const filters = [
  { key: "all", ru: "Все", en: "All" },
  { key: "rune", ru: "Руны", en: "Runes" },
  { key: "gem", ru: "Камни", en: "Gems" },
  { key: "facet", ru: "Фасеты", en: "Facets" },
  { key: "jewel", ru: "Новые самоцветы", en: "Colossal Jewels" },
];
const options = computed(() =>
  socketInserts
    .filter(
      (item) =>
        (group.value === "all" || item.group === group.value) &&
        `${item.name.ru} ${item.name.en}`
          .toLocaleLowerCase()
          .includes(search.value.trim().toLocaleLowerCase())
    )
    .sort((a, b) =>
      a.group === b.group
        ? b.requiredLevel - a.requiredLevel ||
          a.name[lang.value].localeCompare(b.name[lang.value], lang.value)
        : filters.findIndex((f) => f.key === a.group) -
          filters.findIndex((f) => f.key === b.group)
    )
);
const selected = (index: number) =>
  socketInsertByCode.get(props.modelValue[index - 1] ?? "");
const jewelItem = (index: number) =>
  socketInsertItem(
    props.modelValue[index - 1] ?? "",
    props.item.socketPropertyValues?.[index - 1]
  );
const properties = (index: number) =>
  socketPropertyLines(
    props.native,
    props.modelValue[index - 1] ?? "",
    socketCategory(props.item),
    props.characterLevel,
    props.item.socketPropertyValues?.[index - 1]
  );
function setValues(index: number, values: Record<string, number>) {
  emit("values", { ...props.item.socketPropertyValues, [index - 1]: values });
}
function close() {
  const previous = opened.value;
  opened.value = undefined;
  if (previous) nextTick(() => triggers.value[previous - 1]?.focus());
}
function escape(event: KeyboardEvent) {
  if (opened.value) {
    event.preventDefault();
    event.stopPropagation();
    close();
  }
}
function toggle(index: number) {
  if (opened.value === index) {
    close();
    return;
  }
  opened.value = index;
  search.value = "";
  nextTick(() => searchInput.value[0]?.focus());
}
function choose(index: number, code: string | null) {
  const values = { ...props.item.socketPropertyValues };
  delete values[index - 1];
  emit("values", values);
  emit(
    "update:modelValue",
    Array.from({ length: props.count }, (_, i) =>
      i === index - 1 ? code : (props.modelValue[i] ?? null)
    )
  );
  opened.value = undefined;
  nextTick(() => triggers.value[index - 1]?.focus());
}
watch(
  () => props.count,
  () => {
    if (opened.value && opened.value > props.count) opened.value = undefined;
  }
);
</script>
