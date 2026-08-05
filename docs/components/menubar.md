# Menubar

The classic desktop-app menu strip — File, View, Help, and whatever else a
frameless window's chrome needs along its top edge. It is data-driven: pass
a `menus` array and the component owns opening, closing, hover-to-switch,
keyboard handling and click-outside; selecting a row emits `select` with
that row's `command` id rather than acting on it, so the host stays the one
place app logic lives.

<script setup lang="ts">
import { Menubar } from "@ecoma-io/loom";
import MenubarDemo from "../../src/primitives/Menubar/MenubarDemo.vue";
import menubarDemoSource from "../../src/primitives/Menubar/MenubarDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Menubar, type MenubarMenu } from "@ecoma-io/loom";

const menus: MenubarMenu[] = [
  {
    id: "file",
    label: "File",
    items: [{ label: "Open project…", command: "file.open", shortcut: "Ctrl+O" }],
  },
];
</script>

<template>
  <Menubar :menus="menus" @select="run($event)" />
</template>
```

## Every menu, including a disabled row and separators

<Demo title="File · View · Help" :source="menubarDemoSource">
  <MenubarDemo />
</Demo>

## Keyboard

| Key                                  | Behaviour                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `↓` / `Enter` / `Space` on a trigger | Opens that menu, highlights its first enabled row                                |
| `↑` `↓`                              | Moves the highlight, skipping separators and disabled rows, wrapping at the ends |
| `←` `→`                              | Moves to the previous/next top-level menu                                        |
| `Home` / `End`                       | Jumps to the first/last enabled row                                              |
| `Esc`                                | Closes                                                                           |
| Click outside                        | Closes                                                                           |

## Reach for DropdownMenu instead when a menu opens on demand

Menubar is the persistent strip; `DropdownMenu` is a single button that opens
one menu on demand. They share the same data-driven, `select`-emitting
contract deliberately, so a host can move a set of commands between "always
on the bar" and "behind a button" without relearning the API. What differs
is the keyboard mechanism underneath: `DropdownMenu` delegates to Reka UI's
roving-focus group, so its trigger and its rows form a single tab stop the
way `Tabs` does. Menubar's triggers and rows are plain, hand-managed
elements instead — every trigger keeps the browser's default `tabindex`, so
`Tab` walks each one individually rather than landing once on the strip.
Arrow-key navigation inside an open menu still works exactly as documented
above; it is the `Tab`-key entry point that differs from the roving-tabindex
pattern.

## Types

```ts
interface MenubarItem {
  label: string;
  command?: string; // id emitted through @select
  shortcut?: string; // right-aligned accelerator hint
  separator?: boolean;
  disabled?: boolean;
}
interface MenubarMenu {
  id: string;
  label: string;
  items: MenubarItem[];
}
```

## Visual language

- Hover and open state use the neutral `subtle` fill, never the warp action
  colour — a menu is navigation, not the emphasis a primary action carries.
- The dropdown expands with `animate-scale-in` (140ms, `ease-spring`) from
  its top-left corner and respects `prefers-reduced-motion`.
- `shortcut` is right-aligned in `.tabular` (Geist Mono) so accelerator
  hints line up down the column.

## API

<!-- @api Menubar -->
