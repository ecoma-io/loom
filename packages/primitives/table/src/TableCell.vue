<script setup lang="ts">
import { headAlignClass } from "./TableHead.vue";
import type { TableAlign } from "./Table.vue";

withDefaults(
  defineProps<{
    /** Text alignment; numeric figures want `"right"` for the tabular digits. */
    align?: TableAlign;
  }>(),
  {},
);
</script>

<template>
  <td :class="headAlignClass(align)">
    <!-- @slot The cell's content — text, a Badge, a RowActions cluster. -->
    <slot />
  </td>
</template>
