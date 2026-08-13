# WindowControls

The minimize, maximize and close cluster for a frameless, custom-chrome
window. It is Windows-style layout — on macOS the operating system draws its
own traffic-lights, so a host hides this cluster there rather than drawing a
second set.

<script setup lang="ts">
import { WindowControls } from "@ecoma-io/loom";
import WindowControlsDemo from "../../src/primitives/WindowControls/WindowControlsDemo.vue";
import windowControlsDemoSource from "../../src/primitives/WindowControls/WindowControlsDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { WindowControls, type WindowPlatform } from "@ecoma-io/loom";

// The host decides the platform — Loom never sniffs the OS at runtime.
const platform: WindowPlatform = "windows";
</script>

<template>
  <WindowControls
    :platform="platform"
    :is-maximized="isMaximized"
    @minimize="win.minimize()"
    @maximize="win.maximizeToggle()"
    @close="win.close()"
  />
</template>
```

## Presentational — placement and the platform bridge are the host's job

WindowControls only emits intent. It never touches the platform itself: a
click on any of the three buttons fires `minimize`, `maximize` or `close`
and nothing else happens inside the component. Wiring those events to an
actual window — Electron's `BrowserWindow`, a Tauri window, whatever runtime
hosts the app — is entirely the host's responsibility, and so is where the
cluster sits. The demo below places it at the end of a title-bar-shaped
strip because that is the conventional Windows position, but the component
itself has no opinion about layout, alignment, or what else shares that
strip; a host free to put it anywhere a window's chrome needs it.

<Demo title="Minimize, maximize/restore, close" :source="windowControlsDemoSource">
  <WindowControlsDemo />
</Demo>

## Platform awareness

`platform` tells the cluster whether to render at all:

| Platform  | Behaviour                                                                  |
| --------- | -------------------------------------------------------------------------- |
| `windows` | Default. Renders the minimize / maximize / close cluster.                  |
| `macos`   | Renders nothing — macOS draws its own traffic-light buttons.               |
| `linux`   | Renders the cluster. Some Linux desktops handle buttons natively; if yours |
|           | does, set `platform="macos"` to hide this cluster.                         |

The host decides which platform it is on. Loom never sniffs the OS at
runtime, because a Tauri or Electron host already knows its platform and a
PWA has no native window controls to compete with.

## Design notes

- Each button is `w-11` wide and fills the strip's height; hover fills with
  the neutral `subtle` token.
- Close is the one place `destructive` is used without a confirmation step —
  closing a window is a familiar, reversible-by-reopening action, so its
  hover state turns `bg-destructive` as a light warning rather than gating
  behind a dialog.
- The button region sets `-webkit-app-region: no-drag` so the buttons stay
  clickable inside a title bar's drag region.
- Every button carries an `aria-label`; its glyph is an inline SVG using
  `currentColor`, so it follows the surrounding text colour through hover
  and focus states.

## Localising the labels

Four accessible names — the middle button is one control in two states, and a
language may well name those with unrelated words. Every glyph here is an inline
SVG marked `aria-hidden`, so these names are the only thing a screen reader has
to go on.

They default to English and are entirely host-controlled through `labels`, which
takes **any subset** of `WindowControlsLabels`; the names you leave out stay as
your application's vocabulary — or Loom's English — left them.

```vue
<WindowControls :labels="{ close: 'Fermer' }" />
```

For a whole application, set this once with `provideLoomLabels` rather than
threading a prop down through whatever chrome renders the cluster. See
[Localisation](/foundations/localisation).

## API

<!-- @api WindowControls -->
