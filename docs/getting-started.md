# Getting started

Loom ships as one npm package — `@ecoma-io/loom` — with the components, the
theme composable and the stylesheet entry behind a single install. What
follows is the shortest path from an empty Vue application to a rendered,
themed Loom component. Everything it touches has a page of its own; this one
only walks the line between them.

## Requirements

- **Vue 3.5 or newer** — the package's peer dependency.
- **Tailwind CSS 4 in your build.** Loom's styles are authored in Tailwind's
  CSS-first syntax (`@theme`), so the pipeline that compiles your CSS needs
  Tailwind available. With Vite that is `tailwindcss` and `@tailwindcss/vite`
  as dev dependencies, plus the plugin in your Vite config.

## Install

```bash
pnpm add @ecoma-io/loom
```

## Import the styles

```css
@import "@ecoma-io/loom/styles/global.css";
```

One import is the whole surface a normal host needs — tokens, the self-hosted
fonts, base element styling and the motion library all ride along.
[Theming](/foundations/theming) explains what each exported stylesheet
contains, and what a host assembling its own Tailwind entry does differently.

## Render a component

```vue
<script setup lang="ts">
import { Button } from "@ecoma-io/loom";
</script>

<template>
  <Button variant="primary" @click="save">Save</Button>
</template>
```

Every export lives in one place: `packages/loom/src/index.ts` is the complete
list, and each [component page](/components/button) documents its control
with an API table generated from the source rather than written beside it.

## Switch the theme

Loom ships a light and a dark theme, selected by the `data-theme` attribute
on `<html>`. The `useTheme` composable manages that attribute, persists the
preference and resolves a `"system"` mode from the OS setting:

```vue
<script setup lang="ts">
import { useTheme } from "@ecoma-io/loom/theme";

const { resolvedTheme, toggleTheme } = useTheme();
</script>

<template>
  <button @click="toggleTheme">{{ resolvedTheme }} theme</button>
</template>
```

[Theming](/foundations/theming) carries the full story, including flash
prevention for server-rendered pages.

## Where next

The documentation walks a journey, and each stage answers a different
question:

| Stage           | Section                                                             | Answers                                           |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| Foundations     | [Foundations](/foundations/colour)                                  | The tokens every component reads                  |
| Parts           | [Primitives](/components/button), [Composition](/composition/stack) | The controls, and the geometry that arranges them |
| Regions         | [Blocks](/blocks/app-header), [Layouts](/layouts/app-shell)         | Named regions, and ready-made page shells         |
| Patterns        | [Patterns](/patterns/forms)                                         | Worked examples that cross component boundaries   |
| See it together | [Showcase](/showcase/)                                              | What Loom's parts produce when they compose       |
| Start from      | [Templates](/templates/)                                            | Copyable pages to begin a real page from          |

Templates is the newest section with content in it: the
[contract](/templates/contract) is defined, the starter is runnable, and
Analytics is the first production page template. Showcase is still its landing
page today, and its first demonstration is on the roadmap.
