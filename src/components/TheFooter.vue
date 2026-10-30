<template>
  <footer class="footer">
    <span>BLIZZLESS · DIABLO II: RESURRECTED</span
    ><a :href="sourceUrl" target="_blank" rel="noopener noreferrer"
      >{{ t("Данные Blizzless", "Blizzless data") }}
      <UiIcon name="arrow-up-right" :size="12" /></a
    ><a
      href="https://github.com/fabd/diablo2-runewizard"
      target="_blank"
      rel="noopener noreferrer"
      >Inspired by Rune Wizard <UiIcon name="arrow-up-right" :size="12"
    /></a>
  </footer>
</template>
<script setup lang="ts">
import UiIcon from "@/components/ui/UiIcon.vue";
import { useText } from "@/composables/useText";
const t = useText();
withDefaults(defineProps<{ sourceUrl?: string }>(), {
  sourceUrl: "https://blizzless.info/ru/runewords",
});
</script>
<style scoped lang="scss">
.footer {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  justify-content: space-between;
  padding: 16px 0;
  margin-top: 24px;
  font-size: 9px;
  color: var(--color-muted);
  letter-spacing: 0.4px;
  border-top: 1px var(--border-style) var(--color-border);
}
.footer a:hover {
  color: var(--color-accent);
}
</style>
