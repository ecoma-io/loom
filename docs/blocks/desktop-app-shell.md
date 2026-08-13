# DesktopAppShell

The ready-made layout a desktop (Electron/Tauri) app reaches for. It composes
TitleBar, a sidebar, and a content area into a single root so the host never
hand-tunes the flex relationship between window chrome and application body.

<script setup lang="ts">
import { DesktopAppShell } from "@ecoma-io/loom";
import DesktopAppShellDemo from "../../src/blocks/DesktopAppShell/DesktopAppShellDemo.vue";
import desktopAppShellDemoSource from "../../src/blocks/DesktopAppShell/DesktopAppShellDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { DesktopAppShell, SidebarNav, type MenubarMenu } from "@ecoma-io/loom";

const menus: MenubarMenu[] = [
  { id: "file", label: "File", items: [{ label: "Open…", command: "file.open" }] },
];
</script>

<template>
  <DesktopAppShell
    app-name="Acme"
    :menus="menus"
    @select="run($event)"
    @minimize="host.window.minimize()"
    @maximize="host.window.maximizeToggle()"
    @close="host.window.close()"
  >
    <template #sidebar>
      <SidebarNav :sections="sections" />
    </template>

    <main-content-here />
  </DesktopAppShell>
</template>
```

<Demo title="TitleBar, sidebar and content" :source="desktopAppShellDemoSource">
  <DesktopAppShellDemo />
</Demo>

## What it composes

| Region | Component      | Role                                                    |
| ------ | -------------- | ------------------------------------------------------- |
| Top    | `TitleBar`     | Window chrome: brand, menu, title, minimize/max/close   |
| Left   | `sidebar` slot | Navigation rail, typically `SidebarNav`, on `bg-sunken` |
| Right  | default slot   | Main content on `bg-background` with stepped gutters    |

The sidebar sits on the sunken plane and the content on the background plane,
so navigation recedes and work surfaces lift — the same elevation rhythm
SidebarNav and AppHeader use.

## Responsive collapse

Below the `md` breakpoint the sidebar stacks above the content instead of
sitting beside it. This mirrors SidebarNav's own intrinsic collapse pattern:
the nav drops to icon-only at narrow widths, and the shell narrows its rail to
match. Below tablet the rail needs no width at all — nav items stack vertically
over the content, which is the same thing a mobile user sees in any desktop app
that has a sidebar.

## Sidebar width

`sidebarWidth` maps to three fixed widths, each measured against SidebarNav's
label and labelless modes:

| Value | Width   | Use                                     |
| ----- | ------- | --------------------------------------- |
| `sm`  | `12rem` | Icon-rail or short-label navigation     |
| `md`  | `16rem` | Default: full labels, one line each     |
| `lg`  | `20rem` | Two-column nav or long section headings |

The sidebar never grows beyond its basis (`flex-grow: 0`), but it does shrink
if the viewport is narrow — the content area's `min-width: 50%` guarantees it
always gets at least half the available space.

## The host owns the window bridge

Every TitleBar event is re-emitted so the host wires its own platform bridge.
The shell itself owns no IPC — see TitleBar's documentation for the wiring
pattern.

## API

<!-- @api DesktopAppShell -->
