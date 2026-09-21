<script lang="ts">
export { timeTrackContextKey } from "./types";
export type { TimeTrackContext } from "./types";
</script>

<script setup lang="ts">
import { computed, provide } from "vue";
import { cn, useSplitAttrs } from "@ecoma-io/loom-core";
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
    /**
     * Accessible name for the track-and-ruler group. Supplied, it is used
     * verbatim — the host owns the whole label; omitted, the default name
     * carries the visible window's size ("Time track — 12m window").
     */
    ariaLabel?: string;
  }>(),
  {
    tickCount: 6,
    format: formatDuration,
  },
);

defineOptions({ inheritAttrs: false });

const { attrs, rest } = useSplitAttrs();
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

// A host-supplied name owns the whole label — appending the window suffix to
// it would forge a string the host never wrote. The suffix belongs to the
// default, whose only other content is the window it summarises. The old
// sentinel (comparing against the default text) could not tell a host label
// that happened to read "Time track" from the absence of one.
const label = computed(
  () =>
    props.ariaLabel || `Time track — ${props.format(windowEnd.value - windowStart.value)} window`,
);
</script>

<template>
  <div
    role="group"
    :aria-label="label"
    data-loom-time-track
    v-bind="rest"
    :class="cn('flex min-w-0 flex-col gap-1', attrs.class as string)"
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
