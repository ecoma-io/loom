# IconButton

A square, icon-only button with an enforced accessible name. The `label` prop is required
because an icon-only button without one is a WCAG failure — a screen reader user who
cannot see the icon meets an unnamed button.

<script setup lang="ts">
import { IconButton } from "@ecoma-io/loom";
import IconButtonDemo from "../demos/IconButtonDemo.vue";
import iconButtonDemoSource from "../demos/IconButtonDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { IconButton } from "@ecoma-io/loom";
</script>

<template>
  <IconButton label="Close" variant="ghost">
    <XIcon />
  </IconButton>
</template>
```

<Demo title="IconButton variants, sizes, and disabled state" :source="iconButtonDemoSource">
  <IconButtonDemo />
</Demo>

## Variants

The four variants match Button's press language — hover lifts by fill — but `default`
here names what Button calls `primary`, because an icon button is never the screen's
primary action and the word would mislead.

<div class="flex flex-wrap items-center gap-3">
  <IconButton variant="default" label="Close">✕</IconButton>
  <IconButton variant="secondary" label="Settings">⚙</IconButton>
  <IconButton variant="ghost" label="Favourite">★</IconButton>
  <IconButton variant="destructive" label="Delete">🗑</IconButton>
</div>

## Sizes

Every size is a square at or above the 24px minimum target from WCAG 2.2 SC 2.5.8:

| Size | Dimension |
| ---- | --------- |
| sm   | 8 × 8     |
| md   | 9 × 9     |
| lg   | 10 × 10   |

## Accessibility

The `label` prop is rendered as `aria-label`. An icon button must have an accessible
name, and this prop makes forgetting one impossible. A button that only shows an icon
conveys nothing to a screen reader user without it.

## API

<!-- @api IconButton -->
