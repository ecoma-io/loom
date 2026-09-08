# PageHeader

The title band **pinned to the top** of one surface: the surface's name, its
live count, one line of orientation, and its primary actions. It composes no
primitive of its own — every host slots `Button` or whatever else the
surface's actions call for through `#actions` — and that is the decision
that makes it a block: the pinning, the plane it sits on, and the gutter and
wrap rules are fixed once here rather than re-derived by every surface that
needs a header.

<script setup lang="ts">
import { PageHeader } from "@ecoma-io/loom";
import PageHeaderDemo from "../demos/PageHeaderDemo.vue";
import pageHeaderDemoSource from "../demos/PageHeaderDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { PageHeader } from "@ecoma-io/loom";
</script>

<template>
  <PageHeader title="Workflows" :count="12" description="What this surface is for.">
    <template #actions>
      <Button size="sm">Create</Button>
    </template>
  </PageHeader>
</template>
```

## Why a block, and not something every surface writes itself

This is the difference between "a page" and "a surface of a workspace".
When a title lives _inside_ the scrolling area, it drifts away — scroll to
the tenth row and nothing says where you are anymore, and there is nowhere
left to reach the primary action. Pinning it turns the layout into a
three-band frame — title band, scrolling work area, and (per surface) a
footer band — and the work area finally has a **floor**, which is what lets
a three-row list read as "a list that currently has three rows" instead of
"a page that has not finished loading".

Pinning uses `position: sticky`, so it needs a scrolling ancestor. A header
that will not stick is almost always an ancestor with `overflow: hidden`,
not this component.

<Demo title="Title, count, description and actions" :source="pageHeaderDemoSource">
  <PageHeaderDemo />
</Demo>

## Pinned by a hairline, never a shadow

The band sits on the same plane as the work area below it and is separated
by a single hairline border, never a shadow. It does not sit on the
recessed navigation plane — that belongs to a sidebar; this is the title of
the content area itself.

Rows scroll _under_ the band, so the plane is translucent and blurred, the
same "pinned chrome" treatment used elsewhere: the opaque background is
declared first as the fallback, then a blur plus a translucent variant layer
on top. There is no shadow — the band's elevation never changes; the blur
alone is what says content is passing underneath.

## Width — stepped gutters, a capped measure

Gutters step rather than hold one value: smaller by default, larger from
`sm`, and larger again from `3xl` (1920px) — opening up for a wide canvas,
not just shrinking for mobile.

`description` is capped at a readable measure instead of tracking the
viewport. A one-line orientation stretched across an ultra-wide monitor is
unreadable; the width that opens up on a wide screen belongs to the actions
and the work area below, not to a longer line of prose. The title itself
carries no cap — it truncates, so it can only ever take one line.

When space is tight, the **actions cluster wraps to its own row** instead of
crowding a title that has already been truncated to a few characters: the
title block declares the wrap threshold through its own basis, and the
actions cluster is pushed right with its own margin — not the header's
`justify-between` — so once it wraps it still sits on the right rather than
falling flush left under the title.

## The count is a number, so it is tabular

`count` renders in a monospaced, tabular-figures style so the title beside
it never shifts as a number ticks up or down while rows resolve. It is
deliberately **not** a Badge: a badge is a status chip, and "how many rows
are below" is a fact, not a status. Wrap it in a Badge at the call site on
the rare surface where the count itself _is_ the thing to flag — a review
queue that keeps growing, say.

Omit `count` entirely rather than pass `0`: a zero beside a title reads as a
broken fetch. An empty result belongs to whatever empty-state treatment the
surface below uses, not to this band.

## Do / Don't

- Say what the surface is **for** in `description`, not its name again.
- Keep exactly one `variant="primary"` action in `#actions`; the rest
  `outline` or `subtle`.
- Don't put a long filter bar or navigation tabs here — this band is
  identity plus action; a filter belongs to the work area right below it.
- Don't reach for this for a heading _inside_ a section, and don't reach for
  it as a dialog title — both have their own, more specific components.

## API

<!-- @api PageHeader -->
