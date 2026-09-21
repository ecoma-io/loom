<script setup lang="ts">
import { ref } from "vue";
import { TreeView, type TreeNode } from "@ecoma-io/loom";

const opened = ref<Array<string | number>>(["reports"]);

const structure: TreeNode[] = [
  {
    value: "reports",
    label: "Reports",
    children: [
      { value: "weekly", label: "Weekly" },
      { value: "monthly", label: "Monthly" },
    ],
  },
  {
    value: "settings",
    label: "Settings",
    children: [
      { value: "account", label: "Account" },
      { value: "team", label: "Team" },
    ],
  },
];

function expandAll() {
  opened.value = structure.map((node) => node.value);
}
</script>

<template>
  <div class="flex w-full items-start gap-4">
    <TreeView
      v-model:expanded-keys="opened"
      :nodes="structure"
      aria-label="Workspace sections"
      class="max-w-xs"
    />
    <div class="flex flex-col gap-2 text-xs text-muted-foreground">
      <button
        type="button"
        class="rounded border border-border bg-card px-2 py-1.5 text-foreground transition-colors duration-fast hover:bg-sunken"
        @click="expandAll"
      >
        Expand all
      </button>
      <button
        type="button"
        class="rounded border border-border bg-card px-2 py-1.5 text-foreground transition-colors duration-fast hover:bg-sunken"
        @click="opened = []"
      >
        Collapse all
      </button>
      <p class="mt-2">Open: {{ opened.join(", ") || "none" }}</p>
    </div>
  </div>
</template>
