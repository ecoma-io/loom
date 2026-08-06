# SidebarNav

The primary **navigation** chrome of a workspace: a `<nav>` landmark of
sections and destinations, plus an icon-only collapsed mode. It composes
`Tooltip` for the collapsed mode's accessible names, `Badge` for the item
count, and `Separator` between sections — fixed here because the three have
to agree with each other (a badge folded into a tooltip, a separator that
never appears before the first section) in a way a host re-deriving them by
hand would drift on.

<script setup lang="ts">
import { SidebarNav } from "@ecoma-io/loom";
import SidebarNavDemo from "../../src/blocks/SidebarNav/SidebarNavDemo.vue";
import sidebarNavDemoSource from "../../src/blocks/SidebarNav/SidebarNavDemo.vue?raw";
</script>

## Usage

```vue
<script setup lang="ts">
import { SidebarNav, type SidebarNavSection } from "@ecoma-io/loom";
import { Home } from "@lucide/vue";

const sections: SidebarNavSection[] = [
  { items: [{ icon: Home, label: "Overview", active: true, href: "/" }] },
];
</script>

<template>
  <SidebarNav :sections="sections" aria-label="Primary navigation" />
</template>
```

## Why chrome, not content

This is the **most recessed plane** in the shell's elevation rhythm: it
always sits darker than the content area it serves, so the sidebar never
reads as more raised than what it leads to. Unlike `PageHeader` (a surface's
own title, on the same plane as its content) or `AppHeader` (the shell's top
strip, one step above the content), `SidebarNav` does exactly one job: say
where you are, and where you can go.

<Demo title="Sections, badges and the collapsed mode" :source="sidebarNavDemoSource">
  <SidebarNavDemo />
</Demo>

## Hover lifts to the raised plane, never tints with the neutral hover fill

The neutral hover fill is tuned for a surface sitting on the app background,
where it lands about two percent darker and reads clearly. This nav sits on
the sunken plane instead, one percent of lightness away from that same
fill — close enough that the hover state would be present in the markup and
invisible on screen. So a hovered row lifts to the raised plane instead:
that is the elevation rhythm's own answer (sunken below background below
raised), and the row under the pointer steps forward rather than tinting in
place.

The general lesson, not specific to this block: a hover token only means
something relative to the plane it sits on. Copying it onto a different
plane is how a state goes missing without anything flagging it.

## One force — warp, never mixed with weft

The active item carries a flat tinted fill plus an inset accent bar, in the
human accent alone. Which surface a person is standing on is that person's
own decision, so it carries the human force only — never the agent accent,
even when the destination is a surface an agent operates. The accent colors
say who is acting; "which page is this" is always a human call.

## Types

```ts
interface SidebarNavItem {
  icon?: Component; // a Lucide-shaped component, e.g. Home from @lucide/vue
  label: string;
  active?: boolean; // the sole item painted with the accent bar + fill
  href?: string; // renders a real <a> instead of a <button>
  badge?: string | number; // hidden while collapsed — folded into the tooltip instead
}
interface SidebarNavSection {
  label?: string; // omit for an unlabeled leading group
  items: SidebarNavItem[];
}
```

`icon` takes a component, never a string name to look up — every block in
this package that accepts an icon does the same, so a host always passes the
component it imported rather than threading a name through a lookup table
this package does not maintain.

## Presentational only

`SidebarNav` never tracks the current route itself — the host decides which
item is `active`, and the host owns routing (`href` renders a real `<a>`,
never a JS navigation). Selecting an item emits `select` with the full item,
so the host maps it to its own action.

## Collapsed mode

In `collapsed` mode, section labels and item text hide and every row shrinks
to an icon-only square. Since the visible label disappears, the accessible
name moves to `aria-label` on the `<a>`/`<button>` itself — `Tooltip` (open
on hover or focus) only _supplements_ that name through `aria-describedby`,
never serves as the only source of one. `badge` also drops out of the
layout at this point; its value is not lost, it folds into the same
Tooltip content as the label.

Collapsed rows are square (36×36) rather than full-width, so the nav centers
its own children in this mode. The rail's width is the host's job — and the
host may narrow it late, or not narrow it at all: without the centering, a
collapsed nav sitting in a still-wide container leaves a column of icons
hugging the left edge of an otherwise empty panel. Centering makes the mode
read correctly at every container width the host produces, so a width
animation on the host's side only has to tighten something that already
looks right. In the demo above, the host narrows the container to `3.25rem`
(the 2.25rem square row plus the nav's own padding) with a width
transition — that is the part worth copying at the call site.

## Keyboard

Every item is a real `<a>`/`<button>`, so tab order and Enter/Space
activation come from the platform rather than hand-written key handling —
there is no focus trap, and nothing to learn beyond the browser's own
conventions.

## Do / Don't

- Show exactly one `active` item in the currently visible list — that is
  "where you are", not "where you have been".
- Omit the first section's `label` when it needs no name (the default,
  unlabeled leading group).
- Don't reach for this for a transient command list — `DropdownMenu` and
  `Menubar` already cover that; this is a persistent navigation landmark,
  never an overlay.
- Don't paint the active item with the agent accent even when it leads to a
  surface an agent operates — the accent colors describe who just acted, and
  "which page is current" is always a human decision.

## API

<!-- @api SidebarNav -->
