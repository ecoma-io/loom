# Frame

Fixed-ratio container. Frame maintains a consistent aspect ratio regardless of
its width — useful for media embeds, image thumbnails, and any content that
needs a fixed proportion.

<script setup lang="ts">
import { Frame } from "@ecoma-io/loom";
import FrameDemo from "../../src/composition/Frame/FrameDemo.vue";
import frameDemoSource from "../../src/composition/Frame/FrameDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Frame } from "@ecoma-io/loom";
</script>

<template>
  <Frame ratio="16:9">
    <img src="photo.jpg" alt="Description" class="h-full w-full object-cover" />
  </Frame>
</template>
```

## Named ratios

| Ratio  | Use for                      |
| ------ | ---------------------------- |
| `16:9` | Video, wide cards (default)  |
| `4:3`  | Classic photo, presentations |
| `1:1`  | Avatars, square thumbnails   |
| `3:4`  | Portrait photos              |

Any valid CSS `aspect-ratio` value is also accepted — for example,
`ratio="21 / 9"` for an ultra-wide strip.

## Overflow

Frame applies `overflow: hidden` so content cannot distort the frame. Content
that fills the frame (like an `<img>` with `object-cover`) is clipped to the
ratio; content that is smaller simply sits inside it.

<Demo title="Frame" :source="frameDemoSource">
  <FrameDemo />
</Demo>

## API

<!-- @api Frame -->
