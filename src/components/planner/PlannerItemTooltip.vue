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
      <h3 :data-quality="item.quality">
        {{ shard?.name || word?.name[lang] || item.name }}
      </h3>
      <p
        v-if="!shard && baseName && baseName !== item.name"
        class="planner-item-tooltip-base"
      >
        {{ baseName }}
      </p>
      <p v-if="word" class="planner-item-tooltip-rune-order">
        ‘{{ runes.map((rune) => rune?.name[lang]).join(" · ") }}’
      </p>
      <p v-for="line in shard?.lines" :key="line">{{ line }}</p>
      <p v-for="line in baseLines" :key="line">{{ line }}</p>
      <p
        v-for="requirement in requirements?.attributes"
        :key="requirement.key"
        :class="{ 'planner-requirement--unmet': !requirement.met }"
      >
        {{
          requirement.key === "strength"
            ? t("Требуется сила", "Required Strength")
            : t("Требуется ловкость", "Required Dexterity")
        }}: {{ requirement.required }}
        <template v-if="!requirement.met">
          ({{ t("сейчас", "current") }}: {{ requirement.current }})</template
        >
      </p>
      <p
        v-if="!shard"
        :class="{ 'planner-requirement--unmet': requirements && !requirements.level.met }"
      >
        {{ t("Требуемый уровень", "Required level") }}:
        {{ requirements?.level.required ?? itemRequiredLevel(item) }}
      </p>
      <p v-if="item.quality === 'superior' || item.superiorMod">
        {{ t("Превосходный", "Superior") }}
      </p>
      <p v-if="item.ethereal">{{ t("Эфирный", "Ethereal") }}</p>
      <p v-if="isTome(item.baseCode)">
        {{ t("Свитков внутри", "Scrolls inside") }}: {{ item.quantity ?? 20 }} / 20
      </p>
      <div v-if="word" class="planner-item-tooltip-properties">
        <RunewordStats :lines="wordLines" />
      </div>
      <ul v-else-if="properties.length" class="planner-item-tooltip-properties">
        <li v-for="(line, index) in properties" :key="index">{{ line }}</li>
      </ul>
      <ul v-if="socketLines.length" class="planner-item-tooltip-properties">
        <li v-for="(line, index) in socketLines" :key="index">{{ line }}</li>
      </ul>
      <ul v-if="baseSkillLines.length" class="planner-item-tooltip-properties">
        <li v-for="line in baseSkillLines" :key="line">{{ line }}</li>
      </ul>
      <PlannerSetBonuses :bonuses="setBonuses" />
      <div v-if="runes.length" class="planner-item-tooltip-sockets">
        <p>{{ t("Сокеты", "Socketed") }} ({{ runes.length }})</p>
        <div :class="{ 'planner-socket-grid': squareSockets }">
          <span v-for="(rune, index) in runes" :key="index">
            <img v-if="rune" :src="baseUrl + rune.image_url.slice(1)" alt="" />
            <i v-else aria-hidden="true" />
            {{ rune?.name[lang] || t("Пустой", "Empty") }}
          </span>
        </div>
      </div>
      <p v-if="item.notes" class="planner-item-tooltip-notes">{{ item.notes }}</p>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { watch } from "vue";
import { baseSkillDefinition } from "@/utils/planner-base-skills";
import { computed, onBeforeUnmount, onMounted, ref, type CSSProperties } from "vue";
import RunewordStats from "@/components/RunewordStats.vue";
import PlannerSetBonuses from "./PlannerSetBonuses.vue";
import { useInfoStore, useRunewordsStore } from "@/store";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
import { isContainerBase, plannerItemIdentity, isTome } from "@/utils/planner-item-art";
import {
  itemBonusLines,
  itemRuneword,
  itemRunewordLines,
  worldstoneShardTooltip,
  itemSockets,
} from "@/utils/planner-item-presentation";
import {
  definitionPropertyLines,
  catalogPropertyLines,
  catalogSetBonuses,
  socketSummaryLines,
  itemPropertyLines,
} from "@/utils/planner-item-catalog";
import { affixById, affixDefinition } from "@/utils/planner-affixes";
import { itemRequiredLevel, socketCategory } from "@/utils/planner-sockets";
import { plannerItemDimensions } from "@/utils/planner-item-art";
import { usePlannerGameData } from "@/composables/usePlannerGameData";
import { plannerClasses } from "@/shared/planner";
import type { PlannerItem } from "@/types/planner";
import { itemSkillClass } from "@/utils/planner-properties";
import type { ItemRequirementStatus } from "@/utils/planner-item-requirements";

const props = defineProps<{
  id: string;
  item: PlannerItem;
  anchor: { left: number; right: number; top: number; bottom: number };
  requirements?: ItemRequirementStatus;
}>();
defineEmits<{ pointerenter: []; pointerleave: [] }>();
const info = useInfoStore();
const words = useRunewordsStore();
const store = usePlannerStore();
const t = useText();
const lang = computed(() => info.currentLang);
const native = usePlannerGameData();
const squareSockets = computed(() => {
  const size = plannerItemDimensions(props.item);
  return (
    runes.value.length === 4 &&
    socketCategory(props.item) === "weapon" &&
    size?.[0] === 2 &&
    size[1] === 3
  );
});
const identity = computed(() => plannerItemIdentity(props.item));
const shard = computed(() => worldstoneShardTooltip(identity.value.baseCode, lang.value));
const baseLines = computed(() => {
  const base = native.value?.baseCharacteristics(
    identity.value.baseCode ?? "",
    store.build.classId
  );
  if (!base || shard.value) return [];
  const lines: string[] = [];
  if (base.defense) lines.push(`${t("Базовая защита", "Base Defense")}: ${base.defense}`);
  if (base.block !== undefined)
    lines.push(`${t("Базовый шанс блока", "Base Chance to Block")}: ${base.block}%`);
  for (const [label, damage] of [
    [t("Урон Smite", "Base Smite Damage"), base.smite],
    [t("Урон ногой", "Base Kick Damage"), base.kick],
    [t("Базовый урон одной рукой", "Base One-Hand Damage"), base.oneHand],
    [t("Базовый урон двумя руками", "Base Two-Hand Damage"), base.twoHand],
    [t("Базовый урон при броске", "Base Throw Damage"), base.throwing],
  ] as const)
    if (damage) lines.push(`${label}: ${damage.join("–")}`);
  if (base.durability)
    lines.push(`${t("Базовая прочность", "Base Durability")}: ${base.durability}`);
  if (base.maxStack && !isTome(identity.value.baseCode))
    lines.push(
      `${t("Количество", "Quantity")}: ${props.item.quantity ?? 1} / ${base.maxStack}`
    );
  const restriction = plannerClasses.find((row) => row.id === base.classId);
  if (restriction)
    lines.push(
      t(`Только для класса «${restriction.name.ru}»`, `(${restriction.name.en} Only)`)
    );
  return lines;
});
const baseName = computed(() => {
  if (isContainerBase(identity.value.baseCode)) return "";
  const base = native.value?.gd.items[identity.value.baseCode || ""];
  return base ? native.value?.gd.locale.strings[base.namestr] || base.name : "";
});
const word = computed(() => itemRuneword(props.item, words.sortedRunewords));
const runes = computed(() => itemSockets(props.item, words.sortedRunewords));
const socketLines = computed(() =>
  native.value && !word.value
    ? socketSummaryLines(
        native.value,
        props.item.socketedItems ?? [],
        socketCategory(props.item),
        store.build.level,
        props.item.socketPropertyValues
      )
    : []
);
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
const baseSkillLines = computed(() => {
  if (!native.value) return [];
  const game = native.value;
  const level = store.build.level;
  return [
    ...definitionPropertyLines(game, baseSkillDefinition(props.item), 1, level),
    ...(["automod", "superiorMod"] as const).flatMap((field) => {
      const mod = props.item[field];
      if (!mod) return [];
      const option = game
        .baseModifierOptions(props.item, field)
        .find((row) => row.id === mod.id);
      if (!option) return [];
      const values = Object.fromEntries(
        option.ranges.flatMap(({ min, max }, i) =>
          min < max ? [[i + 1, mod.values[i]]] : []
        )
      );
      return definitionPropertyLines(game, option.definition, 1, level, values);
    }),
  ];
});
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
    ...(native.value && props.item.craftId
      ? itemPropertyLines(
          native.value,
          props.item,
          store.build.level,
          store.build.classId
        )
      : itemBonusLines(props.item, lang.value)),
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
watch(() => props.anchor, place, { flush: "post" });
let observer: ResizeObserver;
onMounted(() => {
  observer = new ResizeObserver(place);
  if (tooltip.value) observer.observe(tooltip.value);
  place();
});
onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>
