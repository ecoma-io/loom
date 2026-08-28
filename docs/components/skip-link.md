# SkipLink

The WCAG 2.4.1 (Bypass Blocks) affordance: a link to the main content that is the page's first
focusable element and stays visually hidden until it receives keyboard focus.

<script setup lang="ts">
import { SkipLink } from "@ecoma-io/loom";
import SkipLinkDemo from "../demos/SkipLinkDemo.vue";
import skipLinkDemoSource from "../demos/SkipLinkDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { SkipLink } from "@ecoma-io/loom";
</script>

<template>
  <SkipLink />
</template>
```

<Demo title="SkipLink" :source="skipLinkDemoSource">
  <SkipLinkDemo />
</Demo>

## Placement

The link only works as a bypass if it is the **first focusable element** — render it before the
header and navigation it exists to skip, next to the app shell:

```vue
<template>
  <div>
    <SkipLink />
    <header><!-- repeated site chrome --></header>
    <main id="main"><!-- content --></main>
  </div>
</template>
```

While unfocused it is visually hidden (clipped, one pixel, out of flow), so occupying the top of
the document costs no layout. On `:focus` — any focus, not only `:focus-visible` — it reveals
itself as a fixed overlay at the top-left, presented from the theme's tokens: the pinned
`primary` contrast pair with the shared focus ring and halo. It carries no motion, so
`prefers-reduced-motion` needs no exception.

## The target

Give the destination `tabindex="-1"` so following the link _moves focus_ there. Without it the
browser only scrolls to the fragment, which a screen reader may not announce — the skip would
move the viewport but not the user:

```vue
<main id="main" tabindex="-1"><!-- content --></main>
```

`-1` is not in the tab order; it only marks the element as a focus destination.

## Labels

The link's text comes through the library's localisation seam. Override one instance with the
`labels` prop:

```vue
<SkipLink :labels="{ label: 'Zum Hauptinhalt springen' }" />
```

or translate every Loom component at once above your application root:

```ts
provideLoomLabels(() => ({
  skipLink: { label: "Zum Hauptinhalt springen" },
}));
```

## API

<!-- @api SkipLink -->
