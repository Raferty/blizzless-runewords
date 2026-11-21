<template>
  <section class="planner-panel" :class="{ 'planner-panel--collapsed': !expanded }">
    <div class="planner-panel-heading">
      <h3>
        <template v-if="fixedOpen">{{ title }}</template>
        <button
          v-else
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
    <div v-show="expanded" :id="contentId" class="planner-panel-content"><slot /></div>
  </section>
</template>
<script setup lang="ts">
import UiIcon from "@/components/ui/UiIcon.vue";
import { computed, useId } from "vue";
import { useText } from "@/composables/useText";
const props = defineProps<{ title: string; fixedOpen?: boolean }>();
const open = defineModel<boolean>("open", { default: true });
const expanded = computed(() => props.fixedOpen || open.value);
const contentId = useId();
const t = useText();
</script>
