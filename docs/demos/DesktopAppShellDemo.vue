<script setup lang="ts">
import { ref } from "vue";
import {
  DesktopAppShell,
  SidebarNav,
  type SidebarNavSection,
  type WindowPlatform,
} from "@ecoma-io/loom";
import { Hexagon, Home, Settings, Bell, Search } from "@lucide/vue";

const isMaximized = ref(false);
const last = ref("—");
const platform = ref<WindowPlatform>("windows");

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
    <fieldset class="flex items-center gap-2 text-xs text-muted-foreground">
      <legend class="sr-only">Platform</legend>
      <label for="das-platform-windows" class="flex min-h-6 items-center gap-1">
        <input
          id="das-platform-windows"
          v-model="platform"
          type="radio"
          value="windows"
          class="accent-primary"
        />
        Windows
      </label>
      <label for="das-platform-macos" class="flex min-h-6 items-center gap-1">
        <input
          id="das-platform-macos"
          v-model="platform"
          type="radio"
          value="macos"
          class="accent-primary"
        />
        macOS
      </label>
      <label for="das-platform-linux" class="flex min-h-6 items-center gap-1">
        <input
          id="das-platform-linux"
          v-model="platform"
          type="radio"
          value="linux"
          class="accent-primary"
        />
        Linux
      </label>
    </fieldset>

    <div class="overflow-hidden rounded-lg border border-border shadow-sm">
      <DesktopAppShell
        app-name="MyApp"
        title="project-alpha — MyApp"
        sidebar-width="md"
        sidebar-aria-label="Primary navigation"
        :platform="platform"
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
