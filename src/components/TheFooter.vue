<template>
  <footer class="footer">
    <span>BLIZZLESS · DIABLO II: RESURRECTED</span
    ><a
      href="https://blizzless.info/ru/runewords"
      target="_blank"
      rel="noopener noreferrer"
      >{{ t("Данные Blizzless", "Blizzless data") }} ↗</a
    ><a
      href="https://github.com/fabd/diablo2-runewizard"
      target="_blank"
      rel="noopener noreferrer"
      >Inspired by Rune Wizard ↗</a
    >
  </footer>
</template>
<script setup lang="ts">
import { useText } from "@/composables/useText";
const t = useText();
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
