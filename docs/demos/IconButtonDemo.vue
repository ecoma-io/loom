<script setup lang="ts">
import IconButton from "./IconButton.vue";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <p class="mb-2 text-sm text-muted-foreground">Variants</p>
      <div class="flex flex-wrap items-center gap-3">
        <IconButton variant="default" label="Close">✕</IconButton>
        <IconButton variant="secondary" label="Settings">⚙</IconButton>
        <IconButton variant="ghost" label="Favourite">★</IconButton>
        <IconButton variant="destructive" label="Delete">🗑</IconButton>
      </div>
    </div>

    <div>
      <p class="mb-2 text-sm text-muted-foreground">Sizes</p>
      <div class="flex flex-wrap items-center gap-3">
        <IconButton size="sm" label="Close">✕</IconButton>
        <IconButton size="md" label="Close">✕</IconButton>
        <IconButton size="lg" label="Close">✕</IconButton>
      </div>
    </div>

    <div>
      <p class="mb-2 text-sm text-muted-foreground">Disabled</p>
      <div class="flex flex-wrap items-center gap-3">
        <IconButton disabled label="Close">✕</IconButton>
        <IconButton variant="ghost" disabled label="Settings">⚙</IconButton>
      </div>
    </div>
  </div>
</template>
