<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { cn } from "@ecoma-io/loom-core";
import { formatDuration, leftWithin, tickValues } from "./geometry";
import type { TimeFormatter } from "./types";

const props = withDefaults(
  defineProps<{
    /** Domain start, in epoch milliseconds. */
    start: number;
    /** Domain end, in epoch milliseconds. */
    end: number;
    /** Visible window start. Default: the domain start. */
    viewStart?: number;
    /** Visible window end. Default: the domain end. */
    viewEnd?: number;
    /** Number of ticks to aim for. Default: `6`. */
    tickCount?: number;
    /** Overrides the default duration formatter used for the labels. */
    format?: TimeFormatter;
    /** Accessible name for the ruler. Default: `"Time ruler"`. */
    ariaLabel?: string;
  }>(),
  {
    tickCount: 6,
    format: formatDuration,
    ariaLabel: "Time ruler",
  },
);

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const windowStart = computed(() => props.viewStart ?? props.start);
const windowEnd = computed(() => props.viewEnd ?? props.end);
const format = computed(() => props.format);

const ticks = computed(() =>
  tickValues(windowStart.value, windowEnd.value, props.tickCount).map((time) => ({
    time,
    left: leftWithin(windowStart.value, windowEnd.value, time),
  })),
);
</script>

<template>
  <div
    role="img"
    :aria-label="`${ariaLabel}: window of ${format(windowEnd - windowStart)}, from ${format(windowStart - start)} to ${format(windowEnd - start)}`"
    :class="cn('relative h-6 min-w-0 overflow-hidden', attrs.class as string)"
    data-loom-time-ruler
  >
    <div class="absolute inset-x-0 bottom-0 h-2 border-b border-border">
      <template v-for="tick in ticks" :key="tick.time">
        <div class="absolute top-0 h-2 w-px bg-border" :style="{ left: `${tick.left}%` }" />
      </template>
    </div>
    <div class="absolute inset-x-0 top-0 font-mono text-xs leading-4 text-muted-foreground">
      <template v-for="tick in ticks" :key="tick.time">
        <div class="absolute -translate-x-1/2 whitespace-nowrap" :style="{ left: `${tick.left}%` }">
          {{ format(tick.time - start) }}
        </div>
      </template>
    </div>
  </div>
</template>
