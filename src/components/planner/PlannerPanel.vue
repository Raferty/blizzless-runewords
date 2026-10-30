<template>
  <section class="planner-panel" :class="{ 'planner-panel--collapsed': !open }">
    <div class="planner-panel-heading">
      <h3>
        <button
          type="button"
          class="planner-panel-toggle"
          :aria-expanded="open"
          :aria-controls="contentId"
          :aria-label="`${open ? t('Свернуть', 'Collapse') : t('Развернуть', 'Expand')} ${title}`"
          @click="open = !open"
        >
          <UiIcon name="chevron-down" />
          {{ title }}
        </button>
      </h3>
      <slot name="actions" />
    </div>
    <div v-show="open" :id="contentId" class="planner-panel-content"><slot /></div>
  </section>
</template>
<script setup lang="ts">
import UiIcon from "@/components/ui/UiIcon.vue";
import { useId } from "vue";
import { useText } from "@/composables/useText";
defineProps<{ title: string }>();
const open = defineModel<boolean>("open", { default: true });
const contentId = useId();
const t = useText();
</script>
