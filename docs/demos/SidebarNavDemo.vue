<script setup lang="ts">
import { ref } from "vue";
import { Bell, Boxes, LayoutDashboard, Settings, Users, Workflow } from "@lucide/vue";
import SidebarNav, { type SidebarNavSection } from "@ecoma-io/loom-sidebar-nav";
import Switch from "@ecoma-io/loom-switch";

const collapsed = ref(false);

const sections: SidebarNavSection[] = [
  {
    items: [
      { icon: LayoutDashboard, label: "Overview", active: true, href: "#" },
      { icon: Workflow, label: "Workflows", href: "#" },
      { icon: Boxes, label: "Connections", href: "#" },
      { icon: Users, label: "Members", href: "#" },
    ],
  },
  {
    label: "System",
    items: [
      { icon: Bell, label: "Notifications", badge: 3, href: "#" },
      { icon: Settings, label: "Settings", href: "#" },
    ],
  },
];
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- The rail's WIDTH is the host's to animate — the block only re-lays its
         own rows. Shown here because collapsing without narrowing the container
         is the half-done version of this mode, and the demo is what a consumer
         copies. 3.25rem = the 2.25rem square row + the nav's 0.5rem padding. -->
    <div
      class="flex h-80 overflow-hidden rounded-lg border border-border transition-[width] duration-slow ease-out"
      :class="collapsed ? 'w-[3.25rem]' : 'w-56'"
    >
      <SidebarNav :sections="sections" :collapsed="collapsed" aria-label="Primary navigation" />
    </div>
    <!-- Label lives on the row, wired via aria-labelledby (Switch's documented
         convention — it renders a button, not a labelable input). -->
    <div class="flex items-center gap-2 text-small text-muted-foreground">
      <span id="sidebar-nav-demo-collapsed">Collapse to icons</span>
      <Switch v-model="collapsed" aria-labelledby="sidebar-nav-demo-collapsed" />
    </div>
  </div>
</template>
