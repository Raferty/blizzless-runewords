<template>
  <div v-if="bonuses" class="planner-set-bonuses">
    <h4>{{ bonuses.name }}</h4>
    <section v-if="bonuses.item.length" class="planner-set-item-bonuses">
      <p>{{ t("Бонусы этого предмета", "Item set bonuses") }}</p>
      <ul>
        <template v-for="(group, index) in bonuses.item" :key="index">
          <li v-for="line in group.lines" :key="line">
            {{ line }} <span>({{ condition(group) }})</span>
          </li>
        </template>
      </ul>
    </section>
    <section v-if="bonuses.partial.length">
      <p>{{ t("Бонусы комплекта", "Partial set bonuses") }}</p>
      <ul>
        <template v-for="group in bonuses.partial" :key="group.count">
          <li v-for="line in group.lines" :key="line">
            {{ line }} <span>({{ condition(group) }})</span>
          </li>
        </template>
      </ul>
    </section>
    <section v-if="bonuses.full.length">
      <p>{{ t("Полный комплект", "Complete set") }} ({{ bonuses.size }})</p>
      <ul>
        <li v-for="line in bonuses.full" :key="line">{{ line }}</li>
      </ul>
    </section>
    <p class="planner-set-bonus-hint">
      {{
        t(
          "Бонусы действуют при экипировке нужных частей комплекта.",
          "Bonuses require the matching set pieces to be equipped."
        )
      }}
    </p>
  </div>
</template>
<script setup lang="ts">
import { useText } from "@/composables/useText";
import type {
  CatalogSetBonuses,
  ConditionalSetBonus,
} from "@/utils/planner-item-catalog";

defineProps<{ bonuses?: CatalogSetBonuses }>();
const t = useText();
const condition = (group: ConditionalSetBonus) =>
  group.requires ||
  `${group.count} ${t(group.count < 5 ? "части комплекта" : "частей комплекта", "set items")}`;
</script>
