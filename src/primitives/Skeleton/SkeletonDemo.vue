<script setup lang="ts">
import Skeleton from "./Skeleton.vue";
</script>

<template>
  <div class="flex flex-col gap-4 rounded-lg border border-border p-4" style="max-width: 20rem">
    <div class="flex items-center gap-3">
      <Skeleton variant="circle" class="h-10 w-10" />
      <div class="flex flex-1 flex-col gap-2">
        <Skeleton variant="text" class="w-2/3" />
        <Skeleton variant="text" class="w-1/3" />
      </div>
    </div>
    <Skeleton variant="rect" class="h-32 w-full" />
    <div class="flex flex-col gap-2">
      <Skeleton variant="text" class="w-full" />
      <Skeleton variant="text" class="w-full" />
      <Skeleton variant="text" class="w-2/3" />
    </div>
  </div>
</template>
