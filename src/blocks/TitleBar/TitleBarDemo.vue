<script setup lang="ts">
import { ref } from "vue";
import TitleBar from "./TitleBar.vue";
import { Hexagon } from "@lucide/vue";
import type { MenubarMenu } from "../../primitives/Menubar/Menubar.vue";
import type { WindowPlatform } from "../../primitives/WindowControls/WindowControls.vue";

const isMaximized = ref(false);
const last = ref("—");
const platform = ref<WindowPlatform>("windows");

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
    <fieldset class="flex items-center gap-2 text-xs text-muted-foreground">
      <legend class="sr-only">Platform</legend>
      <label for="tb-platform-windows" class="flex items-center gap-1">
        <input
          id="tb-platform-windows"
          v-model="platform"
          type="radio"
          value="windows"
          class="accent-primary"
        />
        Windows
      </label>
      <label for="tb-platform-macos" class="flex items-center gap-1">
        <input
          id="tb-platform-macos"
          v-model="platform"
          type="radio"
          value="macos"
          class="accent-primary"
        />
        macOS
      </label>
      <label for="tb-platform-linux" class="flex items-center gap-1">
        <input
          id="tb-platform-linux"
          v-model="platform"
          type="radio"
          value="linux"
          class="accent-primary"
        />
        Linux
      </label>
    </fieldset>

    <!-- rounded/overflow-hidden so the bar reads as the top of a window -->
    <div class="overflow-hidden rounded-lg border border-border shadow-sm">
      <TitleBar
        app-name="MyApp"
        title="teaser-launch.mp4 — Demo project"
        :menus="menus"
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
