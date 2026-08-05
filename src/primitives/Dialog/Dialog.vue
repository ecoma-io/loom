<script lang="ts">
/**
 * How wide the task surface gets. Width is the primitive's decision rather
 * than a class a caller passes, so three dialogs opened from three screens
 * cannot be three different widths: `md` for a confirm or a short form, `lg`
 * for a form with several sections, `xl` for an authoring surface — an editor
 * living inside a dialog.
 */
export type DialogSize = "md" | "lg" | "xl";

/**
 * Each width is capped against the viewport, so the largest sizes stay usable
 * on a laptop instead of running off the screen. `satisfies` is what keeps the
 * map and the union honest: adding a member to one and not the other stops
 * compiling.
 */
const SIZE_CLASS = {
  md: "w-[min(92vw,32rem)]",
  lg: "w-[min(92vw,44rem)]",
  xl: "w-[min(94vw,64rem)]",
} satisfies Record<DialogSize, string>;
</script>

<script setup lang="ts">
import {
  DialogRoot,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "reka-ui";
import { X } from "@lucide/vue";
import { cn } from "../../lib/cn";
import { optional } from "../../lib/props";

/**
 * Dialog — a modal task surface that blocks the rest of the UI until it is
 * resolved: confirming a destructive action, or a form that deserves the
 * user's whole attention.
 *
 * The escape contract, and it is the strictest of the overlays: opening moves
 * focus into the panel and *traps* it there, so Tab cycles the dialog's own
 * controls and never reaches the page behind. Esc, the overlay and the close
 * button all close it; closing returns focus to whatever opened it. The page
 * behind does not scroll while it is open. Everything outside the panel is
 * hidden from assistive technology, which is what makes the block real rather
 * than visual.
 *
 * `title` is a required prop rather than optional chrome: without a rendered
 * title the dialog has no accessible name, and a screen reader announces a
 * modal that says nothing about what it is asking. Pass `hideTitle` to keep it
 * for assistive technology while dropping it from the visual layout.
 *
 * Reach for `Popover` when the panel is non-blocking secondary content, and a
 * transient notification when the user need not act at all.
 */
withDefaults(
  defineProps<{
    /** Drive the dialog from the host with `v-model:open`; omit it and the dialog owns its own state. */
    open?: boolean | undefined;
    /** The accessible name, and the question the dialog is asking. State the consequence ("Delete scene?"), not "Are you sure?". */
    title: string;
    /** Wired as the dialog's accessible description — the consequence line, rather than loose body text. */
    description?: string;
    /** Keep the title as the accessible name but drop it from the visual layout. */
    hideTitle?: boolean;
    /** Show the close affordance in the top corner. Esc and an overlay click close the dialog either way. */
    closable?: boolean;
    /** Panel width. `md` confirms, `lg` multi-section forms, `xl` authoring surfaces. */
    size?: DialogSize;
  }>(),
  // `open: undefined` is load-bearing, not a redundant default — it is what
  // keeps the uncontrolled third state reachable past Vue's absent-Boolean
  // casting. `optional()` in the template is the other half; its docblock
  // carries the reasoning for both. `description` needs no such entry: a
  // string prop is already `undefined` when absent.
  { open: undefined, hideTitle: false, closable: true, size: "md" },
);

defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <DialogRoot v-bind="optional({ open })" @update:open="$emit('update:open', $event)">
    <!-- @slot The control that opens the dialog. Optional — omit it and drive
         the dialog entirely from the host with `v-model:open`. -->
    <DialogTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>

    <DialogPortal>
      <!-- The scrim is heavy on purpose: at 70% the page behind reads as
           context, and at 60% it read as competing content. It fades rather
           than moves, so nothing behind the dialog appears to shift. -->
      <DialogOverlay class="fixed inset-0 z-50 bg-foreground/70 data-[state=open]:animate-fade" />
      <DialogContent
        :class="
          cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            SIZE_CLASS[size],
            'rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-lg outline-none',
            // Scoped to the open state, never unconditional. Reka's Presence
            // keeps closed content mounted until an animationend arrives, and a
            // mount-only animation never fires a second one — which here would
            // strand a full-screen, input-blocking overlay over a page with no
            // dialog on it. Scoped, the closed element computes
            // `animation-name: none` and Presence unmounts it at once.
            'data-[state=open]:animate-scale-in',
          )
        "
      >
        <DialogTitle :class="cn('text-base font-semibold', hideTitle && 'sr-only')">
          {{ title }}
        </DialogTitle>
        <DialogDescription v-if="description" class="mt-1 text-sm text-muted-foreground">
          {{ description }}
        </DialogDescription>

        <!-- The gap above the body is dropped when nothing visible precedes
             it, so a dialog with a hidden title and no description does not
             open with an empty band at the top. -->
        <div :class="cn((description || !hideTitle) && 'mt-4')">
          <!-- @slot The dialog body. -->
          <slot />
        </div>

        <!-- @slot The action row, aligned to the trailing edge. -->
        <div v-if="$slots.footer" class="mt-6 flex items-center justify-end gap-2">
          <slot name="footer" />
        </div>

        <DialogClose
          v-if="closable"
          aria-label="Close"
          class="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X class="h-4 w-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
