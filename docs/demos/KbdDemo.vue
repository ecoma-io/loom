<script setup lang="ts">
import { Kbd } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-6">
    <p class="text-small text-muted-foreground">
      Single keys and glyphs:
      <Kbd>Esc</Kbd>
      <Kbd>⇧</Kbd>
      <Kbd>4</Kbd>
    </p>

    <!-- A combination is several caps joined by a visible separator the host
         renders, with the whole run named once for assistive technology. -->
    <p class="text-small text-muted-foreground">
      Combinations:
      <span
        class="inline-flex translate-y-0.5 items-center gap-1"
        role="img"
        aria-label="Command C"
      >
        <Kbd size="sm">⌘</Kbd>
        <span aria-hidden="true">+</span>
        <Kbd size="sm">C</Kbd>
      </span>
      <span class="mx-2" aria-hidden="true">·</span>
      <span
        class="inline-flex translate-y-0.5 items-center gap-1"
        role="img"
        aria-label="Control Shift P"
      >
        <Kbd size="sm">Ctrl</Kbd>
        <span aria-hidden="true">+</span>
        <Kbd size="sm">⇧</Kbd>
        <span aria-hidden="true">+</span>
        <Kbd size="sm">P</Kbd>
      </span>
    </p>

    <p class="text-small text-muted-foreground">
      In prose at the small size — press
      <Kbd size="sm">Enter</Kbd>
      to send,
      <Kbd size="sm">Esc</Kbd>
      to dismiss.
    </p>
  </div>
</template>
