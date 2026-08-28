<script setup lang="ts">
import { Button, VisuallyHidden } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- The glyph is the whole visible control; the words only exist for the
         screen reader, and they are what name the button. -->
    <Button variant="outline" size="sm">
      <svg
        class="size-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />
      </svg>
      <VisuallyHidden>Empty the vault</VisuallyHidden>
    </Button>
    <span class="text-sm text-muted-foreground">Visible hint for everyone</span>
    <VisuallyHidden as="div">Spoken-only context that would be noise on screen</VisuallyHidden>
  </div>
</template>
