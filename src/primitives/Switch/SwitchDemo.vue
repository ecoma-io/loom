<script setup lang="ts">
import { ref } from "vue";
import Switch from "./Switch.vue";

const telemetry = ref(false);
const autosave = ref(true);
</script>

<template>
  <!-- Label/description live on the row, wired via aria-labelledby (Switch's
       documented convention — it renders a button, not a labelable input). -->
  <div class="flex flex-col gap-4" style="max-width: 24rem">
    <div class="flex items-center justify-between gap-4">
      <span id="switch-demo-telemetry" class="text-sm text-foreground"
        >Send anonymous telemetry</span
      >
      <Switch v-model="telemetry" aria-labelledby="switch-demo-telemetry" />
    </div>
    <div class="flex items-center justify-between gap-4">
      <span id="switch-demo-autosave" class="text-sm text-foreground">Autosave</span>
      <Switch v-model="autosave" aria-labelledby="switch-demo-autosave" />
    </div>
    <div class="flex items-center justify-between gap-4 opacity-60">
      <span id="switch-demo-disabled" class="text-sm text-foreground">Locked (disabled)</span>
      <Switch :model-value="true" disabled aria-labelledby="switch-demo-disabled" />
    </div>
  </div>
</template>
