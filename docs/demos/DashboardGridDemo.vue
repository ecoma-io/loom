<script setup lang="ts">
import { Activity, TrendingDown, TrendingUp } from "@lucide/vue";
import { Badge, DashboardGrid, Separator, Surface } from "@ecoma-io/loom";

/** KPI row — label, big tabular value, and a delta as a status Badge. */
const kpis = [
  { label: "Orders today", value: "1,284", delta: "+12%", trend: "up" },
  { label: "Revenue", value: "$48.2k", delta: "+4%", trend: "up" },
  { label: "Return rate", value: "1.3%", delta: "-0.2%", trend: "down" },
  { label: "Active tasks", value: "6", delta: "+2", trend: "up" },
] as const;

const recentActivity = [
  'Workflow "Inventory reconciliation" finished — 214 rows matched.',
  "The triage queue produced 8 drafts awaiting review.",
  "3 invoices have been pending approval for over 24 hours.",
];
</script>

<template>
  <!-- Realistic dashboard: a KPI row that reflows with the viewport, plus two
       wider panels spanning multiple tiles once the grid has room for them. -->
  <DashboardGrid min-tile-width="14rem" gap="md">
    <Surface v-for="kpi in kpis" :key="kpi.label" pad="md" class="flex flex-col gap-2">
      <p class="text-small text-muted-foreground">{{ kpi.label }}</p>
      <div class="flex items-baseline gap-2">
        <p class="tabular text-display text-foreground">{{ kpi.value }}</p>
        <Badge :variant="kpi.trend === 'up' ? 'success' : 'destructive'">
          <component :is="kpi.trend === 'up' ? TrendingUp : TrendingDown" aria-hidden="true" />
          <span class="tabular">{{ kpi.delta }}</span>
        </Badge>
      </div>
    </Surface>

    <Surface pad="lg" class="flex flex-col gap-3 sm:col-span-2">
      <div class="flex items-center gap-2">
        <Activity aria-hidden="true" class="text-muted-foreground" />
        <p class="text-title text-foreground">Recent activity</p>
      </div>
      <template v-for="(item, i) in recentActivity" :key="item">
        <Separator v-if="i > 0" />
        <p class="text-body text-foreground">{{ item }}</p>
      </template>
    </Surface>

    <Surface pad="lg" class="flex flex-col gap-3 sm:col-span-2">
      <div class="flex items-center gap-2">
        <Activity aria-hidden="true" class="text-accent-text" />
        <p class="text-title text-foreground">Active tasks</p>
      </div>
      <p class="text-body text-muted-foreground">
        6 background tasks are running, with zero errors in the past hour.
      </p>
    </Surface>
  </DashboardGrid>
</template>
