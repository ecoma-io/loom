<script setup lang="ts">
import { ref } from "vue";
import ContextMenu, { type ContextMenuEntry } from "@ecoma-io/loom-context-menu";

const lastCommand = ref("—");

const basicItems: ContextMenuEntry[] = [
  { label: "Cut", value: "cut", shortcut: "⌘X" },
  { label: "Copy", value: "copy", shortcut: "⌘C" },
  { separator: true },
  { label: "Paste", value: "paste", shortcut: "⌘V" },
];

const fullItems: ContextMenuEntry[] = [
  { heading: true, label: "Edit" },
  { label: "Undo", value: "undo", shortcut: "⌘Z" },
  { label: "Redo", value: "redo", shortcut: "⇧⌘Z" },
  { separator: true },
  { heading: true, label: "Clipboard" },
  { label: "Cut", value: "cut", shortcut: "⌘X" },
  { label: "Copy", value: "copy", shortcut: "⌘C" },
  { label: "Paste", value: "paste", disabled: true },
  { separator: true },
  { label: "Delete", value: "delete", danger: true, shortcut: "⌫" },
];

function onSelect(value: string) {
  lastCommand.value = value;
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <p class="text-small font-medium">Basic context menu</p>
      <ContextMenu :items="basicItems" @select="onSelect">
        <template #trigger>
          <div
            class="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground"
          >
            Right-click here
          </div>
        </template>
      </ContextMenu>
    </div>

    <div class="flex flex-col gap-2">
      <p class="text-small font-medium">Headings, separators, shortcuts, disabled and danger</p>
      <ContextMenu :items="fullItems" @select="onSelect">
        <template #trigger>
          <div
            class="flex h-24 w-full items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground"
          >
            Right-click here
          </div>
        </template>
      </ContextMenu>
    </div>

    <p class="text-xs text-muted-foreground">Last command: {{ lastCommand }}</p>
  </div>
</template>
