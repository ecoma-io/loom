<script lang="ts">
/**
 * Which edge of the trigger the tip prefers, before collision flipping. The
 * members mirror Reka's own `Side`, and the template binding is what enforces
 * that: a member Reka does not accept stops `:side="side"` type-checking.
 * Declared here rather than aliased so the generated props table prints the
 * four values instead of a name that tells the reader nothing.
 */
export type TooltipSide = "top" | "right" | "bottom" | "left";
</script>

<script setup lang="ts">
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipArrow,
} from "reka-ui";
import { cn } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";

/**
 * Tooltip — a short, non-interactive hint on hover or keyboard focus of its
 * trigger: the label for an icon-only button, or one terse explanation.
 *
 * A tooltip is not a small dialog, and the difference is the whole contract.
 * It never takes focus — focus stays on the trigger the entire time it is
 * shown, which is what lets a keyboard user read it and keep going. Hovering
 * the trigger or focusing it opens the tip; Esc, blur and moving the pointer
 * away close it; the page behind never stops scrolling. Nothing inside it can
 * be reached, so nothing interactive belongs inside it. The moment a hint
 * needs a link or a button, it is a `Popover`.
 *
 * It is wired as `aria-describedby`, never `aria-labelledby`: it *supplements*
 * an accessible name and must never be the only source of one. An icon-only
 * button still carries its own `aria-label` — a screen reader user who never
 * hovers would otherwise meet an unnamed button.
 *
 * The provider is bundled in so a single tooltip works with no setup. An
 * application with many can hoist one Reka `TooltipProvider` higher later,
 * which is what shares the hover delay across them.
 */
withDefaults(
  defineProps<{
    /** The hint text. The default slot overrides it where the hint needs markup. */
    content?: string;
    /** The edge of the trigger to anchor against, before collision flipping. */
    side?: TooltipSide;
    /** Gap in pixels between the trigger and the tip. */
    sideOffset?: number;
    /** Milliseconds of hover before the tip appears. Keyboard focus is always immediate. */
    delay?: number;
    /** Drive the tip from the host with `v-model:open` — an onboarding hint, say. Omit it for hover and focus alone. */
    open?: boolean | undefined;
  }>(),
  // `open: undefined` is load-bearing, not a redundant default — it is what
  // keeps the uncontrolled third state reachable past Vue's absent-Boolean
  // casting. `optional()` in the template is the other half; its docblock
  // carries the reasoning for both. `content` needs no such entry: a string
  // prop is already `undefined` when absent.
  { open: undefined, side: "top", sideOffset: 6, delay: 300 },
);

defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <TooltipProvider :delay-duration="delay">
    <TooltipRoot v-bind="optional({ open })" @update:open="$emit('update:open', $event)">
      <!-- @slot The element the hint describes. Rendered `as-child`, so the
           caller's own element *is* the trigger and keeps its own accessible
           name. -->
      <TooltipTrigger as-child>
        <slot name="trigger" />
      </TooltipTrigger>

      <TooltipPortal>
        <TooltipContent
          :side="side"
          :side-offset="sideOffset"
          :class="
            cn(
              'z-overlay max-w-[16rem] rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md',
              // Scoped to the open state, never unconditional. Reka's Presence
              // keeps closed content mounted until an animationend arrives, and
              // a mount-only animation never fires a second one — so an
              // unconditional animation class leaves a stray tip in the page.
              // Scoped, the closed element computes `animation-name: none` and
              // Presence unmounts it at once; the paired exit is precisely what
              // Presence is waiting to hold it for.
              //
              // `delayed-open` rather than `open`: the animation belongs to the
              // hover path, which the user waited for. A tip opened by keyboard
              // focus appears instantly, because a keyboard user asked for it
              // deliberately and has nothing to wait through. The exit needs no
              // such split — Reka reports both open flavours as plain `closed`
              // on the way out, so one class answers them both.
              'data-[state=delayed-open]:animate-scale-in data-[state=closed]:animate-scale-out',
            )
          "
          style="transform-origin: var(--reka-popper-transform-origin)"
        >
          <!-- @slot The hint, where markup is needed. Takes precedence over
               `content`. Nothing interactive belongs here — a tooltip cannot be
               reached by keyboard or pointer. -->
          <slot>{{ content }}</slot>
          <TooltipArrow class="fill-foreground" :width="10" :height="5" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
