# TitleBar

Custom window chrome for a frameless desktop app. It is a block: composed
from primitives, aware of the desktop-window domain, but still purely
presentational — it owns no window logic of its own, only re-emitting what
the menu and the window controls tell it.

<script setup lang="ts">
import { TitleBar } from "@ecoma-io/loom";
import TitleBarDemo from "../../src/blocks/TitleBar/TitleBarDemo.vue";
import titleBarDemoSource from "../../src/blocks/TitleBar/TitleBarDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { TitleBar, type MenubarMenu, type WindowPlatform } from "@ecoma-io/loom";

const menus: MenubarMenu[] = [
  { id: "file", label: "File", items: [{ label: "Open…", command: "file.open" }] },
];

// The host decides the platform — Loom never sniffs the OS at runtime.
const platform: WindowPlatform = "windows";
</script>

<template>
  <TitleBar
    app-name="Acme"
    :platform="platform"
    :menus="menus"
    @select="run($event)"
    @minimize="host.window.minimize()"
    @maximize="host.window.maximizeToggle()"
    @close="host.window.close()"
  />
</template>
```

`app-name` is required, with no default — the block carries no identity of
its own. Whatever brand shows on the bar always comes from the host.

<Demo title="Menus, title and window controls" :source="titleBarDemoSource">
  <TitleBarDemo />
</Demo>

## Layout

```
Windows / Linux:
[ ⬡ brand ] [ File View Help ]  ····· drag / title ····· [ – ▢ ✕ ]

macOS (native traffic-lights on the left):
[ 🔴🟡🟢   ⬡ brand ] [ File View Help ]  ····· drag / title ·····
```

The whole bar is a window drag region. **Only** the clusters that actually
take clicks — `Menubar`, `WindowControls` — opt back out of it. The brand
cluster stays inside the drag region on purpose: nothing in it is
interactive, and the logo corner is exactly where someone reaches to move
the window. Opting it out would take that affordance away for nothing in
return.

The brand mark sits on the primary color — the one point of color on a bar
that is otherwise neutral.

## Platform awareness

`platform` adjusts the layout for the host's desktop:

| Platform  | Brand cluster          | WindowControls | Notes                                     |
| --------- | ---------------------- | -------------- | ----------------------------------------- |
| `windows` | Standard left padding  | Visible        | Default — the Loom cluster handles it all |
| `macos`   | Shifted right (4.5rem) | Hidden         | macOS draws its own traffic-light buttons |
| `linux`   | Standard left padding  | Visible        | Most Linux desktops need the cluster      |

On macOS the brand cluster shifts right by 4.5rem (72px) to leave room for
the native traffic-light buttons. That measurement covers the three 12px
buttons, their 8px left margin, and 4px inter-button gap at the default
window scale.

The host decides which platform to declare. Loom never sniffs the OS at
runtime — a Tauri or Electron host already knows its platform, and a PWA
has no native window controls to avoid.

## PWA window controls overlay

The header carries a `data-loom-titlebar` attribute. When a PWA is installed
and the browser's `window-controls-overlay` feature is visible, Loom's
global CSS adjusts the title bar's left padding to clear the native controls.
This is CSS-only — no JavaScript is required.

See [WindowControls](/components/window-controls#platform-awareness) for the
platform behaviour detail.

## What it composes

| Region   | Primitive        | Role                                               |
| -------- | ---------------- | -------------------------------------------------- |
| Brand    | —                | The brand mark plus the app name                   |
| Menu     | `Menubar`        | File / View / Help, emitting `select(command)`     |
| Title    | —                | The open project/composition, centered, truncating |
| Controls | `WindowControls` | minimize · maximize · close                        |

`Menubar` and `WindowControls` are fixed here rather than left to the host
because the drag-region contract only holds if every interactive cluster in
the bar opts out of it consistently — a host assembling the bar itself would
have to re-derive that rule at every call site instead of getting it once,
here.

## The host owns the window bridge

The block knows nothing about which shell it runs in. A host wraps it with a
thin layer that wires window intents (and, for `select`, app commands) to
its own platform:

```vue
<TitleBar
  :app-name="appName"
  :title="projectTitle"
  :menus="menus"
  :platform="platform"
  :is-maximized="isMaximized"
  @select="run($event)"
  @minimize="host.window.minimize()"
  @maximize="host.window.maximizeToggle()"
  @close="host.window.close()"
/>
```

## Title content

`title` is meant to distinguish open windows from each other, the way a
multi-window editor's window switcher needs to:

- With a project open, pass `"<Project name> — <appName>"` — and have the
  host set the OS-level window title to match, since this block only draws
  the chrome inside the window and never touches the OS title itself.
- With no project open, pass an empty `title` and let `appName` alone carry
  the app's identity.

## API

<!-- @api TitleBar -->
