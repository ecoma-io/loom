<script setup lang="ts">
import { ref } from "vue";
import { Inbox } from "@lucide/vue";
import EmptyState from "@ecoma-io/loom-empty-state";
import Button from "@ecoma-io/loom-button";

// Re-keying remounts the block so the staggered entrance replays.
const replayKey = ref(0);
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="rounded-lg border border-border bg-card">
      <EmptyState
        :key="replayKey"
        title="No workflows yet"
        description="Create your first workflow to get started."
      >
        <template #icon><Inbox /></template>
        <template #action>
          <Button variant="primary">Create workflow</Button>
        </template>
      </EmptyState>
    </div>
    <Button variant="subtle" size="sm" class="self-start" @click="replayKey++">Replay</Button>
  </div>
</template>
