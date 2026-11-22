<template>
  <section v-if="automods.length" class="planner-item-properties">
    <h3>{{ t("Автомод основы", "Auto Mod") }}</h3>
    <div class="mod-row" :class="{ 'mod-row--selected': automod }">
      <UiSelect
        dropdown-class="planner-select-dropdown"
        :aria-label="t('Свойство автомода', 'Auto Mod')"
        :model-value="selectedAutomod?.key ?? ''"
        :options="[
          { value: '', label: t('Без бонуса', 'None') },
          ...automods.map(({ key, label }) => ({ value: key, label })),
        ]"
        @update:model-value="selectAutomod"
      />
      <div v-if="automod" class="mod-lines">
        <label v-for="code in automodProperties" :key="code">
          {{ propertyName(code) }} +
          <input
            type="number"
            required
            :aria-label="propertyName(code)"
            :value="currentValue(automod, item.automod, code)"
            :min="valueOptions(selectedAutomod!.rows, code)[0]?.value"
            :max="valueOptions(selectedAutomod!.rows, code).at(-1)?.value"
            @change="editRoll($event, 'automod', code, automod)"
          />{{ code.endsWith("%") ? "%" : "" }}
        </label>
        <span v-for="line in fixedAutomodLines" :key="line">{{ line }}</span>
      </div>
    </div>
  </section>
  <section v-if="superiorRows.length" class="planner-item-properties">
    <h3>{{ t("Бонус Superior", "Superior Mod") }}</h3>
    <div v-for="bonus in superiorBonuses" :key="bonus.code" class="superior-bonus">
      <label>
        <input
          type="checkbox"
          :checked="bonus.selected"
          :disabled="!bonus.next && !bonus.canClear"
          @change="apply('superiorMod', bonus.next)"
        />
        {{ propertyName(bonus.code) }}
      </label>
      <label v-if="bonus.selected && superior">
        +<input
          type="number"
          required
          :aria-label="propertyName(bonus.code)"
          :value="currentValue(superior, item.superiorMod, bonus.code)"
          :min="bonus.range.min"
          :max="bonus.range.max"
          @change="editRoll($event, 'superiorMod', bonus.code, superior)"
        />{{ bonus.code.endsWith("%") ? "%" : "" }}
      </label>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed } from "vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import { useText } from "@/composables/useText";
import { definitionPropertyLines } from "@/utils/planner-item-catalog";
import type { PlannerAffix, PlannerItem } from "@/types/planner";
import type { GameSaveExporter } from "@/utils/planner-game-save";

type Row = ReturnType<GameSaveExporter["baseModifierOptions"]>[number];
type Field = "automod" | "superiorMod";
const props = defineProps<{
  item: PlannerItem;
  native: GameSaveExporter;
  characterLevel: number;
}>();
const emit = defineEmits<{ update: [Field, PlannerAffix | undefined] }>();
const t = useText();
const property = (row: Row | undefined, index: number) =>
  String(row?.definition[`prop${index + 1}`] ?? "");
const codes = (row: Row) => row.ranges.map((_, i) => property(row, i)).filter(Boolean);
const propertyIndex = (row: Row, code: string) =>
  row.ranges.findIndex((_, index) => property(row, index) === code);
const propertyNames: Record<string, [string, string]> = {
  "res-all": ["Все сопротивления", "All Resistances"],
  att: ["Рейтинг атаки", "Attack Rating"],
  "dmg%": ["Повышенный урон", "Enhanced Damage"],
  "ac%": ["Повышенная защита", "Enhanced Defense"],
  "dur%": ["Максимальная прочность", "Maximum Durability"],
  hp: ["Здоровье", "Life"],
  mana: ["Мана", "Mana"],
};
const propertyName = (code: string) => t(...(propertyNames[code] ?? [code, code]));
function currentValue(row: Row | undefined, mod: PlannerAffix | undefined, code: string) {
  return row && mod ? mod.values[propertyIndex(row, code)] : undefined;
}
function valueOptions(rows: Row[], code: string) {
  const values = new Set<number>();
  for (const row of rows) {
    const range = row.ranges[propertyIndex(row, code)];
    if (range) for (let value = range.min; value <= range.max; value++) values.add(value);
  }
  return [...values]
    .sort((a, b) => a - b)
    .map((value) => ({
      value,
      label: `+${value}${code.endsWith("%") ? "%" : ""}`,
    }));
}
function apply(field: Field, row?: Row, code?: string, value?: number) {
  const previous = props.item[field];
  const oldRow = props.native
    .baseModifierOptions(props.item, field)
    .find((option) => option.id === previous?.id);
  emit(
    "update",
    field,
    row && {
      id: row.id,
      values: row.ranges.map(({ min, max }, index) => {
        const key = property(row, index);
        const selected = key === code ? value : currentValue(oldRow, previous, key);
        return Math.max(min, Math.min(max, selected ?? max));
      }),
    }
  );
}

const automodRows = computed(() =>
  props.native.baseModifierOptions(props.item, "automod")
);
const automod = computed(() =>
  automodRows.value.find((row) => row.id === props.item.automod?.id)
);
const automods = computed(() => {
  const families = new Map<string, Row[]>();
  for (const row of automodRows.value) {
    const key = row.ranges.some(({ min, max }) => min < max)
      ? row.ranges
          .map(({ min, max }, i) =>
            [
              property(row, i),
              row.definition[`par${i + 1}`],
              min === max ? min : "*",
            ].join(":")
          )
          .join("/")
      : row.id;
    if (families.has(key)) families.get(key)!.push(row);
    else families.set(key, [row]);
  }
  return [...families].map(([key, rows]) => ({
    key,
    rows,
    label:
      key === rows[0].id
        ? definitionPropertyLines(
            props.native,
            rows[0].definition,
            1,
            props.characterLevel
          ).join(" · ") || key
        : rows[0].ranges
            .flatMap(({ min, max }, index) =>
              min < max ? [propertyName(property(rows[0], index))] : []
            )
            .join(" + "),
  }));
});
const selectedAutomod = computed(() =>
  automods.value.find(({ rows }) => rows.some((row) => row.id === automod.value?.id))
);
const automodProperties = computed(() =>
  automod.value
    ? codes(automod.value).filter(
        (code) => valueOptions(selectedAutomod.value?.rows ?? [], code).length > 1
      )
    : []
);
const fixedAutomodLines = computed(() => {
  if (!automod.value) return [];
  const definition = { ...automod.value.definition };
  for (const index of automod.value.ranges.keys()) {
    if (automodProperties.value.includes(property(automod.value, index)))
      delete definition[`prop${index + 1}`];
  }
  return definitionPropertyLines(props.native, definition, 1, props.characterLevel);
});
function selectAutomod(key: string) {
  apply("automod", automods.value.find((family) => family.key === key)?.rows.at(-1));
}
function setAutomodValue(code: string, value: number) {
  const current = automod.value;
  const fitting =
    selectedAutomod.value?.rows.filter((row) =>
      valueOptions([row], code).some((option) => option.value === value)
    ) ?? [];
  // Keep the current tier where possible. Other tiers may constrain linked rolls.
  const row = fitting.find((row) => row.id === current?.id) ?? fitting.at(-1);
  if (row) apply("automod", row, code, value);
}

const superiorRows = computed(() =>
  props.native.baseModifierOptions(props.item, "superiorMod")
);
const superior = computed(() =>
  superiorRows.value.find((row) => row.id === props.item.superiorMod?.id)
);
const superiorBonuses = computed(() => {
  const rows = superiorRows.value;
  const active = superior.value ? codes(superior.value) : [];
  return [...new Set(rows.flatMap(codes))].map((code) => {
    const selected = active.includes(code);
    const wanted = selected ? active.filter((key) => key !== code) : [...active, code];
    const next = rows.find((row) => {
      const keys = codes(row);
      return keys.length === wanted.length && wanted.every((key) => keys.includes(key));
    });
    const range = superior.value?.ranges[propertyIndex(superior.value, code)];
    return {
      code,
      selected,
      range: range ?? { min: 0, max: 0 },
      next,
      canClear: wanted.length === 0 && props.item.quality === "runeword",
    };
  });
});

function editRoll(event: Event, field: Field, code: string, row: Row) {
  const input = event.target as HTMLInputElement;
  if (
    input.value &&
    input.validity.valid &&
    (field !== "automod" ||
      valueOptions(selectedAutomod.value?.rows ?? [], code).some(
        (option) => option.value === input.valueAsNumber
      ))
  ) {
    if (field === "automod") setAutomodValue(code, input.valueAsNumber);
    else apply(field, row, code, input.valueAsNumber);
    return;
  }
  input.value = String(currentValue(row, props.item[field], code) ?? "");
}
</script>

<style scoped>
.mod-row {
  position: relative;
  display: grid;
  align-items: center;
  background: rgb(255 255 255 / 5%);
}
.mod-row > * {
  grid-area: 1 / 1;
}
.mod-row :deep(.ui-select__trigger) {
  width: 100%;
  height: 100%;
  min-height: 2.5rem;
  background: transparent;
}
.mod-row > .ui-select {
  align-self: stretch;
}
.mod-row--selected :deep(.ui-select__value) {
  opacity: 0;
}
.mod-lines {
  position: relative;
  display: grid;
  gap: 0.2rem;
  padding: 0.35rem 2.5rem 0.35rem 0.65rem;
  pointer-events: none;
}
.mod-lines label {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: baseline;
}
.superior-bonus {
  display: flex;
  gap: 1rem;
  align-items: center;
  min-height: 2.5rem;
}
.superior-bonus label {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
}
.mod-lines input,
.superior-bonus input[type="number"] {
  width: 5ch;
  min-width: 0;
  padding: 0.15rem;
  font: inherit;
  color: inherit;
  text-align: center;
  appearance: textfield;
  pointer-events: auto;
  background: #111;
  border: 1px solid #424242;
  border-radius: 3px;
}
.mod-lines input::-webkit-inner-spin-button {
  appearance: none;
}
</style>
