<script setup lang="ts">
import { ref } from "vue";
import WindowControls from "./WindowControls.vue";

const isMaximized = ref(false);
const last = ref("—");

const onClose = () => (last.value = "close");
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
    <div class="text-xs text-muted-foreground">
      Last intent: <code class="tabular text-foreground">{{ last }}</code> · maximized:
      <code class="tabular text-foreground">{{ isMaximized }}</code>
      <span class="ml-2">— hover to see the fill; Close turns destructive red.</span>
    </div>
  </div>
</template>
