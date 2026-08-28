# NavigationMenu

A WAI-ARIA navigation menu landmark: triggers that open dropdown panels of
navigation links for site navigation.

<script setup lang="ts">
import { NavigationMenu } from "@ecoma-io/loom";
import NavigationMenuDemo from "../demos/NavigationMenuDemo.vue";
import navigationMenuDemoSource from "../demos/NavigationMenuDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { NavigationMenu } from "@ecoma-io/loom";

const items = [
  {
    label: "Products",
    value: "products",
    children: [
      { label: "Analytics", href: "/analytics", description: "Real-time dashboards" },
      { label: "Reports", href: "/reports" },
    ],
  },
  {
    label: "Docs",
    value: "docs",
    href: "/docs",
  },
];
</script>

<template>
  <NavigationMenu :items="items" />
</template>
```

Items with `children` render as trigger buttons that open a dropdown panel;
items without them render as direct anchor links.

## Dropdown vs. navigation

`NavigationMenu` is a **navigation landmark** — its panels contain links, not
actions. `DropdownMenu` is a **command list** — its rows are buttons that
perform actions. `Menubar` is a persistent horizontal strip of command menus.
Choose `NavigationMenu` for site navigation; the others serve different
purposes.

<Demo title="Navigation menu" :source="navigationMenuDemoSource">
  <NavigationMenuDemo />
</Demo>

## Keyboard interaction

- **Tab**: moves between the nav landmark and the rest of the page
- **Left/Right arrows** (horizontal): move between triggers
- **Up/Down arrows** (vertical): move between triggers
- **ArrowDown**: opens the dropdown panel for the focused trigger
- **Escape**: closes the open panel and returns focus to the trigger
- **Enter**: activates a focused trigger or follows a focused link

## RTL support

Pass `dir="rtl"` to mirror the arrow keys and layout direction. The `dir`
attribute is placed on the `<nav>` element itself so CSS and keyboard
behaviour agree.

## API

<!-- @api NavigationMenu -->
