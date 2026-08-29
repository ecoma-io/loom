<script lang="ts">
import type { AlertLabels } from "@ecoma-io/loom-labels";

/**
 * The feedback tones, matching Toast and Badge so one functional hue means
 * one thing everywhere. `neutral` is the default because an alert's first
 * job is to be seen at all, not to alarm.
 */
export type AlertVariant = "neutral" | "info" | "success" | "warning" | "destructive";

/**
 * Loom's English, co-located with the component so it tree-shakes with it,
 * and exported so a host can build a partial vocabulary against the real
 * thing rather than a transcription of it.
 */
export const ALERT_LABELS: AlertLabels = {
  dismiss: "Dismiss",
};
</script>

<script setup lang="ts">
import { computed, ref } from "vue";
import { Info, CircleCheck, TriangleAlert, CircleX, X } from "@lucide/vue";
import IconButton from "@ecoma-io/loom-icon-button";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";
import { cn } from "@ecoma-io/loom-core";

const props = withDefaults(
  defineProps<{
    /** Selects the tinted wash and the default icon. */
    variant?: AlertVariant;
    /** The headline. Optional — a one-line alert can speak through its body alone. */
    title?: string;
    /** The detail line below the title. Longer content belongs in the default slot. */
    description?: string;
    /** Shows the dismiss control and lets the alert leave; pair with `v-model:open`. */
    dismissible?: boolean;
    /**
     * Controls visibility. Omit it and the alert owns its own state until
     * dismissed; pass bindings through `v-model:open` to own it yourself.
     * Pick one mode per instance and stay there: while the prop is bound the
     * internal state never moves, so removing the binding later brings back
     * whatever the host last left visible.
     */
    open?: boolean | undefined;
    /** Names for what the alert says on its own account, as any subset of `AlertLabels`. */
    labels?: LabelOverrides<AlertLabels>;
    /**
     * How assertively the alert announces itself, overriding the per-tone
     * default. Destructive and warning news are assertive `role="alert"`
     * interruptions; neutral, info and success are polite `role="status"` —
     * a "Saved" note should not cut off what is being read. `"off"` removes
     * the live semantics for surfaces that are not interruptions at all,
     * such as a static wall of notices.
     */
    live?: "assertive" | "polite" | "off";
  }>(),
  {
    // `undefined` is the uncontrolled state, and only an explicit default
    // keeps it reachable past Vue's Boolean casting.
    open: undefined,
    variant: "neutral",
    dismissible: false,
  },
);

const emit = defineEmits<{ "update:open": [value: boolean] }>();

// `<Transition>` cannot pass fallthrough attributes through to its child —
// a `class` or `@click` on the caller's `<Alert>` would land on the
// Transition node and vanish. Opting out and forwarding by hand is what
// keeps this component ordinary from the outside.
defineOptions({ inheritAttrs: false });

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("alert", ALERT_LABELS, () => props.labels);

/**
 * Per-tone accent icon and measured wash. The tinted pairs are the same ones
 * Badge paints (`bg-*-muted text-*-text`) because those are the tokens mixed
 * to hold their contrast in both themes; `-text`, never the bare `warning`,
 * for the failure Badge records. `neutral` carries no icon of its own — an
 * unremarkable note does not need one, and the slot remains available.
 */
const TONE_ACCENTS = {
  // Badge's own neutral pair: the recessed well, not a borrowed status hue.
  neutral: { icon: undefined, wash: "bg-subtle text-subtle-foreground" },
  info: { icon: Info, wash: "bg-info-muted text-info-text" },
  success: { icon: CircleCheck, wash: "bg-success-muted text-success-text" },
  warning: { icon: TriangleAlert, wash: "bg-warning-muted text-warning-text" },
  destructive: { icon: CircleX, wash: "bg-destructive-muted text-destructive-text" },
} satisfies Record<AlertVariant, { icon: typeof Info | undefined; wash: string }>;

// Controlled/uncontrolled split by hand — there is no Reka root to lean on,
// and `optional()` exists for exactly the prop-forwarding case this is not.
const innerOpen = ref(true);
const isOpen = computed(() => props.open ?? innerOpen.value);

function dismiss(): void {
  if (props.open === undefined) innerOpen.value = false;
  emit("update:open", false);
}

const accent = computed(() => TONE_ACCENTS[props.variant]);

// The interruption an alert makes follows its stakes: failure and warning
// news is the assertive role, the rest polite. A live region that says
// "Saved" on every save should not be cutting off whatever is being read.
const live = computed<"assertive" | "polite" | "off">(
  () =>
    props.live ??
    (props.variant === "destructive" || props.variant === "warning" ? "assertive" : "polite"),
);
</script>

<template>
  <!-- Enter rises like every revealed surface; exit falls back down it. Vue
       holds the leaving element itself, so no Presence machinery is needed
       the way it is under Reka, and the global reduced-motion collapse still
       ends both phases instantly — dismissal stays immediate for readers who
       asked for less motion. -->
  <Transition enter-active-class="animate-fade-rise" leave-active-class="animate-fade-fall">
    <div
      v-if="isOpen"
      v-bind="$attrs"
      :role="live === 'off' ? undefined : live === 'assertive' ? 'alert' : 'status'"
      :class="cn('flex items-start gap-3 rounded-md border border-transparent p-3', accent?.wash)"
    >
      <slot name="icon">
        <component
          :is="accent.icon"
          v-if="accent?.icon"
          class="mt-0.5 h-4 w-4 shrink-0"
          aria-hidden="true"
        />
      </slot>

      <div class="min-w-0 flex-1 break-words">
        <p v-if="title" class="text-sm font-medium">{{ title }}</p>
        <p v-if="description" :class="cn('text-small', title && 'mt-0.5')">
          {{ description }}
        </p>
        <!-- @slot Anything beyond a title and one line of detail — a list of
             what failed, a link out. Rendered after the description, inside
             the tone's measured text colour. -->
        <div v-if="$slots.default" :class="cn((title || description) && 'mt-1')">
          <slot />
        </div>
      </div>

      <!-- In the flow, not overlaid: an absolutely-positioned close control
           collides with long titles at narrow widths, which is exactly where
           alerts wrap. -->
      <IconButton
        v-if="dismissible"
        variant="ghost"
        size="sm"
        :label="text.dismiss"
        class="-mr-1 -mt-1 shrink-0"
        @click="dismiss()"
      >
        <X class="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </div>
  </Transition>
</template>
