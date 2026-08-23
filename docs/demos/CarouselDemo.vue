<script setup lang="ts">
import { Carousel } from "@ecoma-io/loom";

const palettes = [
  "linear-gradient(120deg, var(--color-primary), var(--color-info))",
  "linear-gradient(120deg, var(--color-accent), var(--color-warning))",
  "linear-gradient(120deg, var(--color-success), var(--color-primary))",
];
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-6">
    <Carousel class="max-w-md">
      <div
        v-for="(bg, i) in palettes"
        :key="i"
        class="flex h-40 items-end bg-cover p-3"
        :style="{ backgroundImage: bg }"
      >
        <span class="rounded bg-background/80 px-2 py-1 text-small">Palette {{ i + 1 }}</span>
      </div>
    </Carousel>

    <Carousel class="max-w-md" loop>
      <div
        v-for="(bg, i) in palettes"
        :key="i"
        class="flex h-24 items-center justify-center"
        :style="{ background: bg }"
      >
        <span class="text-small font-medium text-primary-foreground"
          >Looping · page {{ i + 1 }}</span
        >
      </div>
    </Carousel>
  </div>
</template>
