<script lang="ts">
export type ToastVariant = "info" | "success" | "warning" | "destructive" | "accent";

// Re-exported so the vocabulary is reachable from the component a consumer
// actually imports. It is declared in `ToastItem.vue` — which is where the ✕
// it names is rendered, and which `ToastStack` mounts without this file in the
// picture at all — and that file's docblock carries why the direction cannot
// be reversed.
export type { ToastLabels } from "@ecoma-io/loom-labels";
export { TOAST_LABELS } from "./ToastItem.vue";
</script>

<script setup lang="ts">
import { computed } from "vue";
import { ToastProvider, ToastViewport } from "reka-ui";
import { optional } from "@ecoma-io/loom-core";
import { useLabels, type LabelOverrides, type ToastLabels } from "@ecoma-io/loom-labels";
import ToastItem, { TOAST_LABELS } from "./ToastItem.vue";

/**
 * Toast — a transient, self-dismissing notification the user need not act on
 * (a save confirmed, an export finished, a recoverable error). Built on Reka
 * UI's Toast: it announces to assistive tech (`role`/`aria-live`), pauses on
 * hover/focus, and is swipe/Esc dismissible.
 *
 * Presentational and self-contained — the provider + viewport are bundled so a
 * single Toast works standalone (the card itself lives in the internal
 * `ToastItem`), and it stays free of any queue logic: the host owns *when*
 * toasts open (this primitive renders one). An app that shows several at once
 * has to keep its own queue and its own provider/viewport pair — several
 * standalone `Toast`s each bundling their own viewport would stack at the
 * same screen coordinates rather than list one below the next.
 *
 * For a blocking confirmation use `Dialog`; for a persistent field/section error
 * that must stay until resolved use `InlineError`.
 */
const props = withDefaults(
  defineProps<{
    /** Controls visibility; pair with `v-model:open`. Omit to let the toast own its own open state. */
    open?: boolean | undefined;
    /** The toast's headline — always shown. */
    title: string;
    /** An optional second line of detail below the title. */
    description?: string;
    /** Selects the accent icon and colour. */
    variant?: ToastVariant;
    /** ms before auto-dismiss; the Reka default pauses on hover/focus. */
    duration?: number;
    /** Shows the ✕ close button. */
    closable?: boolean;
    /** Renders a single inline action button; emits `action` when pressed. */
    actionLabel?: string;
    /**
     * Names for everything the toast says on its own account, as any subset of
     * `ToastLabels` — the ✕ control, the word spoken ahead of the
     * announcement, and the name of the region the cards stack in. What this
     * leaves out stays as the host's `provideLoomLabels` vocabulary left it,
     * and then as Loom's English.
     *
     * A whole application's language belongs in that vocabulary rather than
     * here; `title`, `description` and `actionLabel` are the per-instance copy.
     */
    labels?: LabelOverrides<ToastLabels>;
  }>(),
  {
    // `open` is tri-state and its third state is the default: `undefined`
    // means the toast has not been handed an owner and manages itself. Vue
    // would otherwise cast an absent Boolean prop to `false`, which reads as
    // "the host says closed" and leaves `<Toast title="…" />` rendering
    // nothing at all. Declaring the default explicitly is what keeps
    // `undefined` reachable.
    open: undefined,
    variant: "info",
    duration: 5000,
    closable: true,
  },
);

defineEmits<{ "update:open": [value: boolean]; action: [] }>();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("toast", TOAST_LABELS, () => props.labels);

// Reka's `ToastViewport` accepts its label as `(hotkey: string) => string` as
// well as a template with a `{hotkey}` hole in it, and the function form is the
// one this seam needs: the hole would be Loom deciding where the key sits in
// the phrase. Wrapped in a `computed` rather than written inline in the
// template so that the identity it hands Reka changes when — and only when —
// the resolved vocabulary does.
const regionLabel = computed(() => (hotkey: string) => text.value.region({ hotkey }));
</script>

<template>
  <!-- `label` is a real Reka prop rather than a hard-coded vnode attribute, so
       this sets it rather than racing it — but leaving it unset is not neutral:
       Reka reads out "Notification" ahead of every toast, in English, from a
       live region nothing else on the page can reach. -->
  <ToastProvider :label="text.announce">
    <ToastItem
      v-bind="optional({ open, description, actionLabel, labels })"
      :title="title"
      :variant="variant"
      :duration="duration"
      :closable="closable"
      @update:open="$emit('update:open', $event)"
      @action="$emit('action')"
    />

    <ToastViewport
      :label="regionLabel"
      class="fixed bottom-0 right-0 z-toast flex w-[min(92vw,24rem)] flex-col gap-2 p-4 outline-none"
    />
  </ToastProvider>
</template>
