<script setup lang="ts">
import { Users, DollarSign, AlertTriangle, Activity } from "@lucide/vue";
import MetricCard from "@ecoma-io/loom-metric-card";
</script>

<template>
  <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
    <MetricCard value="12,847" label="Active users" trend="up" trend-value="+12.5%">
      <template #icon><Users /></template>
    </MetricCard>
    <MetricCard value="$84.2k" label="Revenue" trend="up" trend-value="+8.1%">
      <template #icon><DollarSign /></template>
    </MetricCard>
    <MetricCard value="3.2%" label="Churn rate" trend="down" trend-value="-3.2%">
      <template #icon><AlertTriangle /></template>
    </MetricCard>
    <MetricCard value="99.9%" label="Uptime" trend="flat" trend-value="0%">
      <template #icon><Activity /></template>
    </MetricCard>
  </div>
</template>
