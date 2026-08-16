<script setup lang="ts">
import SplitLayout from "@ecoma-io/loom-split-layout";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Side on the left</div>
      <div class="text-xs text-muted-foreground">
        The side panel sits on the left. Below the collapse width, panels stack: side above, content
        below.
      </div>
    </div>

    <div class="h-72 overflow-hidden rounded border border-border">
      <SplitLayout gap="md" min-side-width="14rem">
        <template #header>
          <div class="bg-card px-4 py-2 text-xs">Header bar</div>
        </template>
        <template #side>
          <div class="flex h-full items-center justify-center p-4 text-xs">Side panel</div>
        </template>
        <div class="flex flex-col gap-2 py-4 text-xs">
          <p>Content area — grows to fill the remaining space.</p>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua.
          </p>
        </div>
      </SplitLayout>
    </div>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Side on the right</div>
      <div class="text-xs text-muted-foreground">
        When <code>side="right"</code>, the panel sits on the right and stacks below the content
        when collapsed.
      </div>
    </div>

    <div class="h-72 overflow-hidden rounded border border-border">
      <SplitLayout side="right" gap="md" min-side-width="14rem">
        <template #header>
          <div class="bg-card px-4 py-2 text-xs">Header bar</div>
        </template>
        <template #side>
          <div class="flex h-full items-center justify-center p-4 text-xs">Right panel</div>
        </template>
        <div class="flex flex-col gap-2 py-4 text-xs">
          <p>Content area — grows to fill the remaining space.</p>
          <p>
            Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
            commodo consequat.
          </p>
        </div>
      </SplitLayout>
    </div>
  </div>
</template>
