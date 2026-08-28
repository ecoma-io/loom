<script setup lang="ts">
import { Button, LiveRegion, useAnnounce } from "@ecoma-io/loom";

// The recommended mount, done right here: one polite and one assertive
// region beside the top of the demo, mounted once and never toggled. The
// buttons only write into them.
const announce = useAnnounce();
</script>

<template>
  <div class="max-w-xl">
    <LiveRegion politeness="polite" />
    <LiveRegion politeness="assertive" />
    <div class="flex flex-wrap gap-2">
      <Button variant="outline" @click="announce('Draft saved')">Save draft (polite)</Button>
      <Button
        variant="destructive"
        @click="announce('Upload failed. Three files were not uploaded.', 'assertive')"
      >
        Fail upload (assertive)
      </Button>
    </div>
    <p class="mt-3 text-sm text-muted-foreground">
      Both regions are mounted above the buttons, empty, before you press anything. The save button
      announces politely; the failure button interrupts with an assertive announcement. Run this
      page with a screen reader and press each button twice — the repeated message is cleared and
      re-added, so it plays both times.
    </p>
  </div>
</template>
