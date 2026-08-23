<script setup lang="ts">
import { Dashboard } from "@ecoma-io/loom";
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Dashboard with sidebar</div>
      <div class="text-xs text-muted-foreground">
        Sidebar + auto-reflowing tile grid. On narrow viewports the sidebar stacks above the grid;
        the tile column count derives from the container width.
      </div>
    </div>

    <Dashboard min-tile-width="14rem" gap="md">
      <template #header>
        <div class="bg-primary px-4 py-2 text-xs text-primary-foreground">Header bar</div>
      </template>

      <template #sidebar>
        <div class="border-r border-border p-3 text-xs">
          <p class="font-medium">Sidebar nav</p>
          <p class="mt-1 text-muted-foreground">Navigation links</p>
        </div>
      </template>

      <div v-for="i in 6" :key="i" class="rounded border border-border bg-card p-3 text-xs">
        Tile {{ i }}
      </div>
    </Dashboard>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Dashboard without sidebar</div>
      <div class="text-xs text-muted-foreground">
        No sidebar — the tile grid fills the full width. Add an <code>aside</code>
        slot for supplementary metrics that appear on ultrawide viewports.
      </div>
    </div>

    <Dashboard min-tile-width="14rem" gap="md">
      <template #header>
        <div class="bg-primary px-4 py-2 text-xs text-primary-foreground">Header bar</div>
      </template>

      <template #aside>
        <div class="border-l border-border p-3 text-xs">
          <p class="font-medium">Metrics</p>
          <p class="mt-1 text-muted-foreground">Visible on 2xl+</p>
        </div>
      </template>

      <div v-for="i in 6" :key="i" class="rounded border border-border bg-card p-3 text-xs">
        Tile {{ i }}
      </div>
    </Dashboard>
  </div>
</template>
