<script setup lang="ts">
import { SkipLink } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-4">
    <SkipLink href="#skip-link-demo-content" />
    <p class="text-sm text-muted-foreground">
      Press Tab once from the address bar: the link is the demo's first focusable element and
      reveals itself on focus. Follow it, or press Tab again to move past it and it hides once more.
    </p>
    <div
      id="skip-link-demo-content"
      tabindex="-1"
      class="rounded-md border border-border bg-muted p-4"
    >
      <div class="text-sm font-medium text-foreground">Main content</div>
      <div class="text-sm text-muted-foreground">
        The destination that receives focus when the link is followed — reachable by keyboard
        because it carries <code>tabindex="-1"</code>.
      </div>
    </div>
  </div>
</template>
