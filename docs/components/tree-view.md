<script setup lang="ts">
import { TreeView } from "@ecoma-io/loom";
import TreeViewDemo from "../demos/TreeViewDemo.vue";
import treeViewDemoSource from "../demos/TreeViewDemo.vue?raw";
</script>

A TreeView shows a hierarchy — files in a project, a department chart, a
taxonomy — as rows a keyboard can walk. It follows the [APG tree view
pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/): one tab stop,
arrows that move and open, a typeahead that jumps, and rows that say their own
depth with `aria-level`, `aria-setsize` and `aria-posinset`.

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { TreeView, type TreeNode } from "@ecoma-io/loom";

const nodes: TreeNode[] = [
  {
    value: "src",
    label: "src",
    children: [{ value: "index", label: "index.ts" }],
  },
  { value: "readme", label: "README.md" },
];

const chosen = ref<string | number>("index");
</script>

<template>
  <TreeView v-model="chosen" :nodes="nodes" aria-label="Project files" />
</template>
```

A `TreeNode` is a `value` — what `v-model` receives when the node is chosen —
and the `label` the row renders, with optional `children` whose presence is
what makes a row expandable, and an optional `disabled`.

The tree names itself the way the APG example does: `aria-label` (or
`aria-labelledby`) falls through to the `<ul role="tree">`, so an unnamed tree
never leaves your call site.

## Choosing one

<Demo title="Single selection">
  <div class="w-full max-w-sm">
    <TreeView v-model="chosen" :nodes="project" aria-label="Project files" />
  </div>
</Demo>

`v-model` carries the chosen node's `value` — the string or number you put on
the node, never its label. The union in `string | number | Array<string |
number>` is one prop rather than two generic shapes, for the same reason
[Combobox](/components/combobox) is: `v-model` needs a binding whose type does
not depend on another prop's value.

A branch renders when it has children to show. `children` is the contract —
an array of any length means static data, and a node _without_ one under a
`loadChildren` tree is a branch still to fetch. The distinction is
load-bearing there: an explicit `children: []` is a known-empty leaf — it
never becomes a fetch target and never grows a chevron — while the absent
property is the only thing that marks a row as a branch still to fetch.

## Choosing several

<Demo title="Several at once">
  <div class="w-full max-w-sm">
    <TreeView v-model="tagged" :nodes="taxonomy" selection-mode="multiple" aria-label="Tag the entry" />
  </div>
</Demo>

`selection-mode="multiple"` sets `aria-multiselectable` and turns the model
into the whole chosen list, in the order it was chosen: picking adds, picking
again removes, and every change emits the full array.

## Controlling what is open

Expansion is owned either by the tree or by you, and the prop that changes
hands is `expanded`:

- **The tree owns it** — that is the default. Omit `expanded` and the tree
  keeps its own open set, seeded from `defaultExpanded` on mount.
  `defaultExpanded` is a seed, not a contract: after mount the tree answers
  to nobody, so editing the prop does nothing.
- **You own it** — pass `expanded` with `v-model:expanded`, the same mirror
  contract `modelValue` keeps for selection: every open or close emits the
  whole open set, and an edit you make to the prop lands in the tree through
  a watcher instead of being silently lost.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { TreeView, type TreeNode } from "@ecoma-io/loom";

const nodes: TreeNode[] = [/* … */];
const open = ref<Array<string | number>>(["src"]);
</script>

<template>
  <TreeView v-model:expanded="open" :nodes="nodes" aria-label="Project files" />
</template>
```

Both directions work: open the tree with the chevron or the arrow keys and it
emits `["src", "…"]`; set the prop and the row opens. The chevron and
ArrowRight/ArrowLeft are the same control, so a keyboard user moves the same
set a pointer user does.

## Custom rows

A row is a label until you say otherwise. The `node` slot replaces it, with
the node and its state scoped in:

```vue
<TreeView :nodes="nodes" aria-label="Project files">
  <template #node="{ node, state }">
    <span :class="state.disabled && 'text-muted-foreground'">{{ node.label }}</span>
    <span class="text-small text-muted-foreground">{{ node.value }}</span>
  </template>
</TreeView>
```

Scoped in are `node` — the `TreeNode` itself — and `state`, the live row
state: `expandable`, `expanded`, `selected`, `busy`, `disabled` and
`focusable`. The slot reaches every depth: the tree forwards it down the
recursion, so a nested row renders the same content a root row does. Leave
the slot out and the row renders the label, dimmed when disabled — which is
exactly what the demo's first panel replaces with a label plus the value.

## Lazy branches

<Demo title="Loaded on first expansion" :source="treeViewDemoSource">
  <TreeViewDemo />
</Demo>

Hand the tree a `loadChildren` and a node with no `children` of its own is
treated as a branch to fetch on first expansion. The contract is the three
answers a fetch can give:

- **Children arrive** — they render beneath the row, and the fetch is never
  made again: collapsing and reopening serves the cache.
- **An empty array arrives** — that _is_ the answer. The row becomes a leaf
  and loses its chevron, rather than offering a branch that opens onto
  nothing.
- **The fetch rejects** — the row stays collapsed and still expandable, so
  the next activation retries instead of caching a failure.

While a fetch is in flight the row carries `aria-busy` and the string from
`labels.loading`, because an expand that produces nothing yet reads as a
broken control to the person waiting.

## Disabled

A disabled row is present but unchoosable: the arrows still reach it, the
focus ring still shows where you are, and Enter, Space and clicks refuse it. A
disabled _branch_ cannot be opened either — its children stay out of the
announcement until the branch is re-enabled. Disabled rows never hold the
tree's entry tab stop: from outside, Tab lands on the first enabled row.

The whole tree can be unavailable too. `disabled` dims it and drops every row
from the tab order, and leaving the prop unset defers to an enclosing
`<fieldset disabled>`, read straight off the DOM — the same house rule every
Loom composite keeps. The dimming is a text-colour change rather than
opacity, so the row keeps its contrast against the page.

## Keyboard and screen readers

The tree holds one tab stop and moves it — the roving tabindex the APG
pattern calls for. Disabled rows are reachable by keyboard but cannot be
chosen or opened.

| Key            | Effect                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Tab            | Moves into the tree, landing on the active row                                                                      |
| Arrow Down     | Focus on the next visible row                                                                                       |
| Arrow Up       | Focus on the previous visible row                                                                                   |
| Arrow Right    | Opens a closed branch; on an open one, first child                                                                  |
| Arrow Left     | Closes an open branch; on a closed one, the parent                                                                  |
| Home           | Focus on the first visible row                                                                                      |
| End            | Focus on the last visible row                                                                                       |
| Enter or Space | Chooses the focused row                                                                                             |
| A–Z            | Typeahead: jumps to the next row whose label starts with what was typed; the same letter again finds the next match |

Every row announces its position in the hierarchy — `aria-level`,
`aria-setsize`, `aria-posinset` — so a screen reader on row twelve of a deep
tree says which branch it is standing in. An open branch is `aria-expanded`;
a leaf carries no `aria-expanded` at all, because nothing about it can open.
The typeahead buffer resets after 500 ms, and the disclosure glyph's rotation
is a CSS transition the [global reduced-motion
rule](/foundations/motion) stops.

## Labels

The one string the control says that no node in it says:

```ts
interface TreeViewLabels {
  loading: string; // shown while a lazy branch is being fetched
}
```

```vue
<TreeView :nodes="archive" :load-children="fetch" :labels="{ loading: 'Fetching…' }" />
```

Every key is optional — supply one and the other stays as your application's
vocabulary, or Loom's English, left it. Annotate a bag of your own with
`LabelOverrides<TreeViewLabels>` rather than with `TreeViewLabels` itself: the
override type is partial, so a key added in a later release is one your bag
may ignore, where the bag interface is total and would stop compiling. For a
whole application set these once with `provideLoomLabels` rather than at
every call site; the `labels` prop is for the per-instance correction. See
[Localisation](/foundations/localisation).

## API

<!-- @api TreeView -->
