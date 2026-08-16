<script setup lang="ts">
import { ref } from "vue";
import Menubar, { type MenubarMenu } from "@ecoma-io/loom-menubar";

const last = ref<string>("—");

const menus: MenubarMenu[] = [
  {
    id: "file",
    label: "File",
    items: [
      { label: "Open project…", command: "file.open", shortcut: "Ctrl+O" },
      { separator: true, label: "" },
      { label: "Settings", command: "nav.settings", shortcut: "Ctrl+," },
      { separator: true, label: "" },
      { label: "Quit", command: "app.quit" },
    ],
  },
  {
    id: "view",
    label: "View",
    items: [
      { label: "Toggle sidebar", command: "view.sidebar", shortcut: "Ctrl+B" },
      { label: "Toggle panel", command: "view.panel", shortcut: "Ctrl+J" },
      { label: "Toggle AI chat", command: "view.ai", shortcut: "Ctrl+I" },
      { separator: true, label: "" },
      { label: "Command palette", command: "view.palette", shortcut: "Ctrl+K" },
    ],
  },
  {
    id: "help",
    label: "Help",
    items: [
      { label: "Documentation", command: "help.docs" },
      { label: "About", command: "help.about" },
      { label: "Check for updates (coming soon)", disabled: true },
    ],
  },
];
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="rounded-lg border border-border bg-card px-1.5 py-1">
      <Menubar :menus="menus" @select="last = $event" />
    </div>
    <div class="text-xs text-muted-foreground">
      Last command: <code class="tabular text-foreground">{{ last }}</code>
      <span class="ml-2">— click a menu, or try ↑ ↓ ← → and Esc.</span>
    </div>
  </div>
</template>
