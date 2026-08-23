<script setup lang="ts">
import { ref } from "vue";
import { Switch } from "@ecoma-io/loom";

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
    <!-- The row says "inactive" with a token, not with `opacity-60`. Dimming a
         whole row multiplies down the label as well: measured, `text-foreground`
         under that opacity landed at 4.20:1 on the page ground, under the 4.5:1
         AA floor. `Switch` already carries its own `disabled:opacity-50`, so the
         control still reads as off — and `text-muted-foreground` is a colour
         that was measured rather than a transparency that has to be. -->
    <div class="flex items-center justify-between gap-4">
      <span id="switch-demo-disabled" class="text-sm text-muted-foreground">Locked (disabled)</span>
      <Switch :model-value="true" disabled aria-labelledby="switch-demo-disabled" />
    </div>
  </div>
</template>
