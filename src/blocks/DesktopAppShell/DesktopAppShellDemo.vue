<script setup lang="ts">
import { ref } from "vue";
import DesktopAppShell from "./DesktopAppShell.vue";
import SidebarNav from "../SidebarNav/SidebarNav.vue";
import { Hexagon, Home, Settings, Bell, Search } from "@lucide/vue";
import type { SidebarNavSection } from "../SidebarNav/SidebarNav.vue";

const isMaximized = ref(false);
const last = ref("—");

const sections: SidebarNavSection[] = [
  {
    items: [
      { icon: Home, label: "Home", active: true, href: "#" },
      { icon: Search, label: "Search", href: "#" },
      { icon: Bell, label: "Notifications", badge: 3, href: "#" },
    ],
  },
  {
    label: "System",
    items: [{ icon: Settings, label: "Settings", href: "#" }],
  },
];
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="overflow-hidden rounded-lg border border-border shadow-sm">
      <DesktopAppShell
        app-name="MyApp"
        title="project-alpha — MyApp"
        sidebar-width="md"
        sidebar-aria-label="Primary navigation"
        :is-maximized="isMaximized"
        @select="last = $event"
        @minimize="last = 'window.minimize'"
        @maximize="((isMaximized = !isMaximized), (last = 'window.maximize'))"
        @close="last = 'window.close'"
      >
        <template #brandMark>
          <Hexagon :size="10" :stroke-width="2.5" />
        </template>

        <template #sidebar>
          <SidebarNav :sections="sections" aria-label="Primary navigation" />
        </template>

        <div class="py-6">
          <h2 class="text-heading font-semibold text-foreground">Welcome to MyApp</h2>
          <p class="mt-2 text-body text-muted-foreground">
            This is the main content area of the desktop application shell.
          </p>
        </div>
      </DesktopAppShell>
    </div>
    <div class="text-xs text-muted-foreground">
      Last event: <code class="tabular text-foreground">{{ last }}</code>
    </div>
  </div>
</template>
