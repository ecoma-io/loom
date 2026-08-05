# DropdownMenu

One button that opens a list of commands, with roving focus, typeahead and
arrow-key navigation. It is a menu of _actions_ — not a way to pick a value. A
list that sets a field's value is a select; a list of things to do is this.

<script setup lang="ts">
import { DropdownMenu, Button } from "@ecoma-io/loom";
import DropdownMenuDemo from "../../src/primitives/DropdownMenu/DropdownMenuDemo.vue";
import dropdownMenuDemoSource from "../../src/primitives/DropdownMenu/DropdownMenuDemo.vue?raw";

const quickItems = [
  { label: "Duplicate", value: "duplicate", shortcut: "⌘D" },
  { separator: true },
  { label: "Delete scene", value: "delete", danger: true },
];
</script>

<Demo title="DropdownMenu">
  <DropdownMenu :items="quickItems">
    <template #trigger>
      <Button variant="outline">Actions</Button>
    </template>
  </DropdownMenu>
</Demo>

## Usage

```vue
<script setup lang="ts">
import { DropdownMenu, Button, type DropdownMenuEntry } from "@ecoma-io/loom";

const items: DropdownMenuEntry[] = [
  { heading: true, label: "Scene" },
  { label: "Duplicate", value: "duplicate", shortcut: "⌘D" },
  { separator: true },
  { label: "Delete scene", value: "delete", danger: true },
];

function onSelect(value: string) {
  // The host maps a command id to an action.
}
</script>

<template>
  <DropdownMenu :items="items" @select="onSelect">
    <template #trigger>
      <Button variant="outline">Actions</Button>
    </template>
  </DropdownMenu>
</template>
```

## Entries

The rows are data rather than markup, which is what keeps the primitive free of
application logic: selecting a row emits its `value`, and the host decides what
that command means.

A `DropdownMenuEntry` is one of three kinds, told apart by which fields are set
rather than by a discriminator field:

- a **separator** (`separator: true`) — a rule between groups; every other field
  is ignored.
- a **heading** (`heading: true`) — a non-interactive group label.
- a **command** — anything else. `label` is what the row says, `value` is the id
  emitted on select, `shortcut` is an accelerator hint at the trailing edge.

Two flags modify a command. `danger` paints it in the destructive token, so a
destructive command is not one indistinguishable row among the rest. `disabled`
leaves it visible but inert: announced as disabled, and selecting it emits
nothing on the pointer path or the keyboard one.

An entry with no `value` selects nothing either — a decorative row cannot fire an
action by accident.

<Demo title="Headings, separators, shortcuts, a disabled row and a destructive one" :source="dropdownMenuDemoSource">
  <DropdownMenuDemo />
</Demo>

## Motion

The rows reveal in sequence as the menu opens, which reads as a list arriving
rather than a block appearing. The delay per row comes from Loom's shared
stagger vocabulary and is capped there, so a long menu does not trail in
indefinitely — the last row of a twenty-command menu appears as promptly as the
sixth. Hover colour runs on its own channel, so a row highlighted mid-reveal
still responds at once.

## Escape contract

- **Closes on** Esc, a click outside, selecting a command, or the host setting
  `open` to `false`.
- **Focus on open** moves into the menu and onto its first command.
- **Focus on close** returns to the trigger.
- **The page behind does not scroll** while the menu is open, and the rest of
  the page is hidden from assistive technology. A command list is never scrolled
  out from under the pointer mid-choice.

Focus stays in the menu while it is open, but not the way a dialog traps it: a
menu has no internal tab order at all. Tab is inert; the arrow keys and typeahead
are how a row is reached.

Reach for [Popover](./popover.md) when the panel holds interactive content
rather than commands, and for a select control when the list _is_ a field's
value.

## API

<!-- @api DropdownMenu -->
