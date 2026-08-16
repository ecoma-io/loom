<script setup lang="ts">
import MasterDetail from "./MasterDetail.vue";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Default gap</div>
      <div class="text-xs text-muted-foreground">
        Master and detail panels sit side by side. Below the collapse width they stack.
      </div>
    </div>

    <div class="h-64 overflow-hidden rounded border border-border">
      <MasterDetail>
        <template #master>
          <div class="flex h-full items-center justify-center p-4 text-xs">Master list</div>
        </template>
        <div class="flex flex-col gap-2 py-4 text-xs">
          <p>Detail content — grows to fill the remaining space.</p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </p>
        </div>
      </MasterDetail>
    </div>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">With gap="md"</div>
      <div class="text-xs text-muted-foreground">
        A visible gap separates the master and detail panels.
      </div>
    </div>

    <div class="h-64 overflow-hidden rounded border border-border">
      <MasterDetail gap="md">
        <template #master>
          <div class="flex h-full items-center justify-center p-4 text-xs">Master list</div>
        </template>
        <div class="flex flex-col gap-2 py-4 text-xs">
          <p>Detail content with a medium gap.</p>
          <p>
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
            commodo consequat.
          </p>
        </div>
      </MasterDetail>
    </div>
  </div>
</template>
