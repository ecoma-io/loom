<script setup lang="ts">
import { ref } from "vue";
import { Command, type CommandItem, type CommandGroup } from "@ecoma-io/loom";

const items: CommandItem[] = [
  {
    value: "settings",
    label: "Open settings",
    group: "Navigation",
    description: "Application preferences and configuration",
  },
  {
    value: "docs",
    label: "Go to docs",
    group: "Navigation",
    description: "Read the documentation",
  },
  { value: "profile", label: "Edit profile", group: "Actions" },
  { value: "project", label: "Create project", group: "Actions" },
  { value: "team", label: "Invite team member", group: "Actions" },
  { value: "dark", label: "Toggle dark mode", group: "Preferences" },
  { value: "lang", label: "Change language", group: "Preferences" },
  { value: "logout", label: "Log out" },
  { value: "help", label: "Help" },
];

const groups: CommandGroup[] = [
  { heading: "Navigation" },
  { heading: "Actions" },
  { heading: "Preferences" },
];

const selected = ref("");
</script>

<template>
  <div class="flex w-full max-w-sm flex-col gap-4">
    <div class="flex flex-col gap-2">
      <span id="command-demo-grouped" class="text-xs text-muted-foreground">
        grouped commands — type to filter, arrow keys to navigate, Enter to select
      </span>
      <Command
        :items="items"
        :groups="groups"
        :labels="{ placeholder: 'Search commands…' }"
        aria-labelledby="command-demo-grouped"
        @select="selected = $event"
      />
    </div>

    <p class="text-xs text-muted-foreground">
      Selected: <span class="tabular">{{ selected || "none" }}</span>
    </p>
  </div>
</template>
