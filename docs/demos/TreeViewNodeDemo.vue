<script setup lang="ts">
import { ref } from "vue";
import { TreeView, type TreeNode } from "@ecoma-io/loom";

const files: TreeNode[] = [
  {
    value: "src",
    label: "src",
    children: [
      {
        value: "components",
        label: "components",
        children: [
          { value: "tree-source", label: "TreeView.vue" },
          { value: "table-source", label: "Table.vue" },
        ],
      },
      { value: "index-source", label: "index.ts" },
    ],
  },
  {
    value: "tests",
    label: "tests",
    children: [{ value: "tree-test", label: "TreeView.test.ts" }],
  },
  { value: "readme", label: "README.md" },
];

const opened = ref<Array<string | number>>(["src"]);
</script>

<template>
  <!-- A custom row replaces the label text run, not the tree: the chevron,
       the indent, the roving tab stop and the selection highlight all stay
       Loom's, so a content-rich row costs nothing on the keyboard side. -->
  <TreeView
    v-model:expanded-keys="opened"
    :nodes="files"
    aria-label="Project files"
    class="max-w-xs"
  >
    <template #node="{ node, level, expanded, selected }">
      <span class="truncate">{{ node.label }}</span>
      <span
        v-if="node.children?.length"
        class="shrink-0 text-xs text-muted-foreground"
        :class="{ 'text-foreground': selected }"
        >{{ expanded ? "–" : node.children.length }} files</span
      >
      <span v-else-if="level > 1" class="shrink-0 text-xs text-muted-foreground" aria-hidden="true"
        >file</span
      >
    </template>
  </TreeView>
</template>
