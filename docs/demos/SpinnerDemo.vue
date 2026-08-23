<script setup lang="ts">
import { Spinner } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center gap-4 text-primary">
      <Spinner size="sm" label="Loading item" />
      <Spinner size="md" label="Loading" />
      <Spinner size="lg" label="Loading page" />
    </div>

    <div class="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground">
      <Spinner size="sm" label="Saving changes" />
      <span>Saving changes…</span>
    </div>
  </div>
</template>
