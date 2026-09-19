<script setup lang="ts">
import { computed, ref } from "vue";
import { Badge, Checkbox, DataGrid } from "@ecoma-io/loom";
import type { DataGridColumn, DataGridSortState } from "@ecoma-io/loom";

type Row = {
  id: string;
  service: string;
  builds: number;
  state: "passing" | "degraded";
  [key: string]: unknown;
};

const ROWS: Row[] = [
  { id: "api", service: "api", builds: 12, state: "passing" },
  { id: "web", service: "web", builds: 7, state: "degraded" },
  { id: "worker", service: "worker", builds: 21, state: "passing" },
];

// The windowed story needs enough rows to overflow its viewport — 50 at
// 44px/row is three screens of scrolling. Same row shape, same slot wiring.
const ROWS_50: Row[] = Array.from({ length: 50 }, (_, i) => ({
  id: `w${i}`,
  service: `service-${i}`,
  builds: i % 30,
  state: i % 2 === 0 ? "passing" : "degraded",
}));

const COLUMNS: DataGridColumn[] = [
  { key: "service", header: "Service", sortable: true },
  { key: "builds", header: "Builds", sortable: true, align: "right", width: "6rem" },
  { key: "state", header: "State" },
];

const sort = ref<DataGridSortState>(undefined);
const selected = ref<Array<string | number>>([]);
const picked = ref<string | undefined>(undefined);
const windowed = ref(false);

const rows = computed(() => {
  const source = windowed.value ? ROWS_50 : ROWS;
  if (!sort.value) return source;
  const { key, direction } = sort.value;
  return [...source].sort((a, b) => {
    const va = a[key as keyof Row];
    const vb = b[key as keyof Row];
    const order =
      typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
    return direction === "asc" ? order : -order;
  });
});
</script>

<template>
  <div class="max-w-xl">
    <!-- Exactly one grid is in the DOM at any moment: v-if swaps, never a
         second instance, so role="grid" stays unambiguous in the harness. -->
    <div class="mb-3 flex items-center gap-2 text-small text-muted-foreground">
      <!-- No wrapping <label>: Checkbox owns its input, so a <label> would
           claim the wrong control (vuejs-accessibility/label-has-for). The
           accessible name comes from aria-label; the word is visible text. -->
      <Checkbox v-model="windowed" :aria-label="'Window 50 rows'" />
      <span>Window 50 rows</span>
    </div>
    <DataGrid
      v-if="!windowed"
      v-model:selected-row-keys="selected"
      v-model:sort="sort"
      :columns="COLUMNS"
      :rows="rows"
      selectable
      caption="Service builds this week"
      @row-activate="(row) => (picked = String(row.service))"
    >
      <template #cell="{ column, value }">
        <Badge v-if="column.key === 'state'" :variant="value === 'passing' ? 'success' : 'warning'">
          {{ value }}
        </Badge>
        <template v-else>{{ value }}</template>
      </template>
    </DataGrid>
    <DataGrid
      v-else
      v-model:selected-row-keys="selected"
      v-model:sort="sort"
      :columns="COLUMNS"
      :rows="rows"
      :virtualized="true"
      :max-height="'17rem'"
      selectable
      caption="Service builds this week"
      @row-activate="(row) => (picked = String(row.service))"
    >
      <template #cell="{ column, value }">
        <Badge v-if="column.key === 'state'" :variant="value === 'passing' ? 'success' : 'warning'">
          {{ value }}
        </Badge>
        <template v-else>{{ value }}</template>
      </template>
    </DataGrid>
    <p aria-live="polite" class="mt-2 text-small text-muted-foreground">
      Selected: {{ selected.length }} · Picked: {{ picked ?? "none" }}
    </p>
  </div>
</template>
