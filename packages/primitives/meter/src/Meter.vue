<script lang="ts">
import type { MeterLabels } from "@ecoma-io/loom-labels";
import { cva } from "class-variance-authority";

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const METER_LABELS: MeterLabels = {
  name: "Meter",
  valueText: ({ value, max }) => `${value} of ${max}`,
  optimal: "Optimal",
  cautionary: "Caution",
  critical: "Critical",
};

/**
 * The track's thickness, the same scale as Progress — a meter is a gauge, not a
 * form control, so it stays a stroke rather than aligning with input height.
 */
export type MeterSize = "sm" | "md" | "lg";

export const meterVariants = cva("relative w-full overflow-hidden rounded-full bg-muted", {
  variants: {
    size: {
      sm: "h-1",
      md: "h-2",
      lg: "h-3",
    } satisfies Record<MeterSize, string>,
  },
  defaultVariants: { size: "md" },
});
</script>

<script setup lang="ts">
import { computed, useId } from "vue";
import { Check, CircleAlert, X } from "@lucide/vue";
import { cn } from "@ecoma-io/loom-core";
import { useSplitAttrs } from "@ecoma-io/loom-core";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";

/**
 * Meter — a scalar capacity gauge on the WAI-ARIA meter role, visually a sibling
 * of Progress (same stroke scale, track/fill anatomy). Renders a measured
 * quantity against a known capacity — disk usage, budget consumption, seat
 * allocation — things that are not tasks and should never say "loading."
 *
 * Built directly on `<div role="meter">` rather than a headless component: the
 * ARIA meter role carries the same contract as the HTML meter element (min, max,
 * value, low, high, optimum) and a headless abstraction would add nothing but
 * an extra dependency — Progress uses Reka UI because progressbar's indeterminate
 * animation requires real DOM transitions Meter does not need.
 *
 * The accessible name is mandatory: a meter without a name is a number with no
 * referent. Four sources, resolved in order:
 * 1. `ariaLabelledby` (external element)
 * 2. `ariaLabel` (explicit string, no visible text)
 * 3. `label` (visible text, same string as the name)
 * 4. `text.name` (the labels-seam fallback — guaranteed non-empty)
 *
 * A `value` above `max` paints the bar full but `aria-valuenow` reports the
 * clamped value, because a spoken number outside the declared range is a lie
 * — the Progress lesson, carried forward.
 */
const props = withDefaults(
  defineProps<{
    /** The measured amount, clamped into [min, max] for both the fill and the announced value. */
    value: number;
    /** The value at which the gauge reads 0% full. */
    min?: number;
    /** The value at which the gauge reads 100% full. */
    max?: number;
    /** Low threshold — the boundary between the low and medium regions (HTML meter semantics). */
    low?: number;
    /** High threshold — the boundary between the medium and high regions (HTML meter semantics). */
    high?: number;
    /** The optimal value; decides which region is the good one. Defaults to the midpoint. */
    optimum?: number;
    /** Visible text that also supplies the accessible name when no ariaLabel/ariaLabelledby is set. */
    label?: string;
    /** Accessible name for the gauge, in place of a visible label. */
    ariaLabel?: string;
    /** Accessible name sourced from another element's id, in place of `ariaLabel`/`label`. */
    ariaLabelledby?: string;
    /** Track thickness. Its own scale, not the control-height scale — a gauge is a stroke. */
    size?: MeterSize;
    /** Opt-in band recolouring (success/warning/destructive) with a redundant non-colour cue per band. */
    threshold?: boolean;
    /** Print the localised value text beside the track. Hidden from AT — the role already announces it. */
    showValue?: boolean;
    /**
     * How the gauge speaks, as any subset of `MeterLabels` — the rest stay as
     * the host's `provideLoomLabels` vocabulary left them, and then as Loom's
     * English.
     */
    labels?: LabelOverrides<MeterLabels>;
  }>(),
  {
    min: 0,
    max: 100,
    size: "md",
    threshold: false,
    showValue: false,
  },
);

const text = useLabels("meter", METER_LABELS, () => props.labels);

/** Track label text sizing, matching Progress's readout scale exactly. */
const VALUE_TEXT = {
  sm: "text-micro",
  md: "text-xs",
  lg: "text-sm",
} satisfies Record<MeterSize, string>;

defineOptions({ inheritAttrs: false });
const { attrs, rest } = useSplitAttrs();
const labelElId = useId();

// ---------------------------------------------------------------------------
// Value clamping — the Progress lesson: a spoken value outside [min, max] is a lie.
// ---------------------------------------------------------------------------

/** Clamped value, for the fill AND the aria attributes — never out of range. */
const clamped = computed<number>(() => {
  const v = props.value;
  if (Number.isNaN(v)) return props.min;
  return Math.min(Math.max(v, props.min), props.max);
});

/** Percentage 0–100, from the clamped value. */
const pct = computed<number>(() => {
  const range = props.max - props.min;
  if (range <= 0) return 100;
  return ((clamped.value - props.min) / range) * 100;
});

// ---------------------------------------------------------------------------
// Band logic — HTML meter element's three-quality model, exactly.
//
// Three regions: low [min, low), medium [low, high], high (high, max].
// The optimum point selects which region is preferred, and how the others rank.
//
// Per HTML spec §4.10.16:
//   optimum in low    → low=preferred, medium=suboptimal, high=even-less-good
//   optimum in medium → medium=preferred, low=suboptimal, high=suboptimal
//   optimum in high   → high=preferred, medium=suboptimal, low=even-less-good
//
// When a region is "even less good" it maps to critical; "suboptimal" maps
// to cautionary. No critical band exists when optimum is in the medium region
// (both extremes are equally suboptimal).
// ---------------------------------------------------------------------------

type Band = "optimal" | "cautionary" | "critical";

const band = computed<Band | undefined>(() => {
  if (!props.threshold) return undefined;

  let lo = props.low ?? props.min;
  let hi = props.high ?? props.max;

  // Clamp both boundaries into [min, max], then reject an inverted pair the
  // way the HTML meter element does: treat both as unset rather than build a
  // region model out of crossed boundaries.
  lo = Math.min(Math.max(lo, props.min), props.max);
  hi = Math.min(Math.max(hi, props.min), props.max);
  if (lo > hi) {
    lo = props.min;
    hi = props.max;
  }

  const o = Math.min(Math.max(props.optimum ?? (props.min + props.max) / 2, props.min), props.max);
  const v = clamped.value;

  // Determine which region contains the optimum.
  // Boundaries: low < value < high belongs to medium; low ≤ optimum ≤ high is medium.
  // Region 0: [min, lo)   Region 1: [lo, hi]   Region 2: (hi, max]
  const optRegion = o < lo ? 0 : o <= hi ? 1 : 2;

  // Map regions to qualities per the table.
  const regionMap: { optimal: number; cautionary: number[]; critical: number | null } =
    optRegion === 0
      ? { optimal: 0, cautionary: [1], critical: 2 }
      : optRegion === 1
        ? { optimal: 1, cautionary: [0, 2], critical: null }
        : { optimal: 2, cautionary: [1], critical: 0 };

  // Determine which region the current value falls into.
  const valueRegion = v < lo ? 0 : v <= hi ? 1 : 2;

  if (valueRegion === regionMap.optimal) return "optimal";
  if (regionMap.cautionary.includes(valueRegion)) return "cautionary";
  if (regionMap.critical === valueRegion) return "critical";
  return "optimal"; // fallback — should not be reached
});

/** The fill colour when threshold is on; stays primary otherwise. */
const fillClass = computed(() => {
  if (!props.threshold) return "bg-primary";
  const b = band.value;
  if (b === "optimal") return "bg-success";
  if (b === "cautionary") return "bg-warning";
  return "bg-destructive";
});

/** The band cue word from labels. */
const cueWord = computed(() => {
  if (!band.value) return "";
  return text.value[band.value];
});

/** The band cue icon component. */
const cueIcon = computed(() => {
  if (band.value === "optimal") return Check;
  if (band.value === "cautionary") return CircleAlert;
  return X;
});

/** The cue colour class — the `-text` token of the band, never the fill token:
 * `--color-success` in dark is a fill lightness and fails text contrast. */
const cueColorClass = computed(() => {
  if (band.value === "optimal") return "text-success-text";
  if (band.value === "cautionary") return "text-warning-text";
  return "text-destructive-text";
});

/** The fill indicator style — translateX slides the fill from right to left. */
const indicatorStyle = computed(() => ({
  transition:
    "transform var(--duration-slow) var(--ease-out), background-color var(--duration-slow) var(--ease-out)",
  transform: `translateX(${pct.value - 100}%)`,
}));

/** aria-valuetext — localisable; never absent because the role is meaningless without it. */
const valuetext = computed(() =>
  text.value.valueText({ value: clamped.value, min: props.min, max: props.max }),
);

// ---------------------------------------------------------------------------
// Accessible name resolution — four sources, in precedence order.
// ---------------------------------------------------------------------------

/**
 * `label` is a content prop and always renders; `ariaLabel`/`ariaLabelledby`
 * choose only where the NAME comes from. A caller passing both wants visible
 * text under one name and a different announced name — silencing the visible
 * text would make the pair unrepresentable. And because assistive tech reads
 * `aria-labelledby` ahead of `aria-label`, whichever source loses must not
 * emit its attribute at all: an `ariaLabel` beside a label-pointing
 * `aria-labelledby` would be read past, not preferred.
 */
const ariaLabelAttr = computed(() => {
  if (props.ariaLabelledby) return undefined;
  if (props.ariaLabel) return props.ariaLabel;
  if (props.label) return undefined; // named through the span's id instead
  return text.value.name; // the seam fallback — a name is never absent
});

const ariaLabelledbyAttr = computed(() => {
  if (props.ariaLabelledby) return props.ariaLabelledby;
  if (props.ariaLabel) return undefined; // ariaLabel wins the name
  if (props.label) return labelElId;
  return undefined;
});

/** Whether the visible `label` text renders. */
const hasVisibleLabel = computed(() => !!props.label);

/** Whether the gauge row needs extra content beside the track. */
const hasRow = computed(() => props.showValue || (props.threshold && band.value));
</script>

<template>
  <!-- Visible label — only when `label` is set and no ariaLabel/ariaLabelledby overrides it.
       Rendered as a <span> rather than <label> because a div[role="meter"] is not a
       labelable element; the association is through aria-labelledby pointing at the span's id. -->
  <span
    v-if="hasVisibleLabel"
    :id="labelElId"
    :class="cn('block text-sm font-medium text-foreground mb-1', VALUE_TEXT[size])"
  >
    {{ label }}
  </span>

  <!-- Branch 1: bare track — nothing beside it, no wrapper. Mirrors Progress's
       default branch: the component's box is the track itself, and it keeps
       the exact sizing it had before `showValue`/`threshold` existed. -->
  <div
    v-if="!hasRow"
    role="meter"
    :aria-valuenow="clamped"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuetext="valuetext"
    :aria-label="ariaLabelAttr"
    :aria-labelledby="ariaLabelledbyAttr"
    v-bind="rest"
    :class="cn(meterVariants({ size }), attrs.class as string)"
  >
    <div :class="cn('h-full rounded-full', fillClass)" :style="indicatorStyle" />
  </div>

  <!-- Branch 2: gauge row with cue/readout — a flex row so the track and the
       side content share a single box. `class` from the caller lands on this
       row (the outermost box the caller sees), and everything else lands on the
       meter element through `rest`. -->
  <div v-else :class="cn('flex w-full items-center gap-3', attrs.class as string)">
    <div
      role="meter"
      :aria-valuenow="clamped"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuetext="valuetext"
      :aria-label="ariaLabelAttr"
      :aria-labelledby="ariaLabelledbyAttr"
      v-bind="rest"
      :class="cn(meterVariants({ size }), 'w-auto min-w-0 flex-1')"
    >
      <div :class="cn('h-full rounded-full', fillClass)" :style="indicatorStyle" />
    </div>

    <!-- Value readout + band cue, aria-hidden (the meter role already announces the
         value via aria-valuetext, and the band is derivable from it). Fixed width so
         the row does not resize as the digits change. -->
    <div aria-hidden="true" :class="cn('flex items-center gap-2 shrink-0')">
      <span
        v-if="showValue"
        :class="cn('tabular w-10 text-right text-muted-foreground', VALUE_TEXT[size])"
      >
        {{ valuetext }}
      </span>
      <span
        v-if="threshold && band"
        :class="cn('flex items-center gap-1 whitespace-nowrap', cueColorClass, VALUE_TEXT[size])"
      >
        <component :is="cueIcon" class="h-3.5 w-3.5" aria-hidden="true" />
        <span>{{ cueWord }}</span>
      </span>
    </div>
  </div>
</template>
