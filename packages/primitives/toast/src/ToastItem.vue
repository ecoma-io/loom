<script lang="ts">
import type { ToastLabels } from "@ecoma-io/loom-labels";

/**

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const TOAST_LABELS: ToastLabels = {
  close: "Close",
  announce: "Notification",
  region: ({ hotkey }) => `Notifications (${hotkey})`,
};
</script>

<script setup lang="ts">
import { computed } from "vue";
import { ToastRoot, ToastTitle, ToastDescription, ToastAction, ToastClose } from "reka-ui";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";
import { Info, CircleCheck, TriangleAlert, CircleX, Sparkles, X } from "@lucide/vue";
import { cn } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";
import type { ToastVariant } from "./Toast.vue";

/**
 * ToastItem — one toast card (ToastRoot + Loom treatment), INTERNAL to
 * the design system. It must live inside a `ToastProvider` whose
 * `ToastViewport` it teleports into: `Toast` bundles that pair for the
 * standalone case. Not exported from the barrel — hosts use `Toast`.
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
    /** Names for what the card says on its own account, as any subset of `ToastLabels`. */
    labels?: LabelOverrides<ToastLabels>;
  }>(),
  {
    // See Toast.vue: `undefined` is the uncontrolled state, and only an
    // explicit default keeps it reachable past Vue's Boolean casting.
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

// `satisfies` binds this map to ToastVariant so a variant added to the type
// without a matching entry here fails at compile time (Button's own idiom).
const toastAccents = {
  info: { icon: Info, color: "text-info-text" },
  success: { icon: CircleCheck, color: "text-success-text" },
  // `-text` like its four siblings. The bare `warning` hue is a fill colour —
  // as text it fails on the dark theme, and the functional `-text` tokens are
  // the ones measured legible on every surface (theme.css carries the ratios).
  warning: { icon: TriangleAlert, color: "text-warning-text" },
  destructive: { icon: CircleX, color: "text-destructive-text" },
  accent: { icon: Sparkles, color: "text-primary-text" },
} satisfies Record<ToastVariant, { icon: typeof Info; color: string }>;

const accent = computed(() => toastAccents[props.variant]);

// Severity alone decides how the toast interrupts (issue #91): a destructive
// report announced politely can be swallowed by whatever the screen reader is
// already saying — exactly the messages that must not be missed. The knob is
// Reka's own `type`: it hard-wires the hidden announce region's `role` to
// `alert` and picks that region's politeness from this prop — `foreground`
// announces `aria-live="assertive"`, `background` politely. Destructive
// routes foreground; every other severity stays polite, so an ordinary
// notification never interrupts. Deliberately no prop of Loom's own: the
// variant the card already carries *is* the severity, and a second way to set
// it would only let the two disagree.
const announceType = computed<"foreground" | "background">(() =>
  props.variant === "destructive" ? "foreground" : "background",
);
</script>

<template>
  <!-- Entrance and exit deliberately do not share an element, and the split is
       forced by Reka rather than taste. The swipe gesture marks ToastRoot
       itself (data-swipe plus --reka-toast-swipe-* custom properties), so the
       root's transform stays reserved and the entrance rides the inner card.
       The exit cannot ride along: Presence decides an element's fate by
       reading the computed animation-name of the node it mounted — never a
       descendant's — and by waiting for an animationend whose target is that
       same node (usePresence.js). A toast-out confined to the inner card would
       leave the root's own name `none` and be unmounted before its first
       frame; on ToastRoot it genuinely plays. -->
  <ToastRoot
    v-bind="optional({ open })"
    :type="announceType"
    :duration="duration"
    class="outline-none data-[state=closed]:animate-toast-out"
    @update:open="$emit('update:open', $event)"
  >
    <div
      :class="
        cn(
          'relative flex animate-toast-in items-start gap-3 rounded-md border border-border bg-popover p-3 pr-8 text-popover-foreground shadow-lg',
          // Accent variant: a highlighted border to draw attention to the
          // toast's distinctiveness from the standard variants.
          variant === 'accent' && 'border-primary/40',
        )
      "
    >
      <component
        :is="accent.icon"
        :class="cn('mt-0.5 h-4 w-4 shrink-0', accent.color)"
        aria-hidden="true"
      />
      <div class="min-w-0 flex-1">
        <ToastTitle class="text-sm font-medium">{{ title }}</ToastTitle>
        <ToastDescription v-if="description" class="mt-0.5 text-xs text-muted-foreground">
          {{ description }}
        </ToastDescription>
      </div>

      <ToastAction v-if="actionLabel" :alt-text="actionLabel" as-child @click="$emit('action')">
        <button
          type="button"
          class="shrink-0 rounded-sm px-2 py-1 text-xs font-medium text-primary-text transition-colors duration-fast ease-out hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {{ actionLabel }}
        </button>
      </ToastAction>

      <ToastClose
        v-if="closable"
        :aria-label="text.close"
        class="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <X class="h-3.5 w-3.5" />
      </ToastClose>
    </div>
  </ToastRoot>
</template>
