<script setup lang="ts">
import { Info, Scissors, WandSparkles } from "@lucide/vue";
import { Button, Tooltip } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- The button keeps its own aria-label: the tip describes it, it does not
         name it. -->
    <Tooltip content="Split the clip at the playhead (S)">
      <template #trigger>
        <Button variant="subtle" size="icon" aria-label="Split clip">
          <Scissors class="h-4 w-4" />
        </Button>
      </template>
    </Tooltip>

    <Tooltip content="Suggest edits for this scene" side="bottom">
      <template #trigger>
        <Button variant="subtle" size="icon" aria-label="Suggest edits">
          <WandSparkles class="h-4 w-4" />
        </Button>
      </template>
    </Tooltip>

    <!-- No hover delay: an onboarding surface that wants the hint immediately. -->
    <Tooltip content="Appears with no hover delay" :delay="0" side="right">
      <template #trigger>
        <Button variant="ghost" size="icon-sm" aria-label="Instant hint">!</Button>
      </template>
    </Tooltip>

    <Tooltip side="right">
      <template #trigger>
        <Button variant="ghost" size="icon" aria-label="About tooltips">
          <Info class="h-4 w-4" />
        </Button>
      </template>
      <div class="max-w-[14rem]">
        A tooltip is a <b>hint</b> — nothing interactive belongs in one, because focus never enters
        it.
      </div>
    </Tooltip>
  </div>
</template>
