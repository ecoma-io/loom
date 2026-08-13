# Sidebar

Content + sidebar with intrinsic CSS collapse. The Every Layout "Sidebar"
pattern: the layout wraps and both panels go full-width the moment the
content can't fit its minimum — no media query, no JavaScript.

<script setup lang="ts">
import { Sidebar } from "@ecoma-io/loom";
import SidebarDemo from "../../src/composition/Sidebar/SidebarDemo.vue";
import sidebarDemoSource from "../../src/composition/Sidebar/SidebarDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Sidebar } from "@ecoma-io/loom";
</script>

<template>
  <Sidebar sideWidth="16rem">
    <template #side>
      <nav>Navigation</nav>
    </template>
    <main>Content</main>
  </Sidebar>
</template>
```

## How the intrinsic collapse works

The sidebar gets a fixed `flex-basis` (its preferred width) and `flex-grow: 0`.
The content gets `flex-grow: 999` and a `min-width` set by `contentMin`. When
the container is too narrow for the content to fit its minimum, `flex-wrap`
pushes the content to a new line and both panels take full width — the sidebar
becomes a full-width section above or below the content.

No media query, no JavaScript. The layout derives its own breakpoint from the
container's width, so it works identically inside a sidebar-narrowed workspace
and full-bleed on an ultra-wide monitor.

## Sidebar vs. Split

- **Sidebar**: the content is the star — it grows to fill all available space.
  The sidebar has a _preferred_ width and can shrink slightly before wrapping.
- **Split**: both panels have firm minimum widths. The side panel is rigid and
  the content demands 50% before wrapping.

Use Sidebar for navigation + content layouts. Use Split for two-panel editors,
master-detail views, or any layout where both panels need firm boundaries.

## Side

| Value   | Sidebar position | Collapsed order              |
| ------- | ---------------- | ---------------------------- |
| `left`  | Left (default)   | Sidebar above, content below |
| `right` | Right            | Content above, sidebar below |

## Side width

The sidebar's preferred width. Any valid CSS length. Default: `"16rem"`.

## Content min

The minimum percentage of the container the content demands before wrapping.
Default: `"50%"`.

<Demo title="Sidebar" :source="sidebarDemoSource">
  <SidebarDemo />
</Demo>

## API

<!-- @api Sidebar -->
