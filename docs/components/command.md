# Command

A keyboard-driven command search — the universal "Cmd+K" interface. Type to
filter across grouped items and select with Enter to execute an action.

<script setup lang="ts">
import { Command } from "@ecoma-io/loom";
import CommandDemo from "../demos/CommandDemo.vue";
import commandDemoSource from "../demos/CommandDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Command, type CommandItem, type CommandGroup } from "@ecoma-io/loom";

const items: CommandItem[] = [
  { value: "settings", label: "Open settings", group: "Navigation" },
  { value: "docs", label: "Go to docs", group: "Navigation" },
  { value: "profile", label: "Edit profile", group: "Actions" },
];

const groups: CommandGroup[] = [{ heading: "Navigation" }, { heading: "Actions" }];
</script>

<template>
  <Command
    :items="items"
    :groups="groups"
    placeholder="Search commands…"
    aria-label="Commands"
    @select="(v) => console.log(v)"
  />
</template>
```

## Command vs. Combobox

Combobox selects a **value** — a language, a country, a form field. Command
executes an **action** — open settings, go to docs, create a project. The two
share a surface vocabulary and keyboard model, but their intents differ:

<table tabindex="0">
  <thead>
    <tr><th></th><th scope="col">Combobox</th><th scope="col">Command</th></tr>
  </thead>
  <tbody>
    <tr><th scope="row">Purpose</th><td>Select a value for a form field</td><td>Execute an action</td></tr>
    <tr><th scope="row">Model</th><td><code>v-model</code> (two-way binding)</td><td><code>@select</code> callback</td></tr>
    <tr><th scope="row">Form wiring</th><td>Inside a <code>Field</code>, posts with <code>name</code></td><td>No form integration</td></tr>
    <tr><th scope="row">Items</th><td><code>ComboboxOption</code></td><td><code>CommandItem</code></td></tr>
  </tbody>
</table>

## Items

Each item has a `value` (what the host receives on select), a `label` (what the
reader sees), an optional `description` shown below the label, an optional
`group` key linking it to a section heading, and an optional `disabled` flag.

```ts
interface CommandItem {
  value: string;
  label: string;
  description?: string;
  group?: string;
  disabled?: boolean;
}
```

## Groups

Group definitions provide section headings above runs of items that share a
`group` key. Groups with no matching items are hidden automatically when the
filter narrows the list.

```ts
interface CommandGroup {
  heading: string;
}
```

## Filtering

The built-in filter matches the query as a case-insensitive substring against
`label`, `description` and `value`. It resets the highlight to the first match
on every keystroke, so the most relevant item is always one Enter away.

<Demo title="Command search" :source="commandDemoSource">
  <CommandDemo />
</Demo>

## Keyboard interaction

| Key      | Behaviour                                 |
| -------- | ----------------------------------------- |
| Type     | Filter items, reset highlight to first    |
| `↓`      | Move highlight down (wraps at end)        |
| `↑`      | Move highlight up (wraps at start)        |
| `Enter`  | Select highlighted item                   |
| `Escape` | Clear query, or close when query is empty |
| `Home`   | Jump to first item                        |
| `End`    | Jump to last item                         |

Focus stays in the input throughout — the active item is tracked with
`aria-activedescendant`, not real focus movement.

## Accessibility

- `role="searchbox"` on the input (more specific than `combobox` for search)
- `aria-autocomplete="list"` and `aria-controls` wired to the listbox
- `aria-activedescendant` pointing to the highlighted item
- `role="listbox"` on the results container
- `role="option"` on each item with `aria-selected` and `aria-disabled`
- Live region announcing result count

## API

<!-- @api Command -->
