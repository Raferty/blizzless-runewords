<template>
  <UiModal
    :model-value="true"
    closable
    :label="t('Поделиться сборкой', 'Share build')"
    @close="$emit('close')"
  >
    <div class="planner-editor planner-build-share">
      <div class="planner-modal-heading">
        <h2>{{ t("Поделиться сборкой", "Share build") }}</h2>
        <button type="button" :aria-label="t('Закрыть', 'Close')" @click="$emit('close')">
          <UiIcon name="close" />
        </button>
      </div>
      <p class="planner-help">
        {{
          t(
            "Ссылка хранит весь текущий билд: вещи и сундук, навыки, атрибуты, наёмника, задания, вейпоинты и заметки. После изменения билда создайте новую ссылку.",
            "This link contains the entire current build: equipment and stash, skills, attributes, mercenary, quests, waypoints and notes. Create a new link after changing the build."
          )
        }}
      </p>
      <p v-if="build.sharedStashData" class="planner-help">
        {{ t("Ссылка также передаёт весь импортированный общий сундук со всеми вкладками.",
          "The link also includes every tab of your imported shared stash.") }}
      </p>
      <p v-if="loading" role="status">{{ t("Создаю ссылку…", "Creating link…") }}</p>
      <template v-else-if="url">
        <label class="planner-label">
          {{ t("Ссылка на сборку", "Build link") }}
          <textarea
            ref="linkField"
            :value="url"
            readonly
            rows="4"
            spellcheck="false"
            @focus="linkField?.select()"
          />
        </label>
        <p v-if="copied" role="status">{{ t("Ссылка скопирована.", "Link copied.") }}</p>
        <div class="planner-modal-actions">
          <a :href="url" target="_blank" rel="noopener noreferrer"
            >{{ t("Открыть ссылку", "Open link") }} <UiIcon name="arrow-up-right"
          /></a>
          <button type="button" class="planner-primary" :disabled="copying" @click="copy">
            <UiIcon name="copy" /> {{ t("Копировать ссылку", "Copy link") }}
          </button>
        </div>
      </template>
      <p v-if="error" class="planner-error" role="alert">{{ error }}</p>
    </div>
  </UiModal>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import UiModal from "@/components/ui/UiModal.vue";
import UiIcon from "@/components/ui/UiIcon.vue";
import { useText } from "@/composables/useText";
import { cloneBuild } from "@/utils/planner";
import { createBuildShareUrl } from "@/utils/planner-share";
import type { PlannerBuild } from "@/types/planner";
const props = defineProps<{ build: PlannerBuild }>();
defineEmits<{ close: [] }>();
const t = useText();
const snapshot = cloneBuild(props.build);
const url = ref(""),
  error = ref("");
const loading = ref(true),
  copied = ref(false),
  copying = ref(false);
const linkField = ref<HTMLTextAreaElement>();
onMounted(async () => {
  try {
    url.value = await createBuildShareUrl(snapshot);
  } catch {
    error.value = t(
      "Не удалось создать ссылку для этой сборки. Сохраните её через экспорт JSON.",
      "Could not create a link for this build. Save it using JSON export."
    );
  } finally {
    loading.value = false;
  }
});
async function copy() {
  copying.value = true;
  error.value = "";
  copied.value = false;
  try {
    await navigator.clipboard.writeText(url.value);
    copied.value = true;
  } catch {
    linkField.value?.focus();
    linkField.value?.select();
    error.value = t(
      "Не удалось скопировать автоматически. Ссылка выделена — скопируйте её вручную.",
      "Automatic copying is unavailable. The link is selected so you can copy it manually."
    );
  } finally {
    copying.value = false;
  }
}
</script>
<style scoped>
.planner-build-share textarea {
  width: 100%;
  min-height: 84px;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #ddd;
  resize: vertical;
  background: #0d0d0d;
  border: 1px solid #444;
  border-radius: 4px;
}
.planner-build-share .planner-modal-actions a {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  color: #c7b377;
  text-decoration: none;
}
</style>
