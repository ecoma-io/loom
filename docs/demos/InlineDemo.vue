<script setup lang="ts">
import InlineComponent from "@ecoma-io/loom-inline";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Gap steps</div>
      <div class="text-xs text-muted-foreground">
        Each step tightens one notch below the <code>sm</code> breakpoint.
      </div>
    </div>

    <InlineComponent gap="sm">
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">sm</div>
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">gap</div>
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">items</div>
    </InlineComponent>

    <InlineComponent gap="md">
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">md</div>
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">gap</div>
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">items</div>
    </InlineComponent>

    <InlineComponent gap="lg">
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">lg</div>
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">gap</div>
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">items</div>
    </InlineComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Wrapping</div>
      <div class="text-xs text-muted-foreground">
        Items wrap to new lines by default when they exceed the container width.
      </div>
    </div>

    <InlineComponent gap="sm" class="max-w-48">
      <div v-for="i in 8" :key="i" class="rounded border border-border bg-card px-3 py-1 text-xs">
        Item {{ i }}
      </div>
    </InlineComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">No wrap</div>
      <div class="text-xs text-muted-foreground">
        Disable wrapping when items must stay on a single line.
      </div>
    </div>

    <InlineComponent gap="sm" :wrap="false" class="overflow-x-auto">
      <div
        v-for="i in 8"
        :key="i"
        class="rounded border border-border bg-card px-3 py-1 text-xs whitespace-nowrap"
      >
        Item {{ i }}
      </div>
    </InlineComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Alignment</div>
    </div>

    <InlineComponent gap="md" align="start">
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">start</div>
      <div class="rounded border border-border bg-card px-3 py-4 text-xs">tall item</div>
    </InlineComponent>

    <InlineComponent gap="md" align="center">
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">center</div>
      <div class="rounded border border-border bg-card px-3 py-4 text-xs">tall item</div>
    </InlineComponent>

    <InlineComponent gap="md" align="baseline">
      <div class="rounded border border-border bg-card px-3 py-1 text-xs text-lg font-bold">Aa</div>
      <div class="rounded border border-border bg-card px-3 py-1 text-xs">baseline</div>
    </InlineComponent>
  </div>
</template>
