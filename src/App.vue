<template>
  <TheHeader
    v-model:search="activeSearch"
    :search-placeholder="searchPlaceholder"
    :section="route.section"
  />
  <RunewordsCatalog v-if="route.section === 'runewords'" />
  <RecipesCatalog v-else v-model:search="recipeSearch" />
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from "vue";
import TheHeader from "@/components/TheHeader.vue";
import RunewordsCatalog from "@/components/RunewordsCatalog.vue";
import { useRunewordsStore } from "@/store";
import { useText } from "@/composables/useText";
import { parseCatalogHash } from "@/utils/navigation";
const RecipesCatalog = defineAsyncComponent(
  () => import("@/components/RecipesCatalog.vue")
);
const words = useRunewordsStore();
const t = useText();
const route = ref(parseCatalogHash(window.location.hash));
const recipeSearch = ref("");
const onHashChange = () => {
  route.value = parseCatalogHash(window.location.hash);
};
onMounted(() => window.addEventListener("hashchange", onHashChange));
onBeforeUnmount(() => window.removeEventListener("hashchange", onHashChange));
const activeSearch = computed({
  get: () => (route.value.section === "recipes" ? recipeSearch.value : words.search),
  set: (value: string) => {
    if (route.value.section === "recipes") recipeSearch.value = value;
    else words.search = value;
  },
});
const searchPlaceholder = computed(() =>
  route.value.section === "recipes"
    ? t("Рецепт, ингредиент или результат…", "Recipe, ingredient or result…")
    : t("Название, руна или тип предмета…", "Name, rune or item type…")
);
</script>
