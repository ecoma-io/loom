# Drawer

A panel anchored to an edge of the viewport that slides in over the page: a
filter rail tuned while the table it filters stays visible, a record's detail
opened from a row, a navigation sheet on a narrow screen.

The line between this and [Dialog](./dialog.md) is worth drawing sharply,
because it is the pair most often picked wrongly. **A dialog is a centred task
surface for a decision or a short form — it interrupts.** It sits in the middle
of the screen, and the page behind it is context rather than something to keep
looking at. **A drawer is edge-anchored and deliberately leaves that page
visible along its open side**, because the work happens _alongside_ the
content: you adjust a filter and watch the rows change, or read a record's
detail against the list it came from.

So the question is not how much room the panel needs. It is whether the user
must answer before anything else can happen — that is a dialog — or whether
they are reading and adjusting something about what is already on screen, which
is this.

<script setup lang="ts">
import { Drawer, Button } from "@ecoma-io/loom";
import DrawerDemo from "../../src/primitives/Drawer/DrawerDemo.vue";
import drawerDemoSource from "../../src/primitives/Drawer/DrawerDemo.vue?raw";
</script>

<Demo title="Drawer">
  <Drawer title="Scene 12" description="Opened from the row it describes.">
    <template #trigger>
      <Button variant="outline">Open detail</Button>
    </template>
    <p class="text-sm">The list behind stays visible. Press Esc to leave.</p>
  </Drawer>
</Demo>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Drawer, Button } from "@ecoma-io/loom";

const open = ref(false);
</script>

<template>
  <Drawer v-model:open="open" side="right" size="sm" title="Filters">
    <template #trigger>
      <Button variant="outline">Filters</Button>
    </template>

    <!-- the panel body — it is the part that scrolls -->
    <FilterForm />

    <template #footer>
      <Button variant="subtle" @click="reset">Reset</Button>
      <Button variant="primary" @click="apply">Apply</Button>
    </template>
  </Drawer>
</template>
```

## Sides

`side` is not one decision but four made together, and the component keeps them
in a single table so they cannot drift apart: the edge the panel is pinned to,
the axis it slides in along, which dimension `size` then means, and which pair
of corners is rounded. A fifth follows from the same edge — the direction a
dismissing swipe has to travel, which is always _towards_ the edge the panel
came from.

- **`right`** (the default) — detail about the row or record already on screen.
  Left-to-right readers expect it on the trailing edge.
- **`left`** — navigation, which is where a reader already looks for it.
- **`bottom`** — the sheet a narrow screen gets. The shape a thumb reaches.
- **`top`** — the rare one: a command surface dropping in over the header.

Only the panel's inner corners are rounded, because the outer pair sits flush
against the viewport edge and a radius there would show a sliver of page
through it.

## Sizes

`size` is the panel's extent along its own axis — **width** on a `left` or
`right` drawer, **height** on a `top` or `bottom` one. Like Dialog's width it is
the primitive's decision rather than a class the caller passes, so two drawers
opened from two screens cannot be two different sizes.

- `sm` — a filter rail, or a navigation sheet.
- `md` — a record's detail.
- `lg` — a working surface with a table or a multi-section form in it.

Each is capped against the viewport, so even `lg` leaves the page it is
anchored over visible behind it. That remaining gap is the whole difference
between a drawer and a full-screen takeover, and it is why the cap is not
negotiable.

<Demo title="Sides, sizes, a scrolling body and a drawer that declines a stray click" :source="drawerDemoSource">
  <DrawerDemo />
</Demo>

## Dismissing

`dismissible` is on by default, and it governs the two _casual_ exits: a press
outside the panel, and the drag handle offered on its inner edge. Turn it off
for a panel holding an unsaved edit, where leaving should be a choice rather
than a stray click — the scrim then absorbs the press, and no handle is drawn,
because there is nothing to drag towards.

Turning it off never makes the drawer inescapable. **Esc closes it, and the
control in the corner closes it**, and both return focus to whatever opened
it. Declining an accidental dismissal is a different request from having no way
out, and a panel that answered both the same way would be a keyboard trap.

The corner control is always rendered, which is a deliberate divergence from
Dialog's `closable`. A dialog can drop it because the footer already carries an
explicit decision; a drawer frequently has no footer at all, so one of its two
pointer-independent exits has to stay visible.

The drawer never closes itself when the host drives it: it reports the request
through `update:open` and waits. That is what lets a save run before the panel
goes away, and what makes a failed save able to keep it open.

## The body scrolls, the title does not

The panel is a column: a header that does not shrink, a body that takes the
remaining space and scrolls, and — when the `footer` slot is filled — an action
row pinned below it. A drawer taller than its content's needs therefore scrolls
its body while the title stays put, which matters more here than in a dialog:
the title is the panel's accessible name and the only thing on screen saying
what is being looked at.

The body also stops a scroll that reaches its end from chaining out to the page
behind, so flicking through a long list never nudges the document underneath.

## Modality, and the scrollbar

A drawer here is **modal**, and that is a choice rather than an oversight.
Visible is not the same as reachable: focus is trapped in the panel, Tab never
walks out to the page behind, everything outside is hidden from assistive
technology, and the document does not scroll. A panel you could Tab out of
would strand a keyboard user behind a scrim they cannot see past.

One consequence is worth knowing before you meet it. Locking the document
removes the vertical scrollbar, so Reka compensates by adding a `padding-right`
to `<body>` the width of the scrollbar that just vanished. In-flow content
therefore does not jump. **Viewport-pinned furniture does** — a fixed-position
header or toolbar is laid out against the viewport, not the body, so it stays
where it was while everything else holds still, and the misalignment
appears the instant the drawer opens. Reka publishes the measurement as
`--scrollbar-width` on the document element for exactly this, so the fix is one
declaration on the pinned element:

```css
.app-header {
  padding-right: var(--scrollbar-width, 0px);
}
```

## Keyboard and screen readers

- **Tab / Shift+Tab** cycle the drawer's own controls, and never reach the page
  behind. Focus moves into the panel when it opens.
- **Esc** closes it, from anywhere inside.
- **Enter / Space** on the corner control closes it.
- **On close**, focus returns to whatever opened it.
- The panel is a `dialog` named by its `title` and described by its
  `description`, so both are announced together rather than the description
  being found later as loose body text.
- The drag handle is `aria-hidden` and not focusable — it is a pointer
  affordance sitting on top of the exits above, never instead of them, and it
  is not on the keyboard's path at all.

## Motion

The panel slides in on the **`slow`** lane with **`ease-out`**, and it is the
one place this component reaches past `--duration-normal`. The [motion
foundations](../foundations/motion.md) page names a panel taking over the
screen as exactly what the unhurried lane is for; a full-height panel crossing
the viewport at 200ms reads as a flinch rather than a slide. The scrim fades
under it on the normal lane, so nothing behind the drawer appears to move.

The slide is a **transform**, never a `width` or an inset. Animating a layout
property on a full-height panel relayouts the document on every frame; a
translate runs on the compositor. The closed position comes from
`@starting-style`, which supplies the before-value at the moment the panel is
inserted — and unlike a mount-only keyframe animation it leaves nothing for the
overlay machinery to wait on, so a closed drawer is removed in the same frame
rather than lingering invisibly over a page it no longer belongs to.

A live swipe is rendered as `transform` while the slide owns `translate`, so
the two compose rather than overwrite each other, and the transition is dropped
entirely while a finger is down — a panel easing 320ms behind the hand is a
panel that feels broken. Everything here is a CSS transition, so the global
`prefers-reduced-motion` rule collapses it without the component needing a path
of its own.

## API

<!-- @api Drawer -->
