# Centered

The simplest application shell: a header, a centered content column with a
max-width constraint, and a footer. Header and footer span the full viewport;
only the content is centered. On ultra-wide monitors the extra viewport goes to
intentional whitespace — lines of text stay readable rather than stretching to
fill the screen.

<script setup lang="ts">
import { Centered } from "@ecoma-io/loom";
import CenteredDemo from "../demos/CenteredDemo.vue";
import centeredDemoSource from "../demos/CenteredDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Centered } from "@ecoma-io/loom";
</script>

<template>
  <Centered maxWidth="prose" gutter>
    <template #header>
      <!-- full-width header bar -->
    </template>
    <!-- centered, max-width-constrained content -->
    <template #footer>
      <!-- full-width footer -->
    </template>
  </Centered>
</template>
```

## Max-width

Names readable intent rather than a pixel value:

| Value   | Width   | Use for                         |
| ------- | ------- | ------------------------------- |
| `sm`    | `24rem` | Narrow sidebars, compact panels |
| `md`    | `28rem` | Form columns                    |
| `lg`    | `32rem` | General content (default)       |
| `xl`    | `36rem` | Wider content panels            |
| `prose` | ~65ch   | Long-form readable text         |

## Responsive behavior

- **Below sm:** full-width with `px-4` gutters — the viewport itself is margin
- **sm and up:** gutters widen to `px-6` — content breathes as the screen grows
- **3xl (ultrawide):** gutters widen to `px-8` — extra viewport goes to whitespace
- **Header and footer** always span the full viewport width and are never centered

<Demo title="Centered" :source="centeredDemoSource">
  <CenteredDemo />
</Demo>

## API

<!-- @api Centered -->
