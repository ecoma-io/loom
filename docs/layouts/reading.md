---
composition: "Optional full-width header and footer bands around one measured reading column that never widens."
---

# Reading

A long-form reading layout: capped line-length for comfortable reading, with
optional full-width header and footer bands. The content area is always
constrained to ~65ch — the width research identifies as the fastest for
sustained reading — and extra viewport on ultrawide monitors goes to
intentional whitespace, never to stretching lines. The bands span the full
viewport width and are never constrained to the prose measure: they carry
site chrome, navigation, and copyright that should reach across the page.

<script setup lang="ts">
import { Reading } from "@ecoma-io/loom";
import ReadingDemo from "../demos/ReadingDemo.vue";
import readingDemoSource from "../demos/ReadingDemo.vue?raw";
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
It is a boolean — the exported `ReadingGutter` type — defaulting to `true`:
padding steps up as the viewport widens (`px-4`, then `px-6`, then `px-8`
past the widest breakpoint), and `:gutter="false"` removes it entirely, which
is the flush edge a full-bleed hero above the article wants.

~65 characters per line is the measure research identifies as the fastest for
sustained reading. Lines longer than that force the eye to work harder tracking
back to the start of the next line; lines shorter than that break phrases
mid-phrase and interrupt comprehension. Both slow the reader down, and both
grow worse on ultrawide monitors — which is exactly where this layout holds the
line while the extra viewport becomes whitespace.

## Obligations

<!-- @layout-obligations Reading -->

## API

<!-- @api Reading -->
