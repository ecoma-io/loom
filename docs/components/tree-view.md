<script setup lang="ts">
import { TreeView } from "@ecoma-io/loom";
import TreeViewDemo from "../demos/TreeViewDemo.vue";
import treeViewDemoSource from "../demos/TreeViewDemo.vue?raw";
import TreeViewNodeDemo from "../demos/TreeViewNodeDemo.vue";
import treeViewNodeDemoSource from "../demos/TreeViewNodeDemo.vue?raw";
import TreeViewExpandedDemo from "../demos/TreeViewExpandedDemo.vue";
import treeViewExpandedDemoSource from "../demos/TreeViewExpandedDemo.vue?raw";
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

## Lazy branches

<Demo title="Loaded on first expansion" :source="treeViewDemoSource">
  <TreeViewDemo />
</Demo>

Hand the tree a `loadChildren` and a node with no `children` of its own is
treated as a branch to fetch on first expansion. First expansion includes the
host's: a branch rendered open from the start — `expanded-keys` naming it, or
a `default-expanded` seed — fetches the first time it renders, announcing busy
exactly as a keyboard-opened branch does. The contract is the three answers a
fetch can give:

- **Children arrive** — they render beneath the row, and the fetch is never
  made again: collapsing and reopening serves the cache.
- **An empty array arrives** — that _is_ the answer. The row becomes a leaf
  and loses its chevron, rather than offering a branch that opens onto
  nothing.
- **The fetch rejects** — the row stays collapsed and still expandable, so
  the next activation retries instead of caching a failure. Under a branch
  the host had rendered open, the tree proposes the collapsed list instead,
  and the host's answer to that proposal is final as with any other open or
  close.

While a fetch is in flight the row carries `aria-busy` and the string from
`labels.loading`, because an expand that produces nothing yet reads as a
broken control to the person waiting.

## Custom rows

The text run of a row — the tree's own label plus the busy string while a
fetch is in flight — is the `#node` slot's default content. Hand it a
template and the row becomes yours: the slot receives a
`TreeViewNodeSlotProps` object carrying the `node` itself and everything the
tree has resolved about it (`level`, `expanded`, `selected`, `busy`), and
the chevron, the indent, the roving tab stop and the selection highlight all
stay the tree's.

<Demo title="A row that says what it holds" :source="treeViewNodeDemoSource">
  <TreeViewNodeDemo />
</Demo>

```vue
<script setup lang="ts">
import { TreeView, type TreeNode } from "@ecoma-io/loom";

const nodes: TreeNode[] = [
  {
    value: "src",
    label: "src",
    children: [
      { value: "components", label: "components" },
      { value: "index", label: "index.ts" },
    ],
  },
];
</script>

<template>
  <TreeView :nodes="nodes" aria-label="Project files">
    <template #node="{ node, expanded }">
      <span>{{ node.label }}</span>
      <span v-if="node.children?.length" class="text-muted-foreground">
        {{ expanded ? "open" : `${node.children.length} files` }}
      </span>
    </template>
  </TreeView>
</template>
```

## Controlled expansion

Uncontrolled, the tree owns its open rows — seeded from `defaultExpanded`
once, then internal. Pass `v-model:expanded-keys` and expansion turns into a
read-through: the tree renders exactly the rows your list names and emits the
full open list on every open and close — and the host's answer is final. A
host that withholds the emitted list (a veto kept by rejecting the next
`update:expanded-keys`) holds the tree where it was, so the state lives
beside the data instead of inside a control your page cannot reach.

<Demo title="The host keeps the open list" :source="treeViewExpandedDemoSource">
  <TreeViewExpandedDemo />
</Demo>

```vue
<script setup lang="ts">
import { ref } from "vue";
import { TreeView, type TreeNode } from "@ecoma-io/loom";

const opened = ref<Array<string | number>>(["reports"]);
const nodes: TreeNode[] = [
  { value: "reports", label: "Reports", children: [{ value: "weekly", label: "Weekly" }] },
  { value: "settings", label: "Settings", children: [{ value: "team", label: "Team" }] },
];
</script>

<template>
  <button type="button" @click="opened = []">Collapse all</button>
  <TreeView v-model:expanded-keys="opened" :nodes="nodes" aria-label="Sections" />
</template>
```

Leave `expanded-keys` out and `defaultExpanded` seeds the uncontrolled tree;
the two props never mix — whichever the host supplies is the one that counts.
A host that stops supplying `expanded-keys` mid-session falls back to the
tree's own state — the last thing the tree spoke, including every veto already
applied — and never to a reset.

Selection keeps the opposite convention: `v-model` is an optimistic mirror —
the tree shows what it emitted while the host catches up — the same contract
[Combobox](/components/combobox) keeps. Expansion is strict because an open
branch paints its whole subtree into the DOM, and a tree that lies about
what the host allowed reads as one that ignored it.

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

| Key            | Effect                                                                                                                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tab            | Moves into the tree, landing on the active row                                                                                                                                                                                                                             |
| Arrow Down     | Focus on the next visible row                                                                                                                                                                                                                                              |
| Arrow Up       | Focus on the previous visible row                                                                                                                                                                                                                                          |
| Arrow Right    | Opens a closed branch; on an open one, first child                                                                                                                                                                                                                         |
| Arrow Left     | Closes an open branch; on a closed one, the parent                                                                                                                                                                                                                         |
| Home           | Focus on the first visible row                                                                                                                                                                                                                                             |
| End            | Focus on the last visible row                                                                                                                                                                                                                                              |
| Enter or Space | Chooses the focused row                                                                                                                                                                                                                                                    |
| Any character  | Typeahead: jumps to the next row whose label starts with what was typed — any printable key counts, digits and punctuation included, and Shift still types; a key pressed with Alt, Ctrl or Cmd held is left to the browser. The same character again finds the next match |

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
