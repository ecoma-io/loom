<script setup lang="ts">
import LoadingState from "./LoadingState.vue";
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="rounded-lg border border-border bg-card">
      <LoadingState mode="spinner" label="Loading…" />
    </div>
    <div class="rounded-lg border border-border bg-card">
      <LoadingState mode="skeleton" />
    </div>
  </div>
</template>
