<script setup lang="ts">
import { ref } from "vue";
import { SegmentedControl } from "@ecoma-io/loom";

const theme = ref("system");
const density = ref("compact");

const themeOptions = [
  { value: "system", label: "Auto" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const densityOptions = [
  { value: "compact", label: "Compact" },
  { value: "cozy", label: "Cozy" },
  { value: "roomy", label: "Roomy", disabled: true },
];
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">Theme</span>
      <SegmentedControl v-model="theme" :options="themeOptions" />
    </div>
    <div class="flex flex-col gap-2">
      <span class="text-xs text-muted-foreground">Density (dense form)</span>
      <SegmentedControl v-model="density" :options="densityOptions" size="sm" />
    </div>
  </div>
</template>
