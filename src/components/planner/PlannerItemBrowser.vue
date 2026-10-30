<template>
  <div class="planner-item-browser">
    <aside
      class="planner-item-categories"
      :aria-label="t('Категории предметов', 'Item categories')"
    >
      <button type="button" :aria-pressed="!category" @click="category = ''">
        {{ t("Все категории", "All categories") }}
      </button>
      <details v-for="group in groups" :key="group.key" open>
        <summary>{{ t(group.ru, group.en) }}</summary>
        <button
          v-for="entry in group.categories"
          :key="entry.code"
          type="button"
          :aria-pressed="category === entry.code"
          @click="category = entry.code"
        >
          {{ t(entry.ru, entry.en) }}
        </button>
      </details>
    </aside>
    <section class="planner-item-search">
      <div class="planner-item-searchbar">
        <input
          v-model="query"
          type="search"
          :aria-label="t('Поиск предметов', 'Search items')"
          :placeholder="t('Поиск…', 'Search…')"
        />
        <button
          type="button"
          :aria-expanded="filtersOpen"
          @click="filtersOpen = !filtersOpen"
        >
          {{ t("Фильтры", "Filters") }}
          <UiIcon :name="filtersOpen ? 'chevron-up' : 'chevron-down'" />
        </button>
      </div>
      <div v-if="filtersOpen" class="planner-item-filters">
        <label
          ><input v-model="byLevel" type="checkbox" />
          {{ t("Доступны на моём уровне", "Available at my level") }} ({{ level }})</label
        >
        <label
          >{{ t("Класс основы", "Base tier") }}
          <select v-model="tier">
            <option value="">{{ t("Все", "All") }}</option>
            <option value="normal">{{ t("Обычный", "Normal") }}</option>
            <option value="exceptional">{{ t("Исключительный", "Exceptional") }}</option>
            <option value="elite">{{ t("Элитный", "Elite") }}</option>
          </select></label
        >
      </div>
      <div
        class="planner-item-quality-tabs"
        :aria-label="t('Качество предметов', 'Item qualities')"
      >
        <button
          v-for="filter in filters"
          :key="filter.key"
          type="button"
          :data-quality="filter.key"
          :aria-pressed="quality === filter.key"
          @click="quality = filter.key"
        >
          {{ t(filter.ru, filter.en) }}
        </button>
      </div>
      <div class="planner-item-results" :aria-label="t('Список предметов', 'Item list')">
        <button
          v-for="entry in filtered"
          :key="entry.id"
          type="button"
          class="planner-item-result"
          :data-quality="entry.quality"
          @click="$emit('choose', entry)"
        >
          <span>{{
            entry.word
              ? entry.word.name[lang]
              : entry.craftId
                ? craftById.get(entry.craftId)?.name[lang] || entry.name
                : entry.name
          }}</span
          ><small>{{ t("Ур.", "Lvl") }} {{ entry.level }}</small>
        </button>
        <p v-if="!filtered.length" class="planner-item-empty">
          {{
            t(
              "Предметы не найдены. Измените поиск или фильтры.",
              "No items found. Change your search or filters."
            )
          }}
        </p>
      </div>
      <div class="planner-item-browser-footer">
        <span>{{ t("Найдено", "Found") }}: {{ filtered.length }}</span>
      </div>
    </section>
  </div>
</template>
<script setup lang="ts">
import UiIcon from "@/components/ui/UiIcon.vue";
import { computed, ref } from "vue";
import { useText } from "@/composables/useText";
import { useInfoStore } from "@/store";
import { craftById } from "@/utils/planner-crafts";
import {
  itemCategories,
  type CatalogItem,
  type ItemBase,
} from "@/utils/planner-item-catalog";
const props = defineProps<{
  items: CatalogItem[];
  existing: CatalogItem[];
  bases: Map<string, ItemBase>;
  level: number;
}>();
defineEmits<{ choose: [item: CatalogItem] }>();
const t = useText();
const info = useInfoStore();
const lang = computed(() => info.currentLang);
const query = ref(""),
  category = ref(""),
  quality = ref("all"),
  tier = ref("");
const byLevel = ref(false),
  filtersOpen = ref(false);
const filters = [
  { key: "all", ru: "Все предметы", en: "All Items" },
  { key: "runeword", ru: "Рунные слова", en: "Runewords" },
  { key: "unique", ru: "Уникальные", en: "Unique Items" },
  { key: "normal", ru: "Основы", en: "Base Items" },
  { key: "crafted", ru: "Крафтовые", en: "Crafted Items" },
  { key: "set", ru: "Комплекты", en: "Set Items" },
  { key: "existing", ru: "Мои предметы", en: "Existing Items" },
];
const groups = computed(() =>
  [
    { key: "shields", ru: "Щиты", en: "Shields" },
    { key: "weapons", ru: "Оружие", en: "Weapons" },
    { key: "armor", ru: "Броня", en: "Armor" },
    { key: "other", ru: "Прочее", en: "Miscellaneous" },
  ]
    .map((group) => ({
      ...group,
      categories: itemCategories.filter(
        (c) =>
          c.group === group.key &&
          props.items.some((item) =>
            item.bases.some((code) => props.bases.get(code)?.category === c.code)
          )
      ),
    }))
    .filter((group) => group.categories.length)
);
const filtered = computed(() => {
  const search = query.value.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return (quality.value === "existing" ? props.existing : props.items).filter(
    (item) =>
      (quality.value === "all" ||
        quality.value === "existing" ||
        quality.value === item.quality) &&
      (!byLevel.value || item.level <= props.level) &&
      item.bases.some(
        (code) =>
          (!category.value || props.bases.get(code)?.category === category.value) &&
          (!tier.value || props.bases.get(code)?.tier === tier.value)
      ) &&
      search.every((term) =>
        [
          item.name,
          item.word?.name.ru,
          item.craftId ? craftById.get(item.craftId)?.name.ru : "",
          ...item.bases.map((code) => props.bases.get(code)?.name),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(term)
      )
  );
});
</script>
