# Iconography

Loom draws every icon from [Lucide](https://lucide.dev), through `@lucide/vue`
— an icon component per glyph, imported by name, styled entirely through
props rather than through hand-tuned CSS per instance.

```vue
<script setup lang="ts">
import { Search } from "@lucide/vue";
</script>

<template>
  <Search />
</template>
```

## One set of defaults, applied once

`applyLoomIconDefaults()` sets every `@lucide/vue` icon rendered afterward to
size 16 and stroke width 1.5 — hairline-first, matching the same 1px border
language the rest of the library draws borders in. A component declares
`size` or `strokeWidth` only where it deliberately diverges from that
default; it never restates 16/1.5 itself.

```ts
export function applyLoomIconDefaults(): void {
  setLucideProps({ size: 16, strokeWidth: 1.5 });
}
```

It resolves to Vue's `provide()`, which is why it has to be called from
inside a component's `setup()` — this documentation site's own root layout
calls it for exactly that reason, the same way a host application calls it
once from its own root component. Called from a plain entry module instead,
it silently provides nothing, and every icon quietly falls back to Lucide's
own 24px / stroke-2 defaults.

The one standing exception: an icon rendered at 12px or below sets
`stroke-width` to 2.5 explicitly rather than inheriting 1.5. Lucide's stroke
lives on a 24-unit grid and scales down with the icon, so 1.5 at 12px renders
under one device pixel against a full pixel at 16px — 2.5 is what restores
the glyph's optical weight at that size rather than letting it thin out to
nothing.

<Demo title="16px / 1.5 (the default) next to 12px / 2.5">
  <Search />
  <Search :size="12" :stroke-width="2.5" />
</Demo>

## Icons are decorative; the label carries the meaning

`SidebarNavItem`'s own type declares its `icon` field decorative, and that is
the rule everywhere in the source: an icon paired with visible text is
`aria-hidden`, because the accessible name already comes from the label next
to it. `InlineError`'s warning triangle and `Spinner`'s SVG arc are both
`aria-hidden` for the same reason — the meaning lives in the text or the
`aria-label` beside them, never in the glyph alone. An icon standing entirely
on its own, with no visible label — an icon-only `Button` — is the one case
that needs an explicit accessible name instead, through `aria-label`.

<Demo title="Icon with a visible label vs. icon-only">
  <span class="inline-flex items-center gap-1.5 text-sm">
    <Bell class="h-4 w-4" aria-hidden="true" />
    Notifications
  </span>
</Demo>

## Consumer icons

Host applications can use the same `createLucideIcon` factory Loom's own
components use internally to build custom icons that take the same props
as any Lucide icon (`size`, `strokeWidth`, `color`). This is useful for
brand marks and domain-specific glyphs that need to sit alongside the
standard Lucide set.
