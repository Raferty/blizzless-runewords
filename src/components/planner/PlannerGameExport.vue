<template>
  <UiModal
    :model-value="true"
    closable
    :label="t('Экспорт персонажа', 'Export character')"
    @close="$emit('close')"
  >
    <form class="planner-editor planner-game-export" @submit.prevent="download">
      <div class="planner-modal-heading">
        <h2>{{ t("Экспорт персонажа", "Export character") }}</h2>
        <button type="button" :aria-label="t('Закрыть', 'Close')" @click="$emit('close')">
          ×
        </button>
      </div>
      <p class="planner-help">
        {{
          t(
            "Игровое сохранение .d2s для офлайн Blizzless 1.3.2 (v105).",
            "Game save .d2s for offline Blizzless 1.3.2 (v105)."
          )
        }}
      </p>
      <label class="planner-label"
        >{{ t("Имя персонажа в игре", "In-game character name") }}
        <input
          v-model="name"
          type="text"
          maxlength="15"
          required
          pattern="[A-Za-z][A-Za-z_-]{1,14}"
        />
        <small>{{
          t(
            "2–15 латинских букв; допускается один дефис или знак подчёркивания.",
            "2–15 Latin letters; one hyphen or underscore is allowed."
          )
        }}</small>
      </label>
      <p v-if="loading" role="status" class="planner-help">
        {{ t("Загружаю игровые данные…", "Loading game data…") }}
      </p>
      <template v-else-if="native">
        <p v-if="rows.length" class="planner-help">
          {{
            t(
              "Выберите игровые основы предметов. Для уникальных и комплектных вещей выберите точный предмет из игры.",
              "Choose item bases. For unique and set items, choose the exact in-game item."
            )
          }}
        </p>
        <div class="planner-game-export-items">
          <div v-for="row in rows" :key="row.entry.key" class="planner-game-export-item">
            <label class="planner-label">
              <span>{{ location(row.entry) }} · {{ row.entry.item.name }}</span>
              <UiSelect
                v-model="choices[row.entry.key]"
                dropdown-class="planner-select-dropdown"
                :options="row.options"
                :placeholder="t('Выберите основу или предмет', 'Choose base or item')"
                :aria-label="`${t('Игровой предмет', 'Game item')}: ${row.entry.item.name}`"
              />
            </label>
            <label
              v-if="['runeword', 'unique', 'set'].includes(row.entry.item.quality)"
              class="planner-label"
            >
              {{ t("Свойства предмета", "Item properties") }}
              <UiSelect
                dropdown-class="planner-select-dropdown"
                :model-value="String(rolls[row.entry.key] ?? 'planned')"
                :options="[
                  { value: 'planned', label: t('Из планнера', 'From planner') },
                  { value: '0', label: t('Минимальный ролл', 'Minimum roll') },
                  { value: '1', label: t('Максимальный ролл', 'Maximum roll') },
                ]"
                :aria-label="`${t('Ролл', 'Roll')}: ${row.entry.item.name}`"
                @update:model-value="
                  rolls[row.entry.key] =
                    $event === 'planned' ? 'planned' : $event === '0' ? 0 : 1
                "
              />
            </label>
            <p v-if="!row.options.length" class="planner-error">
              {{
                t(
                  "Для этого предмета нет подходящей основы. Проверьте тип и ячейку экипировки.",
                  "No compatible base. Check the item type and equipment slot."
                )
              }}
            </p>
          </div>
        </div>
      </template>
      <details v-if="native" class="planner-game-export-details">
        <summary>
          {{ t("Что переносится и как загрузить", "What's included and how to load") }}
        </summary>
        <p class="planner-help">
          {{
            t(
              "Сохраняются уровень, навыки, характеристики, золото, награды заданий, экипировка, талисманы и наёмник. Режим «Из планнера» сохраняет введённые бонусы; остальные игровые свойства используют ролл, выбранный в редакторе предмета (для старых сборок — максимальный). Можно отдельно выбрать полный минимальный или максимальный ролл. Произвольные названия обычных, магических и редких вещей в игре заменяются названиями основы или аффиксов.",
              "Includes level, skills, attributes, gold, quest rewards, gear, charms and mercenary. From planner preserves entered bonuses; other game properties use the roll selected in the item editor (maximum for older builds). Full minimum and maximum presets are also available. Custom normal, magic and rare item names are replaced with game base or affix names."
            )
          }}
        </p>
        <p class="planner-help">
          {{
            t(
              "Это персонаж для проверки сборки: все сложности и акты открыты, вейпоинты — по выбору во вкладке «Вейпоинты». Заметки и описание сборки остаются в JSON.",
              "This is a build-testing character: all difficulties and acts are unlocked. Waypoints follow your selections in the Waypoints tab. Build notes and descriptions remain in JSON."
            )
          }}
        </p>
        <p class="planner-help">
          {{
            t(
              "Поместите .d2s в папку офлайн-сохранений Blizzless. Файлы карты (.map), клавиатуры (.key) и контроллера (.ctl) игра создаёт сама.",
              "Place the .d2s in your Blizzless offline save folder. The game creates map (.map), keyboard (.key), and controller (.ctl) files."
            )
          }}
        </p>
      </details>
      <p v-if="error" class="planner-error" role="alert">{{ error }}</p>
      <p v-if="downloaded" role="status">
        {{ t("Сохранён файл", "Saved file") }} {{ downloaded }}
      </p>
      <div class="planner-modal-actions">
        <button type="button" @click="$emit('backup')">
          {{ t("Резервная копия JSON", "JSON backup") }}
        </button>
        <button v-if="!native && !loading" type="button" @click="load">
          {{ t("Повторить", "Retry") }}
        </button>
        <button type="submit" class="planner-primary" :disabled="!ready">
          {{ t("Скачать .d2s", "Download .d2s") }}
        </button>
      </div>
    </form>
  </UiModal>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from "vue";
import UiModal from "@/components/ui/UiModal.vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import { useText } from "@/composables/useText";
import { usePlannerStore } from "@/store/planner";
import { equipmentSlots, plannerClasses } from "@/shared/planner";
import {
  GameSaveError,
  gameSaveEntries,
  loadGameSaveExporter,
  validCharacterName,
  type GameSaveEntry,
  type GameSaveExporter,
  type GameSaveRoll,
} from "@/utils/planner-game-save";
defineEmits<{ close: []; backup: [] }>();
const store = usePlannerStore();
const t = useText();
const name = ref(
  validCharacterName(store.build.name)
    ? store.build.name
    : plannerClasses.find((c) => c.id === store.build.classId)!.name.en
);
const choices = ref<Record<string, string>>({});
const rolls = ref<Record<string, GameSaveRoll>>({});
const native = shallowRef<GameSaveExporter>();
const loading = ref(false),
  writing = ref(false),
  error = ref(""),
  downloaded = ref("");
const rows = computed(() =>
  native.value
    ? gameSaveEntries(store.build).map((entry) => ({
        entry,
        options: native.value!.choices(entry, store.build),
      }))
    : []
);
const ready = computed(
  () =>
    native.value &&
    !writing.value &&
    validCharacterName(name.value) &&
    rows.value.every((row) =>
      row.options.some((option) => option.value === choices.value[row.entry.key])
    )
);
function location(entry: GameSaveEntry) {
  const owner =
    entry.owner === "mercenary"
      ? t("Наёмник", "Mercenary")
      : entry.owner === "stash"
        ? t("Сундук", "Stash")
        : entry.owner === "charm"
          ? t("Талисман", "Charm")
          : "";
  const slot = equipmentSlots.find((s) => s.key === entry.slot);
  return [owner, slot ? t(slot.ru, slot.en) : ""].filter(Boolean).join(" · ");
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    native.value = await loadGameSaveExporter();
    for (const row of rows.value)
      choices.value[row.entry.key] = native.value.defaultChoice(row.entry, store.build);
  } catch {
    error.value = t(
      "Не удалось загрузить игровые данные для экспорта.",
      "Could not load game data for export."
    );
  } finally {
    loading.value = false;
  }
}
async function download() {
  if (!ready.value) return;
  writing.value = true;
  error.value = "";
  try {
    const characterName = name.value;
    const bytes = await native.value!.exportCharacter(store.build, {
      name: characterName,
      choices: choices.value,
      rolls: rolls.value,
    });
    const url = URL.createObjectURL(
      new Blob([Uint8Array.from(bytes).buffer], { type: "application/octet-stream" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${characterName}.d2s`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    downloaded.value = link.download;
  } catch (cause) {
    const code = cause instanceof GameSaveError ? cause.code : "validation";
    const messages: Record<string, [string, string]> = {
      name: ["Проверьте имя персонажа.", "Check the character name."],
      base: [
        "Выберите подходящие основы для всех предметов.",
        "Choose compatible bases for every item.",
      ],
      statRange: [
        "Бонус не помещается в .d2s. Выберите минимальный ролл или уменьшите значение в планнере.",
        "A bonus is outside the .d2s range. Choose the minimum roll or reduce its value in the planner.",
      ],
      property: [
        "Этот предмет использует свойство, которое пока нельзя записать в .d2s.",
        "This item uses a property that cannot yet be written to .d2s.",
      ],
      mercenary: [
        "Проверьте тип, уровень и экипировку наёмника.",
        "Check mercenary type, level and gear.",
      ],
      stash: [
        "Все запасные предметы не помещаются в игровой сундук.",
        "Spare items do not fit in the game stash.",
      ],
      validation: [
        "Не удалось проверить игровой файл. Экспорт отменён; сборку можно сохранить в JSON.",
        "Could not validate the game file. Export was cancelled; you can save a JSON backup.",
      ],
    };
    error.value = t(...(messages[code] ?? messages.validation));
  } finally {
    writing.value = false;
  }
}
onMounted(load);
</script>
