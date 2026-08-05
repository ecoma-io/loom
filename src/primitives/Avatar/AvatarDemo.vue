<script setup lang="ts">
import Avatar from "./Avatar.vue";

// A tiny inline data-URI so the "working image" example never depends on a
// network fetch — a flat coral circle, enough to prove the AvatarImage path
// paints instead of falling back.
const workingSrc =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Ccircle cx='32' cy='32' r='32' fill='%23e85d3f'/%3E%3C/svg%3E";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">Working image</span>
      <Avatar :src="workingSrc" alt="Ada Lovelace" fallback="AL" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">Broken image (falls back to initials)</span>
      <Avatar src="https://broken.invalid/not-found.jpg" alt="Grace Hopper" fallback="GH" />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">No image</span>
      <Avatar alt="Katherine Johnson" fallback="KJ" />
    </div>

    <div class="flex items-center gap-3">
      <Avatar size="sm" fallback="SM" alt="Small" />
      <Avatar size="md" fallback="MD" alt="Medium" />
      <Avatar size="lg" fallback="LG" alt="Large" />
    </div>
  </div>
</template>
