<script lang="ts">
export type ToastVariant = "info" | "success" | "warning" | "destructive" | "ai";
</script>

<script setup lang="ts">
import { ToastProvider, ToastViewport } from "reka-ui";
import { optional } from "../../lib/props";
import ToastItem from "./ToastItem.vue";

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
withDefaults(
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
</script>

<template>
  <ToastProvider>
    <ToastItem
      v-bind="optional({ open, description, actionLabel })"
      :title="title"
      :variant="variant"
      :duration="duration"
      :closable="closable"
      @update:open="$emit('update:open', $event)"
      @action="$emit('action')"
    />

    <ToastViewport
      class="fixed bottom-0 right-0 z-toast flex w-[min(92vw,24rem)] flex-col gap-2 p-4 outline-none"
    />
  </ToastProvider>
</template>
