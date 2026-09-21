# VirtualList

Windowed rendering for long lists: only the rows that fit the viewport —
plus an `overscan` buffer above and below — are in the DOM, so a list of a
hundred thousand rows costs a hundred thousand laid-out styles instead of a
hundred thousand vnodes, while the scrollbar still spans the whole set.

<script setup lang="ts">
import { VirtualList } from "@ecoma-io/loom";
import VirtualListDemo from "../demos/VirtualListDemo.vue";
import virtualListDemoSource from "../demos/VirtualListDemo.vue?raw";
</script>

## Usage

Rows are plain data — the component owns none of their shape — and every row
is rendered through the default scoped slot. Give the list a fixed height
(any sizing you like through `class`/`style`), a fixed `itemHeight` every row
must fit exactly, and your rows.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { VirtualList } from "@ecoma-io/loom";

const rows = Array.from({ length: 100_000 }, (_, i) => `Line ${i}`);
const active = ref(-1);
</script>

<template>
  <VirtualList
    v-model:active-index="active"
    :items="rows"
    :item-height="32"
    label="Log lines"
    class="h-96"
    @activate="(i) => console.log(i)"
  >
    <template #default="{ item, index, active }">
      <div :class="['flex h-full items-center px-3 text-sm truncate', active && 'bg-accent-1/60']">
        {{ index }}: {{ item }}
      </div>
    </template>
  </VirtualList>
</template>
```

## Row contract

`itemHeight` is the windowing contract. Rows are sized and clipped by the
component, so content must be truncating — one line of text, a fixed-height
tile — and rows must not exceed their height or the window math drifts.
Every row is one logical element with one tab stop; anything interactive
inside a row (a button, an input) is a Tab stop of its own, reached from the
row.

## Degenerate inputs

The windowing contract degrades instead of breaking:

- `itemHeight` must be a finite positive number. A zero, negative or
  non-finite `itemHeight` renders an empty list — no rows, an empty spacer —
  and the list answers no keys.
- A zero, negative, fractional or non-finite `overscan` is floored and
  clamped to `0`.
- An `overscan` at or above the item count is safe: the window covers the
  whole list and clamps at its ends.
- A viewport smaller than one row still renders exactly one row.

## Keyboard

The list is a single Tab stop. Rows rove focus:

| Key                   | Action                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Arrow Down / Arrow Up | Move to the next / previous row (scrolled into view)                                                                                       |
| Home / End            | First / last row                                                                                                                           |
| Page Down / Page Up   | One page of fully visible rows — `floor(viewportHeight / itemHeight)`; the rendered window paints the `ceil` (one partial row at the edge) |
| Enter / Space         | Activate the active row (`activate`)                                                                                                       |

Nested controls keep their own keys: a keydown whose target is a row button
is left to the button.

## Accessibility

`role="list"` with `role="listitem"` rows; the scroll container carries
`tabindex="-1"` because Firefox seats a scrollable container in the tab order
ahead of its rows on its own — the `-1` pins the single-Tab-stop contract in
every engine instead of leaving it to each engine's scroll-container
focusability rule.
Every rendered row reports `aria-setsize` and `aria-posinset` so the
virtualized DOM still announces its place in the full set, and `activeIndex`
is the visual and roving anchor the host binds to.

## Windowing helpers

`virtualWindow(scrollTop, viewportHeight, itemHeight, count, overscan)` returns
the `{ start, end }` slice a viewport renders — the same math the component
uses, exposed for anyone building a window around their own markup. The
`VirtualWindow` type names that slice. The window clamps to the list ends
(scroll positions a browser clamps but jsdom does not) and degrades to an
empty slice when there is nothing or no room to render.

<!-- @api VirtualList -->
