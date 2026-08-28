<script setup lang="ts">
import { computed, inject } from "vue";
import type { ToolbarContext, ToolbarOrientation } from "./Toolbar.vue";
import { TOOLBAR_CONTEXT } from "./Toolbar.vue";

/**
 * ToolbarSeparator — the divider between groups of controls inside a
 * Toolbar. It reads the toolbar's own orientation through the context the
 * toolbar provides and draws along the perpendicular axis, so a horizontal
 * toolbar gets vertical hairlines and a vertical one gets horizontal. Its
 * `role="separator"` is the one an APG toolbar wants between its groups —
 * which is why `decorative` is not offered here: inside a toolbar the line
 * is never merely visual, it IS the group boundary.
 *
 * Composing the `Separator` primitive instead of drawing the hairline here
 * was considered and rejected: the primitive binds `h-full w-px` for its
 * vertical axis, and the short, centered divider a toolbar wants would fight
 * that on Tailwind's emitted order — a coin flip, not a decision. Four lines
 * of divider here beat a class-order lottery.
 */
const props = defineProps<{
  /** Only for standalone use — inside a Toolbar the axis is inherited. */
  orientation?: ToolbarOrientation;
}>();

const inherited = inject<ToolbarContext | null>(TOOLBAR_CONTEXT, null);
const axis = computed(
  () => props.orientation ?? (inherited ? inherited.orientation : "horizontal"),
);
</script>

<template>
  <div
    role="separator"
    :aria-orientation="axis === 'vertical' ? 'horizontal' : 'vertical'"
    :class="axis === 'vertical' ? 'mx-2 h-px w-4 self-center' : 'h-4 w-px self-center'"
    class="shrink-0 bg-border"
  />
</template>
