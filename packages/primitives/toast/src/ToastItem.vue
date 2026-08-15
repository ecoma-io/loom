<script lang="ts">
import type { LabelOf } from "@ecoma-io/loom-labels";

/**
 * Everything a toast publishes that is not the host's own copy — including the
 * two strings Reka UI would otherwise supply in English of its own accord.
 *
 * Declared here rather than in `Toast.vue`, which is where a reader would look
 * for it, and the reason is a module cycle rather than a preference.
 * `Toast.vue` imports this file; this file needs the defaults for the close
 * control it renders. Declaring them in `Toast.vue` and importing them back
 * would make that a real runtime cycle where today it is a type-only one, and
 * it would cost the block that reuses this card — `ToastStack` mounts
 * `ToastItem` directly through its own provider — the whole seam. Owning them
 * here means every card resolves its own names wherever it is mounted.
 *
 * `announce` and `region` are not decoration. Reka's `ToastProvider` defaults
 * its `label` to "Notification" and reads it out ahead of every toast's own
 * text in a hidden live region; its `ToastViewport` names the list
 * "Notifications ({hotkey})". Both are real props rather than hard-coded
 * vnode attributes, so these are set rather than overridden — but leaving
 * either unset falls back to English, not to nothing.
 */
export interface ToastLabels {
  /** The ✕ control on the card. */
  readonly close: string;
  /**
   * Spoken before each toast's own title, in a hidden live region, to say what
   * kind of thing has just arrived. Keep it to one word — it is a prefix on
   * every announcement, not a sentence.
   */
  readonly announce: string;
  /**
   * The name of the list the toasts stack in. `hotkey` is the key that focuses
   * it, as the environment reports it ("F8"), handed over raw so a language
   * can put it wherever it belongs in the phrase.
   */
  readonly region: LabelOf<{ hotkey: string }>;
}

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
  warning: { icon: TriangleAlert, color: "text-warning" },
  destructive: { icon: CircleX, color: "text-destructive-text" },
  accent: { icon: Sparkles, color: "text-primary-text" },
} satisfies Record<ToastVariant, { icon: typeof Info; color: string }>;

const accent = computed(() => toastAccents[props.variant]);
</script>

<template>
  <!-- The slide-in animation rides this inner card, never ToastRoot: Reka
       drives ToastRoot's own transform for the swipe-to-dismiss gesture, so a
       filled entrance transform there would freeze the swipe. ToastRoot itself
       carries no animation, so Reka Presence unmounts it immediately on close. -->
  <ToastRoot
    v-bind="optional({ open })"
    :duration="duration"
    class="outline-none"
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
