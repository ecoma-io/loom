<script setup lang="ts">
import ScrollArea from "./ScrollArea.vue";

const items = Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`);
</script>

<template>
  <div class="flex flex-col gap-6" style="max-width: 24rem">
    <div>
      <p class="mb-2 text-sm font-medium text-foreground">Vertical</p>
      <ScrollArea orientation="vertical" class="h-48 w-full">
        <div class="flex flex-col gap-1 p-2">
          <div
            v-for="item in items"
            :key="item"
            class="rounded-sm bg-muted px-3 py-2 text-sm text-foreground"
          >
            {{ item }}
          </div>
        </div>
      </ScrollArea>
    </div>

    <div>
      <p class="mb-2 text-sm font-medium text-foreground">Horizontal</p>
      <ScrollArea orientation="horizontal" class="h-48 w-full">
        <div class="flex gap-2 p-2" style="width: max-content">
          <div
            v-for="item in items"
            :key="item"
            class="shrink-0 rounded-sm bg-muted px-4 py-2 text-sm text-foreground"
          >
            {{ item }}
          </div>
        </div>
      </ScrollArea>
    </div>

    <div>
      <p class="mb-2 text-sm font-medium text-foreground">Both</p>
      <ScrollArea orientation="both" class="h-48 w-full">
        <div style="width: max-content">
          <div
            v-for="item in items"
            :key="item"
            class="mb-1 rounded-sm bg-muted px-3 py-2 text-sm text-foreground"
            style="width: 600px"
          >
            {{ item }}
          </div>
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
