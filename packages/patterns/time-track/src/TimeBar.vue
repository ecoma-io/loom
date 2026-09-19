<script setup lang="ts">
import { computed, inject, onMounted, useAttrs } from "vue";
import { cn } from "@ecoma-io/loom-core";
import { timeTrackContextKey } from "./TimeTrack.vue";

const props = withDefaults(
  defineProps<{
    /** Span start, in epoch milliseconds (the track's clock). */
    start: number;
    /** Span end, in epoch milliseconds. */
    end: number;
    /** Accessible name for the bar. Defaults to a duration label. */
    ariaLabel?: string;
  }>(),
  {},
);

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();

const track = inject(timeTrackContextKey, null);

onMounted(() => {
  if (track === null) {
    console.warn(
      "TimeBar renders nothing outside a TimeTrack — bars position themselves on the track's window.",
    );
  }
});

const left = computed(() => {
  if (!track) return 0;
  const span = track.value.viewEnd - track.value.viewStart;
  return ((props.start - track.value.viewStart) / span) * 100;
});

const width = computed(() => {
  if (!track) return 0;
  const span = track.value.viewEnd - track.value.viewStart;
  return Math.min(Math.max(((props.end - props.start) / span) * 100, 0), 100);
});
</script>

<template>
  <div
    v-if="track"
    role="img"
    :aria-label="ariaLabel ?? `Duration ${Math.max(end - start, 0)} milliseconds`"
    :class="cn('absolute top-0 h-6 overflow-hidden rounded bg-primary/80', attrs.class as string)"
    :style="{ left: `${left}%`, width: `${width}%` }"
    data-loom-time-bar
  >
    <slot />
  </div>
</template>
