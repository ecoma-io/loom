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

    <!-- Thickness, heaviest first, so the three read as one scale rather than
         three unrelated bars. -->
    <div class="flex flex-col gap-2">
      <span id="progress-demo-size-lg" class="text-xs text-muted-foreground">
        size="lg" — under a page heading
      </span>
      <Progress :model-value="70" size="lg" aria-labelledby="progress-demo-size-lg" />

      <span id="progress-demo-size-md" class="text-xs text-muted-foreground">
        size="md" — the default
      </span>
      <Progress :model-value="70" size="md" aria-labelledby="progress-demo-size-md" />

      <span id="progress-demo-size-sm" class="text-xs text-muted-foreground">
        size="sm" — inside a table row
      </span>
      <Progress :model-value="70" size="sm" aria-labelledby="progress-demo-size-sm" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="progress-demo-show-value" class="text-xs text-muted-foreground">
        show-value — the percentage as text
      </span>
      <Progress :model-value="62" show-value aria-labelledby="progress-demo-show-value" />
    </div>

    <div class="flex flex-col gap-2">
      <span id="progress-demo-show-value-indeterminate" class="text-xs text-muted-foreground">
        show-value while indeterminate — a dash, never a fabricated 0%
      </span>
      <Progress show-value aria-labelledby="progress-demo-show-value-indeterminate" />
    </div>
  </div>
</template>
