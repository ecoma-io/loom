<script setup lang="ts">
import { Split as SplitComponent } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Side on the left</div>
      <div class="text-xs text-muted-foreground">
        Below the collapse width, panels stack: side above, content below.
      </div>
    </div>

    <SplitComponent gap="md" min-side-width="14rem">
      <template #side>
        <!-- A link in each pane: the split's keyboard contract is the passage
             across the pane boundary in document order, which panels of static
             text can never witness. -->
        <div class="rounded border border-border bg-muted p-3 text-xs">
          Side panel
          <a href="#" class="mt-2 block font-medium text-primary-text hover:underline">
            Panel settings
          </a>
        </div>
      </template>
      <div class="rounded border border-border bg-card p-3 text-xs">
        Content area — grows to fill the remaining space.
        <a href="#" class="mt-2 block font-medium text-primary-text hover:underline">
          Open the editor
        </a>
      </div>
    </SplitComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Side on the right</div>
      <div class="text-xs text-muted-foreground">
        When <code>side="right"</code>, the panel sits on the right and stacks below the content
        when collapsed.
      </div>
    </div>

    <SplitComponent side="right" gap="md" min-side-width="14rem">
      <template #side>
        <div class="rounded border border-border bg-muted p-3 text-xs">Right panel</div>
      </template>
      <div class="rounded border border-border bg-card p-3 text-xs">
        Content area — grows to fill the remaining space.
      </div>
    </SplitComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Narrow side panel</div>
    </div>

    <SplitComponent gap="md" min-side-width="10rem">
      <template #side>
        <div class="rounded border border-border bg-muted p-3 text-xs">10rem panel</div>
      </template>
      <div class="rounded border border-border bg-card p-3 text-xs">
        Wider content area when the side panel is narrower.
      </div>
    </SplitComponent>
  </div>
</template>
