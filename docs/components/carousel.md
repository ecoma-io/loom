# Carousel

A paged strip: full-width slides, previous/next controls, and native scroll
underneath. One slide per page by design — the responsive behaviour is the
browser's, not a breakpoint map — and touch swiping comes from the same
native scrolling the controls drive.

<script setup lang="ts">
import { Carousel } from "@ecoma-io/loom";
import CarouselDemo from "../demos/CarouselDemo.vue";
import carouselDemoSource from "../demos/CarouselDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Carousel } from "@ecoma-io/loom";
</script>

<template>
  <Carousel>
    <div class="h-40 bg-primary">First</div>
    <div class="h-40 bg-accent">Second</div>
  </Carousel>
</template>
```

## Behaviour

- **Controls** page one slide at a time and disable at the boundaries unless
  `loop` is set; their names come from the labels seam.
- **Keyboard**: once the strip holds focus, ArrowLeft/ArrowRight page and
  Home/End jump to the ends. The controls remain ordinary Tab stops.
- **Touch** is native scrolling — the reader's finger decides where the strip
  settles, and the component follows.
- **Announcements**: each slide carries its position (`Slide 2 of 3`, through
  the labels seam), and a live region present from first render reports the
  settled page politely. Nothing announces on load.
- **No autoplay.** A carousel that moves by itself takes control away from
  the reader; if a product genuinely needs it, it is that product's decision
  to build.

<Demo title="Paged and looping" :source="carouselDemoSource">
  <CarouselDemo />
</Demo>

## Difference from ScrollReel

ScrollReel is a _scroller_: free horizontal browsing with snap points, no
notion of a current page. Carousel is a _pager_: discrete slides, a tracked
position, controls that know the boundaries. Reach for ScrollReel when the
reader browses; reach for Carousel when the product presents.

## API

<!-- @api Carousel -->
