<script setup lang="ts">
import { ref } from "vue";
import { ResizableSplit } from "@ecoma-io/loom";

const width = ref(320);
</script>

<template>
  <div class="flex h-64 flex-col gap-3">
    <div class="text-xs text-muted-foreground">
      Drag the separator, or focus it and use the arrow keys. Double-click resets to 320px.
    </div>
    <ResizableSplit v-model="width" class="h-full rounded-lg border border-border bg-background">
      <template #panel>
        <div class="flex h-full items-center justify-center p-4">
          <div class="text-center">
            <div class="font-medium">Panel</div>
            <div class="text-xs text-muted-foreground">{{ width }}px</div>
          </div>
        </div>
      </template>
      <template #content>
        <div class="flex h-full items-center justify-center p-4 text-muted-foreground">
          Content — takes the remaining width.
        </div>
      </template>
    </ResizableSplit>
  </div>
</template>
