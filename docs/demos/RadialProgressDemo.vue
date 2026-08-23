<script setup lang="ts">
import { RadialProgress } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-8" style="max-width: 32rem">
    <div class="flex flex-col gap-3">
      <span class="text-xs text-muted-foreground">Sizes — sm, md, lg</span>
      <div class="flex flex-wrap items-center gap-6">
        <RadialProgress :model-value="62" size="sm" aria-label="Disk used, small" />
        <RadialProgress :model-value="62" size="md" aria-label="Disk used, medium" />
        <RadialProgress :model-value="62" size="lg" aria-label="Disk used, large" />
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <span class="text-xs text-muted-foreground">
        Thickness — thin, regular, thick. The stroke is a proportion of the diameter, so the ring
        keeps its weight at every size.
      </span>
      <div class="flex flex-wrap items-center gap-6">
        <RadialProgress :model-value="62" thickness="thin" aria-label="Quota, thin ring" />
        <RadialProgress :model-value="62" thickness="regular" aria-label="Quota, regular ring" />
        <RadialProgress :model-value="62" thickness="thick" aria-label="Quota, thick ring" />
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <span class="text-xs text-muted-foreground">
        The ends of the range — nothing done paints nothing at all, and 100% turns success.
      </span>
      <div class="flex flex-wrap items-center gap-6">
        <RadialProgress :model-value="0" aria-label="Onboarding, not started" />
        <RadialProgress :model-value="8" aria-label="Onboarding, just started" />
        <RadialProgress :model-value="100" aria-label="Onboarding, complete" />
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <span class="text-xs text-muted-foreground">
        Indeterminate — the arc spins and the centre reads a dash, because there is no percentage
        yet to print.
      </span>
      <div class="flex flex-wrap items-center gap-6">
        <RadialProgress aria-label="Syncing workspace" />
        <RadialProgress :show-value="false" aria-label="Syncing workspace, no readout" />
      </div>
    </div>

    <!-- The tile is where `show-value` is worth turning off: the number is
         already set in the surrounding type, at a size the ring could never
         hold. -->
    <div class="flex flex-col gap-3">
      <span class="text-xs text-muted-foreground">A dashboard tile printing its own number</span>
      <div
        class="flex w-fit items-center gap-4 rounded-md border border-border bg-card p-4 text-card-foreground"
      >
        <RadialProgress
          :model-value="86"
          size="lg"
          thickness="thick"
          :show-value="false"
          aria-label="Delivery score"
        />
        <div class="flex flex-col">
          <span class="tabular text-heading">86</span>
          <span class="text-xs text-muted-foreground">Delivery score, last 30 days</span>
        </div>
      </div>
    </div>
  </div>
</template>
