# Cross-platform support

Loom targets the four surfaces a web application can occupy: a browser tab, an
installed PWA, a desktop shell (Electron, Tauri), and a mobile webview. The
same components and tokens work across all four, because the differences are
handled at the boundaries — safe-area insets, window-chrome awareness, and
platform-specific layout adjustments — rather than baked into every component.

## The host decides the platform

Loom never sniffs the operating system at runtime. A Tauri or Electron host
already knows which desktop it is running on, and a PWA or browser tab has no
native window controls to accommodate. The `WindowPlatform` type — `"windows" |
"macos" | "linux"` — is a prop the host passes, not a value Loom derives:

```vue
<script setup lang="ts">
import { TitleBar, type WindowPlatform } from "@ecoma-io/loom";

// The host knows its platform. Loom does not guess.
const platform: WindowPlatform = "macos";
</script>

<template>
  <TitleBar app-name="Acme" :platform="platform" />
</template>
```

This keeps the library free of `navigator.platform` reads and user-agent
parsing, which are wrong as often as they are right — a Linux host under
Wayland may want the Windows cluster, and a PWA on macOS never has native
traffic-light buttons at all.

## Desktop window chrome

### TitleBar platform awareness

`TitleBar` adjusts its layout based on the `platform` prop:

| Platform  | Brand cluster          | WindowControls | Reason                                    |
| --------- | ---------------------- | -------------- | ----------------------------------------- |
| `windows` | Standard left padding  | Visible        | Default — Loom's cluster handles it all   |
| `macos`   | Shifted right (4.5rem) | Hidden         | macOS draws its own traffic-light buttons |
| `linux`   | Standard left padding  | Visible        | Most Linux desktops need the cluster      |

On macOS the brand cluster shifts right by 4.5rem (72px) to leave room for the
native traffic-light buttons at the top-left corner of the window. That
measurement covers the three 12px buttons, their 8px left margin, and 4px
inter-button gap at the default window scale.

`WindowControls` renders nothing when `platform` is `"macos"`, because macOS
draws its own minimize, maximize and close buttons. A Linux desktop that
handles buttons natively can set `platform="macos"` to hide the cluster.

See [TitleBar](/blocks/title-bar) and [WindowControls](/components/window-controls)
for the component API detail.

### The host owns the window bridge

TitleBar and WindowControls only emit intent — `minimize`, `maximize`, `close`,
`select(command)`. They never call Electron's `BrowserWindow`, Tauri's window
API, or any other platform bridge. The host wires those events to its own
runtime:

```vue
<TitleBar
  app-name="Acme"
  :platform="platform"
  @minimize="appWindow.minimize()"
  @maximize="appWindow.toggleMaximize()"
  @close="appWindow.close()"
/>
```

This is the same separation the rest of the library follows: Loom renders the
UI, the host owns the behaviour.

## PWA window controls overlay

When a PWA is installed and the browser's `window-controls-overlay` feature is
visible, the operating system draws its own minimize, maximize and close buttons
over the web content. Loom's `TitleBar` carries a `data-loom-titlebar`
attribute, and the global stylesheet adjusts its left padding to clear the
native controls:

```css
@supports (window-controls-overlay: visible) {
  [data-loom-titlebar] {
    padding-left: env(titlebar-area-x, 0px);
  }
}
```

This is CSS-only — no JavaScript is required. The padding reads from
`env(titlebar-area-x)`, which the browser sets to the width of the native
controls overlay. When the overlay is not visible, the `@supports` block does
not apply and the title bar uses its default padding.

See [MDN: Window Controls Overlay](https://developer.mozilla.org/en-US/docs/Web/API/Window_Controls_Overlay_API)
for the browser feature detail.

## Safe areas

Mobile webviews — and desktop PWA title-bar overlays — can reserve screen space
the layout must not paint into: a notch, a home indicator, or a status bar.
Loom exposes these as CSS custom properties in `theme.css`:

| Token                | Value                              | Use                          |
| -------------------- | ---------------------------------- | ---------------------------- |
| `--safe-area-top`    | `env(safe-area-inset-top, 0px)`    | Status bar / notch           |
| `--safe-area-bottom` | `env(safe-area-inset-bottom, 0px)` | Home indicator               |
| `--safe-area-left`   | `env(safe-area-inset-left, 0px)`   | Landscape notch (left edge)  |
| `--safe-area-right`  | `env(safe-area-inset-right, 0px)`  | Landscape notch (right edge) |

Every token falls back to `0px`, so they are safe to read unconditionally — a
viewport without a safe area simply contributes no inset. A host that wants
Loom's opinion uses the token; a host that needs the raw value for a custom
layout reads `env(safe-area-inset-top)` directly.

`ToastStack` already uses `env(safe-area-inset-bottom)` to keep toasts above
the home indicator on mobile devices.

## Drag regions

A frameless desktop window needs a drag region so the user can move it by its
title bar. TitleBar sets `-webkit-app-region: drag` on the entire header, then
opts the interactive clusters — `Menubar` and `WindowControls` — back out with
`-webkit-app-region: no-drag`. The brand cluster stays inside the drag region
on purpose: nothing in it is interactive, and the logo corner is exactly where
someone reaches to move the window.

This drag-region contract is why `Menubar` and `WindowControls` are built into
`TitleBar` rather than left to the host to assemble — every interactive element
in the bar must consistently opt out of the drag region, and getting that wrong
makes the title bar partially or fully undraggable.
