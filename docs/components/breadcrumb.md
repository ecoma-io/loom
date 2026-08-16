# Breadcrumb

A navigation trail showing the page's position in the site hierarchy.

<script setup lang="ts">
import { Breadcrumb } from "@ecoma-io/loom";
import BreadcrumbDemo from "../demos/BreadcrumbDemo.vue";
import breadcrumbDemoSource from "../demos/BreadcrumbDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { Breadcrumb } from "@ecoma-io/loom";
</script>

<template>
  <Breadcrumb
    :items="[
      { label: 'Home', href: '/' },
      { label: 'Products', href: '/products' },
      { label: 'Loom' },
    ]"
  />
</template>
```

The last item is always the current page — it renders as a span with
`aria-current="page"`, never as a link, regardless of whether its `href`
is set. Items before the last render as links.

## Separators

Five separator options: `/` (default), `\`, `>`, `→`, and `chevron` (an
inline SVG). Separators are `aria-hidden` so they are spoken only as
structural pauses, not as characters.

<Demo title="Separator options" :source="breadcrumbDemoSource">
  <BreadcrumbDemo />
</Demo>

## API

<!-- @api Breadcrumb -->
