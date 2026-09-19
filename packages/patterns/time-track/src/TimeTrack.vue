<script lang="ts">
export { timeTrackContextKey } from "./types";
export type { TimeTrackContext } from "./types";
</script>

<script setup lang="ts">
import { computed, provide, useAttrs } from "vue";
import { cn } from "@ecoma-io/loom-core";
import TimeRuler from "./TimeRuler.vue";
import { timeTrackContextKey, type TimeFormatter, type TimeTrackContext } from "./types";
import { formatDuration, leftWithin, widthWithin } from "./geometry";

const props = withDefaults(
  defineProps<{
    /** Domain start, in epoch milliseconds — the earliest time the data can express. */
    start: number;
    /** Domain end, in epoch milliseconds — the latest time the data can express. */
    end: number;
    /** Visible window start; defaults to the domain. The host drives zoom/pan by moving this prop. */
    viewStart?: number;
    /** Visible window end; defaults to the domain. The host drives zoom/pan by moving this prop. */
    viewEnd?: number;
    /** Number of ruler ticks to aim for. Default: `6`. */
    tickCount?: number;
    /** Overrides the default duration formatter used for tick labels. */
    format?: TimeFormatter;
    /** Accessible name for the track-and-ruler group. Default: `"Time track"`. */
    ariaLabel?: string;
  }>(),
  {
    tickCount: 6,
    format: formatDuration,
    ariaLabel: "Time track",
  },
);

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const windowStart = computed(() => props.viewStart ?? props.start);
const windowEnd = computed(() => props.viewEnd ?? props.end);

const context = computed<TimeTrackContext>(() => ({
  viewStart: windowStart.value,
  viewEnd: windowEnd.value,
  left: (time: number) => leftWithin(windowStart.value, windowEnd.value, time),
  width: (start: number, end: number) =>
    widthWithin(windowStart.value, windowEnd.value, start, end),
}));

provide(timeTrackContextKey, context);

const label = computed(() =>
  props.ariaLabel === "Time track"
    ? `${props.ariaLabel} — ${props.format(windowEnd.value - windowStart.value)} window`
    : props.ariaLabel,
);
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    :class="cn('flex min-w-0 flex-col gap-1', attrs.class as string)"
    data-loom-time-track
  >
    <TimeRuler
      :start="start"
      :end="end"
      :view-start="windowStart"
      :view-end="windowEnd"
      :tick-count="tickCount"
      :format="format"
    />
    <div class="relative min-h-8 flex-1 overflow-hidden">
      <slot />
    </div>
  </div>
</template>
