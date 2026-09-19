<script setup lang="ts">
import { ref } from "vue";
import { VirtualList } from "@ecoma-io/loom";

// A synthetic catalogue large enough that only a window of it may be in the
// DOM at once — 50_000 rows at 32px is 1.6km of list, and the demo stays at
// ~20 nodes.
const items = Array.from({ length: 50_000 }, (_, i) => ({
  id: `item-${i}`,
  name: `Row ${i}`,
  note: i % 5 === 0 ? "flagged" : "",
}));

const activeRow = ref(-1);
const picked = ref(-1);

function choose(index: number): void {
  picked.value = index;
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-fg-2 text-sm leading-relaxed">
      A virtualized list of {{ items.length.toLocaleString() }} rows: the DOM holds only the
      viewport window plus overscan. Arrow keys, Home/End and PgUp/PgDn rove the active row; Enter
      activates it.
    </p>
    <div class="overflow-hidden rounded-lg border shadow-sm dark:border-*">
      <VirtualList
        v-model:active-index="activeRow"
        :items="items"
        :item-height="32"
        label="Catalogue rows"
        class="h-96 w-full bg-canvas-1"
        @activate="choose"
      >
        <template #default="{ item, index, active }">
          <div
            :data-picked="picked === index"
            :class="[
              'flex h-full items-center gap-3 border-b px-3 text-sm',
              active ? 'bg-accent-1/60' : 'bg-canvas-1',
              picked === index && 'ring-1 ring-inset ring-accent-2',
            ]"
          >
            <span class="w-16 shrink-0 font-mono text-fg-3">{{ index }}</span>
            <span class="truncate text-fg-1">{{ item.name }}</span>
            <span v-if="item.note" class="ml-auto shrink-0 text-fg-3">{{ item.note }}</span>
          </div>
        </template>
      </VirtualList>
    </div>
    <p class="text-fg-2 text-sm" aria-live="polite">
      {{
        picked >= 0
          ? `Activated: ${items[picked]?.name}`
          : "Nothing activated yet — press Enter on a row."
      }}
    </p>
  </div>
</template>
