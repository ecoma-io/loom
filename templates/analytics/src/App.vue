<script setup lang="ts">
// Every import here is a published specifier — that is the whole point of a
// template. An internal `@ecoma-io/loom-*` import would fail the dev server
// (this template's Vite config aliases only the named published specifiers)
// and redden `archkeep check` (the layer-templates row judges the resolved
// target). If the surface cannot express something, file the gap rather than
// reach past it.
import {
  Button,
  DataGrid,
  EmptyState,
  Field,
  Grid,
  LoadingState,
  MetricCard,
  PageHeader,
  Select,
  Stack,
  type DataGridColumn,
  type DataGridSortState,
} from "@ecoma-io/loom";
import { computed, onMounted, ref } from "vue";

// A template owns one page. The shell around it — sidebar, header, routing,
// theme switching — is application territory the consumer's own app provides;
// this file is the page they build on, and stops there.
// ---------------------------------------------------------------------------
// Customers. A template has no backend, so the "fetch" is a timeout over a
// fixture — but the states around it are the real ones a consumer wires:
// loading before first paint of the grid, and empty when a filter matches
// nothing. DataGrid has no empty-state slot by design; the pairing below is
// the pattern the library expects a host to own.
// ---------------------------------------------------------------------------
// The index signature is DataGrid's row contract (`Record<string, unknown>`)
// — the same shape DataGridDemo's own row type carries.
interface Customer {
  id: string;
  name: string;
  email: string;
  plan: string;
  mrr: number;
  status: "active" | "trial" | "churned";
  [key: string]: unknown;
}

const CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "Northwind Traders",
    email: "ops@northwind.example",
    plan: "Enterprise",
    mrr: 1240,
    status: "active",
  },
  {
    id: "c2",
    name: "Contoso Labs",
    email: "hello@contoso.example",
    plan: "Growth",
    mrr: 480,
    status: "active",
  },
  {
    id: "c3",
    name: "Fabrikam Freight",
    email: "it@fabrikam.example",
    plan: "Enterprise",
    mrr: 2100,
    status: "active",
  },
  {
    id: "c4",
    name: "Tailspin Toys",
    email: "dev@tailspin.example",
    plan: "Starter",
    mrr: 90,
    status: "trial",
  },
  {
    id: "c5",
    name: "Adventure Works",
    email: "admin@adventure.example",
    plan: "Growth",
    mrr: 520,
    status: "trial",
  },
  {
    id: "c6",
    name: "Litware Systems",
    email: "contact@litware.example",
    plan: "Starter",
    mrr: 90,
    status: "churned",
  },
  {
    id: "c7",
    name: "Proseware",
    email: "team@proseware.example",
    plan: "Growth",
    mrr: 610,
    status: "active",
  },
  {
    id: "c8",
    name: "Alpine Ski House",
    email: "bookings@alpine.example",
    plan: "Starter",
    mrr: 120,
    status: "churned",
  },
];

const loading = ref(true);
const statusFilter = ref("");
const sort = ref<DataGridSortState>(undefined);

// The mock fetch. Swap this function for your API call; the states below do
// not change.
function load(): void {
  loading.value = true;
  window.setTimeout(() => {
    loading.value = false;
  }, 600);
}
onMounted(load);

const filteredRows = computed(() =>
  statusFilter.value ? CUSTOMERS.filter((c) => c.status === statusFilter.value) : CUSTOMERS,
);

// DataGrid cycles and emits sort state; it never reorders rows — the host
// sorts. Numbers compare numerically, everything else lexically.
const sortedRows = computed(() => {
  if (!sort.value) return filteredRows.value;
  const { key, direction } = sort.value;
  const dir = direction === "asc" ? 1 : -1;
  return [...filteredRows.value].sort((a, b) => {
    const av = a[key as keyof Customer];
    const bv = b[key as keyof Customer];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
});

const columns: DataGridColumn[] = [
  { key: "name", header: "Customer", sortable: true },
  { key: "email", header: "Email" },
  { key: "plan", header: "Plan", sortable: true },
  { key: "mrr", header: "MRR", sortable: true, align: "right" },
  { key: "status", header: "Status", sortable: true },
];

function formatMrr(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "churned", label: "Churned" },
];

// The metric cards derive from the same data the grid shows, so a skeleton
// card and a skeleton row resolve together — one loading flag drives both.
const metrics = computed(() => {
  const active = CUSTOMERS.filter((c) => c.status === "active");
  const trial = CUSTOMERS.filter((c) => c.status === "trial");
  const churned = CUSTOMERS.filter((c) => c.status === "churned");
  const mrr = active.reduce((sum, c) => sum + c.mrr, 0);
  return [
    {
      label: "Active customers",
      value: String(active.length),
      trend: "up" as const,
      trendValue: "+2 this month",
    },
    {
      label: "Monthly recurring revenue",
      value: formatMrr(mrr),
      trend: "up" as const,
      trendValue: "+8.1%",
    },
    {
      label: "Open trials",
      value: String(trial.length),
      trend: "flat" as const,
      trendValue: "no change",
    },
    {
      label: "Churned",
      value: String(churned.length),
      trend: "down" as const,
      trendValue: "-1 this month",
    },
  ];
});
</script>

<template>
  <main class="focus:outline-none">
    <Stack gap="lg" class="py-8">
      <PageHeader title="Analytics" description="Revenue and customer health at a glance.">
        <template #actions>
          <Button @click="load">Reload data</Button>
        </template>
      </PageHeader>

      <Grid min-col-width="14rem">
        <MetricCard
          v-for="metric in metrics"
          :key="metric.label"
          :label="metric.label"
          :value="metric.value"
          :trend="metric.trend"
          :trend-value="metric.trendValue"
          :loading="loading"
        />
      </Grid>

      <Stack gap="md">
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-title font-semibold">Customers</h2>
          <!-- Labelled by its Field so the visible label is the accessible
               name — no duplicated aria-label to fall out of sync. -->
          <Field label="Filter by status" class="w-48">
            <!-- The a11y rule reads `<Select>` as a bare native `<select>`
                 and cannot follow a label arriving through the Field's
                 slot — the same false positive FieldDemo quiets. -->
            <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
            <Select v-model="statusFilter" :options="statusOptions" placeholder="All statuses" />
          </Field>
        </div>

        <LoadingState v-if="loading" label="Loading customers" mode="skeleton" />

        <!-- DataGrid renders the rows it is given and has no empty-state
             slot; when the filter matches nothing, the grid makes way for
             an EmptyState and the filter's undo lives in its action. -->
        <template v-else-if="sortedRows.length > 0">
          <DataGrid v-model:sort="sort" :columns="columns" :rows="sortedRows" caption="Customers">
            <template #cell="{ column, value }">
              <template v-if="column.key === 'mrr'">{{ formatMrr(value as number) }}</template>
              <template v-else>{{ value }}</template>
            </template>
          </DataGrid>
        </template>

        <EmptyState
          v-else
          title="No customers match this filter"
          :description="`No customers have status “${statusFilter}”.`"
        >
          <template #action>
            <Button variant="secondary" @click="statusFilter = ''">Clear filter</Button>
          </template>
        </EmptyState>
      </Stack>
    </Stack>
  </main>
</template>
