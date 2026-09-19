<script setup lang="ts">
import { ref } from "vue";
import { TimeTrack, TimeBar } from "@ecoma-io/loom";

/**
 * TimeTrack demo — a host owning the zoom/pan window.
 *
 * The pattern is controlled: `viewStart`/`viewEnd` are props, so the zoom and
 * pan buttons below are ordinary host state — exactly the seam a trace viewer
 * or scheduler binds its own gestures to. The bars never move themselves.
 */
const DOMAIN_START = 0;
const DOMAIN_END = 60_000; // 60s of activity.

const window = ref<[number, number]>([DOMAIN_START, DOMAIN_END]);

function zoom(factor: number) {
  const [start, end] = window.value;
  const span = end - start;
  const nextSpan = Math.min(Math.max(span * factor, 5_000), DOMAIN_END - DOMAIN_START);
  const center = (start + end) / 2;
  window.value = [
    Math.max(DOMAIN_START, center - nextSpan / 2),
    Math.min(DOMAIN_END, center + nextSpan / 2),
  ];
}

function pan(millis: number) {
  const [start, end] = window.value;
  const span = end - start;
  const delta = Math.min(millis, span * 0.4);
  const nextStart = Math.max(DOMAIN_START, Math.min(start + delta, DOMAIN_END - span));
  window.value = [nextStart, nextStart + span];
}

function reset() {
  window.value = [DOMAIN_START, DOMAIN_END];
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center gap-2">
      <button class="rounded border border-border px-2 py-1 text-sm" @click="zoom(0.5)">
        Zoom in
      </button>
      <button class="rounded border border-border px-2 py-1 text-sm" @click="zoom(2)">
        Zoom out
      </button>
      <button class="rounded border border-border px-2 py-1 text-sm" @click="pan(-1)">
        Pan left
      </button>
      <button class="rounded border border-border px-2 py-1 text-sm" @click="pan(1)">
        Pan right
      </button>
      <button class="rounded border border-border px-2 py-1 text-sm" @click="reset">Reset</button>
    </div>

    <TimeTrack
      :start="DOMAIN_START"
      :end="DOMAIN_END"
      :view-start="window[0]"
      :view-end="window[1]"
      aria-label="Request timeline"
      class="w-full rounded border border-border p-2"
    >
      <TimeBar :start="0" :end="8_000" aria-label="DNS lookup" class="bg-accent" />
      <TimeBar :start="8_000" :end="26_000" aria-label="TLS handshake" class="bg-primary" />
      <TimeBar :start="26_000" :end="42_000" aria-label="Response body" class="bg-success" />
    </TimeTrack>
  </div>
</template>
