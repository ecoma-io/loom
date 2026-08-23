<script setup lang="ts">
import { AlertTriangle } from "@lucide/vue";
import { Button, ErrorState } from "@ecoma-io/loom";
</script>

<template>
  <div class="rounded-lg border border-border bg-card">
    <ErrorState title="Failed to load data" description="Check your connection and try again.">
      <template #icon><AlertTriangle /></template>
      <template #action>
        <Button variant="primary">Try again</Button>
      </template>
    </ErrorState>
  </div>
</template>
