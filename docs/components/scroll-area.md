# ScrollArea

Custom-styled scrollbars for overflow content, replacing the browser's native scrollbar
with a thin track that expands on hover. Built on Reka UI's ScrollArea primitives.

<script setup lang="ts">
import { ScrollArea } from "@ecoma-io/loom";
import ScrollAreaDemo from "../demos/ScrollAreaDemo.vue";
import scrollAreaDemoSource from "../demos/ScrollAreaDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { ScrollArea } from "@ecoma-io/loom";
</script>

<template>
  <ScrollArea orientation="vertical" class="h-48 w-full">
    <div class="p-2">
      <!-- long content here -->
    </div>
  </ScrollArea>
</template>
```

<Demo title="ScrollArea orientations" :source="scrollAreaDemoSource">
  <ScrollAreaDemo />
</Demo>

## Orientation

The `orientation` prop controls which scrollbars appear:

- **`"vertical"`** (default) — vertical scrollbar only
- **`"horizontal"`** — horizontal scrollbar only
- **`"both"`** — both scrollbars, with a corner piece where they meet

Each scrollbar is a thin track (2.5 units wide) that expands to 3 units on hover,
making the scroll thumb easier to grab without eating layout space at rest.

## API

<!-- @api ScrollArea -->
