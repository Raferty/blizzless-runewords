<template>
  <UiModal
    class="planner-item-dialog"
    :model-value="true"
    closable
    :label="title"
    @close="$emit('close')"
  >
    <form class="planner-editor planner-item-editor" @submit.prevent="save">
      <header class="planner-item-tabs">
        <div role="tablist" :aria-label="t('Редактор предмета', 'Item editor')">
          <button
            :id="uid + '-select'"
            type="button"
            role="tab"
            :aria-selected="tab === 'select'"
            :aria-controls="uid + '-panel'"
            @click="tab = 'select'"
            @keydown.right.prevent="item.name.trim() && (tab = 'edit')"
          >
            {{ t("Выбор", "Select") }}
          </button>
          <button
            :id="uid + '-edit'"
            type="button"
            role="tab"
            :disabled="!item.name.trim()"
            :aria-selected="tab === 'edit'"
            :aria-controls="uid + '-panel'"
            @click="tab = 'edit'"
            @keydown.left.prevent="tab = 'select'"
          >
            {{ t("Редактирование", "Edit") }}
          </button>
        </div>
        <span>{{ title }}</span>
        <button
          type="button"
          class="planner-item-close"
          :aria-label="t('Закрыть', 'Close')"
          @click="$emit('close')"
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div
        :id="uid + '-panel'"
        class="planner-item-tabpanel"
        role="tabpanel"
        :aria-labelledby="uid + '-' + tab"
      >
        <template v-if="tab === 'select'">
          <PlannerItemBrowser
            v-if="catalog"
            :items="catalog.items"
            :existing="existingItems"
            :bases="catalog.bases"
            :level="store.build.level"
            @choose="chooseCatalogItem"
          />
          <div v-else class="planner-item-loading" role="status">
            <p>
              {{
                loadError || t("Загружаю предметы Blizzless…", "Loading Blizzless items…")
              }}
            </p>
            <button v-if="loadError" type="button" @click="loadCatalog">
              {{ t("Повторить", "Retry") }}
            </button>
          </div>
        </template>
        <div v-else class="planner-item-edit-scroll">
          <div class="planner-item-hero">
            <div class="planner-item-portrait">
              <img
                v-if="selectedImage"
                :class="{ 'planner-ethereal-image': item.ethereal }"
                :src="baseUrl + selectedImage"
                alt=""
              /><PlannerIcon
                v-else
                :name="
                  preferredKind === 'shield'
                    ? 'shield'
                    : preferredKind === 'armor'
                      ? 'armor'
                      : charmMode
                        ? 'charm'
                        : 'sword'
                "
              />
            </div>
            <div class="planner-item-identity">
              <h2 :data-quality="item.quality">
                {{ item.name || t("Новый предмет", "New item") }}
                <small
                  v-if="
                    selectedBase &&
                    !item.craftId &&
                    !isContainerBase(selectedBase.code) &&
                    item.name !== selectedBase.name
                  "
                  >{{ selectedBase.name }}</small
                >
              </h2>
              <div class="planner-item-tools">
                <button type="button" @click="tab = 'select'">
                  <UiIcon name="refresh" /> {{ t("Заменить", "Change Item") }}
                </button>
                <button
                  v-if="removable && owner !== 'stash'"
                  type="button"
                  @click="$emit('stash')"
                >
                  <UiIcon name="arrow-up-right" /> {{ t("В сундук", "Unequip") }}
                </button>
                <button v-if="removable" type="button" @click="$emit('remove')">
                  <UiIcon name="trash" /> {{ t("Удалить", "Delete") }}
                </button>
              </div>
              <div class="planner-item-base-controls">
                <label class="planner-label"
                  >{{ t("Уровень предмета", "Item level")
                  }}<input
                    v-model.number="item.itemLevel"
                    type="number"
                    min="1"
                    max="99"
                    required
                /></label>
                <label
                  v-if="baseOptions.length && !isContainerBase(item.baseCode)"
                  class="planner-label"
                  >{{ t("Основа", "Base")
                  }}<UiSelect
                    dropdown-class="planner-select-dropdown"
                    :model-value="item.baseCode ?? ''"
                    :options="baseOptions"
                    :aria-label="t('Основа предмета', 'Item base')"
                    @update:model-value="changeBase"
                /></label>
                <label v-if="isTome(item.baseCode)" class="planner-label"
                  >{{ t("Свитков внутри", "Scrolls inside")
                  }}<input
                    v-model.number="item.quantity"
                    type="number"
                    min="0"
                    max="20"
                    required
                /></label>
                <label v-if="canEditQuality" class="planner-label planner-item-quality"
                  >{{ t("Качество", "Quality") }}
                  <UiSelect
                    dropdown-class="planner-select-dropdown"
                    :model-value="item.quality"
                    :options="editableQualities"
                    :aria-label="t('Качество предмета', 'Item quality')"
                    @update:model-value="changeQuality"
                  />
                </label>
                <label
                  v-if="isCharm && item.quality === 'unique' && uniqueCharms.length"
                  class="planner-label planner-item-unique-charm"
                  >{{ t("Уникальный талисман", "Unique charm") }}
                  <UiSelect
                    dropdown-class="planner-select-dropdown"
                    :model-value="item.catalogId ?? ''"
                    :options="
                      uniqueCharms.map((entry) => ({
                        value: entry.catalogId!,
                        label: entry.name,
                      }))
                    "
                    :aria-label="t('Уникальный талисман', 'Unique charm')"
                    @update:model-value="changeUniqueCharm"
                  />
                </label>
                <label v-if="selectedBase?.kind" class="planner-item-ethereal"
                  ><input
                    v-model="item.ethereal"
                    type="checkbox"
                    :disabled="!!selectedCraft && !canToggleCraftEthereal"
                  />
                  {{ t("Эфирный", "Ethereal") }}</label
                >
              </div>
            </div>
          </div>
          <div
            v-if="templates.length || selectedCatalog?.catalogId || selectedCraft"
            class="planner-template-controls"
          >
            <button type="button" @click="setRoll(0)">
              {{ t("Мин. ролл", "Min roll") }}</button
            ><button type="button" @click="setRoll(1)">
              {{ t("Макс. ролл", "Max roll") }}
            </button>
          </div>
          <p v-if="affixNotice" class="planner-muted" role="status">{{ affixNotice }}</p>
          <section v-if="selectedCraft && native" class="planner-item-properties">
            <h3 data-quality="crafted">
              {{ t("Свойства рецепта", "Recipe properties") }}
            </h3>
            <details v-if="selectedRecipe" class="planner-craft-recipe">
              <summary>
                {{ t("Ингредиенты", "Ingredients") }} · {{ selectedCraft.name[lang] }}
              </summary>
              <p>
                {{
                  selectedRecipe.ingredients
                    .map(
                      (part) =>
                        `${part.count} × ${cubeIngredients.get(part.key)?.name[lang] || cubeIngredients.get(part.key)?.name.en || part.key}`
                    )
                    .join(" + ")
                }}
              </p>
              <PlannerRecipeIngredients
                :recipe="selectedRecipe"
                :base-code="item.baseCode"
                :ethereal="!!item.ethereal"
              />
            </details>
            <PlannerPropertyEditor
              :native="native"
              :item="item"
              :character-level="store.build.level"
              :character-class="store.build.classId"
              @values="setPropertyValues"
              @choices="setPropertyChoices"
              @class="setSkillClass"
            />
            <p class="planner-muted">
              {{
                t(
                  "К этим бонусам добавляются случайные аффиксы. Уровень предмета — уровень результата крафта.",
                  "Random affixes are added to these bonuses. Item level is the level of the crafted result."
                )
              }}
            </p>
            <p v-if="preferredCraftAffixes.length" class="planner-muted">
              {{ t("Приоритетные аффиксы рецепта", "Recipe preferred affixes") }}:
              {{ preferredCraftAffixes.join(", ") }}
            </p>
          </section>
          <PlannerAffixEditor
            v-if="native && editableQuality(item.quality)"
            :item="item"
            :native="native"
            :character-level="store.build.level"
            @update:affixes="updateAffixes"
          />
          <p v-if="!craftAffixesComplete" class="planner-muted" role="status">
            {{ t("Нужно случайных аффиксов", "Required random affixes") }}:
            {{ craftAffixMinimum(item.itemLevel ?? 99) }} ({{ t("сейчас", "selected") }}
            {{ item.affixes?.length ?? 0 }}).
          </p>
          <section v-if="!editableQuality(item.quality)" class="planner-item-properties">
            <h3 :data-quality="item.quality">
              {{ qualityOptions.find((q) => q.value === item.quality)?.label }}
            </h3>
            <template v-if="selectedWord"
              ><p class="planner-rune-order">
                {{
                  selectedWord.runes
                    .map((id) => RUNES.find((r) => r.id === id)?.name[lang])
                    .join(" · ")
                }}
              </p>
            </template>
            <PlannerPropertyEditor
              v-if="native && native.itemDefinition(item)"
              :native="native"
              :item="item"
              :character-level="store.build.level"
              :character-class="store.build.classId"
              @values="setPropertyValues"
              @choices="setPropertyChoices"
              @class="setSkillClass"
            />
            <RunewordStats
              v-else-if="selectedWord"
              :lines="selectedWord.stats?.[lang] ?? []"
            />
            <ul v-else-if="referenceLines.length">
              <li v-for="(line, index) in referenceLines" :key="index">{{ line }}</li>
            </ul>
            <ul v-else>
              <li v-for="field in activeBonuses" :key="field.key">
                {{ item.bonuses[field.key] }} {{ t(field.ru, field.en)
                }}{{ field.percent ? " %" : "" }}
              </li>
              <li v-if="!activeBonuses.length" class="planner-muted">
                {{ t("Нет собственных бонусов.", "No inherent bonuses.") }}
              </li>
            </ul>
            <PlannerSetBonuses :bonuses="setBonuses" />
          </section>
          <section v-if="selectedBase && maxSockets" class="planner-item-sockets">
            <label class="planner-label"
              >{{ t("Сокеты", "Sockets")
              }}<input
                v-model.number="item.sockets"
                type="number"
                :min="affixSockets(item)"
                :max="maxSockets"
                :readonly="item.quality === 'runeword'"
            /></label>
            <span v-if="item.quality !== 'runeword'"
              >{{ t("Свободных гнёзд", "Empty sockets") }}:
              {{
                Math.max(
                  0,
                  socketCount - (item.socketedItems?.filter(Boolean).length ?? 0)
                )
              }}</span
            >
          </section>
          <PlannerSocketEditor
            v-if="native && socketCount"
            :item="item"
            :count="socketCount"
            :model-value="
              selectedWord
                ? selectedWord.runes.map((id) => `r${String(id).padStart(2, '0')}`)
                : (item.socketedItems ?? [])
            "
            :readonly="item.quality === 'runeword'"
            :native="native"
            :character-level="store.build.level"
            @update:model-value="item.socketedItems = $event"
            @values="item.socketPropertyValues = $event"
          />
          <p
            v-if="itemRequiredLevel(item) > item.requiredLevel"
            class="planner-muted planner-item-required-level"
          >
            {{
              t(
                "Требуемый уровень со свойствами и вставками",
                "Required level with mods and socket inserts"
              )
            }}: {{ itemRequiredLevel(item) }}
          </p>
          <p v-if="!inventoryFits" class="planner-error">
            {{
              t(
                "Для этого предмета недостаточно места в выбранной ячейке.",
                "This item does not fit at the selected position."
              )
            }}
          </p>
        </div>
      </div>
      <footer v-if="tab === 'edit'" class="planner-item-actions">
        <button type="button" @click="$emit('close')">{{ t("Отмена", "Cancel") }}</button
        ><button
          type="submit"
          class="planner-primary"
          :disabled="!item.name.trim() || !inventoryFits || !craftAffixesComplete"
        >
          {{ t("Применить", "Apply") }}
        </button>
      </footer>
    </form>
  </UiModal>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, useId, watch } from "vue";
import PlannerItemBrowser from "./PlannerItemBrowser.vue";
import PlannerIcon from "./PlannerIcon.vue";
import UiIcon from "@/components/ui/UiIcon.vue";
import PlannerSetBonuses from "./PlannerSetBonuses.vue";
import PlannerAffixEditor from "./PlannerAffixEditor.vue";
import PlannerPropertyEditor from "./PlannerPropertyEditor.vue";
import { isClassCharm, normalizeClassCharm } from "@/utils/planner-properties";
import {
  craftById,
  craftVariant,
  createCraftedItem,
  craftAffixMinimum,
} from "@/utils/planner-crafts";
import { cubeCatalog, cubeIngredients } from "@/utils/cube";
import PlannerRecipeIngredients from "./PlannerRecipeIngredients.vue";
import { stashSupplies } from "@/utils/planner-supplies";
import {
  editableQuality,
  canBeRare,
  retainCompatibleAffixes,
  affixSockets,
  affixById,
} from "@/utils/planner-affixes";
import PlannerSocketEditor from "./PlannerSocketEditor.vue";
import { itemRequiredLevel } from "@/utils/planner-sockets";
import { usePlannerStore } from "@/store/planner";
import {
  createItemCatalog,
  catalogPropertyLines,
  catalogSetBonuses,
  type CatalogItem,
} from "@/utils/planner-item-catalog";
import type { GameSaveExporter } from "@/utils/planner-game-save";
import UiModal from "@/components/ui/UiModal.vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import RunewordStats from "@/components/RunewordStats.vue";
import { useText } from "@/composables/useText";
import { useInfoStore, useRunewordsStore } from "@/store";
import { bonusFields } from "@/shared/planner";
import { RUNES } from "@/shared/constants";
import { matchesItemType } from "@/utils/runeword";
import { parsePlannerItem, charmFits, inventoryWidth } from "@/utils/planner";
import { isContainerBase, plannerItemImage, isTome } from "@/utils/planner-item-art";
import { itemRuneword } from "@/utils/planner-item-presentation";
import type { ClassId, EquipmentSlot, PlannerItem, PlannerAffix } from "@/types/planner";
import { runewordBonuses, runewordTemplates } from "@/utils/planner-runewords";
import type { RunewordTableItem } from "@/types";
const props = withDefaults(
  defineProps<{
    title: string;
    itemSlot?: EquipmentSlot;
    owner?: "hero" | "mercenary" | "charm" | "stash";
    initial?: PlannerItem;
    allowedTypes?: number[];
    removable?: boolean;
    charmMode?: boolean;
    initialHeight?: number;
    allowedHeights?: number[];
    preferredKind?: NonNullable<PlannerItem["baseKind"]>;
    characterClass?: ClassId;
    inventoryPosition?: number;
    inventoryId?: string;
  }>(),
  {
    initial: undefined,
    itemSlot: undefined,
    owner: "hero",
    allowedTypes: () => [],
    removable: false,
    charmMode: false,
    initialHeight: 1,
    allowedHeights: () => [1, 2, 3],
    preferredKind: "weapon",
    characterClass: undefined,
    inventoryPosition: undefined,
    inventoryId: undefined,
  }
);
const emit = defineEmits<{
  close: [];
  remove: [];
  stash: [];
  save: [item: PlannerItem, height: number];
}>();
const t = useText();
const info = useInfoStore();
const words = useRunewordsStore();
const lang = computed(() => info.currentLang);
const uid = useId();
const store = usePlannerStore();
const baseUrl = import.meta.env.BASE_URL;
const tab = ref(props.initial ? "edit" : "select");
const native = shallowRef<GameSaveExporter>();
const catalog = shallowRef<ReturnType<typeof createItemCatalog>>();
const loadError = ref("");
const roll = ref<0 | 1>(props.initial?.propertyRoll ?? 0);
const height = ref(props.initialHeight);
const item = ref<PlannerItem>(
  props.initial
    ? JSON.parse(JSON.stringify(props.initial))
    : {
        name: "",
        quality: "rare",
        requiredLevel: 1,
        notes: "",
        bonuses: {},
        itemLevel: 99,
      }
);
item.value.itemLevel ??= 99;
const inventoryFits = computed(
  () =>
    !props.charmMode ||
    (props.inventoryPosition === undefined
      ? props.allowedHeights.includes(height.value)
      : charmFits(
          store.build.charms,
          props.inventoryPosition,
          height.value,
          props.inventoryId,
          inventoryWidth(item.value)
        ))
);
item.value.propertyRoll ??= roll.value;
normalizeClassCharm(item.value, store.build.classId);
const qualityOptions = computed(() => [
  { value: "normal" as const, label: t("Обычный", "Normal") },
  { value: "magic" as const, label: t("Магический", "Magic") },
  { value: "rare" as const, label: t("Редкий", "Rare") },
  { value: "unique" as const, label: t("Уникальный", "Unique") },
  { value: "set" as const, label: t("Комплект", "Set") },
  { value: "crafted" as const, label: t("Крафтовый", "Crafted") },
  { value: "runeword" as const, label: t("Рунное слово", "Runeword") },
]);
const canEditQuality = computed(
  () =>
    !!selectedBase.value &&
    selectedBase.value.code !== "box" &&
    !isTome(selectedBase.value.code) &&
    !stashSupplies[selectedBase.value.code] &&
    selectedBase.value.category !== "rpot" &&
    (isCharm.value
      ? ["normal", "magic", "unique"].includes(item.value.quality)
      : ["normal", "magic", "rare"].includes(item.value.quality))
);
const editableQualities = computed(() =>
  qualityOptions.value.filter((q) =>
    isCharm.value
      ? q.value === "magic" || (q.value === "unique" && uniqueCharms.value.length > 0)
      : q.value === "normal" ||
        q.value === "magic" ||
        (q.value === "rare" && canBeRare(item.value.baseCode ?? ""))
  )
);
const affixNotice = ref("");
function updateAffixes(value: PlannerAffix[]) {
  item.value.affixes = value;
  item.value.sockets = Math.max(item.value.sockets ?? 0, affixSockets(item.value));
}
function reconcileAffixes() {
  const previous = item.value.affixes ?? [];
  const next = retainCompatibleAffixes(item.value);
  if (next.length !== previous.length) {
    affixNotice.value = t(
      "Несовместимые свойства удалены после изменения основы, качества или уровня.",
      "Incompatible mods were removed after changing the base, quality or item level."
    );
    updateAffixes(next);
  }
}
function changeQuality(value: string) {
  if (
    value === item.value.quality ||
    !editableQualities.value.some((q) => q.value === value)
  )
    return;
  if (isCharm.value) {
    const entry =
      value === "unique"
        ? (uniqueCharms.value.find((entry) =>
            entry.bases.includes(item.value.baseCode ?? "")
          ) ?? uniqueCharms.value[0])
        : catalog.value?.items.find(
            (entry) => entry.id === "base:" + charmFamily(item.value.baseCode ?? "")
          );
    if (entry) chooseCharm(entry);
    return;
  }
  item.value.quality = value as PlannerItem["quality"];
  reconcileAffixes();
}
function chooseCharm(entry: CatalogItem) {
  const { itemLevel, notes } = item.value;
  chooseCatalogItem(entry);
  item.value.itemLevel = itemLevel ?? 99;
  item.value.notes = notes;
}
function changeUniqueCharm(id: string) {
  const entry = uniqueCharms.value.find((entry) => entry.catalogId === id);
  if (entry && id !== item.value.catalogId) chooseCharm(entry);
}
watch(
  () => item.value.itemLevel,
  (value) => {
    if (Number.isInteger(value) && value! >= 1 && value! <= 99) reconcileAffixes();
  }
);
const matchingWords = computed(() =>
  words.sortedRunewords
    .filter(
      (word) =>
        props.allowedTypes.some((type) =>
          type === 16 ? word.types?.includes(16) : matchesItemType(word.types ?? [], type)
        ) &&
        (!props.characterClass ||
          (word.types ?? []).some(
            (type) =>
              !restrictedTypes[type] || restrictedTypes[type] === props.characterClass
          ))
    )
    .sort((a, b) => a.name.en.localeCompare(b.name.en))
);
const restrictedTypes: Partial<Record<number, ClassId>> = {
  8: "assassin",
  19: "assassin",
  20: "paladin",
  21: "necromancer",
  22: "sorceress",
  23: "druid",
  24: "warlock",
};
const selectedWord = computed(() => itemRuneword(item.value, words.sortedRunewords));
const templates = computed(() =>
  selectedWord.value ? runewordTemplates(selectedWord.value.name.en) : []
);
function applyTemplate(roll: 0 | 1) {
  const template =
    templates.value.find((entry) => entry.kind === item.value.baseKind) ??
    templates.value[0];
  if (template) {
    item.value.baseKind = template.kind;
    Object.assign(item.value, runewordBonuses(template, roll));
  }
}
function chooseWord(word: RunewordTableItem) {
  item.value = {
    name: word.name[lang.value],
    quality: "runeword",
    runewordId: word.id,
    requiredLevel: word.level,
    notes: "",
    bonuses: {},
    baseKind:
      runewordTemplates(word.name.en).find((entry) => entry.kind === props.preferredKind)
        ?.kind ?? runewordTemplates(word.name.en)[0]?.kind,
  };
  applyTemplate(0);
  item.value.itemLevel = 99;
  item.value.sockets = word.runes.length;
}
const selectedCatalog = computed(() =>
  catalog.value?.items.find((entry) =>
    item.value.craftId
      ? entry.craftId === item.value.craftId
      : item.value.catalogId
        ? entry.catalogId === item.value.catalogId && entry.quality === item.value.quality
        : item.value.runewordId
          ? entry.word?.id === item.value.runewordId
          : item.value.quality === "normal" && entry.id === "base:" + item.value.baseCode
  )
);
const selectedCraft = computed(() => craftById.get(item.value.craftId ?? ""));
const selectedRecipe = computed(() =>
  cubeCatalog.recipes.find((recipe) => recipe.key === item.value.craftId)
);
const preferredCraftAffixes = computed(() =>
  (craftVariant(item.value)?.preferredAffixes ?? [])
    .map((id) => affixById.get(id)?.name)
    .filter(Boolean)
);
const craftAffixesComplete = computed(
  () =>
    !item.value.craftId ||
    (item.value.affixes?.length ?? 0) >= craftAffixMinimum(item.value.itemLevel ?? 99)
);
const canToggleCraftEthereal = computed(
  () =>
    !!selectedCraft.value?.variants.some(
      (variant) =>
        variant.ethereal !== !!item.value.ethereal &&
        variant.bases.includes(item.value.baseCode ?? "")
    )
);
watch(
  () => item.value.ethereal,
  (value, previous) => {
    if (!!value === !!previous) return;
    if (!selectedCraft.value || !native.value) return;
    if (!craftVariant(item.value)) {
      item.value.ethereal = previous;
      return;
    }
    delete item.value.propertyValues;
    delete item.value.propertyChoices;
    Object.assign(item.value, native.value.itemBonuses(item.value, store.build.classId));
  }
);
const selectedBase = computed(() => catalog.value?.bases.get(item.value.baseCode ?? ""));
const isCharm = computed(() => selectedBase.value?.category === "char");
watch(
  () => item.value.baseCode,
  (code) => {
    if (isTome(code)) item.value.quantity ??= 20;
    else delete item.value.quantity;
  },
  { immediate: true }
);
const charmFamily = (code: string) =>
  ["cm3", "cm4", "cs2"].includes(code) ? "cm3" : code;
const uniqueCharms = computed(() =>
  isCharm.value
    ? (catalog.value?.items.filter(
        (entry) =>
          entry.quality === "unique" &&
          entry.bases.some((code) => {
            const base = catalog.value?.bases.get(code);
            return (
              base?.category === "char" &&
              charmFamily(code) === charmFamily(item.value.baseCode ?? "")
            );
          })
      ) ?? [])
    : []
);
watch(
  () => [selectedBase.value?.category, item.value.quality] as const,
  ([category, quality]) => {
    if (category === "char" && quality === "normal") item.value.quality = "magic";
  },
  { immediate: true }
);
const selectedImage = computed(() =>
  plannerItemImage(item.value, selectedBase.value?.tier)
);
const maxSockets = computed(() =>
  Math.min(
    6,
    Math.max(
      item.value.quality === "crafted"
        ? Math.min(
            selectedBase.value?.maxSockets ?? 0,
            Math.max(1, affixSockets(item.value))
          )
        : (selectedBase.value?.maxSockets ?? 0),
      native.value &&
        item.value.catalogId &&
        (item.value.quality === "unique" || item.value.quality === "set")
        ? native.value.catalogBonuses(item.value.catalogId, item.value.quality, 1).sockets
        : 0
    )
  )
);
const baseOptions = computed(() =>
  [...(catalog.value?.bases.values() ?? [])]
    .filter((base) =>
      selectedCatalog.value
        ? selectedCatalog.value.bases.includes(base.code)
        : catalog.value?.availableBases.has(base.code)
    )
    .filter((base) => !props.charmMode || props.allowedHeights.includes(base.height))
    .map((base) => ({ value: base.code, label: base.name }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"))
);
const referenceLines = computed(() =>
  native.value && selectedCatalog.value
    ? catalogPropertyLines(
        native.value,
        selectedCatalog.value,
        roll.value,
        store.build.level
      ).map((line) =>
        line.startsWith("Socketed (") ? `Socketed (${item.value.sockets ?? 0})` : line
      )
    : []
);
const setBonuses = computed(() =>
  native.value && item.value.quality === "set" && item.value.catalogId
    ? catalogSetBonuses(native.value, item.value.catalogId, roll.value, store.build.level)
    : undefined
);
const socketCount = computed(() =>
  Math.max(0, Math.min(6, Math.floor(Number(item.value.sockets) || 0)))
);
watch(
  () => item.value.sockets,
  (count) => {
    if (Number.isInteger(count) && count! >= 0 && item.value.socketedItems)
      item.value.socketedItems = item.value.socketedItems.slice(0, count);
    if (Number.isInteger(count) && count! >= 0 && item.value.socketPropertyValues)
      item.value.socketPropertyValues = Object.fromEntries(
        Object.entries(item.value.socketPropertyValues).filter(
          ([index]) => Number(index) < count!
        )
      );
  }
);
const activeBonuses = computed(() =>
  bonusFields.filter((field) => item.value.bonuses[field.key])
);
const existingItems = computed(() =>
  [
    ...Object.values(store.build.equipment),
    ...store.build.stash,
    ...store.build.charms,
    ...Object.values(store.build.mercenary.equipment),
  ]
    .filter((entry): entry is PlannerItem => !!entry)
    .map((entry, index): CatalogItem => ({
      id: "existing:" + index,
      name: entry.name,
      quality: entry.quality,
      level: itemRequiredLevel(entry),
      bases: entry.baseCode
        ? [entry.baseCode]
        : (catalog.value?.items.find(
            (row) =>
              (entry.runewordId && row.word?.id === entry.runewordId) ||
              row.name.toLocaleLowerCase() === entry.name.toLocaleLowerCase()
          )?.bases ?? []),
      existing: entry,
    }))
    .filter((entry) =>
      entry.bases.some((code) => catalog.value?.availableBases.has(code))
    )
);
async function loadCatalog() {
  loadError.value = "";
  try {
    const module = await import("@/utils/planner-game-save");
    native.value = await module.loadGameSaveExporter();
    catalog.value = createItemCatalog(
      native.value,
      store.build,
      { key: "editor", owner: props.owner, slot: props.itemSlot, height: height.value },
      matchingWords.value
    );
    if (props.initial && !item.value.baseCode) {
      const choice = native.value.defaultChoice(
        {
          key: "editor",
          owner: props.owner,
          slot: props.itemSlot,
          height: height.value,
          item: item.value,
        },
        store.build
      );
      const entry = catalog.value.items.find(
        (row) => row.catalogId === choice || row.id === "base:" + choice
      );
      if (entry) {
        item.value.baseCode = entry.bases[0];
        item.value.catalogId = entry.catalogId;
      }
    }
    if (selectedWord.value) item.value.sockets = selectedWord.value.runes.length;
    else
      item.value.sockets ??=
        item.value.catalogId &&
        (item.value.quality === "unique" || item.value.quality === "set")
          ? native.value.catalogBonuses(
              item.value.catalogId,
              item.value.quality,
              roll.value
            ).sockets
          : 0;
  } catch {
    loadError.value = t(
      "Не удалось загрузить каталог предметов.",
      "Could not load the item catalog."
    );
  }
}
function changeBase(code: string) {
  const base = catalog.value?.bases.get(code);
  if (!base) return;
  if (selectedCraft.value) {
    const variant =
      selectedCraft.value.variants.find(
        (row) => row.ethereal === !!item.value.ethereal && row.bases.includes(code)
      ) ?? selectedCraft.value.variants.find((row) => row.bases.includes(code));
    if (!variant) return;
    item.value.ethereal = variant.ethereal;
    delete item.value.propertyValues;
    delete item.value.propertyChoices;
  }
  item.value.baseCode = code;
  item.value.baseKind = base.kind;
  if (props.charmMode) height.value = base.height;
  if (item.value.quality === "normal" || editableQuality(item.value.quality)) {
    item.value.name = selectedCraft.value?.name.en ?? base.name;
    item.value.requiredLevel = base.level;
  }
  if (item.value.quality === "runeword") {
    applyTemplate(roll.value);
    item.value.requiredLevel = Math.max(selectedWord.value?.level ?? 1, base.level);
  } else item.value.sockets = Math.min(item.value.sockets ?? 0, maxSockets.value);
  reconcileAffixes();
  if ((item.value.propertyValues || selectedCraft.value) && native.value)
    Object.assign(item.value, native.value.itemBonuses(item.value, store.build.classId));
}
function setPropertyValues(values: Record<string, number>) {
  item.value.propertyValues = values;
  Object.assign(item.value, native.value!.itemBonuses(item.value, store.build.classId));
}
function setPropertyChoices(choices: Record<string, number>) {
  for (const [index, choice] of Object.entries(choices))
    if (item.value.propertyChoices?.[index] !== choice)
      delete item.value.propertyValues?.[index];
  item.value.propertyChoices = choices;
  Object.assign(item.value, native.value!.itemBonuses(item.value, store.build.classId));
}
function setSkillClass(value: ClassId) {
  item.value.skillClass = value;
  Object.assign(item.value, native.value!.itemBonuses(item.value, store.build.classId));
}
function setRoll(value: 0 | 1) {
  roll.value = value;
  item.value.propertyRoll = value;
  delete item.value.propertyValues;
  if (selectedWord.value) applyTemplate(value);
  else if (selectedCraft.value && native.value)
    Object.assign(item.value, native.value.itemBonuses(item.value, store.build.classId));
  else if (
    native.value &&
    item.value.catalogId &&
    (item.value.quality === "unique" || item.value.quality === "set")
  ) {
    if (isClassCharm(item.value)) normalizeClassCharm(item.value, store.build.classId);
    Object.assign(
      item.value,
      native.value.catalogBonuses(
        item.value.catalogId,
        item.value.quality,
        value,
        {},
        item.value.skillClass ?? store.build.classId,
        item.value.propertyChoices
      )
    );
  }
}
function chooseCatalogItem(entry: CatalogItem) {
  affixNotice.value = "";
  if (entry.existing) {
    item.value = JSON.parse(JSON.stringify(entry.existing));
    roll.value = item.value.propertyRoll ?? 0;
  } else if (entry.word) chooseWord(entry.word);
  else if (entry.craftId && native.value)
    item.value = createCraftedItem(
      native.value,
      entry.craftId,
      [...entry.bases].sort(
        (a, b) =>
          (catalog.value?.bases.get(a)?.level ?? 0) -
          (catalog.value?.bases.get(b)?.level ?? 0)
      )[0],
      store.build.level,
      store.build.classId
    );
  else
    item.value = {
      name: entry.name,
      quality: entry.quality,
      catalogId: entry.catalogId,
      requiredLevel: entry.level,
      itemLevel: 99,
      bonuses: {},
      notes: "",
      sockets: 0,
    };
  if (!entry.existing) {
    const orderedBases = [...entry.bases].sort(
      (a, b) =>
        (catalog.value?.bases.get(a)?.level ?? 0) -
        (catalog.value?.bases.get(b)?.level ?? 0)
    );
    const base =
      orderedBases.find(
        (code) => catalog.value?.bases.get(code)?.kind === props.preferredKind
      ) ?? orderedBases[0];
    changeBase(base);
    setRoll(0);
  }
  item.value.itemLevel ??= 99;
  if (props.charmMode && selectedBase.value) height.value = selectedBase.value.height;
  tab.value = "edit";
}
onMounted(loadCatalog);
function save() {
  if (!item.value.name.trim() || !inventoryFits.value || !craftAffixesComplete.value)
    return;
  emit(
    "save",
    parsePlannerItem({ ...item.value, name: item.value.name.trim() }),
    height.value
  );
}
</script>
