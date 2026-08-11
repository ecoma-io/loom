<script lang="ts">
import { cva } from "class-variance-authority";

/**
 * The ring's outer diameter. `sm` is a table-row or list-item marker, `md` a
 * card corner, `lg` the one on a dashboard tile where the ring is the whole
 * visual. Its own scale rather than the control-height scale a Select uses: a
 * ring is not a form control and never has to line up beside a text input.
 */
export type RadialProgressSize = "sm" | "md" | "lg";

/**
 * How heavy the ring's stroke is. Measured in the SVG's own units, so the
 * proportion of stroke to diameter holds at every `size` — a `thick` ring
 * reads as thick whether it is 40px or 96px across.
 */
export type RadialProgressThickness = "thin" | "regular" | "thick";

export const radialProgressVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center",
  {
    variants: {
      size: {
        sm: "h-10 w-10",
        md: "h-16 w-16",
        lg: "h-24 w-24",
      } satisfies Record<RadialProgressSize, string>,
    },
    defaultVariants: { size: "md" },
  },
);
</script>

<script setup lang="ts">
import { computed } from "vue";
import { ProgressRoot } from "reka-ui";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * RadialProgress — the same information Progress carries, drawn as a ring: a
 * dashboard tile, a quota, a score out of 100 where the circle *is* the
 * visual. Reach for Progress instead wherever the bar sits in a row of text
 * and its length is doing the comparing, and for Spinner when there is no
 * percentage at all — a ring with nothing to fill is a spinner wearing a
 * gauge's clothes.
 *
 * Its contract is Progress's, deliberately and to the letter: `null`/omitted
 * `modelValue` is indeterminate, the value is clamped into [0, max] for the
 * same reason, the arc turns `success` at 100%, and the accessible name comes
 * from `ariaLabel`/`ariaLabelledby`. Two components answering the same
 * question differently is worse than either answer.
 *
 * Reka's ProgressRoot is kept as the wrapper even though the fill below is an
 * SVG arc rather than a ProgressIndicator: the root is what emits
 * `role="progressbar"` and `aria-valuenow`/`aria-valuemin`/`aria-valuemax`,
 * and it is the only way this component and Progress cannot drift into
 * announcing the same number two different ways. ProgressIndicator is left out
 * because it exists to be translated inside an overflow-hidden track, which is
 * not how an arc is painted.
 */
const props = withDefaults(
  defineProps<{
    /** The completed amount, 0–`max`; `null`/omitted renders indeterminate. */
    modelValue?: number | null;
    /** The value that reads as 100% complete. */
    max?: number;
    /** The ring's outer diameter. */
    size?: RadialProgressSize;
    /** The weight of the ring's stroke, in proportion to its diameter. */
    thickness?: RadialProgressThickness;
    /** Print the rounded percentage in the ring's centre. On by default — an empty ring is a spinner. While indeterminate it prints an em dash, never a number. */
    showValue?: boolean;
    /** Accessible name describing the task, overriding Reka's default `NN%` label. */
    ariaLabel?: string;
    /** Accessible name sourced from another element's id, in place of `ariaLabel`. */
    ariaLabelledby?: string;
  }>(),
  {
    max: 100,
    size: "md",
    thickness: "regular",
    // On, unlike Progress's opt-in: a bar has a length a reader can compare
    // against its own track, and a ring does not — 70% and 80% are the same
    // arc to the eye. The number is what makes the ring readable.
    showValue: true,
  },
);

/**
 * The drawing is done in a fixed 100×100 user-unit box and scaled to whatever
 * `size` renders, so every number below is a proportion rather than a pixel
 * count and none of them has to be recomputed per size.
 */
const VIEW = 100;
const CENTRE = VIEW / 2;

const STROKE = {
  thin: 6,
  regular: 10,
  thick: 14,
} satisfies Record<RadialProgressThickness, number>;

/** The centre readout scales with the ring, or it overflows it at `sm`. */
const VALUE_TEXT = {
  sm: "text-micro",
  md: "text-sm",
  lg: "text-lg",
} satisfies Record<RadialProgressSize, string>;

// One rendered node, but `class` is still routed by hand: Vue's fallthrough
// merge concatenates, so a caller's `h-20 w-20` only beat the size variant's
// `h-16 w-16` if Tailwind happened to emit it later. `cn()` decides it. The
// rest of the fallthrough (aria-describedby, data-testid) lands on the same
// node, which is the one carrying role="progressbar".
defineOptions({ inheritAttrs: false });
const { attrs, rest } = useSplitAttrs();

/**
 * Clamped into [0, max] for the reason Progress's own comment gives:
 * `aria-valuenow` is generated from whatever ProgressRoot receives, so an
 * unclamped 150 is announced against an `aria-valuemax` of 100 while the arc
 * is painted full.
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

const strokeWidth = computed(() => STROKE[props.thickness]);

/**
 * An SVG stroke is centred on its path, so half of it falls outside the
 * circle's own radius. A radius of `CENTRE` therefore paints the outer half of
 * the stroke past the viewBox edge and the browser clips it — the flat top
 * that makes a radial progress look broken. Half the stroke width comes off
 * the radius so the ring's outer edge lands exactly on the box.
 */
const radius = computed(() => CENTRE - strokeWidth.value / 2);

/**
 * The dash pattern is measured along the path, so it depends on the radius —
 * which depends on `thickness`. Hard-coding a circumference works for exactly
 * one thickness and silently mis-fills every other one.
 */
const circumference = computed(() => 2 * Math.PI * radius.value);

/**
 * Determinate: one dash as long as the whole path, pushed back by the fraction
 * still to do. Indeterminate: a fixed quarter-turn segment, with the gap set
 * to the full circumference so nothing wraps round behind it while it spins.
 */
const dashArray = computed(() =>
  pct.value === null
    ? `${circumference.value * 0.25} ${circumference.value}`
    : `${circumference.value}`,
);

const dashOffset = computed(() =>
  pct.value === null ? 0 : circumference.value * (1 - pct.value / 100),
);

/**
 * A round cap at exactly 0% still paints a dot at twelve o'clock — a ring
 * showing nothing that reads as a couple of percent. Nothing done draws
 * nothing, so the cap squares off for that one value.
 */
const lineCap = computed(() => (pct.value === 0 ? "butt" : "round"));

/** Matches Progress: an em dash for "no percentage yet", never a false `0%`. */
const readout = computed(() => (pct.value === null ? "—" : `${Math.round(pct.value)}%`));

defineExpose({ pct });
</script>

<template>
  <ProgressRoot
    :model-value="value"
    :max="max"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    v-bind="rest"
    :class="cn(radialProgressVariants({ size }), attrs.class as string)"
  >
    <!-- Hidden from assistive tech in one piece: everything it draws is
         already announced by the progressbar above it, and the centre readout
         would otherwise be read a second time as loose text.

         Indeterminate spins the whole SVG rather than the arc inside it. The
         rotation is then an ordinary CSS transform on an HTML-positioned box,
         whose transform-origin is its own centre at every size — where a
         transform on an SVG child resolves against the viewBox and needs
         `transform-box` reasoning to stay centred. It is a CSS animation and
         not a JS ticker so the global prefers-reduced-motion rule in
         global.css collapses it, which a requestAnimationFrame loop would
         escape. The readout sits outside the SVG for the same reason: it must
         not spin with it. -->
    <svg
      :viewBox="`0 0 ${VIEW} ${VIEW}`"
      fill="none"
      aria-hidden="true"
      :class="cn('absolute inset-0 h-full w-full', pct === null && 'animate-spin')"
    >
      <circle
        :cx="CENTRE"
        :cy="CENTRE"
        :r="radius"
        :stroke-width="strokeWidth"
        class="stroke-muted"
      />
      <!-- Rotated by the SVG `transform` attribute about the box's centre
           rather than a CSS `-rotate-90`: the attribute is expressed in
           viewBox units, so twelve o'clock stays twelve o'clock at any
           rendered size, with no dependency on how the engine resolves
           transform-origin for an SVG child. An unrotated circle starts at
           three. -->
      <circle
        :cx="CENTRE"
        :cy="CENTRE"
        :r="radius"
        :stroke-width="strokeWidth"
        :stroke-dasharray="dashArray"
        :stroke-dashoffset="dashOffset"
        :stroke-linecap="lineCap"
        :transform="`rotate(-90 ${CENTRE} ${CENTRE})`"
        :class="pct === 100 ? 'stroke-success' : 'stroke-primary'"
        :style="
          pct === null
            ? undefined
            : {
                transition:
                  'stroke-dashoffset var(--duration-slow) var(--ease-out), stroke var(--duration-slow) var(--ease-out)',
              }
        "
      />
    </svg>
    <span
      v-if="showValue"
      aria-hidden="true"
      :class="cn('tabular text-foreground', VALUE_TEXT[size])"
      >{{ readout }}</span
    >
  </ProgressRoot>
</template>
