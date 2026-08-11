# Pagination

Move through a paged result set — one page at a time, or by jumping straight to
a numbered one. It is the chrome that sits above or below a table, a search
result list, or anything else a server hands back a slice at a time.

Reach for something else when the list is not really paged. An endless feed
wants a "load more" button, which says what it does; a long list a reader scans
rather than indexes wants a virtualised scroller, where the scrollbar is the
position indicator. Pagination earns its space when _which page you are on_ is
information the reader needs.

It renders **buttons, never links**, and that is a boundary worth knowing
before you build on it. Loom cannot know whether your pages are addressable
URLs, and an `<a>` with no `href` is not a link — it is a `div` that lies to a
screen reader and falls out of the tab order. If your pages are real, crawlable
URLs and you need them to be followable, copyable and indexable, you need your
own row of `<a href>` elements; nothing here can be configured into producing
one.

<script setup lang="ts">
import { ref } from "vue";
import { Pagination } from "@ecoma-io/loom";
import PaginationDemo from "../../src/primitives/Pagination/PaginationDemo.vue";
import paginationDemoSource from "../../src/primitives/Pagination/PaginationDemo.vue?raw";

const invoices = ref(4);
const deep = ref(37);
const feed = ref(2);
const compact = ref(3);
const simple = ref(2);
const narrow = ref(6);
const wide = ref(6);
const edgeless = ref(6);
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Pagination } from "@ecoma-io/loom";

const page = ref(1);
</script>

<template>
  <Pagination v-model:page="page" :total="248" :items-per-page="25" label="Invoices" />
</template>
```

`page` is 1-based and the model is named after the thing it models, so the
binding is `v-model:page` rather than a bare `v-model`. Leave `page` unset and
the component keeps its own — it still reports every change through
`update:page`, so an uncontrolled instance is a legitimate way to use it rather
than a degraded one.

`total` is a count of **items**, not of pages, and `itemsPerPage` is what turns
one into the other. That is deliberately the same shape the query you just ran
already has.

## Variants

Three, and they differ only in how much of the apparatus is worth the space.
All three drive the same model and carry the same semantics.

`full` is the numbered row with first, previous, next and last. Use it where
jumping to a known page is a real task — a table someone works through in
order, and comes back to.

<Demo title="Full">
  <Pagination v-model:page="invoices" :total="120" label="Invoices" />
</Demo>

`compact` trades the numbers for the position as text. It fits a toolbar with
no room for a row of squares, and still answers "where am I, and how much is
left".

<Demo title="Compact">
  <Pagination v-model:page="compact" variant="compact" :total="120" label="Invoices, compact" />
</Demo>

`simple` is previous and next alone, for a feed nobody navigates by index. The
position is still announced to a screen reader — see below — it simply is not
drawn.

<Demo title="Simple">
  <Pagination v-model:page="simple" variant="simple" :total="120" label="Activity" />
</Demo>

## The window, and the ellipsis

In the `full` variant the numbered row is a sliding window, not the whole set:
`siblingCount` decides how many numbers sit either side of the current page,
and `showEdges` pins page 1 and the last page to the ends with an ellipsis
standing in for whatever the window skipped.

An ellipsis is not a control. It is not focusable, has nothing pressable about
it, and the glyph itself is hidden from assistive technology — "horizontal
ellipsis" is not what it means. The words _more pages_ are, and that is what a
screen reader reads there instead.

<Demo title="One sibling either side, both ends anchored">
  <Pagination v-model:page="deep" :total="1000" label="Search results" />
</Demo>

<Demo title="Two siblings">
  <Pagination v-model:page="wide" :total="1000" :sibling-count="2" label="Search results, wide" />
</Demo>

Turning `showEdges` off drops the anchors and the ellipses together — the
window then floats free, with no way to reach the first or last page except the
edge buttons. It is the tighter, quieter form; it is also the one that hides
how large the set is.

<Demo title="showEdges off">
  <Pagination v-model:page="edgeless" :total="1000" :show-edges="false" label="Search results, unanchored" />
</Demo>

## Naming it

A page very often carries two of these — one above a table and one below it —
and two `<nav>` landmarks with the same name are as unhelpful as two with no
name at all: a screen reader lists them both and offers no way to tell them
apart. `label` is what names each one, and it defaults to `Pagination` so an
unnamed instance is at least a named landmark rather than an anonymous one.

Where there are two, say which is which — `Invoices, top` and `Invoices,
bottom` — or give both the same name only when they genuinely are the same
control rendered twice.

## Boundaries

Three cases are worth seeing rather than reasoning about.

`total` of `0` still renders: the page count floors at one, so the control
shows a single page with both directions closed. Nothing appears or disappears
as a result set empties out, which is what stops the layout jumping under a
reader who has just filtered everything away.

A single page behaves the same way. The chrome stays put and every direction is
genuinely unavailable.

And a set large enough to need both ellipses at once is the case the window
arithmetic exists for — it is Reka UI's, not ours, precisely because the
boundaries of that calculation are where off-by-one bugs live.

<Demo title="Empty, single, and both ellipses">
  <div class="flex flex-col gap-3">
    <Pagination :page="1" :total="0" label="Empty" />
    <Pagination :page="1" :total="6" label="Single page" />
    <Pagination v-model:page="narrow" :total="1000" label="A hundred pages" />
  </div>
</Demo>

## Disabled

`disabled` closes the whole control — while the page behind it is loading, for
instance. Every button takes the DOM `disabled` state rather than a dimmed
paint, so nothing that looks unavailable can still be pressed.

<Demo title="Disabled">
  <Pagination v-model:page="feed" disabled :total="120" label="Invoices, loading" />
</Demo>

## Keyboard and screen readers

The whole control is a `<nav>` landmark with an accessible name, so it is
reachable from a screen reader's landmark list rather than only by tabbing to
it.

Every control is a real `<button>`: Tab moves between them, Enter and Space
press them. The current page is marked `aria-current="page"` as well as filled,
which is the non-colour half of that signal — a reader who cannot see the fill
still hears _current page_.

Previous and first are genuinely `disabled` on page 1, and next and last on the
last page. That is the honest state, and it costs something: a browser blurs a
button the instant it becomes disabled, so a reader pressing Enter on **Next**
until the end would otherwise arrive at the last page with focus dumped on the
document body and their place gone. So the control that fired the change hands
focus on — to the current page button where the variant has one, which
announces _Page 12, current page_, exactly what they were trying to find out,
and to its mirror control otherwise (next hands to previous, last to first).
That hand-off is for keyboard activation only; a pointer press has no focus
position to lose, and moving it would raise a ring nobody asked for.

The `compact` and `simple` variants carry the position in a `role="status"`
region — visible text in `compact`, screen-reader-only in `simple` — because
pressing next in either otherwise changes nothing announceable. The `full`
variant deliberately has none: its numbered row already carries the state, and
a live region on top of the focus hand-off would say everything twice.

## Motion

The page buttons take Button's own press language and nothing more: the fill
shifts on hover, the button presses down to 0.97 on `:active`, and the focus
ring blooms — all on the `fast` lane, which is where a direct response to input
belongs. Nothing is re-timed for being in a row.

The numbered row itself does **not** animate, and that is a decision rather than
an omission. It is stable furniture: a page that stays inside the window across
a change keeps its own DOM node, because the row is keyed by page number rather
than by position. Nothing remounts, so nothing replays an entrance animation,
and the numbers do not shuffle or re-stagger under a reader who has just pressed
next. Content moving after a click is the thing that makes pagination feel
unreliable, and a row that re-animates every time is that feeling made literal.

<Demo title="Every state" :source="paginationDemoSource">
  <PaginationDemo />
</Demo>

## API

<!-- @api Pagination -->
