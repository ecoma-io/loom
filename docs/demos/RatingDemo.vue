<script setup lang="ts">
import { ref } from "vue";
import Rating from "@ecoma-io/loom-rating";

const quality = ref(3);
const accuracy = ref(3.5);
const clearable = ref(4);
const locked = ref(2);
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span id="rating-demo-quality" class="text-xs text-muted-foreground">
        whole stars, previewing under the pointer
      </span>
      <Rating v-model="quality" hoverable aria-labelledby="rating-demo-quality" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="rating-demo-accuracy" class="text-xs text-muted-foreground">
        halves — the left half of a star is its own target
      </span>
      <Rating v-model="accuracy" :step="0.5" hoverable aria-labelledby="rating-demo-accuracy" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="rating-demo-clearable" class="text-xs text-muted-foreground">
        clearable — choosing the same star again scores 0
      </span>
      <Rating v-model="clearable" clearable aria-labelledby="rating-demo-clearable" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">
        read-only — a picture of a number, not an input: no tab stop, no dimming, and the exact
        average rather than the nearest half
      </span>
      <span class="flex items-center gap-2">
        <Rating :model-value="4.2" readonly />
        <span class="text-xs text-muted-foreground">4.2 · 318 reviews</span>
      </span>
    </div>

    <div class="flex flex-col gap-2">
      <span id="rating-demo-locked" class="text-xs text-muted-foreground">
        disabled — an input the reader may not edit yet
      </span>
      <Rating v-model="locked" disabled aria-labelledby="rating-demo-locked" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">the three star sizes</span>
      <Rating :model-value="4" size="sm" readonly />
      <Rating :model-value="4" size="md" readonly />
      <Rating :model-value="4" size="lg" readonly />
    </div>

    <p class="text-xs text-muted-foreground">
      Chosen quality: <span class="tabular">{{ quality }}</span> — accuracy:
      <span class="tabular">{{ accuracy }}</span>
    </p>
  </div>
</template>
