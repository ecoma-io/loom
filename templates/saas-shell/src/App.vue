<script setup lang="ts">
// Every import here is a published specifier — that is the whole point of a
// template. An internal `@ecoma-io/loom-*` import would fail the dev server
// (this template's Vite config aliases only the named published specifiers)
// and redden `archkeep check` (the layer-templates row judges the resolved
// target). If the surface cannot express something, file the gap rather than
// reach past it.
//
// useTheme rides the root specifier deliberately: the `/theme` subpath is also
// published, but in-tree its tsconfig alias lands on the core package, and the
// layer-templates row judges the resolved project, not the specifier a
// consumer writes — importing it here would redden the row for a reach the
// template does not make.
import {
  AppShell,
  Breadcrumb,
  Button,
  DataGrid,
  EmptyState,
  Field,
  FormActions,
  FormLayout,
  FormSection,
  Grid,
  LoadingState,
  MetricCard,
  PageHeader,
  Select,
  SidebarNav,
  SkipLink,
  Stack,
  Switch,
  TextField,
  useTheme,
  type DataGridColumn,
  type DataGridSortState,
  type SidebarNavItem,
  type SidebarNavSection,
} from "@ecoma-io/loom";
import { computed, onMounted, ref } from "vue";

// ---------------------------------------------------------------------------
// Navigation. Two pages, switched client-side — a real project replaces this
// with its router, but the shell, the landmarks and the heading hierarchy stay
// exactly as they are here.
// ---------------------------------------------------------------------------
type Page = "dashboard" | "settings";

const page = ref<Page>("dashboard");

const navSections = computed<SidebarNavSection[]>(() => [
  {
    items: [
      { label: "Dashboard", active: page.value === "dashboard" },
      { label: "Settings", active: page.value === "settings" },
    ],
  },
]);

// SidebarNavItem carries no route key — the host owns routing, so the mapping
// from a nav item to a page lives here, in one function a router call replaces.
function onNavSelect(item: SidebarNavItem): void {
  if (item.label === "Dashboard") page.value = "dashboard";
  if (item.label === "Settings") page.value = "settings";
}

const breadcrumbs = computed(() => [
  { label: "Acme Inc" },
  { label: page.value === "dashboard" ? "Dashboard" : "Settings" },
]);

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

// ---------------------------------------------------------------------------
// Settings. A form layout, two fieldsets' worth of fields, and actions that
// a real project wires to its API. The submit button sits inside the <form>,
// so it submits natively — no click handler needed.
// ---------------------------------------------------------------------------
const workspaceName = ref("Acme Inc");
const supportEmail = ref("support@acme.example");
const defaultRange = ref("30");
const emailDigest = ref(true);

function save(): void {
  // Wire your API call here. The template stops at the boundary a real app
  // owns: what "saved" means is your backend's answer, not the shell's.
}

function resetForm(): void {
  workspaceName.value = "Acme Inc";
  supportEmail.value = "support@acme.example";
  defaultRange.value = "30";
  emailDigest.value = true;
}

const rangeOptions = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const { resolvedTheme, toggleTheme } = useTheme();
</script>

<template>
  <!-- First node in the DOM: keyboard users reach it before anything else.
       Its destination is the <main> below, which carries tabindex="-1". -->
  <SkipLink />

  <AppShell sidebar-width="md" sidebar-aria-label="Primary">
    <template #sidebar>
      <div class="flex h-full flex-col gap-4 p-4">
        <!-- The brand is a plain paragraph, not a link: the template has one
             page set and nothing to navigate home to. -->
        <p class="text-heading font-semibold">Acme Inc</p>
        <SidebarNav :sections="navSections" aria-label="Primary" @select="onNavSelect" />
      </div>
    </template>

    <template #header>
      <header class="flex items-center justify-between gap-4 px-4 py-3">
        <Breadcrumb :items="breadcrumbs" />
        <Button variant="ghost" @click="toggleTheme"> {{ resolvedTheme }} theme </Button>
      </header>
    </template>

    <main id="main" tabindex="-1" class="focus:outline-none">
      <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
           Dashboard
         - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->
      <div v-if="page === 'dashboard'" class="py-8">
        <Stack gap="lg">
          <PageHeader title="Dashboard" description="Revenue and customer health at a glance.">
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
                <Select
                  v-model="statusFilter"
                  :options="statusOptions"
                  placeholder="All statuses"
                />
              </Field>
            </div>

            <LoadingState v-if="loading" label="Loading customers" mode="skeleton" />

            <!-- DataGrid renders the rows it is given and has no empty-state
                 slot; when the filter matches nothing, the grid makes way for
                 an EmptyState and the filter's undo lives in its action. -->
            <template v-else-if="sortedRows.length > 0">
              <DataGrid
                v-model:sort="sort"
                :columns="columns"
                :rows="sortedRows"
                caption="Customers"
              >
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
      </div>

      <!-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
           Settings
         - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -->
      <div v-else class="py-8">
        <!-- The form owns submission: Save renders inside it, so the native
             submit path fires and @submit.prevent keeps the page from
             reloading. Cancel resets the fields to their initial values. -->
        <form @submit.prevent="save">
          <FormLayout max-width="lg">
            <template #header>
              <PageHeader
                title="Settings"
                description="Workspace profile and delivery preferences."
              />
            </template>

            <FormSection
              legend="Workspace profile"
              description="How your workspace appears to teammates."
            >
              <Field label="Workspace name" name="workspace-name" required>
                <TextField v-model="workspaceName" placeholder="Your company" />
              </Field>
              <Field
                label="Support email"
                name="support-email"
                hint="Shown to customers on billing emails."
              >
                <TextField
                  v-model="supportEmail"
                  type="email"
                  placeholder="support@yourcompany.com"
                />
              </Field>
            </FormSection>

            <FormSection
              legend="Delivery preferences"
              description="How often Loom reports activity to your inbox."
            >
              <Field label="Default report range" name="default-range">
                <!-- The a11y rule reads `<Select>` as a bare native `<select>`
                     and cannot follow a label arriving through the Field's
                     slot — the same false positive FieldDemo quiets. -->
                <!-- eslint-disable-next-line vuejs-accessibility/form-control-has-label -->
                <Select v-model="defaultRange" :options="rangeOptions" />
              </Field>
              <div class="flex items-center justify-between gap-4">
                <span id="email-digest-label" class="text-sm">Weekly email digest</span>
                <Switch v-model="emailDigest" aria-labelledby="email-digest-label" />
              </div>
            </FormSection>

            <template #actions>
              <FormActions>
                <template #cancel>
                  <Button variant="subtle" type="button" @click="resetForm">Cancel</Button>
                </template>
                <Button variant="primary" type="submit">Save changes</Button>
              </FormActions>
            </template>
          </FormLayout>
        </form>
      </div>
    </main>
  </AppShell>
</template>
