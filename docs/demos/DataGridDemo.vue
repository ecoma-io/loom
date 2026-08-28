<script setup lang="ts">
import { computed, ref } from "vue";
import { Badge, DataGrid } from "@ecoma-io/loom";
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

const COLUMNS: DataGridColumn[] = [
  { key: "service", header: "Service", sortable: true },
  { key: "builds", header: "Builds", sortable: true, align: "right", width: "6rem" },
  { key: "state", header: "State" },
];

const sort = ref<DataGridSortState>(undefined);
const selected = ref<Array<string | number>>([]);
const picked = ref<string | undefined>(undefined);

const rows = computed(() => {
  if (!sort.value) return ROWS;
  const { key, direction } = sort.value;
  return [...ROWS].sort((a, b) => {
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
    <DataGrid
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
    <p aria-live="polite" class="mt-2 text-small text-muted-foreground">
      Selected: {{ selected.length }} · Picked: {{ picked ?? "none" }}
    </p>
  </div>
</template>
