# ContextMenu

A right-click command list, with roving focus, typeahead and arrow-key navigation.
The menu mirrors DropdownMenu's structure and behaviour, but opens on a right-click
instead of from a visible button.

<script setup lang="ts">
import { ContextMenu, type ContextMenuEntry } from "@ecoma-io/loom";
import ContextMenuDemo from "../../src/primitives/ContextMenu/ContextMenuDemo.vue";
import contextMenuDemoSource from "../../src/primitives/ContextMenu/ContextMenuDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ContextMenu, type ContextMenuEntry } from "@ecoma-io/loom";

const items: ContextMenuEntry[] = [
  { label: "Cut", value: "cut", shortcut: "⌘X" },
  { label: "Copy", value: "copy", shortcut: "⌘C" },
  { separator: true },
  { label: "Paste", value: "paste", shortcut: "⌘V" },
];
</script>

<template>
  <ContextMenu :items="items" @select="(v) => handleCommand(v)">
    <template #trigger>
      <div>Right-click here</div>
    </template>
  </ContextMenu>
</template>
```

<Demo title="ContextMenu with headings, shortcuts, danger and disabled entries" :source="contextMenuDemoSource">
  <ContextMenuDemo />
</Demo>

## Entries

Three kinds, told apart by which fields are set — the same contract as DropdownMenu:

- **Command** — has a `value`. Selecting it emits `select` with that value.
- **Separator** — `separator: true`. A horizontal rule.
- **Heading** — `heading: true`. A non-interactive group label.

Additional flags: `danger` paints a destructive command in the destructive token,
`disabled` makes a row inert, and `shortcut` shows a keyboard hint at the trailing
edge (display only — the primitive binds no keys).

## Escape contract

Opening moves focus into the menu and onto the first command; Esc and an outside
click both close it; closing returns focus to the trigger's element. The menu is
modal while open. Focus stays in the menu via arrow keys and typeahead — Tab is
inert, the same as DropdownMenu.

## API

<!-- @api ContextMenu -->
