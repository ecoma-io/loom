<script setup lang="ts">
import { ref } from "vue";
import { TreeView, type TreeNode } from "@ecoma-io/loom";

const chosen = ref<string | number>("src");
const tagged = ref<Array<string | number>>(["graph"]);

const project: TreeNode[] = [
  {
    value: "src",
    label: "src",
    children: [
      {
        value: "components",
        label: "components",
        children: [
          { value: "tree-view", label: "TreeView.vue" },
          { value: "table", label: "Table.vue" },
        ],
      },
      { value: "index", label: "index.ts" },
    ],
  },
  {
    value: "tests",
    label: "tests",
    children: [{ value: "tree-test", label: "TreeView.test.ts" }],
  },
  // A generated artifact: present in the listing, but not something a reader
  // can act on — so it says so instead of accepting a selection silently.
  { value: "lockfile", label: "pnpm-lock.yaml", disabled: true },
  { value: "readme", label: "README.md" },
];

const taxonomy: TreeNode[] = [
  {
    value: "animals",
    label: "Animals",
    children: [
      { value: "bird", label: "Bird" },
      { value: "mammal", label: "Mammal" },
    ],
  },
  {
    value: "plants",
    label: "Plants",
    children: [
      { value: "fern", label: "Fern" },
      { value: "moss", label: "Moss" },
    ],
  },
];

const archive: TreeNode[] = [
  { value: "releases", label: "Releases" },
  { value: "contributors", label: "Contributors" },
];
// The branches fetched on first expansion. "Contributors" resolves empty on
// purpose: an archive with nobody in it is a leaf, and the tree says so by
// losing its chevron rather than opening onto nothing.
const branches: Record<string, TreeNode[]> = {
  releases: [
    { value: "v0-1", label: "v0.1.0" },
    { value: "v0-2", label: "v0.2.0" },
  ],
  contributors: [],
};

function fetchBranch(node: TreeNode): Promise<TreeNode[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(branches[node.value] ?? []), 700);
  });
}
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-3">
    <TreeView v-model="chosen" :nodes="project" aria-label="Project files" />
    <TreeView
      v-model="tagged"
      :nodes="taxonomy"
      selection-mode="multiple"
      aria-label="Tag the entry"
    />
    <TreeView :nodes="archive" :load-children="fetchBranch" aria-label="Archive" />
  </div>
</template>
