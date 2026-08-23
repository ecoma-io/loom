<script setup lang="ts">
import { ref } from "vue";
import { ColorPicker } from "@ecoma-io/loom";

const label = ref("#3366cc");
const series = ref("#b5502a");
const locked = ref("#1f3a5f");

// The last committed colour, so the page shows the difference between the live
// value beside the picker and the checkpoint a host would actually record.
const lastCommit = ref<string | undefined>(undefined);

// A product's own palette, passed in as data. A picker holds no opinion about
// which colours matter — that is the consuming application's to say.
const brand = ["#1f3a5f", "#3366cc", "#2f7a5b", "#b5502a", "#8a2f4d", "#4b4b4b"];
</script>

<template>
  <div class="flex w-full max-w-3xl flex-wrap items-start gap-8">
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-4">
        <span id="colour-picker-demo-label" class="text-xs text-muted-foreground">
          label colour
        </span>
        <span class="tabular text-xs text-muted-foreground">{{ label }}</span>
      </div>
      <ColorPicker
        v-model="label"
        aria-labelledby="colour-picker-demo-label"
        @commit="(value) => (lastCommit = value)"
      />
      <p class="text-xs text-muted-foreground">
        Last committed:
        <span class="tabular">{{ lastCommit ?? "—" }}</span>
        — one entry per gesture, not one per tick.
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <span id="colour-picker-demo-series" class="text-xs text-muted-foreground">
        chart series — with the product's own palette
      </span>
      <ColorPicker v-model="series" :swatches="brand" aria-labelledby="colour-picker-demo-series" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="colour-picker-demo-locked" class="text-xs text-muted-foreground">disabled</span>
      <ColorPicker
        :model-value="locked"
        :swatches="brand"
        disabled
        aria-labelledby="colour-picker-demo-locked"
      />
    </div>
  </div>
</template>
