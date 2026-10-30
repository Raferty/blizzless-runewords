<template>
  <Teleport to="body">
    <div
      :id="id"
      ref="tooltip"
      role="tooltip"
      class="planner-item-tooltip"
      :class="{ 'planner-item-tooltip--overlap': overlap }"
      :style="position"
      @pointerenter="$emit('pointerenter')"
      @pointerleave="$emit('pointerleave')"
    >
      <h3 :data-quality="item.quality">{{ word?.name[lang] || item.name }}</h3>
      <p v-if="baseName && baseName !== item.name" class="planner-item-tooltip-base">
        {{ baseName }}
      </p>
      <p v-if="word" class="planner-item-tooltip-rune-order">
        ‘{{ runes.map((rune) => rune?.name[lang]).join(" · ") }}’
      </p>
      <p>{{ t("Требуемый уровень", "Required level") }}: {{ itemRequiredLevel(item) }}</p>
      <p v-if="item.ethereal">{{ t("Эфирный", "Ethereal") }}</p>
      <div v-if="word" class="planner-item-tooltip-properties">
        <RunewordStats :lines="wordLines" />
      </div>
      <ul v-else class="planner-item-tooltip-properties">
        <li v-for="(line, index) in properties" :key="index">{{ line }}</li>
      </ul>
      <PlannerSetBonuses :bonuses="setBonuses" />
      <div v-if="runes.length" class="planner-item-tooltip-sockets">
        <p>{{ t("Сокеты", "Socketed") }} ({{ runes.length }})</p>
        <div>
          <span v-for="(rune, index) in runes" :key="index">
            <img v-if="rune" :src="baseUrl + rune.image_url.slice(1)" alt="" />
            <i v-else aria-hidden="true" />
            {{ rune?.name[lang] || t("Пустой", "Empty") }}
          </span>
        </div>
        <template v-if="!word && native">
          <template v-for="(code, index) in item.socketedItems" :key="index">
            <div v-if="code" class="planner-insert-tooltip-properties">
              <p>{{ runes[index]?.name[lang] }}</p>
              <ul>
                <li
                  v-for="line in socketPropertyLines(
                    native,
                    code,
                    socketCategory(item),
                    store.build.level,
                    item.socketPropertyValues?.[index]
                  )"
                  :key="line"
                >
                  {{ line }}
                </li>
              </ul>
            </div>
          </template>
        </template>
      </div>
      <p v-if="item.notes" class="planner-item-tooltip-notes">{{ item.notes }}</p>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  type CSSProperties,
} from "vue";
import RunewordStats from "@/components/RunewordStats.vue";
import PlannerSetBonuses from "./PlannerSetBonuses.vue";
import { useInfoStore, useRunewordsStore } from "@/store";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
import { isContainerBase, plannerItemIdentity } from "@/utils/planner-item-art";
import {
  itemBonusLines,
  itemRuneword,
  itemRunewordLines,
  itemSockets,
} from "@/utils/planner-item-presentation";
import {
  definitionPropertyLines,
  catalogPropertyLines,
  catalogSetBonuses,
  socketPropertyLines,
  itemPropertyLines,
} from "@/utils/planner-item-catalog";
import { affixById, affixDefinition } from "@/utils/planner-affixes";
import { itemRequiredLevel, socketCategory } from "@/utils/planner-sockets";
import type { GameSaveExporter } from "@/utils/planner-game-save";
import type { PlannerItem } from "@/types/planner";
import { itemSkillClass } from "@/utils/planner-properties";

const props = defineProps<{
  id: string;
  item: PlannerItem;
  anchor: { left: number; right: number; top: number; bottom: number };
}>();
defineEmits<{ pointerenter: []; pointerleave: [] }>();
const info = useInfoStore();
const words = useRunewordsStore();
const store = usePlannerStore();
const t = useText();
const lang = computed(() => info.currentLang);
const native = shallowRef<GameSaveExporter>();
const identity = computed(() => plannerItemIdentity(props.item));
const baseName = computed(() => {
  if (isContainerBase(identity.value.baseCode)) return "";
  const base = native.value?.gd.items[identity.value.baseCode || ""];
  return base ? native.value?.gd.locale.strings[base.namestr] || base.name : "";
});
const word = computed(() => itemRuneword(props.item, words.sortedRunewords));
const runes = computed(() => itemSockets(props.item, words.sortedRunewords));
const wordLines = computed(() =>
  native.value && props.item.propertyValues
    ? itemPropertyLines(native.value, props.item, store.build.level, store.build.classId)
    : word.value
      ? itemRunewordLines(
          word.value,
          props.item.baseKind,
          lang.value,
          props.item.propertyRoll ?? 1,
          store.build.level
        )
      : []
);
const properties = computed(() => {
  const { catalogId } = identity.value;
  if (native.value && props.item.containerQuantity !== undefined)
    return itemPropertyLines(
      native.value,
      props.item,
      store.build.level,
      store.build.classId
    );
  if (
    native.value &&
    catalogId &&
    (props.item.quality === "unique" || props.item.quality === "set")
  ) {
    const definitions =
      props.item.quality === "unique"
        ? native.value.gd.uniqueItems
        : native.value.gd.setItems;
    if (definitions[catalogId])
      return catalogPropertyLines(
        native.value,
        {
          id: catalogId,
          catalogId,
          name: props.item.name,
          quality: props.item.quality,
          level: props.item.requiredLevel,
          bases: [],
        },
        props.item.propertyRoll ?? 1,
        store.build.level,
        props.item.propertyValues,
        itemSkillClass(props.item, store.build.classId),
        props.item.propertyChoices
      ).filter((line) => !line.startsWith("Socketed ("));
  }
  return [
    ...itemBonusLines(props.item, lang.value),
    ...(props.item.affixes ?? []).flatMap((row) => {
      const affix = affixById.get(row.id);
      return native.value && affix
        ? definitionPropertyLines(
            native.value,
            affixDefinition(affix, row.values),
            1,
            store.build.level
          )
        : [];
    }),
  ];
});
const setBonuses = computed(() =>
  native.value && props.item.quality === "set" && identity.value.catalogId
    ? catalogSetBonuses(
        native.value,
        identity.value.catalogId,
        props.item.propertyRoll ?? 1,
        store.build.level
      )
    : undefined
);
const baseUrl = import.meta.env.BASE_URL;
const tooltip = ref<HTMLElement>();
const overlap = ref(false);
const position = ref<CSSProperties>({ left: "12px", top: "12px", visibility: "hidden" });
function place() {
  if (!tooltip.value) return;
  const { width, height } = tooltip.value.getBoundingClientRect();
  const margin = 10;
  let left = props.anchor.right + margin;
  if (left + width > innerWidth - margin) left = props.anchor.left - width - margin;
  left = Math.max(margin, Math.min(left, innerWidth - width - margin));
  let top = Math.max(margin, Math.min(props.anchor.top, innerHeight - height - margin));
  if (left < props.anchor.right && left + width > props.anchor.left) {
    if (props.anchor.bottom + margin + height <= innerHeight - margin)
      top = props.anchor.bottom + margin;
    else if (props.anchor.top - height - margin >= margin)
      top = props.anchor.top - height - margin;
  }
  overlap.value =
    left < props.anchor.right &&
    left + width > props.anchor.left &&
    top < props.anchor.bottom &&
    top + height > props.anchor.top;
  position.value = {
    left: `${left}px`,
    top: `${top}px`,
    visibility: "visible",
  };
}
let observer: ResizeObserver;
let disposed = false;
onMounted(async () => {
  observer = new ResizeObserver(place);
  if (tooltip.value) observer.observe(tooltip.value);
  place();
  try {
    const module = await import("@/utils/planner-game-save");
    const value = await module.loadGameSaveExporter();
    if (!disposed) native.value = value;
  } catch {
    // The saved bonuses and bundled runeword description remain available.
  }
});
onBeforeUnmount(() => {
  disposed = true;
  observer?.disconnect();
});
</script>
