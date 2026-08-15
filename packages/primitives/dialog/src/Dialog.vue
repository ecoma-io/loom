<script lang="ts">
/**
 * The one thing this component says on its own account.
 *
 * Everything else on the surface is the host's — `title`, `description`, the
 * body and the footer all arrive as props or slots — so the corner close
 * control is the whole of Dialog's vocabulary. Its glyph is `aria-hidden` by
 * construction, which makes this name the only thing a screen reader has to go
 * on rather than a nicety on top of visible text.
 */
export interface DialogLabels {
  /** The corner control that dismisses the dialog. */
  readonly close: string;
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const DIALOG_LABELS: DialogLabels = {
  close: "Close",
};

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
import { cn } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";

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
const props = withDefaults(
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
    /**
     * The name on the close control, as any subset of `DialogLabels` — what it
     * leaves out stays as the host's `provideLoomLabels` vocabulary left it,
     * and then as Loom's English.
     *
     * A whole application's language belongs in that vocabulary rather than
     * here. This is the per-instance correction, for the dialog whose close
     * means something more specific than "Close" — "Stop importing", say.
     */
    labels?: LabelOverrides<DialogLabels>;
  }>(),
  // `open: undefined` is load-bearing, not a redundant default — it is what
  // keeps the uncontrolled third state reachable past Vue's absent-Boolean
  // casting. `optional()` in the template is the other half; its docblock
  // carries the reasoning for both. `description` needs no such entry: a
  // string prop is already `undefined` when absent.
  { open: undefined, hideTitle: false, closable: true, size: "md" },
);

defineEmits<{ "update:open": [value: boolean] }>();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("dialog", DIALOG_LABELS, () => props.labels);
</script>

<template>
  <DialogRoot v-bind="optional({ open })" @update:open="$emit('update:open', $event)">
    <!-- @slot The control that opens the dialog. Optional — omit it and drive
         the dialog entirely from the host with `v-model:open`. -->
    <DialogTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </DialogTrigger>

    <DialogPortal>
      <!-- The heavy weight on purpose: at `scrim`'s 70% the page behind reads
           as context, and at 60% it read as competing content. It fades rather
           than moves, so nothing behind the dialog appears to shift. The exit
           is shorter than the entrance by design — `theme.css` carries the
           argument, and a scrim that lingers on the way out is a page that
           feels slow to give itself back. -->
      <DialogOverlay
        class="fixed inset-0 z-50 bg-foreground/scrim data-[state=open]:animate-fade data-[state=closed]:animate-fade-out"
      />
      <DialogContent
        :class="
          cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            SIZE_CLASS[size],
            'rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-lg outline-none',
            // Both states scoped, never unconditional. Reka's Presence keeps
            // closed content mounted until an animationend arrives, and a
            // mount-only animation never fires a second one — which here would
            // strand a full-screen, input-blocking overlay over a page with no
            // dialog on it. The paired exit does not reintroduce that: an
            // animation that ends is precisely what Presence is waiting for,
            // and under `prefers-reduced-motion` the 0.01ms collapse still
            // fires `animationend`. What it removes is the asymmetry — a panel
            // that scaled in over 140ms used to vanish between two frames,
            // which reads as a crash rather than as a close.
            'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out',
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
          :aria-label="text.close"
          class="absolute right-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X class="h-4 w-4" />
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
