<script setup lang="ts">
import { computed, ref } from "vue";
import { Badge, Table, TableCell, TableHead, TableRow } from "@ecoma-io/loom";
import type { TableSort } from "@ecoma-io/loom";

interface Row {
  service: string;
  builds: number;
  state: "passing" | "degraded";
}

const ROWS: Row[] = [
  { service: "api", builds: 12, state: "passing" },
  { service: "web", builds: 7, state: "degraded" },
  { service: "worker", builds: 21, state: "passing" },
];

const sort = ref<TableSort | undefined>(undefined);

const rows = computed(() => {
  if (!sort.value) return ROWS;
  return [...ROWS].sort((a, b) =>
    sort.value === "asc" ? a.builds - b.builds : b.builds - a.builds,
  );
});

const picked = ref<string | undefined>(undefined);
</script>

<template>
  <div class="max-w-xl">
    <Table caption="Service builds this week">
      <thead>
        <TableRow>
          <TableHead>Service</TableHead>
          <TableHead v-model:sort="sort" align="right" sortable>Builds</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </thead>
      <tbody>
        <TableRow
          v-for="row in rows"
          :key="row.service"
          interactive
          :selected="picked === row.service"
          @activate="picked = row.service"
        >
          <TableCell>{{ row.service }}</TableCell>
          <TableCell align="right">{{ row.builds }}</TableCell>
          <TableCell>
            <Badge :variant="row.state === 'passing' ? 'success' : 'warning'">
              {{ row.state }}
            </Badge>
          </TableCell>
        </TableRow>
      </tbody>
    </Table>
    <p aria-live="polite" class="mt-2 text-small text-muted-foreground">
      Picked: {{ picked ?? "none" }}
    </p>
  </div>
</template>
