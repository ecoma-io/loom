<script setup lang="ts">
import { Separator, Stack } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Gap steps</div>
      <div class="text-xs text-muted-foreground">
        Each step tightens one notch below the <code>sm</code> breakpoint.
      </div>
    </div>

    <Stack gap="sm">
      <div class="rounded border border-border bg-card p-2 text-xs">sm gap item</div>
      <div class="rounded border border-border bg-card p-2 text-xs">sm gap item</div>
    </Stack>

    <Stack gap="md">
      <div class="rounded border border-border bg-card p-2 text-xs">md gap item</div>
      <div class="rounded border border-border bg-card p-2 text-xs">md gap item</div>
    </Stack>

    <Stack gap="lg">
      <div class="rounded border border-border bg-card p-2 text-xs">lg gap item</div>
      <div class="rounded border border-border bg-card p-2 text-xs">lg gap item</div>
    </Stack>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Alignment</div>
      <div class="text-xs text-muted-foreground">Cross-axis alignment of children.</div>
    </div>

    <Stack gap="md" align="start">
      <div class="rounded border border-border bg-card p-2 text-xs w-fit">start</div>
      <div class="rounded border border-border bg-card p-2 text-xs w-fit">aligned</div>
    </Stack>

    <Stack gap="md" align="center">
      <div class="rounded border border-border bg-card p-2 text-xs w-fit">center</div>
      <div class="rounded border border-border bg-card p-2 text-xs w-fit">aligned</div>
    </Stack>

    <Stack gap="md" align="end">
      <div class="rounded border border-border bg-card p-2 text-xs w-fit">end</div>
      <div class="rounded border border-border bg-card p-2 text-xs w-fit">aligned</div>
    </Stack>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">With separators</div>
      <div class="text-xs text-muted-foreground">
        Place a <code>&lt;Separator /&gt;</code> between items for visual grouping.
      </div>
    </div>

    <Stack gap="md">
      <div class="p-2 text-xs">First section</div>
      <Separator />
      <div class="p-2 text-xs">Second section</div>
      <Separator />
      <div class="p-2 text-xs">Third section</div>
    </Stack>
  </div>
</template>
