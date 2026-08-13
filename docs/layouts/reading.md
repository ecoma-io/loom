# Reading

A long-form reading layout: capped line-length for comfortable reading, with
optional full-width header and footer bands. The content area is always
constrained to ~65ch — the width research identifies as the fastest for
sustained reading — and extra viewport on ultrawide monitors goes to
intentional whitespace, never to stretching lines.

<script setup lang="ts">
import { Reading } from "@ecoma-io/loom";
import ReadingDemo from "../../src/layouts/Reading/ReadingDemo.vue";
import readingDemoSource from "../../src/layouts/Reading/ReadingDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Reading } from "@ecoma-io/loom";
</script>

<template>
  <Reading>
    <template #header>
      <!-- site chrome, navigation -->
    </template>
    <!-- long-form reading content, capped at ~65ch -->
    <template #footer>
      <!-- copyright, secondary links -->
    </template>
  </Reading>
</template>
```

<Demo title="Reading" :source="readingDemoSource">
  <ReadingDemo />
</Demo>

## Line length

The content wrapper is always `max-w-prose` with no prop to change it. This
layout exists to enforce that cap: a reading layout that can go full-width is
not a reading layout. The `gutter` prop controls horizontal padding, not width.

~65 characters per line is the measure research identifies as the fastest for
sustained reading. Lines longer than that force the eye to work harder tracking
back to the start of the next line; lines shorter than that break phrases
mid-phrase and interrupt comprehension. Both slow the reader down, and both
grow worse on ultrawide monitors — which is exactly where this layout holds the
line while the extra viewport becomes whitespace.

## Responsive behavior

- **Mobile:** full-width content with comfortable padding (`px-4`)
- **Tablet (`sm`):** wider gutters (`px-6`), more vertical breathing room
- **Desktop+:** content stays capped at `max-w-prose`, centered with `mx-auto`
- **Wide/Ultrawide (`3xl`):** gutters widen again (`px-8`), extra viewport goes to whitespace

Header and footer bands span the full width of the viewport and are not
constrained to the prose measure — they carry site chrome, navigation, and
copyright that should reach across the page.

## API

<!-- @api Reading -->
