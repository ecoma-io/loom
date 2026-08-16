<script setup lang="ts">
import { ref } from "vue";
import Slider from "./Slider.vue";

const volume = ref(0.65);
const cacheCeiling = ref(40);
const locked = ref(0.3);

// The last committed value, so the page shows the difference between the live
// readout beside each slider and the checkpoint a host would record.
const lastCommit = ref<number | undefined>(undefined);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span id="slider-demo-volume" class="text-xs text-muted-foreground">volume — 0…1</span>
        <span class="tabular text-xs text-muted-foreground">{{ volume.toFixed(2) }}</span>
      </div>
      <Slider
        v-model="volume"
        aria-labelledby="slider-demo-volume"
        @commit="(value) => (lastCommit = value)"
      />
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span id="slider-demo-cache" class="text-xs text-muted-foreground">
          cache ceiling — 0…100 in steps of 5
        </span>
        <span class="tabular text-xs text-muted-foreground">{{ cacheCeiling }}%</span>
      </div>
      <Slider
        v-model="cacheCeiling"
        :min="0"
        :max="100"
        :step="5"
        aria-labelledby="slider-demo-cache"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span id="slider-demo-locked" class="text-xs text-muted-foreground">disabled</span>
      <Slider :model-value="locked" disabled aria-labelledby="slider-demo-locked" />
    </div>

    <p class="text-xs text-muted-foreground">
      Last committed volume:
      <span class="tabular">{{ lastCommit === undefined ? "—" : lastCommit.toFixed(2) }}</span>
      — one entry per gesture, not one per tick.
    </p>
  </div>
</template>
