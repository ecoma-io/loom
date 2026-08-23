<script setup lang="ts">
import { ScrollReel as ScrollReelComponent } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Snap to start</div>
      <div class="text-xs text-muted-foreground">
        Items snap to their start edge. Use arrow keys to navigate between items.
      </div>
    </div>

    <ScrollReelComponent snap="start" gap="md">
      <div
        v-for="i in 8"
        :key="i"
        class="w-40 flex-shrink-0 rounded border border-border bg-card p-4 text-xs snap-start"
      >
        Item {{ i }}
      </div>
    </ScrollReelComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Snap to center</div>
      <div class="text-xs text-muted-foreground">Items snap to the center of the viewport.</div>
    </div>

    <ScrollReelComponent snap="center" gap="md">
      <div
        v-for="i in 8"
        :key="i"
        class="w-40 flex-shrink-0 rounded border border-border bg-card p-4 text-xs snap-center"
      >
        Item {{ i }}
      </div>
    </ScrollReelComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">No snap</div>
      <div class="text-xs text-muted-foreground">
        Free scrolling — items do not snap to alignment points.
      </div>
    </div>

    <ScrollReelComponent snap="none" gap="md">
      <div
        v-for="i in 8"
        :key="i"
        class="w-40 flex-shrink-0 rounded border border-border bg-card p-4 text-xs"
      >
        Item {{ i }}
      </div>
    </ScrollReelComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Keyboard navigation</div>
      <div class="text-xs text-muted-foreground">
        Focus the reel and use <kbd class="rounded border border-border px-1">←</kbd>
        <kbd class="rounded border border-border px-1">→</kbd> to scroll between items.
        <kbd class="rounded border border-border px-1">Home</kbd>
        <kbd class="rounded border border-border px-1">End</kbd> jump to the start or end.
      </div>
    </div>
  </div>
</template>
