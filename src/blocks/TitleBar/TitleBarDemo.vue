<script setup lang="ts">
import { ref } from "vue";
import TitleBar from "./TitleBar.vue";
import { Hexagon } from "@lucide/vue";
import type { MenubarMenu } from "../../primitives/Menubar/Menubar.vue";

const isMaximized = ref(false);
const last = ref("—");

const menus: MenubarMenu[] = [
  {
    id: "file",
    label: "File",
    items: [
      { label: "Open project…", command: "file.open", shortcut: "Ctrl+O" },
      { separator: true, label: "" },
      { label: "Settings", command: "nav.settings" },
    ],
  },
  {
    id: "view",
    label: "View",
    items: [
      { label: "Toggle sidebar", command: "view.sidebar", shortcut: "Ctrl+B" },
      { label: "Command palette", command: "view.palette", shortcut: "Ctrl+K" },
    ],
  },
  { id: "help", label: "Help", items: [{ label: "About", command: "help.about" }] },
];
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- rounded/overflow-hidden so the bar reads as the top of a window -->
    <div class="overflow-hidden rounded-lg border border-border shadow-sm">
      <TitleBar
        app-name="MyApp"
        title="teaser-launch.mp4 — Demo project"
        :menus="menus"
        :is-maximized="isMaximized"
        @select="last = $event"
        @minimize="last = 'window.minimize'"
        @maximize="((isMaximized = !isMaximized), (last = 'window.maximize'))"
        @close="last = 'window.close'"
      >
        <template #brandMark>
          <Hexagon :size="10" :stroke-width="2.5" />
        </template>
      </TitleBar>
      <div class="grid h-24 place-items-center bg-background text-xs text-muted-foreground">
        (app body)
      </div>
    </div>
    <div class="text-xs text-muted-foreground">
      Last event: <code class="tabular text-foreground">{{ last }}</code>
    </div>
  </div>
</template>
