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
import { WindowControls } from "@ecoma-io/loom";
</script>

<template>
  <WindowControls
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

The three accessible names default to English but are entirely
host-controlled through the `labels` prop — pass a full
`WindowControlsLabels` object to relabel the cluster for another language
without forking the primitive.

## API

<!-- @api WindowControls -->
