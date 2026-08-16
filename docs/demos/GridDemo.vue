<script setup lang="ts">
import GridComponent from "./Grid.vue";
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Auto-fit grid</div>
      <div class="text-xs text-muted-foreground">
        Columns reflow from the container width — no fixed breakpoints needed.
      </div>
    </div>

    <GridComponent gap="md">
      <div v-for="i in 6" :key="i" class="rounded border border-border bg-card p-3 text-xs">
        Cell {{ i }}
      </div>
    </GridComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Narrow columns</div>
      <div class="text-xs text-muted-foreground">
        A smaller <code>minColWidth</code> fits more columns per row.
      </div>
    </div>

    <GridComponent gap="md" min-col-width="10rem">
      <div v-for="i in 8" :key="i" class="rounded border border-border bg-card p-3 text-xs">
        Cell {{ i }}
      </div>
    </GridComponent>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Gap steps</div>
    </div>

    <GridComponent gap="sm" min-col-width="12rem">
      <div v-for="i in 4" :key="i" class="rounded border border-border bg-card p-2 text-xs">sm</div>
    </GridComponent>

    <GridComponent gap="lg" min-col-width="12rem">
      <div v-for="i in 4" :key="i" class="rounded border border-border bg-card p-2 text-xs">lg</div>
    </GridComponent>
  </div>
</template>
