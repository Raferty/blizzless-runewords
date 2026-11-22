<template>
  <section class="planner-materials-layout" aria-labelledby="planner-materials-heading">
    <div class="planner-materials-page">
      <img
        class="planner-materials-background"
        :src="materialsBackground"
        width="1687"
        height="1507"
        alt=""
      />
      <button
        v-for="slot in materialSlots"
        :key="slot.code"
        type="button"
        class="planner-materials-slot"
        :class="{ empty: !store.build.materials[slot.code] }"
        :title="slot.name"
        :style="slot.style"
        @click="editMaterial(slot)"
      >
        <img
          class="planner-materials-icon"
          :src="assetRoot + slot.image"
          :alt="slot.name"
        />
        <span v-if="store.build.materials[slot.code]">{{
          store.build.materials[slot.code]
        }}</span>
      </button>
      <h3 id="planner-materials-heading">{{ t("Материалы", "Materials") }}</h3>
    </div>
    <div class="planner-materials-actions">
      <button type="button" :disabled="materialsEmpty" @click="setAllMaterials(0)">
        {{ t("Очистить панель", "Clear panel") }}
      </button>
      <button
        type="button"
        :disabled="materialsFull"
        @click="setAllMaterials(materialSlotLimit)"
      >
        {{ t("Заполнить панель", "Fill panel") }}
      </button>
    </div>
  </section>
  <UiModal
    v-if="activeMaterial"
    class="planner-material-dialog"
    :model-value="true"
    closable
    :label="activeMaterial.name"
    @close="activeMaterial = null"
  >
    <form class="planner-editor planner-material-editor" @submit.prevent="saveMaterial">
      <div class="planner-modal-heading">
        <img :src="assetRoot + activeMaterial.image" alt="" width="40" height="40" />
        <h2>{{ activeMaterial.name }}</h2>
        <button
          type="button"
          :aria-label="t('Закрыть', 'Close')"
          @click="activeMaterial = null"
        >
          <UiIcon name="close" />
        </button>
      </div>
      <label class="planner-label"
        >{{ t("Количество в ячейке", "Quantity in slot") }} (0–{{ materialSlotLimit }})
        <input
          v-model.number="materialQuantity"
          type="number"
          min="0"
          :max="materialSlotLimit"
          step="1"
          required
        />
      </label>
      <button type="submit" class="planner-primary">
        {{ t("Сохранить", "Save") }}
      </button>
    </form>
  </UiModal>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import UiIcon from "../ui/UiIcon.vue";
import UiModal from "../ui/UiModal.vue";
import { useText } from "@/composables/useText";
import { usePlannerStore } from "@/store/planner";
import { materialSlotLimit } from "@/shared/planner";
import slotLayout from "@/shared/planner-material-slots.json";
import { stashSupplies } from "@/utils/planner-supplies";
import { baseItemImage } from "@/utils/planner-item-art";
const t = useText();
const store = usePlannerStore();
const assetRoot = import.meta.env.BASE_URL;
const materialsBackground = assetRoot + "images/planner/materials-blizzless.png";
const extraMaterials: Record<string, { name: string; image: string }> = {
  std: {
    name: "Standard of Heroes",
    image: "images/planner/items/misc/body_part/flag.webp",
  },
  sth: { name: "Heroic Offering", image: "images/cube/889eae02453e863b05.webp" },
};
const materialSlots = slotLayout.map(({ code, x, y, width, height }) => ({
  code,
  name: stashSupplies[code]?.name ?? extraMaterials[code]?.name,
  image: baseItemImage(code) ?? extraMaterials[code]?.image,
  style: {
    left: `${(x / 1687) * 100}%`,
    top: `${(y / 1507) * 100}%`,
    width: `${(width / 1687) * 100}%`,
    height: `${(height / 1507) * 100}%`,
  },
}));
const materialsEmpty = computed(() =>
  materialSlots.every(({ code }) => store.build.materials[code] === 0)
);
const materialsFull = computed(() =>
  materialSlots.every(({ code }) => store.build.materials[code] === materialSlotLimit)
);
function setAllMaterials(count: number) {
  store.build.materials = Object.fromEntries(
    materialSlots.map(({ code }) => [code, count])
  );
}
type MaterialSlot = (typeof materialSlots)[number];
const activeMaterial = ref<MaterialSlot | null>(null);
const materialQuantity = ref<number | string>(0);
function editMaterial(slot: MaterialSlot) {
  activeMaterial.value = slot;
  materialQuantity.value = store.build.materials[slot.code] || 1;
}
function saveMaterial() {
  const count = materialQuantity.value;
  if (
    !activeMaterial.value ||
    typeof count !== "number" ||
    !Number.isInteger(count) ||
    count < 0 ||
    count > materialSlotLimit
  )
    return;
  store.build.materials[activeMaterial.value.code] = count;
  activeMaterial.value = null;
}
</script>
