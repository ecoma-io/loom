<script setup lang="ts">
import Progress from "./Progress.vue";
</script>

<template>
  <div class="flex flex-col gap-6" style="max-width: 24rem">
    <div class="flex flex-col gap-2">
      <span id="progress-demo-0" class="text-xs text-muted-foreground">0%</span>
      <Progress :model-value="0" aria-labelledby="progress-demo-0" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="progress-demo-40" class="text-xs text-muted-foreground">40%</span>
      <Progress :model-value="40" aria-labelledby="progress-demo-40" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="progress-demo-100" class="text-xs text-muted-foreground">100%</span>
      <Progress :model-value="100" aria-labelledby="progress-demo-100" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="progress-demo-indeterminate" class="text-xs text-muted-foreground">
        Indeterminate (waiting on the % data)
      </span>
      <Progress aria-labelledby="progress-demo-indeterminate" />
    </div>
  </div>
</template>
