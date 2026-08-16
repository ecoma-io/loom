<script lang="ts">
import type { AlertDialogLabels } from "@ecoma-io/loom-labels";
/**

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const ALERT_DIALOG_LABELS: AlertDialogLabels = {
  confirm: "Confirm",
  cancel: "Cancel",
};
</script>

<script setup lang="ts">
import { computed } from "vue";
import {
  AlertDialogRoot,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "reka-ui";
import { cn } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";
import { useSplitAttrs } from "@ecoma-io/loom-core";
import { buttonVariants } from "@ecoma-io/loom-button";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";

/**
 * AlertDialog — the modal that demands a decision before anything else
 * happens: "Delete this permanently?", "Discard unsaved changes?".
 *
 * It is `Dialog` with the exits removed, and that is the whole of the
 * difference. A `Dialog` is dismissible: Esc, a click on the overlay and the
 * close glyph all mean "not now", which is right for a task surface. An
 * AlertDialog has no such exit — a click outside does nothing, there is no
 * close glyph, and the only ways out are the two buttons. It carries
 * `role="alertdialog"`, so its description is announced with its name rather
 * than waiting to be navigated to.
 *
 * Reach for it only when dismissing by accident would lose work or destroy
 * something. Reach for `Dialog` for everything else — an AlertDialog used for
 * an ordinary form is a control that traps a reader for no reason.
 *
 * There is deliberately no body slot. A question that needs body content is a
 * task, and a task is a `Dialog`; keeping the surface to a title, a
 * consequence line and two buttons is what stops this component from becoming
 * an undismissible form.
 *
 * Initial focus lands on **Cancel**, never on the action. A destructive
 * confirm that focuses "Delete" turns a reflexive Enter — from a reader who
 * has not finished the sentence — into a deletion. Reka does this in
 * `AlertDialogContent`; the test pins it, because it is the single behaviour
 * this component exists to guarantee.
 */
const props = withDefaults(
  defineProps<{
    /** Drive the alert from the host with `v-model:open`; omit it and the alert owns its own state. */
    open?: boolean | undefined;
    /** The accessible name, and the decision being asked for. State the consequence ("Delete scene?"), not "Are you sure?". */
    title: string;
    /** The consequence line, announced with the title rather than found later. Omit it only when the title already says everything. */
    description?: string;
    /** Paints the action in the destructive language. The verb in `labels.confirm` is what carries the meaning; this only adds emphasis to it. */
    destructive?: boolean;
    /**
     * The two button names, as any subset of `AlertDialogLabels` — what it
     * leaves out stays as the host's `provideLoomLabels` vocabulary left it,
     * and then as Loom's English.
     *
     * **`confirm` is meant to be set here on all but the rarest alert**, since
     * the verb is what tells a reader what the button does; `cancel` belongs in
     * the application's vocabulary, where it is written once.
     */
    labels?: LabelOverrides<AlertDialogLabels>;
  }>(),
  // `open: undefined` is load-bearing, not a redundant default — it is what
  // keeps the uncontrolled third state reachable past Vue's absent-Boolean
  // casting, and `optional()` in the template is the other half. Its docblock
  // carries the reasoning for both.
  {
    open: undefined,
    destructive: false,
  },
);

defineEmits<{
  /** The reader chose the action. The alert does not close itself — the host decides, so a failed save can keep it open. */
  confirm: [];
  /** The reader backed out, by the cancel button or by Esc. */
  cancel: [];
  /** A close was requested. Fires alongside `confirm` and `cancel`, so a host driving `v-model:open` needs only this one. */
  "update:open": [value: boolean];
}>();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("alertDialog", ALERT_DIALOG_LABELS, () => props.labels);

// The root renders no DOM node at all, so fallthrough attributes would be
// dropped on the floor rather than landing anywhere. They go to the panel,
// which is the only element this component reliably renders — there may be no
// trigger at all when the host drives `open` itself.
//
// `class` is pulled out of that spread and merged through `cn()` instead:
// spreading it alongside the panel's own `:class` only concatenates the two
// lists, so a caller's width silently wins or loses depending on which utility
// Tailwind happened to emit last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: panelAttrs } = useSplitAttrs();

// Reka wires `aria-describedby` to its own description id unconditionally, so
// a panel rendered without a description ships a reference to an element that
// does not exist. That is not cosmetic here: `role="alertdialog"` earns its
// keep by having the description announced with the name, and a dangling IDREF
// announces nothing. Clearing the attribute is what removes it — fallthrough
// attributes are merged after Reka's own, and Vue drops an attribute bound to
// `undefined`. A caller's own `aria-describedby` still wins, because
// `panelAttrs` is spread last.
const panelBindings = computed(() => ({
  ...(props.description ? {} : { "aria-describedby": undefined }),
  ...panelAttrs.value,
}));
</script>

<template>
  <AlertDialogRoot v-bind="optional({ open })" @update:open="$emit('update:open', $event)">
    <!-- @slot The control that opens the alert. Optional — omit it and drive
         the alert entirely from the host with `v-model:open`. -->
    <AlertDialogTrigger v-if="$slots.trigger" as-child>
      <slot name="trigger" />
    </AlertDialogTrigger>

    <AlertDialogPortal>
      <!-- Same scrim as Dialog, and it is inert here: Reka's AlertDialogContent
           prevents both `pointerDownOutside` and `interactOutside`, so a click
           lands on nothing. That is the point — an accidental click at the edge
           of the screen must not be able to answer the question. -->
      <AlertDialogOverlay
        class="fixed inset-0 z-50 bg-foreground/70 data-[state=open]:animate-fade"
      />
      <AlertDialogContent
        v-bind="panelBindings"
        :data-destructive="destructive || undefined"
        :class="
          cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            // One width, and no `size` prop to vary it. A decision has one
            // shape; the wider panels exist on Dialog because an authoring
            // surface needs them, and there is no authoring surface here.
            'w-[min(92vw,32rem)]',
            'rounded-lg border border-border bg-popover p-6 text-popover-foreground shadow-lg outline-none',
            // Scoped to the open state, never unconditional. Reka's Presence
            // keeps closed content mounted until an animationend arrives, and a
            // mount-only animation never fires a second one — which here would
            // strand a full-screen, input-blocking overlay over a page with no
            // alert on it. Scoped, the closed element computes
            // `animation-name: none` and Presence unmounts it at once.
            'data-[state=open]:animate-scale-in',
            attrs.class as string,
          )
        "
        @escape-key-down="$emit('cancel')"
      >
        <AlertDialogTitle class="text-base font-semibold">{{ title }}</AlertDialogTitle>
        <AlertDialogDescription v-if="description" class="mt-1 text-sm text-muted-foreground">
          {{ description }}
        </AlertDialogDescription>

        <div class="mt-6 flex items-center justify-end gap-2">
          <!-- Cancel is first in the DOM as well as first visually, so the
               order a screen reader reads matches the order the eye does. It is
               also the element Reka focuses on open. -->
          <AlertDialogCancel
            :class="buttonVariants({ variant: 'subtle' })"
            @click="$emit('cancel')"
          >
            {{ text.cancel }}
          </AlertDialogCancel>
          <!-- The destructive paint is emphasis, not the signal. What tells a
               reader this button destroys something is the verb in its label,
               which is why `labels.confirm` is meant to be replaced rather than
               left as "Confirm". -->
          <AlertDialogAction
            :class="buttonVariants({ variant: destructive ? 'destructive' : 'primary' })"
            @click="$emit('confirm')"
          >
            {{ text.confirm }}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
