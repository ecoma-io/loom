<script setup lang="ts">
import { Eye, Pencil, Trash2 } from "@lucide/vue";
import RowActions from "./RowActions.vue";
import Button from "../../primitives/Button/Button.vue";
import Surface from "../../primitives/Surface/Surface.vue";

const rows = [
  { name: "Daily video digest builder", meta: "2 steps · cron every 60 min" },
  { name: "Weekly repo cleanup", meta: "1 step · manual" },
  { name: "Keyword-driven blog draft", meta: "3 steps · webhook" },
];
</script>

<template>
  <div class="flex flex-col gap-3">
    <Surface pad="none" class="overflow-hidden">
      <ul class="divide-y divide-border">
        <!-- `group` on the ROW is what scopes the reveal — without it every
             row's actions would light up at once. -->
        <li v-for="row in rows" :key="row.name" class="group flex items-center gap-3 px-3 py-2.5">
          <div class="min-w-0 flex-1">
            <p class="truncate text-body font-medium text-foreground">{{ row.name }}</p>
            <p class="truncate text-small text-muted-foreground">{{ row.meta }}</p>
          </div>
          <RowActions>
            <Button size="icon-sm" variant="ghost" :aria-label="`View ${row.name}`">
              <Eye />
            </Button>
            <Button size="icon-sm" variant="ghost" :aria-label="`Edit ${row.name}`">
              <Pencil />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              class="hover:bg-destructive/10 hover:text-destructive"
              :aria-label="`Delete ${row.name}`"
            >
              <Trash2 />
            </Button>
          </RowActions>
          <Button size="sm" variant="outline">Run</Button>
        </li>
      </ul>
    </Surface>
    <p class="text-small text-muted-foreground">
      Hover a row to reveal its action group — or Tab into the row, since the same reveal also runs
      on
      <code class="font-mono text-micro">focus-within</code>.
    </p>
  </div>
</template>
