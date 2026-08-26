<script setup lang="ts">
import { NavigationMenu } from "@ecoma-io/loom";

const items = [
  {
    label: "Products",
    value: "products",
    children: [
      { label: "Analytics", href: "/analytics", description: "Real-time dashboards and charts" },
      { label: "Reports", href: "/reports", active: true },
      { label: "Integrations", href: "/integrations" },
    ],
  },
  {
    label: "Solutions",
    value: "solutions",
    children: [
      { label: "Startups", href: "/solutions/startups" },
      { label: "Enterprise", href: "/solutions/enterprise" },
      { label: "Agencies", href: "/solutions/agencies" },
    ],
  },
  {
    label: "Docs",
    value: "docs",
    href: "/docs",
  },
  {
    label: "Blog",
    value: "blog",
    href: "/blog",
    active: true,
  },
  {
    label: "Disabled",
    value: "disabled",
    href: "/nope",
    disabled: true,
  },
];
</script>

<template>
  <div class="rounded-lg border border-border bg-card px-1.5 py-1">
    <NavigationMenu :items="items" />
  </div>
</template>
