<template>
  <dialog
    ref="dialog"
    class="ui-modal"
    :aria-label="label"
    @cancel="onCancel"
    @close="emit('close')"
    @click="onBackdropClick"
  >
    <div v-if="modelValue" class="ui-modal__content"><slot /></div>
  </dialog>
</template>
<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
const props = defineProps<{ modelValue: boolean; closable?: boolean; label?: string }>();
const emit = defineEmits<{ (e: "close"): void }>();
const dialog = ref<HTMLDialogElement | null>(null);
let previousOverflow = "";
let locked = false;
function unlock() {
  if (locked) {
    document.body.style.overflow = previousOverflow;
    locked = false;
  }
}
watch(
  () => props.modelValue,
  async (open) => {
    await nextTick();
    if (open && props.modelValue) {
      if (!locked) {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        locked = true;
      }
      if (!dialog.value?.open) dialog.value?.showModal();
    } else {
      dialog.value?.close();
      unlock();
    }
  },
  { immediate: true }
);
function onCancel(event: Event) {
  if (!props.closable) event.preventDefault();
}
function onBackdropClick(event: MouseEvent) {
  if (event.target !== dialog.value || !props.closable) return;
  const rect = dialog.value.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    emit("close");
}
onBeforeUnmount(unlock);
</script>
<style scoped lang="scss">
.ui-modal {
  position: fixed;
  width: 580px;
  max-width: calc(100vw - 32px);
  max-height: calc(100svh - 48px);
  padding: 0;
  margin: auto;
  overflow: auto;
  color: var(--color-text);
  background: var(--color-panel);
  border: 1px var(--border-style) #536570;
  border-radius: 6px;
  box-shadow: 0 25px 100px #000;
}
.ui-modal::backdrop {
  background: rgb(0 0 0 / 78%);
}
@media (max-width: 600px) {
  .ui-modal {
    max-width: calc(100vw - 20px);
    max-height: calc(100svh - 24px);
  }
}
</style>
