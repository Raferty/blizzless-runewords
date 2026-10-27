<template>
  <main class="planner-page">
    <h2 class="sr-only">{{ t("Планнер персонажа", "Character planner") }}</h2>
    <section class="planner-build-bar">
      <PlannerClassSelect />
      <label class="planner-level"
        >{{ t("Уровень", "Level")
        }}<input
          :value="store.build.level"
          type="number"
          min="1"
          max="99"
          @change="setLevel"
      /></label>
      <label class="planner-check"
        ><input v-model="store.build.hardcore" type="checkbox" /> Hardcore</label
      >
      <div class="planner-build-actions">
        <div class="planner-build-presets">
          <label class="planner-build-name"
            ><input
              v-model="store.build.name"
              type="text"
              maxlength="100"
              :placeholder="t('Название сборки', 'Build name')"
              :aria-label="t('Название сборки', 'Build name')"
          /></label>
          <div
            class="planner-set-controls"
            role="group"
            :aria-label="t('Наборы сборки', 'Build sets')"
          >
            <button @click="store.saveBuild">
              + {{ t("Сохранить набор", "Save set") }}
            </button>
          </div>
        </div>
        <div class="planner-build-buttons">
          <button class="planner-primary" @click="store.saveBuild">
            {{ t("Сохранить", "Save build") }}</button
          ><button @click="libraryOpen = true">
            {{ t("Мои сборки", "My builds") }}
            <small>{{ store.saved.length }}</small></button
          ><button @click="shareBuild">{{ t("Ссылка", "Share") }} ↗</button
          ><button @click="exportOpen = true">{{ t("Экспорт", "Export") }}</button
          ><button @click="importInput?.click()">{{ t("Импорт", "Import") }}</button
          ><input
            ref="importInput"
            type="file"
            accept=".json,application/json"
            hidden
            @change="importBuild"
          />
        </div>
      </div>
    </section>
    <div v-if="store.message" class="planner-notification" role="status">
      <span>{{ messageText }}</span
      ><button
        :aria-label="t('Скрыть сообщение', 'Dismiss message')"
        @click="store.message = ''"
      >
        ×
      </button>
    </div>
    <p v-if="!store.storageAvailable" class="planner-error">
      {{
        t(
          "Браузер не разрешил сохранение. Экспортируйте сборку в JSON, чтобы не потерять её.",
          "Browser storage is unavailable. Export your build as JSON to keep a copy."
        )
      }}
    </p>
    <div class="planner-navigation">
      <nav :aria-label="t('Окна планнера', 'Planner windows')">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          :aria-pressed="section === tab.key"
          @click="section = tab.key"
        >
          {{ t(tab.ru, tab.en) }}
        </button>
      </nav>
      <span
        >{{ t("Навыки", "Skills") }} <strong>{{ spentSkills(store.build) }}</strong> /
        {{ skillBudget(store.build)
        }}<span class="planner-muted">
          · {{ t("осталось", "left") }}
          {{ skillBudget(store.build) - spentSkills(store.build) }}</span
        ></span
      >
    </div>
    <div
      class="planner-workspace"
      :class="{
        'planner-workspace--focused': section !== 'overview',
        'planner-workspace--equipment': section === 'equipment',
      }"
    >
      <PlannerEquipment
        v-if="section === 'overview' || section === 'equipment'"
        @equip="editEquipment"
        @charm="editCharm"
      >
        <PlannerMercenary
          v-if="section === 'overview'"
          @configure="section = 'mercenary'"
          @type="setMercenary"
        >
          <PlannerMercenaryEquipment v-if="mercenary.act" @equip="editMercenary" />
        </PlannerMercenary>
        <PlannerStash
          v-if="section === 'overview'"
          @edit="editStash"
          @manage="stashOpen = true"
        />
      </PlannerEquipment>
      <div v-if="section !== 'equipment'" class="planner-main-column">
        <PlannerSkills v-if="section === 'overview' || section === 'skills'" />
        <template v-if="section === 'mercenary'">
          <section class="planner-panel">
            <div class="planner-panel-heading">
              <div>
                <span class="planner-eyebrow">{{
                  t("ВЕРНЫЙ СПУТНИК", "TRUSTED COMPANION")
                }}</span>
                <h3>{{ t("Наёмник", "Mercenary") }}</h3>
              </div>
              <span class="planner-muted">{{
                t("Акты I, II, III, V", "Acts I, II, III, V")
              }}</span>
            </div>
            <div class="planner-form-grid">
              <label class="planner-label"
                >{{ t("Тип и специализация", "Type and specialization")
                }}<UiSelect
                  dropdown-class="planner-select-dropdown"
                  :model-value="store.build.mercenary.type"
                  :options="
                    mercenaries.map((m) => ({ value: m.value, label: t(m.ru, m.en) }))
                  "
                  :aria-label="t('Наёмник', 'Mercenary')"
                  @update:model-value="setMercenary" /></label
              ><label class="planner-label"
                >{{ t("Уровень наёмника", "Mercenary level")
                }}<input
                  :value="store.build.mercenary.level"
                  type="number"
                  min="1"
                  :max="store.mercenaryLevelLimit"
                  @change="setMercLevel"
                /><small class="planner-muted">{{
                  t(
                    "Не выше уровня персонажа; общий предел — 98.",
                    "Cannot exceed character level; maximum level is 98."
                  )
                }}</small></label
              >
            </div>
            <PlannerMercenaryEquipment v-if="mercenary.act" @equip="editMercenary" />
            <div v-else class="planner-empty">
              <PlannerIcon name="shield" />
              <p>
                {{
                  t(
                    "Выберите наёмника, чтобы спланировать его экипировку.",
                    "Choose a mercenary to plan their equipment."
                  )
                }}
              </p>
            </div>
            <p class="planner-help">
              {{
                t(
                  "Экипировка хранится отдельно от героя. Ауры, урон и характеристики наёмника пока не рассчитываются. При смене типа его снаряжение переносится в сундук.",
                  "Equipment is stored separately from your hero. Mercenary auras, damage and stats are not calculated. Changing type moves their gear to the stash."
                )
              }}
            </p>
          </section>
        </template>
        <section v-if="section === 'quests'" class="planner-panel">
          <div class="planner-panel-heading">
            <div>
              <span class="planner-eyebrow">{{
                t("НАГРАДЫ ЗА ЗАДАНИЯ", "QUEST REWARDS")
              }}</span>
              <h3>{{ t("Прогресс персонажа", "Character progress") }}</h3>
            </div>
            <button @click="setAllQuests(true)">
              {{ t("Все пройдены", "Complete all") }}</button
            ><button @click="setAllQuests(false)">
              {{ t("Снять все", "Clear all") }}
            </button>
          </div>
          <p class="planner-help">
            {{
              t(
                "Отмечайте только полученные награды. Снятие награды или снижение уровня не может сделать уже распределённые очки недопустимыми.",
                "Select rewards you have received. Removing rewards or lowering the level must leave your allocated points valid."
              )
            }}
          </p>
          <div class="planner-quest-table">
            <div class="planner-quest-row planner-quest-row--heading">
              <span>{{ t("Задание", "Quest") }}</span
              ><span v-for="difficulty in difficulties" :key="difficulty.value">{{
                t(difficulty.ru, difficulty.en)
              }}</span>
            </div>
            <div v-for="quest in quests" :key="quest.key" class="planner-quest-row">
              <span
                >{{ t("Акт", "Act") }} {{ quest.act }} · {{ t(quest.ru, quest.en)
                }}<small
                  >{{ quest.reward }}
                  {{ t(rewardLabels[quest.kind].ru, rewardLabels[quest.kind].en) }}</small
                ></span
              ><label v-for="difficulty in difficulties" :key="difficulty.value"
                ><input
                  :checked="store.build.quests[difficulty.value][quest.key]"
                  type="checkbox"
                  :aria-label="`${t('Акт', 'Act')} ${quest.act} · ${t(quest.ru, quest.en)} · ${t(difficulty.ru, difficulty.en)}`"
                  @change="toggleQuest(difficulty.value, quest.key, $event)"
              /></label>
            </div>
          </div>
          <div class="planner-quest-totals">
            <p>
              {{ t("Всего очков навыков", "Total skill points")
              }}<strong>{{ skillBudget(store.build) }}</strong>
            </p>
            <p>
              {{ t("Всего очков характеристик", "Total attribute points")
              }}<strong>{{ attributeBudget(store.build) }}</strong>
            </p>
          </div>
        </section>
        <PlannerPanel
          v-if="section === 'overview' || section === 'notes'"
          class="planner-quests-compact"
          :title="t('Задания', 'Quests')"
        >
          <template #actions>
            <button @click="setAllQuests(true)">
              {{ t("Все пройдены", "Complete all") }}
            </button>
            <button @click="setAllQuests(false)">
              {{ t("Снять все", "Clear all") }}
            </button>
          </template>
          <div class="planner-quest-table">
            <div class="planner-quest-row planner-quest-row--heading">
              <span>{{ t("Задание", "Quest") }}</span>
              <span v-for="difficulty in difficulties" :key="difficulty.value">{{
                t(difficulty.ru, difficulty.en)
              }}</span>
            </div>
            <div v-for="quest in quests" :key="quest.key" class="planner-quest-row">
              <span
                :title="`${quest.reward} ${t(rewardLabels[quest.kind].ru, rewardLabels[quest.kind].en)}`"
              >
                {{ t("Акт", "Act") }} {{ quest.act }} · {{ t(quest.ru, quest.en) }}
              </span>
              <label v-for="difficulty in difficulties" :key="difficulty.value">
                <input
                  type="checkbox"
                  :checked="store.build.quests[difficulty.value][quest.key]"
                  :aria-label="`${t(quest.ru, quest.en)} · ${t(difficulty.ru, difficulty.en)}`"
                  @change="toggleQuest(difficulty.value, quest.key, $event)"
                />
              </label>
            </div>
          </div>
        </PlannerPanel>
        <PlannerPanel
          v-if="section === 'notes' || section === 'overview'"
          v-model:open="notesOpen"
          class="planner-notes"
          :title="t('Заметки', 'Notes')"
        >
          <template #actions>
            <button
              v-if="section === 'overview'"
              @click="
                section = 'notes';
                notesOpen = true;
              "
            >
              ✎ {{ t("Изменить", "Edit") }}
            </button>
            <span v-else class="planner-muted">{{
              t("Сохраняется со сборкой", "Saved with your build")
            }}</span>
          </template>
          <div v-if="section === 'notes'" class="planner-form-grid">
            <label class="planner-label"
              >{{ t("Автор", "Author")
              }}<input v-model="store.build.author" maxlength="100" /></label
            ><label class="planner-label"
              >{{ t("Краткое описание", "Build summary")
              }}<textarea
                v-model="store.build.description"
                maxlength="10000"
                rows="3"
              /></label
            ><label class="planner-label"
              >{{ t("Сильные стороны", "Strengths")
              }}<textarea
                v-model="store.build.strengths"
                maxlength="10000"
                rows="3"
              /></label
            ><label class="planner-label"
              >{{ t("Слабые стороны", "Weaknesses")
              }}<textarea v-model="store.build.weaknesses" maxlength="10000" rows="3" />
            </label>
          </div>
          <p v-else-if="store.build.description" class="planner-user-text">
            {{ store.build.description }}
          </p>
          <label class="planner-label"
            >{{ t("Заметки", "Notes")
            }}<textarea
              v-model="store.build.notes"
              maxlength="10000"
              :rows="section === 'notes' ? 7 : 3"
              :placeholder="
                t(
                  'Ротация, цели по экипировке, варианты развития…',
                  'Rotation, gear goals, progression options…'
                )
              "
            /></label
          ><label v-if="section === 'notes'" class="planner-label"
            >{{ t("Лут-фильтр · текст или ссылка", "Loot filter · text or link")
            }}<textarea
              v-model="store.build.lootFilter"
              maxlength="10000"
              rows="4"
              :placeholder="
                t(
                  'Сохраните настройки лут-фильтра для этой сборки',
                  'Keep your loot filter settings with this build'
                )
              "
            /></label
          ><button v-if="section === 'overview'" @click="section = 'notes'">
            {{
              t(
                "Автор, сильные стороны и лут-фильтр",
                "Author, strengths and loot filter"
              )
            }}
            ↗
          </button>
        </PlannerPanel>
      </div>
      <div class="planner-side-column">
        <PlannerMercenary
          v-if="section !== 'overview'"
          @configure="section = 'mercenary'"
          @type="setMercenary"
        />
        <PlannerCharacter @quests="section = 'quests'" />
      </div>
    </div>
    <div class="planner-data-note">
      <span>{{
        t(
          "Игровые данные Blizzless 1.3.2 · 8 классов · 240 навыков · Серверные бонусы рунных слов",
          "Blizzless 1.3.2 game data · 8 classes · 240 skills · Server runeword bonuses"
        )
      }}</span
      ><span>{{ t("Автосохранение в этом браузере", "Autosaved in this browser") }}</span>
    </div>
    <TheFooter />
    <PlannerGameExport
      v-if="exportOpen"
      @close="exportOpen = false"
      @backup="exportBuild"
    />
    <PlannerItemEditor
      v-if="editor"
      :key="editor.key"
      :title="editorTitle"
      :item-slot="
        editor.kind === 'equipment' || editor.kind === 'mercenary'
          ? editor.slot
          : undefined
      "
      :owner="
        editor.kind === 'equipment'
          ? 'hero'
          : editor.kind === 'charm'
            ? 'charm'
            : editor.kind === 'stash'
              ? 'stash'
              : 'mercenary'
      "
      :initial="editorItem"
      :removable="!!editorItem"
      :allowed-types="editorTypes"
      :preferred-kind="editorPreferredKind"
      :character-class="editor.kind === 'equipment' ? store.build.classId : undefined"
      :charm-mode="editor.kind === 'charm'"
      :initial-height="editorCharm?.height ?? 1"
      :allowed-heights="allowedCharmHeights"
      :inventory-position="editor.kind === 'charm' ? editor.position : undefined"
      :inventory-id="editor.kind === 'charm' ? editor.id : undefined"
      @close="editor = null"
      @save="saveItem"
      @remove="removeItem"
      @stash="stashEditorItem"
    />
    <UiModal
      :model-value="libraryOpen"
      closable
      :label="t('Мои сборки', 'My builds')"
      @close="libraryOpen = false"
      ><div class="planner-editor">
        <div class="planner-modal-heading">
          <h2>{{ t("Мои сборки", "My builds") }}</h2>
          <button
            class="planner-close"
            :aria-label="t('Закрыть', 'Close')"
            @click="libraryOpen = false"
          >
            ×
          </button>
        </div>
        <p class="planner-help">
          {{
            t(
              "До 50 снимков сборок в этом браузере. Для резервной копии используйте экспорт JSON.",
              "Up to 50 build snapshots in this browser. Export JSON for a backup."
            )
          }}
        </p>
        <div v-for="entry in store.saved" :key="entry.id" class="planner-saved-build">
          <PlannerIcon
            :name="plannerClasses.find((c) => c.id === entry.build.classId)!.icon"
          />
          <div>
            <strong>{{ entry.build.name || t("Без названия", "Untitled build") }}</strong
            ><small
              >{{
                plannerClasses.find((c) => c.id === entry.build.classId)!.name[lang]
              }}
              · {{ entry.build.level }} · {{ formatDate(entry.savedAt) }}</small
            >
          </div>
          <button
            @click="
              store.loadBuild(entry.build);
              libraryOpen = false;
            "
          >
            {{ t("Открыть", "Load") }}</button
          ><button
            :aria-label="t('Удалить сохранённую сборку', 'Delete saved build')"
            @click="store.saved = store.saved.filter((s) => s.id !== entry.id)"
          >
            ×
          </button>
        </div>
        <p v-if="!store.saved.length" class="planner-empty">
          {{
            t(
              "Сохранённых сборок пока нет. Создайте первую кнопкой «Сохранить».",
              "No saved builds yet. Use Save build to create your first snapshot."
            )
          }}
        </p>
      </div></UiModal
    >
    <UiModal
      :model-value="stashOpen && !editor"
      closable
      :label="t('Сундук', 'Stash')"
      @close="closeStash"
      ><div class="planner-editor">
        <div class="planner-modal-heading">
          <h2>
            {{ t("Сундук", "Stash") }} <small>{{ store.build.stash.length }} / 100</small>
          </h2>
          <button
            class="planner-close"
            :aria-label="t('Закрыть', 'Close')"
            @click="stashOpen = false"
          >
            ×
          </button>
        </div>
        <p class="planner-help">
          {{
            t(
              "Запасные предметы сохраняются со сборкой и не дают бонусов персонажу.",
              "Spare items are saved with your build and do not affect character stats."
            )
          }}
        </p>
        <div class="planner-stash-target">
          <UiSelect
            v-model="stashTarget"
            dropdown-class="planner-select-dropdown"
            :options="
              [
                ...equipmentSlots,
                { key: 'swapMain' as const, ru: 'Оружие II', en: 'Weapon II' },
                { key: 'swapOff' as const, ru: 'Левая рука II', en: 'Off-hand II' },
              ].map((s) => ({ value: s.key, label: t(s.ru, s.en) }))
            "
            :aria-label="t('Ячейка для предмета из сундука', 'Target equipment slot')"
          /><span class="planner-muted">{{
            t("Ячейка для замены", "Slot to equip into")
          }}</span>
        </div>
        <div
          v-for="(item, index) in store.build.stash"
          :key="index"
          class="planner-stash-item"
        >
          <button
            class="planner-item-name"
            :data-quality="item.quality"
            @click="editStash(index)"
          >
            {{ item.name }}</button
          ><button @click="equipFromStash(index)">{{ t("Надеть", "Equip") }}</button
          ><button
            :aria-label="t('Удалить предмет из сундука', 'Remove stash item')"
            @click="store.build.stash.splice(index, 1)"
          >
            ×
          </button>
        </div>
        <p v-if="!store.build.stash.length" class="planner-empty">
          {{ t("Сундук пуст", "Your stash is empty") }}
        </p>
        <button :disabled="store.build.stash.length >= 100" @click="editStash(-1)">
          + {{ t("Добавить предмет", "Add item") }}
        </button>
      </div></UiModal
    >
  </main>
</template>
<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import PlannerCharacter from "./planner/PlannerCharacter.vue";
import PlannerClassSelect from "./planner/PlannerClassSelect.vue";
import PlannerEquipment from "./planner/PlannerEquipment.vue";
import PlannerMercenary from "./planner/PlannerMercenary.vue";
import PlannerMercenaryEquipment from "./planner/PlannerMercenaryEquipment.vue";
import PlannerStash from "./planner/PlannerStash.vue";
import PlannerPanel from "./planner/PlannerPanel.vue";
import PlannerSkills from "./planner/PlannerSkills.vue";
import PlannerIcon from "./planner/PlannerIcon.vue";
import PlannerItemEditor from "./planner/PlannerItemEditor.vue";
import UiSelect from "./ui/UiSelect.vue";
import UiModal from "./ui/UiModal.vue";
import TheFooter from "./TheFooter.vue";
import { useInfoStore } from "@/store";
import { usePlannerStore } from "@/store/planner";
import { useText } from "@/composables/useText";
import {
  difficulties,
  equipmentSlots,
  mercenaries,
  plannerClasses,
  quests,
} from "@/shared/planner";
import {
  attributeBudget,
  charmFits,
  encodeBuild,
  skillBudget,
  spentSkills,
} from "@/utils/planner";
import type {
  Difficulty,
  EquipmentSlot,
  PlannerBuild,
  PlannerItem,
} from "@/types/planner";
import "@/assets/planner.scss";
import "@/assets/planner-item-editor.scss";
const store = usePlannerStore();
const PlannerGameExport = defineAsyncComponent(
  () => import("./planner/PlannerGameExport.vue")
);
const exportOpen = ref(false);
const info = useInfoStore();
const t = useText();
const lang = computed(() => info.currentLang);
const tabs = [
  { key: "overview", ru: "Обзор", en: "Overview" },
  { key: "equipment", ru: "Экипировка", en: "Equipment" },
  { key: "skills", ru: "Навыки", en: "Skills" },
  { key: "mercenary", ru: "Наёмник", en: "Mercenary" },
  { key: "quests", ru: "Задания", en: "Quests" },
  { key: "notes", ru: "Заметки", en: "Notes" },
];
const section = ref("overview");
const notesOpen = ref(true);
watch(section, (value) => {
  if (value === "notes") notesOpen.value = true;
});
const libraryOpen = ref(false);
const stashOpen = ref(false);
const stashTarget = ref<EquipmentSlot>("mainHand");
const importInput = ref<HTMLInputElement | null>(null);
type MercSlot = "head" | "armor" | "mainHand" | "offHand";
type Editor =
  | { kind: "equipment"; slot: EquipmentSlot; key: string }
  | { kind: "mercenary"; slot: MercSlot; key: string }
  | { kind: "charm"; position: number; id?: string; key: string }
  | { kind: "stash"; index: number; key: string };
const editor = ref<Editor | null>(null);
const editorCharm = computed(() =>
  editor.value?.kind === "charm"
    ? store.build.charms.find((c) => c.id === (editor.value as { id?: string }).id)
    : undefined
);
const editorItem = computed(() => {
  const current = editor.value;
  if (!current) return undefined;
  if (current.kind === "charm") return editorCharm.value;
  if (current.kind === "stash") return store.build.stash[current.index];
  return current.kind === "equipment"
    ? store.build.equipment[current.slot]
    : store.build.mercenary.equipment[current.slot];
});
const allowedCharmHeights = computed(() =>
  editor.value?.kind === "charm"
    ? [1, 2, 3].filter((height) =>
        charmFits(
          store.build.charms,
          (editor.value as { position: number }).position,
          height,
          editorCharm.value?.id
        )
      )
    : [1, 2, 3]
);
const mercenary = computed(() =>
  mercenaries.find((m) => m.value === store.build.mercenary.type)!
);
function slotName(slot: EquipmentSlot) {
  if (slot === "swapMain") return t("Оружие II", "Weapon II");
  if (slot === "swapOff") return t("Левая рука II", "Off-hand II");
  const data = equipmentSlots.find((s) => s.key === slot)!;
  return t(data.ru, data.en);
}
const editorTitle = computed(() =>
  !editor.value
    ? ""
    : editor.value.kind === "charm"
      ? t("Инвентарь", "Inventory")
      : editor.value.kind === "stash"
        ? t("Предмет в сундуке", "Stash item")
        : `${editor.value.kind === "mercenary" ? t("Наёмник · ", "Mercenary · ") : ""}${slotName(editor.value.slot)}`
);
const editorTypes = computed(() => {
  const current = editor.value;
  if (!current || current.kind === "charm") return [];
  if (current.kind === "stash") return [12, 16, 17, 18];
  if (current.slot === "head")
    return current.kind === "equipment" && store.build.classId === "druid"
      ? [18, 23]
      : [18];
  if (current.slot === "armor") return [17];
  if (current.slot === "mainHand" || current.slot === "swapMain") {
    if (current.kind === "mercenary")
      return mercenary.value.act === 1 ? [6] : mercenary.value.act === 2 ? [9, 13] : [3];
    return [12];
  }
  if (current.slot === "offHand" || current.slot === "swapOff") {
    if (current.kind === "mercenary") return mercenary.value.act === 3 ? [16] : [3];
    return [
      16,
      ...(store.build.classId === "paladin"
        ? [20]
        : store.build.classId === "necromancer"
          ? [21]
          : store.build.classId === "barbarian"
            ? [1, 2, 3]
            : store.build.classId === "assassin"
              ? [8, 19]
              : store.build.classId === "warlock"
                ? [24]
                : []),
    ];
  }
  return [];
});
const editorPreferredKind = computed(() => {
  const current = editor.value;
  if (!current || current.kind === "charm" || current.kind === "stash")
    return "weapon" as const;
  return ["head", "armor"].includes(current.slot)
    ? ("armor" as const)
    : ["offHand", "swapOff"].includes(current.slot)
      ? ("shield" as const)
      : ("weapon" as const);
});
function editEquipment(slot: EquipmentSlot) {
  editor.value = { kind: "equipment", slot, key: crypto.randomUUID() };
}
function editMercenary(slot: MercSlot) {
  editor.value = { kind: "mercenary", slot, key: crypto.randomUUID() };
}
function editCharm(position: number, id?: string) {
  editor.value = { kind: "charm", position, id, key: crypto.randomUUID() };
}
function editStash(index: number) {
  editor.value = { kind: "stash", index, key: crypto.randomUUID() };
}
function closeStash() {
  if (!editor.value) stashOpen.value = false;
}
function saveItem(item: PlannerItem, height: number) {
  const current = editor.value;
  if (!current) return;
  if (current.kind === "equipment") store.build.equipment[current.slot] = item;
  else if (current.kind === "mercenary")
    store.build.mercenary.equipment[current.slot] = item;
  else if (current.kind === "stash") {
    if (current.index < 0) store.build.stash.push(item);
    else store.build.stash[current.index] = item;
  } else {
    if (
      !charmFits(
        store.build.charms,
        current.position,
        height,
        current.id,
        item.baseCode === "box" ? 2 : 1
      )
    )
      return;
    const charm = {
      ...item,
      height,
      position: current.position,
      id: current.id ?? crypto.randomUUID(),
    };
    const index = store.build.charms.findIndex((c) => c.id === current.id);
    if (index < 0) store.build.charms.push(charm);
    else store.build.charms[index] = charm;
  }
  editor.value = null;
}
function stashEditorItem() {
  if (!editorItem.value || editor.value?.kind === "stash") return;
  if (store.build.stash.length >= 100) {
    store.message = "stashFull";
    return;
  }
  store.build.stash.push(JSON.parse(JSON.stringify(editorItem.value)));
  removeItem();
}
function removeItem() {
  const current = editor.value;
  if (!current) return;
  if (current.kind === "equipment") delete store.build.equipment[current.slot];
  else if (current.kind === "mercenary")
    delete store.build.mercenary.equipment[current.slot];
  else if (current.kind === "stash") store.build.stash.splice(current.index, 1);
  else store.build.charms = store.build.charms.filter((c) => c.id !== current.id);
  editor.value = null;
}
function equipFromStash(index: number) {
  const old = store.build.equipment[stashTarget.value];
  store.build.equipment[stashTarget.value] = store.build.stash[index];
  if (old) store.build.stash[index] = old;
  else store.build.stash.splice(index, 1);
}
function setLevel(event: Event) {
  const input = event.target as HTMLInputElement;
  store.setLevel(Number(input.value));
  input.value = String(store.build.level);
}
function setMercLevel(event: Event) {
  const input = event.target as HTMLInputElement;
  store.setMercenaryLevel(Number(input.value));
  input.value = String(store.build.mercenary.level);
}
function setMercenary(value: string) {
  if (value === store.build.mercenary.type) return;
  const currentItems = Object.values(store.build.mercenary.equipment);
  if (store.build.stash.length + currentItems.length > 100) {
    store.message = "stashFull";
    return;
  }
  store.build.stash.push(...currentItems);
  store.build.mercenary = {
    type: value,
    level: store.build.mercenary.level,
    equipment: {},
  };
}
function toggleQuest(
  difficulty: Difficulty,
  key: keyof PlannerBuild["quests"]["normal"],
  event: Event
) {
  const input = event.target as HTMLInputElement;
  store.updateConfiguration((next) => {
    next.quests[difficulty][key] = input.checked;
  });
  input.checked = store.build.quests[difficulty][key];
}
function setAllQuests(checked: boolean) {
  store.updateConfiguration((next) => {
    for (const difficulty of difficulties)
      for (const quest of quests) next.quests[difficulty.value][quest.key] = checked;
  });
}
const rewardLabels = {
  skill: { ru: "к навыкам", en: "skill points" },
  attributes: { ru: "к характеристикам", en: "stat points" },
  resist: { ru: "сопротивлений", en: "all resistances" },
  life: { ru: "жизни", en: "life" },
};
function exportBuild() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(store.build, null, 2)], { type: "application/json" })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `blizzless-${store.build.classId}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function importBuild(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 1000000) throw new Error("size");
    store.loadBuild(JSON.parse(await file.text()));
  } catch {
    store.message = "invalid";
  }
  input.value = "";
}
async function shareBuild() {
  const encoded = encodeBuild(store.build);
  if (encoded.length > 30000) {
    store.message = "shareSize";
    return;
  }
  const url = new URL(window.location.href);
  url.hash = `/planner?build=${encoded}`;
  try {
    await navigator.clipboard.writeText(url.href);
    store.message = "copied";
  } catch {
    store.message = "clipboard";
  }
}
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : date.toLocaleDateString(lang.value === "ru" ? "ru-RU" : "en-GB");
};
const messageText = computed(() => {
  const messages: Record<string, [string, string]> = {
    saved: [
      "Снимок сборки сохранён в этом браузере.",
      "Build snapshot saved in this browser.",
    ],
    loaded: ["Сборка загружена.", "Build loaded."],
    copied: ["Ссылка на сборку скопирована.", "Build link copied."],
    invalid: [
      "Не удалось загрузить сборку: неверный формат или недопустимые значения.",
      "Cannot load build: invalid format or values.",
    ],
    budget: [
      "Сначала сбросьте лишние очки: награды не покрывают распределение.",
      "Refund points first: the new rewards do not cover your allocations.",
    ],
    levelAdjusted: [
      "Навыки и характеристики приведены к новому уровню. Лишние очки возвращены.",
      "Skill and attribute allocations were adjusted to the new level. Excess points were refunded.",
    ],
    invalidLevel: [
      "Укажите целый уровень от 1 до 99.",
      "Enter a whole level from 1 to 99.",
    ],
    limit: [
      "Достигнут лимит 50 сборок. Удалите ненужный снимок или экспортируйте JSON.",
      "50-build limit reached. Delete a snapshot or export JSON.",
    ],
    clipboard: [
      "Браузер не разрешил копирование. Сохраните сборку через экспорт JSON.",
      "Clipboard access is unavailable. Export JSON to share your build.",
    ],
    shareSize: [
      "Сборка слишком велика для ссылки. Используйте экспорт JSON.",
      "This build is too large for a link. Use JSON export.",
    ],
    stashFull: [
      "В сундуке недостаточно места для экипировки наёмника.",
      "Not enough stash space for mercenary gear.",
    ],
  };
  const text = messages[store.message];
  return text ? t(text[0], text[1]) : store.message;
});
onMounted(() => {
  store.loadSharedHash();
  window.addEventListener("hashchange", store.loadSharedHash);
});
onBeforeUnmount(() => window.removeEventListener("hashchange", store.loadSharedHash));
</script>
