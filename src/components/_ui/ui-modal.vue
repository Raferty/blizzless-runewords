<template>
  <div v-if="modelValue" class="ui-modal">
    <div class="ui-modal__wrapper">
      <div class="ui-modal__close" @click="$emit('update:modelValue', false)">close</div>
      <div v-if="title" class="ui-modal__title"></div>
      <div class="ui-modal__content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  modelValue: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:modelValue"]);
</script>

<style lang="scss" scoped>
.ui-modal {
  position: absolute;
  z-index: 999998;
  width: 100%;
  max-width: to-rem(490);
  border: 1px solid #bab197;
  background-color: rgba(#000, 0.8);
  max-height: calc(100% - 124px);
  overflow-y: auto;

  &__wrapper {
    padding: to-rem(16);
    position: relative;
  }

  &__close {
    position: absolute;
    right: 12px;
    top: 10px;
    color: #ae2a1a;
    cursor: pointer;
  }

  &__title {
    color: #ecd2a8;
    text-align: center;
    font-size: to-rem(22);
    margin-bottom: to-rem(1);
  }
}
</style>
