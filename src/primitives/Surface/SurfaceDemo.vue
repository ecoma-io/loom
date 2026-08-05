<script setup lang="ts">
import Surface from "./Surface.vue";
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Surface variant="card">
        <div class="text-sm font-medium">card</div>
        <div class="mt-1 text-xs text-muted-foreground">Hairline border, no shadow.</div>
      </Surface>
      <Surface variant="muted">
        <div class="text-sm font-medium">muted</div>
        <div class="mt-1 text-xs text-muted-foreground">Recessed panel fill.</div>
      </Surface>
      <Surface variant="overlay">
        <div class="text-sm font-medium">overlay</div>
        <div class="mt-1 text-xs text-muted-foreground">Floating: menu / popover.</div>
      </Surface>
    </div>

    <Surface variant="card" interactive>
      <div class="text-sm font-medium">interactive</div>
      <div class="mt-1 text-xs text-muted-foreground">
        A clickable row or card — hover lifts by fill, hairline asserts, cursor signals.
      </div>
    </Surface>

    <div class="flex flex-wrap items-stretch gap-3">
      <Surface variant="card" pad="none" class="text-xs">
        <div class="px-2 py-1 text-muted-foreground">pad=none</div>
      </Surface>
      <Surface variant="card" pad="sm" class="text-xs text-muted-foreground">pad=sm</Surface>
      <Surface variant="card" pad="md" class="text-xs text-muted-foreground">pad=md</Surface>
      <Surface variant="card" pad="lg" class="text-xs text-muted-foreground">pad=lg</Surface>
    </div>
  </div>
</template>
