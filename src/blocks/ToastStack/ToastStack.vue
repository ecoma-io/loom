<script lang="ts">
import type { ToastVariant } from "../../primitives/Toast/Toast.vue";

/** One entry of a host-owned toast queue, rendered by `ToastStack`. */
export interface ToastStackItem {
  readonly id: string | number;
  readonly title: string;
  readonly description?: string;
  readonly variant?: ToastVariant;
  /** ms before auto-dismiss (default 4000 — a stack turns over faster than a lone toast). */
  readonly duration?: number;
}
</script>

<script setup lang="ts">
import { computed } from "vue";
import { ToastProvider, ToastViewport } from "reka-ui";
import { optional } from "../../lib/props";
import { useLabels, type LabelOverrides } from "../../lib/labels";
import ToastItem, { TOAST_LABELS, type ToastLabels } from "../../primitives/Toast/ToastItem.vue";

/**
 * ToastStack — renders a host-owned toast queue through ONE shared
 * provider/viewport, so simultaneous toasts stack vertically with a gap
 * instead of piling onto the same fixed corner (which is what N standalone
 * `Toast`s produce — each bundles its own viewport at the same coordinates).
 *
 * The queue stays the host's: the host passes the visible entries and
 * removes an entry when `dismiss` fires — on close, swipe, Esc, or
 * auto-dismiss alike. This block owns only the shared-viewport treatment.
 * Every rendered item is driven with `open` fixed to `true` — `ToastStack`
 * decides an entry is visible by including it in `items`, never by an
 * item's own open state, so there is no per-item boolean left unset for
 * Vue's absent-prop casting to catch.
 *
 * The viewport's geometry is written for the two ends of the range it
 * actually lands in. Width is `min(92vw, 24rem)`, so a phone gets a
 * near-full-bleed card and a desktop a bounded one. The bottom inset
 * resolves through `env(safe-area-inset-bottom)` — on a device with a home
 * indicator a flat `p-4` puts the newest toast, and its dismiss control,
 * under the system gesture bar. And the stack is height-bounded
 * (`max-h-dvh` + `overflow-hidden`) so a host that hands over more entries
 * than fit pushes the oldest off the top rather than growing a column
 * taller than the screen. `dvh`, not `vh`: mobile browser chrome collapses
 * the visual viewport and `vh` does not follow.
 */
const props = defineProps<{
  /** The host's visible toast queue, oldest first. */
  items: readonly ToastStackItem[];
  /**
   * Names for the two things the shared region says out loud, as any subset of
   * `ToastLabels` — the rest stay as the host's `provideLoomLabels` vocabulary
   * left them, and then as Loom's English.
   *
   * It resolves the same `toast` slot each `ToastItem` does, so a host that has
   * localised toasts anywhere has localised this too and needs nothing here.
   */
  labels?: LabelOverrides<ToastLabels>;
}>();

defineEmits<{ dismiss: [id: string | number] }>();

// This block owns a provider and a viewport of its own rather than borrowing
// `Toast`'s, which is the whole point of it — and that means it owns their two
// names as well. Left unset they are not unnamed: Reka defaults them to
// "Notification" and "Notifications ({hotkey})", English a host has no prop to
// reach, in the one live region a screen reader is sent to by a hotkey.
const text = useLabels("toast", TOAST_LABELS, () => props.labels);

// The function form rather than Reka's `{hotkey}` template, for the reason
// `Toast.vue` gives: the hole would be Loom deciding where the key sits in the
// phrase, and that is a property of the language.
const regionLabel = computed(() => (hotkey: string) => text.value.region({ hotkey }));
</script>

<template>
  <ToastProvider :label="text.announce">
    <ToastItem
      v-for="item in items"
      :key="item.id"
      :open="true"
      :title="item.title"
      v-bind="optional({ description: item.description, variant: item.variant })"
      :duration="item.duration ?? 4000"
      @update:open="(open) => !open && $emit('dismiss', item.id)"
    />

    <ToastViewport
      :label="regionLabel"
      class="fixed bottom-0 right-0 z-toast flex max-h-dvh w-[min(92vw,24rem)] flex-col gap-2 overflow-hidden p-4 pb-[max(1rem,env(safe-area-inset-bottom))] outline-none"
    />
  </ToastProvider>
</template>
