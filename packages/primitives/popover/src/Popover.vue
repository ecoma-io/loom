<script lang="ts">
/**
 * Which edge of the trigger the panel prefers. It is a preference and not a
 * guarantee: Reka flips the panel to the opposite edge when it would collide
 * with the viewport, which is why a caller sets the side it *wants* rather
 * than the side it will get.
 *
 * The members mirror Reka's own `Side`. Nothing enforces that in this
 * declaration — the template binding does: give this union a member Reka does
 * not accept and `:side="side"` stops type-checking. Declaring it here rather
 * than aliasing `PopoverContentProps["side"]` is what puts the four values in
 * the generated props table, because the documentation reads syntax and an
 * indexed access type has none to read.
 */
export type PopoverSide = "top" | "right" | "bottom" | "left";

/** Where the panel sits along that edge. */
export type PopoverAlign = "start" | "center" | "end";
</script>

<script setup lang="ts">
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent, PopoverArrow } from "reka-ui";
import { cn } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";

/**
 * Popover — a floating panel anchored to a trigger, carrying secondary content
 * the user opts into: a filter set, a colour picker, a details card.
 *
 * The escape contract, which is the whole reason to reach for an overlay
 * primitive rather than an absolutely positioned div: opening moves focus into
 * the panel, Esc and an outside click both close it, closing returns focus to
 * the trigger, and the page behind keeps scrolling because a popover is not
 * modal. Focus is *not* trapped — Tab leaves the panel, which is correct for
 * content the user can walk past. `Dialog` is the one that traps.
 *
 * Reach for `DropdownMenu` when the panel is a list of commands, `Tooltip` for
 * a hint that must not take focus at all, and `Dialog` when the task has to
 * block the rest of the UI.
 */
withDefaults(
  defineProps<{
    /** Drive the panel from the host with `v-model:open`; omit it and the popover owns its own state. */
    open?: boolean | undefined;
    /** The edge of the trigger to anchor against, before collision flipping. */
    side?: PopoverSide;
    /** Where the panel sits along that edge — `start` keeps its leading edge flush with the trigger's. */
    align?: PopoverAlign;
    /** Gap in pixels between the trigger and the panel. */
    sideOffset?: number;
    /** Draw the pointer notch. Turn it off where the panel reads better flush against its trigger. */
    arrow?: boolean;
  }>(),
  // `open: undefined` is load-bearing, not a redundant default — it is what
  // keeps the uncontrolled third state reachable past Vue's absent-Boolean
  // casting. `optional()` in the template is the other half; its docblock
  // carries the reasoning for both.
  { open: undefined, side: "bottom", align: "center", sideOffset: 6, arrow: true },
);

defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <PopoverRoot v-bind="optional({ open })" @update:open="$emit('update:open', $event)">
    <!-- @slot The control that opens the panel. Rendered `as-child`, so the
         caller's own element *is* the trigger and no wrapper swallows its
         accessible name. -->
    <PopoverTrigger as-child>
      <slot name="trigger" />
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        :side="side"
        :align="align"
        :side-offset="sideOffset"
        :class="
          cn(
            'z-overlay min-w-[12rem] max-w-[min(90vw,22rem)] rounded-md border border-border bg-popover p-3 text-sm text-popover-foreground shadow-md outline-none',
            // Both states scoped, never unconditional. Reka's Presence
            // keeps closed content mounted until an animationend arrives, and a
            // mount-only animation never fires a second one — so an
            // unconditional animation class strands an invisible panel over the
            // page, swallowing clicks. Scoped, the closed element computes
            // `animation-name: none` and Presence takes its immediate-unmount
            // branch instead; the paired exit is precisely what Presence is
            // waiting to hold it for. The origin below is what makes that scale
            // grow out of the trigger rather than out of the panel's own
            // centre — on the way out as well as in.
            'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out',
          )
        "
        style="transform-origin: var(--reka-popper-transform-origin)"
      >
        <!-- @slot The panel body. -->
        <slot />
        <PopoverArrow v-if="arrow" class="fill-popover" :width="12" :height="6" />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
