<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * The track's thickness. Deliberately *not* the shared control-height scale a
 * Select or a TextField uses: a bar is a stroke laid under a heading or inside
 * a table row, never a control a person clicks into, so lining it up with a
 * 36px input would only make it a slab. `md` is the thickness every caller got
 * before this prop existed and stays the default for exactly that reason.
 */
export type ProgressSize = "sm" | "md" | "lg";

export const progressVariants = cva("relative w-full overflow-hidden rounded-full bg-muted", {
  variants: {
    size: {
      sm: "h-1",
      md: "h-2",
      lg: "h-3",
    } satisfies Record<ProgressSize, string>,
  },
  defaultVariants: { size: "md" },
});
</script>

<script setup lang="ts">
import { computed } from "vue";
import { ProgressRoot, ProgressIndicator } from "reka-ui";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * Progress — determinate progress bar for a task whose extent as a percentage
 * is known (upload %, step 3 of 5). `modelValue` null/undefined renders the
 * *indeterminate* state — an empty track, since there is no percentage yet to
 * paint. For a wait of unknown duration with no percentage at all, use
 * Spinner instead of guessing a Progress value. For the same number drawn as
 * a ring — a dashboard tile, a quota, a score where the circle is the visual
 * — use RadialProgress, which mirrors this contract exactly.
 *
 * Built on Reka UI's Progress: role="progressbar" + aria-valuenow/min/max set
 * on the root automatically. `ariaLabel`/`ariaLabelledby` are bound onto
 * ProgressRoot (fallthrough overrides Reka's own generated "`NN%`" label) so
 * the accessible name describes *what* is loading, not just how much.
 */
const props = withDefaults(
  defineProps<{
    /** The completed amount, 0–`max`; `null`/omitted renders indeterminate. */
    modelValue?: number | null;
    /** The value that reads as 100% complete. */
    max?: number;
    /** Track thickness. Its own scale, not the control-height scale — a bar is a stroke, not a form control. */
    size?: ProgressSize;
    /** Print the rounded percentage as text beside the track. While indeterminate it prints an em dash, never a number. */
    showValue?: boolean;
    /** Accessible name describing the task, overriding Reka's default `NN%` label. */
    ariaLabel?: string;
    /** Accessible name sourced from another element's id, in place of `ariaLabel`. */
    ariaLabelledby?: string;
  }>(),
  {
    max: 100,
    size: "md",
    showValue: false,
  },
);

/** The readout tracks the track: a 1px bar with 14px digits beside it is not one object. */
const VALUE_TEXT = {
  sm: "text-micro",
  md: "text-xs",
  lg: "text-sm",
} satisfies Record<ProgressSize, string>;

// `showValue` changes which node is outermost, so fallthrough can no longer be
// left to Vue: `class` goes to whatever the caller sees as the component's box
// — the flex row when there is a readout, the track itself when the track is
// all there is — and everything else (aria-describedby, data-testid) goes to
// ProgressRoot, which is the element carrying role="progressbar" and therefore
// the one those attributes are describing.
//
// The two branches are written out rather than always wrapping the track in a
// row, because a bare Progress has to keep the exact box it had before
// `showValue` existed — a wrapper, even an empty one, changes how it sits in
// a flex or grid parent.
//
// Nothing may sit beside those two branches at the top level of the template,
// comments included: a second root node turns the component into a fragment,
// and the attributes routed by hand above then have nowhere single to land.
//
// Routing `class` through `cn()` also settles a fight that used to be decided
// by stylesheet order: Vue's own fallthrough merge concatenates, so a caller's
// `bg-primary` sat alongside the track's `bg-muted` rather than replacing it.
defineOptions({ inheritAttrs: false });
const { attrs, rest } = useSplitAttrs();

/**
 * The value the bar itself is given, clamped into [0, max]; null while
 * indeterminate. The clamp has to happen here rather than only on the way to
 * the transform below: `aria-valuenow` is generated from whatever ProgressRoot
 * receives, so handing it the raw prop announces a number outside the range
 * `aria-valuemin`/`aria-valuemax` declare — "150 percent" read out over a bar
 * painted at 100.
 */
const value = computed<number | null>(() =>
  props.modelValue === null || props.modelValue === undefined
    ? null
    : Math.min(Math.max(props.modelValue, 0), props.max),
);

/** Percentage 0–100, derived from the clamped value; null while indeterminate. */
const pct = computed<number | null>(() =>
  value.value === null ? null : (value.value / props.max) * 100,
);

/**
 * Everything ProgressRoot is given in both branches of the template. `rest`
 * lands last so a caller passing a bare `aria-label` attribute still wins over
 * the prop, which is the precedence Vue's own fallthrough gave before this
 * component took the attributes over by hand.
 */
const rootAttrs = computed(() => ({
  modelValue: value.value,
  max: props.max,
  "aria-label": props.ariaLabel,
  "aria-labelledby": props.ariaLabelledby,
  ...rest.value,
}));

// Determinate: a full-width bar slid left by the remaining percentage
// (transform eased over --duration-slow). Indeterminate: a short segment
// sweeping the track on a loop, since there is no percentage to paint.
// Completion beat: at 100% the fill turns success (Loom dual-force law — a
// finished piece of work reads as done at a glance), eased in over the same
// --duration-slow lane via the background transition.
const indicatorClass = computed(() =>
  cn(
    "h-full",
    pct.value === 100 ? "bg-success" : "bg-primary",
    pct.value === null && "w-1/3 animate-progress-indeterminate rounded-full",
  ),
);

const indicatorStyle = computed(() =>
  pct.value === null
    ? undefined
    : {
        transition:
          "transform var(--duration-slow) var(--ease-out), background-color var(--duration-slow) var(--ease-out)",
        transform: `translateX(-${100 - pct.value}%)`,
      },
);

/**
 * An indeterminate bar has no percentage, so the readout prints an em dash
 * rather than the `0%` a naive `pct ?? 0` would produce — "we do not know yet"
 * and "none of it is done" are different facts, and only one of them is true.
 */
const readout = computed(() => (pct.value === null ? "—" : `${Math.round(pct.value)}%`));

defineExpose({ pct });
</script>

<template>
  <ProgressRoot
    v-if="!showValue"
    v-bind="rootAttrs"
    :class="cn(progressVariants({ size }), attrs.class as string)"
  >
    <ProgressIndicator :class="indicatorClass" :style="indicatorStyle" />
  </ProgressRoot>

  <div v-else :class="cn('flex w-full items-center gap-3', attrs.class as string)">
    <ProgressRoot
      v-bind="rootAttrs"
      :class="cn(progressVariants({ size }), 'w-auto min-w-0 flex-1')"
    >
      <ProgressIndicator :class="indicatorClass" :style="indicatorStyle" />
    </ProgressRoot>
    <!-- Hidden from assistive tech: the progressbar already announces this
         number through `aria-valuenow`, and a visible copy beside it is read
         out a second time as loose text. Fixed width so the track does not
         resize itself every time the digit count changes. -->
    <span
      aria-hidden="true"
      :class="cn('tabular w-10 shrink-0 text-right text-muted-foreground', VALUE_TEXT[size])"
      >{{ readout }}</span
    >
  </div>
</template>
