# Surface

The panel/card primitive — a filled block that groups content. Loom
expresses elevation with hairlines and background lightness rather than
heavy shadows ("hairline over shadow").

<script setup lang="ts">
import { Surface } from "@ecoma-io/loom";
import SurfaceDemo from "../../src/primitives/Surface/SurfaceDemo.vue";
import surfaceDemoSource from "../../src/primitives/Surface/SurfaceDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Surface } from "@ecoma-io/loom";
</script>

<template>
  <Surface variant="card">Content</Surface>
</template>
```

## Variants

| Variant   | Role                             | Elevation                                                                           |
| --------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| `card`    | default — a content panel        | hairline `border` on the white `card` background — already reads as raised on paper |
| `muted`   | a sunken/secondary panel         | `muted` background, transparent border                                              |
| `overlay` | a floating layer (menu, popover) | `shadow-md` — a shadow reserved for things that genuinely float                     |

<Demo title="Variants">
  <Surface variant="card">card</Surface>
  <Surface variant="muted">muted</Surface>
  <Surface variant="overlay">overlay</Surface>
</Demo>

## Pad

Built-in inner padding, so a caller doesn't have to remember the spacing
token:

| Pad    | Value                                         |
| ------ | --------------------------------------------- |
| `none` | `p-0` — the caller owns its own inner padding |
| `sm`   | `p-3`                                         |
| `md`   | `p-4` (default)                               |
| `lg`   | `p-6`                                         |

Content passes through the default slot. `surfaceVariants` (also exported)
lets the same class set be reused elsewhere.

## Interactive — one hover language for every clickable row

`interactive` turns on the shared clickable-surface language: a fill lift
(`hover:bg-subtle/60`), an asserting hairline (`hover:border-border-strong`),
a pointer cursor, and a slightly deeper press state. A selectable list row or
picker card composes this prop instead of hand-writing its own `hover:bg-…`
per view. Surface stays a presentational `div` — the host attaches the click
handler, role, and tabindex that make the interaction real.

<Demo title="Every variant, pad and state" :source="surfaceDemoSource">
  <SurfaceDemo />
</Demo>

## Elevation — shadow only for floating objects

Only `overlay` carries a shadow (`shadow-md`). `card` and `muted` cast no
shadow at all; they separate from their surroundings through a hairline and
background lightness instead. On the paper-light ground, a white card with a
hairline border already reads as "built, not floating." A drop shadow signals
"floating above everything," so it's reserved for menus, dialogs, and
popovers — never scattered across ordinary cards.

## Do / Don't

- Use `overlay` for a floating menu or popover; use `card` for a static panel.
- Don't add a manual drop `shadow` to `card` — the hairline and white
  background are already enough, and a shadow there breaks "hairline over
  shadow."

## API

<!-- @api Surface -->
