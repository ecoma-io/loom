# AppShell

The universal application shell: a sidebar, a header, and a content area that
reflows from mobile to ultrawide. The sidebar collapses below tablet width;
content is bounded at a readable max-width on ultra-wide monitors.

<script setup lang="ts">
import { AppShell } from "@ecoma-io/loom";
import AppShellDemo from "../demos/AppShellDemo.vue";
import appShellDemoSource from "../demos/AppShellDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { AppShell } from "@ecoma-io/loom";
</script>

<template>
  <AppShell>
    <template #sidebar>
      <!-- navigation -->
    </template>
    <template #header>
      <!-- app header bar -->
    </template>
    <!-- content area -->
  </AppShell>
</template>
```

<Demo title="AppShell" :source="appShellDemoSource">
  <AppShellDemo />
</Demo>

## Sidebar width

The `sidebarWidth` prop controls the sidebar panel width:

| Value | Width   | Use for                       |
| ----- | ------- | ----------------------------- |
| `sm`  | `12rem` | Icon rail or compact nav      |
| `md`  | `16rem` | Standard navigation (default) |
| `lg`  | `20rem` | Wide sidebar with details     |

## Responsive behavior

- **Narrow container:** sidebar and content stack vertically — sidebar on top at its declared width, content below
- **Wide enough container:** sidebar sits alongside content; content fills remaining space
- **Ultrawide:** content gutters widen (`3xl`), extra viewport goes to whitespace

Where the stack happens is intrinsic, not a fixed breakpoint: the pair gives
up on one line when the container can no longer fit the sidebar plus the
content's half — roughly twice `sidebarWidth`, so a wider sidebar holds the
side-by-side layout longer.

## API

<!-- @api AppShell -->
