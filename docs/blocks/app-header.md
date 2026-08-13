# AppHeader

The web app's shell-level top bar: the strip that stays pinned above every
surface underneath, once per application. It composes no primitive of its
own — it is layout only, three named-slot regions over which the host drops
`Button`, `TextField`, `DropdownMenu` and `Avatar` — and that is the decision
that makes it a block rather than something a host would assemble itself:
the geometry, elevation and responsive collapse are fixed here so every host
gets the same shell instead of re-deriving the same breakpoints and hairline
by hand.

<script setup lang="ts">
import { AppHeader } from "@ecoma-io/loom";
import AppHeaderDemo from "../../src/blocks/AppHeader/AppHeaderDemo.vue";
import appHeaderDemoSource from "../../src/blocks/AppHeader/AppHeaderDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { AppHeader } from "@ecoma-io/loom";
</script>

<template>
  <AppHeader aria-label="Primary navigation">
    <template #brand>
      <span class="font-semibold">Acme</span>
    </template>
    <template #userMenu>
      <button aria-label="Account">…</button>
    </template>
  </AppHeader>
</template>
```

## Not `PageHeader`, and not `TitleBar`

Three things get confused because all three are "a bar pinned to the top":

- **`AppHeader`** (this one) — the web app's own shell strip: brand, global
  search, organization, notifications, account. Exactly one per application.
- **`PageHeader`** — the title band of one surface, sitting _inside_ the
  content area `AppHeader` sits above. An app has many `PageHeader`s, one
  per surface.
- **`TitleBar`** — a desktop window's native chrome (the drag region, the
  minimize/maximize/close cluster). `AppHeader` is content inside the web
  page, never window furniture.

## Three regions, and one `ml-auto` instead of a spacer

The layout is **brand (left) · search (optional) · a trailing cluster
(organization · notifications · account)**. Each region is a named slot —
the block owns the strip's geometry and elevation, never what a host puts
inside a region. A region nobody slots takes up no space.

The trailing cluster is pushed right by its **own** `ml-auto`, not by a
spacer element. A spacer also works, but it is a **second** flexible box
beside the search field, so the two split the free space between them
instead of the search field taking exactly what is left. `ml-auto` costs no
extra element and no extra width.

<Demo title="Full header, with brand, search and the trailing cluster" :source="appHeaderDemoSource">
  <AppHeaderDemo />
</Demo>

## Below `sm` the bar is two rows

A brand, a real search field, and an organization + notifications + account
cluster do not fit on one row at 390px: measured against the demo's own
content, the search field is left about 60px and renders as a magnifier
glyph pressed against the organization name — present, and unusable.

So below `sm` the search field takes a full-width second row instead, and
the bar's height goes from fixed to a floor of 56px; from `sm` up it snaps
back to one row. It wraps rather than hides: a host slots a search field
because its users need one, and a block does not get to decide they need it
less on a phone.

One thing to keep in mind if this ever changes: the search row is moved
visually below the trailing cluster while staying before it in the DOM, so
on a phone the tab order still reaches search first. That is the lighter of
the two mismatches this creates — search is the more-used control — but it
remains a mismatch, so the same trick should not extend to the other
regions.

## Pinned by a hairline, never a shadow

The bar sits on the raised plane, one step above the content scrolling
underneath it — unlike `PageHeader`, which shares its own content's plane.
Because content moves under a fixed bar, the surface is translucent and
blurred so that motion stays legible as depth; the opaque background is
declared first and is what renders wherever `backdrop-filter` is
unsupported, so the bar is never a see-through smear over its own content.

## Deliberately neutral

`AppHeader` is shell chrome shared by every user and every surface alike, so
it never carries a role-specific accent colour. Those colours mark a specific
category or role on a surface; the chrome around every surface is not that.

## API

<!-- @api AppHeader -->
