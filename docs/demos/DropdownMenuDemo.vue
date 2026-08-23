<script setup lang="ts">
import { ref } from "vue";
import { ChevronDown } from "@lucide/vue";
import { Button, DropdownMenu, type DropdownMenuEntry } from "@ecoma-io/loom";

const lastCommand = ref("—");

const items: DropdownMenuEntry[] = [
  { heading: true, label: "Scene" },
  { label: "Duplicate", value: "duplicate", shortcut: "⌘D" },
  { label: "Rename", value: "rename", shortcut: "F2" },
  { separator: true },
  { label: "Export video", value: "export" },
  { label: "Unavailable here", value: "noop", disabled: true },
  { separator: true },
  { label: "Delete scene", value: "delete", danger: true, shortcut: "⌫" },
];

function onSelect(value: string) {
  lastCommand.value = value;
}
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <DropdownMenu :items="items" @select="onSelect">
      <template #trigger>
        <Button variant="outline">
          Actions
          <ChevronDown class="h-4 w-4" />
        </Button>
      </template>
    </DropdownMenu>
    <p class="text-xs text-muted-foreground">Last command: {{ lastCommand }}</p>
  </div>
</template>
