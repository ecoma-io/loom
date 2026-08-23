<script lang="ts">
/**
 * Which edge of the trigger the card prefers, before collision flipping. The
 * members mirror Reka's own `Side`, and the template binding is what enforces
 * that: a member Reka does not accept stops `:side="side"` type-checking.
 * Declared here rather than aliased so the generated props table prints the
 * four values instead of a name that tells the reader nothing.
 */
export type HoverCardSide = "top" | "right" | "bottom" | "left";

/**
 * How the card aligns against the trigger along the cross-axis, before
 * collision flipping. Same rationale as `HoverCardSide`.
 */
export type HoverCardAlign = "start" | "center" | "end";
</script>

<script setup lang="ts">
import {
  HoverCardRoot,
  HoverCardTrigger,
  HoverCardPortal,
  HoverCardContent,
  HoverCardArrow,
} from "reka-ui";
import { cn } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";

/**
 * HoverCard — a supplementary preview surface on hover, for content the user
 * reads rather than operates.
 *
 * The pointer can travel from the trigger into the card without closing it —
 * the close delay exists for that transit, which is what makes a hover card a
 * complementary surface and a tooltip a non-interactive hint. But that reach
 * is a pointer privilege only. Reka strips `tabindex="-1"` onto every tabbable
 * node inside the content on mount, and the trigger closes the card on blur
 * after `closeDelay` (300ms by default) — so by the time a keyboard user
 * tabbed toward anything inside, the card would already be gone. Interactive
 * content inside a HoverCard is unreachable by keyboard (WCAG 2.1.1), whatever
 * the markup allows.
 *
 * The honest contract: keep the card's content non-interactive — text, an
 * image, a definition — and duplicate anything actionable somewhere reachable.
 * When a preview genuinely needs its own links or buttons, it is not a hover
 * card; it is a `Popover`, whose content takes focus and whose Esc/outside
 * dismissal gives a keyboard user a way in and out.
 *
 * The content is NOT wired as `aria-describedby` — it is a supplementary panel,
 * not an accessible name supplement. A screen reader user who never hovers
 * should still have the trigger's own accessible name, and the card is extra
 * rather than essential.
 */
withDefaults(
  defineProps<{
    /** The edge of the trigger to anchor against, before collision flipping. */
    side?: HoverCardSide;
    /** Gap in pixels between the trigger and the card. */
    sideOffset?: number;
    /** Alignment against the trigger along the cross-axis, before collision flipping. */
    align?: HoverCardAlign;
    /** Alignment offset in pixels from the chosen alignment position. */
    alignOffset?: number;
    /** Milliseconds of hover before the card appears. */
    openDelay?: number;
    /** Milliseconds before the card disappears after the pointer leaves both trigger and content. */
    closeDelay?: number;
    /** Drive the card from the host with `v-model:open`. Omit for hover alone. */
    open?: boolean | undefined;
  }>(),
  // `open: undefined` is load-bearing, not a redundant default — it is what
  // keeps the uncontrolled third state reachable past Vue's absent-Boolean
  // casting. `optional()` in the template is the other half; its docblock
  // carries the reasoning for both.
  {
    side: "bottom",
    sideOffset: 6,
    align: "start",
    alignOffset: 0,
    openDelay: 300,
    closeDelay: 300,
    open: undefined,
  },
);

defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <HoverCardRoot
    :open-delay="openDelay"
    :close-delay="closeDelay"
    v-bind="optional({ open })"
    @update:open="$emit('update:open', $event)"
  >
    <!-- @slot The element that opens the card on hover. Rendered `as-child`, so
         the caller's own element *is* the trigger and keeps its own accessible
         name. -->
    <HoverCardTrigger as-child>
      <slot name="trigger" />
    </HoverCardTrigger>

    <HoverCardPortal>
      <HoverCardContent
        :side="side"
        :side-offset="sideOffset"
        :align="align"
        :align-offset="alignOffset"
        :class="
          cn(
            'z-overlay w-64 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none',
            // Both states scoped, never unconditional. Reka's Presence
            // keeps closed content mounted until an animationend arrives, and
            // a mount-only animation never fires a second one — so an
            // unconditional animation class leaves a stray card in the page.
            // Scoped, the closed element computes `animation-name: none` and
            // Presence unmounts it at once; the paired exit is precisely what
            // Presence is waiting to hold it for.
            'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out',
          )
        "
        style="transform-origin: var(--reka-popper-transform-origin)"
      >
        <!-- @slot The card content. Pointer-reachable, but keep it
             non-interactive — see the component docblock for why keyboard
             users cannot reach anything focusable in here. -->
        <slot />
        <HoverCardArrow class="fill-popover" :width="10" :height="5" />
      </HoverCardContent>
    </HoverCardPortal>
  </HoverCardRoot>
</template>
