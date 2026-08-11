# DatePicker

One calendar date, entered either by typing it into a segmented field or by
picking it out of a calendar popover. Reach for it wherever a date is a value
rather than a search: a due date, a start date, a date of birth.

The segmented field is the reason this is not an `<input type="date">`. Arrow
keys change the segment under the cursor, typing digits fills it and moves on,
and both the order of the segments and the names of the months follow the
`locale` you give it rather than the browser's own — which is what lets a
Vietnamese reader and an American reader see the same day written the way each
of them writes it. The calendar is a second path to the same value, never the
only one.

For a span rather than a single day, compose two of these; a range control
shares almost none of this one's model, and pretending otherwise produces a
picker that is wrong at both ends. For a value that only looks like a date —
a version string, a free-form "sometime in Q3" — reach for a TextField, because
nothing here will let a reader write something the calendar cannot hold.

<script setup lang="ts">
import { ref } from "vue";
import { DatePicker } from "@ecoma-io/loom";
import DatePickerDemo from "../../src/primitives/DatePicker/DatePickerDemo.vue";
import datePickerDemoSource from "../../src/primitives/DatePicker/DatePickerDemo.vue?raw";

const due = ref("2026-03-14");
const empty = ref<string>();
const sprint = ref("2026-03-16");
const shipped = ref("2026-03-18");
const locked = ref("2026-01-01");
const overdue = ref("2026-04-02");
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DatePicker } from "@ecoma-io/loom";

const due = ref("2026-03-14");
</script>

<template>
  <DatePicker v-model="due" aria-label="Due date" />
</template>
```

## The value is an ISO string

`modelValue`, `min` and `max` are all plain `"YYYY-MM-DD"` strings, and the
emitted value is one too. That is a deliberate boundary. Inside a date control
a date wants to be a calendar object — one that knows how long February is this
year, and what "next month" means on the 31st — and this component uses one.
Outside it, a host has a string from its API and wants a string back for it, and
nobody should have to learn a date library to bind a date.

Clearing the field emits `undefined`, which is the same thing as never having
set it: no day is selected and the segments fall back to their placeholders.
A value that cannot be parsed — a half-typed string, a `DD/MM/YYYY` one, a full
timestamp — is read as _no date chosen_ rather than thrown on, because a
component library refusing to render is a worse answer than a field that is
simply empty.

<Demo title="An ISO string in, an ISO string out">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <DatePicker v-model="due" aria-label="Due date" />
    <p class="text-xs text-muted-foreground">
      v-model: <span class="tabular">{{ due || "—" }}</span>
    </p>
  </div>
</Demo>

A field with nothing bound to it shows its segment placeholders, which is what
tells a reader the shape of what is wanted before they have typed anything.

<Demo title="Nothing chosen yet">
  <div class="w-full max-w-xs">
    <DatePicker v-model="empty" aria-label="Start date" />
  </div>
</Demo>

## Bounds

`min` and `max` fence the calendar. A day outside them is announced with
`aria-disabled`, dimmed, unclickable, and — the part that is easy to leave out —
skipped by the arrow keys, so a keyboard user cannot land on a day they are not
allowed to choose and then wonder why Enter did nothing.

They fence the typed field too, though more gently: a date typed outside the
window marks the field invalid rather than refusing the keystroke, because
refusing it mid-edit makes a date like `2026-04-01` impossible to reach from
`2026-03-01` one segment at a time.

<Demo title="Bounds">
  <div class="w-full max-w-xs">
    <DatePicker v-model="sprint" min="2026-03-02" max="2026-03-27" aria-label="Sprint day" />
  </div>
</Demo>

## Locale

`locale` decides the order of the segments, the names of the months and the
weekday headers, and which day the week starts on. It is a presentation choice
and it never reaches the value: the model stays an ISO string whatever calendar
the locale reads by. A Thai locale renders the year 2569 in the field and still
hands back `2026-…`.

<Demo title="Locale">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <DatePicker v-model="shipped" locale="en-GB" aria-label="Shipped on, British English" />
    <DatePicker v-model="shipped" locale="vi-VN" aria-label="Shipped on, Vietnamese" />
    <DatePicker v-model="shipped" locale="ja-JP" aria-label="Shipped on, Japanese" />
  </div>
</Demo>

## Disabled and invalid

A disabled DatePicker dims, refuses the calendar, and leaves nothing of itself
in the tab order. An invalid one still works: it takes the destructive border
and focus ring and sets `aria-invalid`, which is the same error language every
other form control here speaks, so a field reporting an error looks the same
whichever control it holds.

<Demo title="Disabled and invalid">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <DatePicker v-model="locked" disabled aria-label="Created on" />
    <DatePicker v-model="overdue" max="2026-03-27" invalid aria-label="Overdue date" />
  </div>
</Demo>

## Keyboard and screen readers

The field is **one Tab stop**, not three. Left and right arrows move between the
month, day and year segments; up and down change the segment under the cursor;
typing digits fills it and advances to the next one when it cannot hold another
digit. Backspace empties a segment, and emptying the last one clears the date.
Each segment is a `role="spinbutton"` with its own name and its own current
value, so a screen reader announces "month, 3" rather than reading a date back
as one opaque string.

Tab from the field reaches the calendar button. Enter or Space opens the
calendar, and **focus lands on the day the calendar is already sitting on** —
the selected date, or today when there is none — rather than on the
previous-month button. Inside the grid, the arrow keys walk day by day and week
by week and page into the neighbouring month at its edges; Enter chooses, and
choosing closes the calendar and returns focus to the button that opened it.
Escape closes it without choosing, and returns focus the same way.

The calendar is a real `role="grid"` named by its month-and-year heading, and
that heading is a polite live region — paging the calendar moves nothing else a
reader can see, so without it the month would silently become a different
month. Every day carries its full date as its accessible name ("Saturday, March
14, 2026"), which is what makes the single-letter weekday headers safe to keep
as single letters.

Three states, three cues, none of them colour: the selected day is
`aria-selected`, today is `aria-current="date"` and carries a dot under its
number, and an out-of-bounds day is `aria-disabled` and unreachable by keyboard.

The field has no visible label of its own, so name it: `aria-label` or
`aria-labelledby` lands on the `role="group"` holding the segments, which is
where a screen reader announces it once on entering the field rather than three
times over.

## Motion

The panel rises in on the shared `fade-rise` lane — the entrance every overlay
in this library uses, scoped to the open state so a closed panel cannot be left
mounted and invisible over the page.

The 42 day cells deliberately do **not** stagger. `listStaggerDelay` is the
vocabulary for a list of rows arriving in reading order; a grid rippling in cell
by cell reads as a rendering fault rather than as an entrance, so the panel is
the only thing that animates and the cells arrive with it. Everything smaller —
a segment taking focus, a day highlighting under the pointer — is a colour
change at `instant` or `fast`, well inside the feedback ceiling.

<Demo title="Every state" :source="datePickerDemoSource">
  <DatePickerDemo />
</Demo>

## API

<!-- @api DatePicker -->
