<script setup lang="ts">
import InlineError from "./InlineError.vue";
</script>

<template>
  <div class="flex flex-col gap-3" style="max-width: 28rem">
    <InlineError message="This folder isn't a project. It may have moved or been deleted." />
    <InlineError message="Preview failed to load.">
      <template #action>
        <button
          type="button"
          class="rounded-md border border-destructive/40 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          Reload
        </button>
      </template>
    </InlineError>
  </div>
</template>
