<script setup lang="ts">
import { VisuallyHidden } from "@ecoma-io/loom";
import VisuallyHiddenDemo from "../demos/VisuallyHiddenDemo.vue";
import visuallyHiddenDemoSource from "../demos/VisuallyHiddenDemo.vue?raw";
</script>

A VisuallyHidden renders content assistive technology reads that the page
never paints: the words that turn an icon-only control into a named button,
the extra sentence a screen reader needs that would be noise on screen. It is
a utility primitive — no roles, no state, no keyboard map — just the clip
technique done once, in one tested place.

## Usage

```vue
<script setup lang="ts">
import { VisuallyHidden } from "@ecoma-io/loom";
</script>

<template>
  <button>
    <svg aria-hidden="true"><!-- the glyph --></svg>
    <VisuallyHidden>Empty the vault</VisuallyHidden>
  </button>
</template>
```

The hidden span participates in the button's accessible name like any other
text inside it, so the control is announced as "Empty the vault" while the
page shows only the glyph. Attributes fall through to the rendered element,
so an `id` set on the component is the node other elements'
`aria-describedby` points at.

## The clip, not `display: none`

Hiding visually and hiding from assistive technology are different problems.
`display: none` solves both at once — which is exactly why it is wrong here:
the content stops existing for screen readers and for in-page find. The clip
technique takes the box out of flow (`absolute`), shrinks it to a pixel,
clips it to nothing (`clip-path: inset(50%)`, with a `clip` fallback), and
forbids wrapping — visually gone, semantically intact.

That also decides focus: the wrapper itself is never focusable. If the hidden
content should be reachable by keyboard — a skip target, for instance — the
focusable element belongs in the slot, and this component wraps it rather
than being it.

<Demo title="The name of an icon-only control" :source="visuallyHiddenDemoSource">
  <VisuallyHiddenDemo />
</Demo>

## API

<!-- @api VisuallyHidden -->
