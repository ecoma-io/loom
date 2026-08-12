<script setup lang="ts">
import { ref } from "vue";
import type { LabelOverrides } from "../../lib/labels";
import WindowControls, { type WindowControlsLabels } from "./WindowControls.vue";

const isMaximized = ref(false);
const last = ref("—");

const onClose = () => (last.value = "close");

// A partial bag: the seam resolves key by key, so a host translating three of
// the four names keeps Loom's English for the fourth rather than blanking it.
// `satisfies` keeps the typo check alive once the bag leaves the template.
const french = {
  minimize: "Réduire",
  maximize: "Agrandir",
  restore: "Restaurer",
} satisfies LabelOverrides<WindowControlsLabels>;
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Shown on a title-bar-like strip so the hover targets read correctly. -->
    <div class="flex h-9 items-center justify-end rounded-lg border border-border bg-card">
      <WindowControls
        :is-maximized="isMaximized"
        @minimize="last = 'minimize'"
        @maximize="((isMaximized = !isMaximized), (last = 'maximize'))"
        @close="onClose"
      />
    </div>
    <!-- The same cluster, named by a host's own vocabulary. Nothing about it
         changes except what a screen reader says. -->
    <div class="flex h-9 items-center justify-end rounded-lg border border-border bg-card">
      <WindowControls
        :labels="french"
        @minimize="last = 'minimize'"
        @maximize="last = 'maximize'"
        @close="onClose"
      />
    </div>

    <div class="text-xs text-muted-foreground">
      Last intent: <code class="tabular text-foreground">{{ last }}</code> · maximized:
      <code class="tabular text-foreground">{{ isMaximized }}</code>
      <span class="ml-2">— hover to see the fill; Close turns destructive red.</span>
    </div>
  </div>
</template>
