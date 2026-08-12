# DateRangePicker

A span of days with a first and a last, entered either by typing both ends into
one segmented field or by picking them out of a two-month calendar. Reach for it
wherever the value is the window rather than the day: a report period, a
booking, a filter over a table.

It is [DatePicker](./date-picker.md) with two ends, and it inherits every
decision that control made — the segmented field instead of a native input, the
whole field as a single Tab stop, the calendar as a real grid. What is different
is everything that follows from a range being two values that constrain each
other. Choosing the end before the start is not an error and is not refused: the
two are sorted on the way out. And between the first click and the second there
is a range with a start and no end, which is a state the control is genuinely in
and which the value can say.

Two DatePickers side by side are two values and two validations, and nothing
between them knows that the second must not fall before the first — which is the
whole reason this control exists. For a single day reach for DatePicker; for a
day and a time together, [DateTimePicker](./date-time-picker.md); for a
free-form period nobody will compute with ("some time in Q3"), a
[TextField](./text-field.md), because nothing here will let a reader write
something the calendar cannot hold.

<script setup lang="ts">
import { ref } from "vue";
import { DateRangePicker } from "@ecoma-io/loom";
import DateRangePickerDemo from "../../src/primitives/DateRangePicker/DateRangePickerDemo.vue";
import dateRangePickerDemoSource from "../../src/primitives/DateRangePicker/DateRangePickerDemo.vue?raw";

const report = ref({ start: "2026-03-01", end: "2026-03-31" });
const empty = ref();
const half = ref({ start: "2026-03-16" });
const narrow = ref({ start: "2026-04-02", end: "2026-04-09" });
const sprint = ref({ start: "2026-03-09", end: "2026-03-20" });
const trip = ref({ start: "2026-04-02", end: "2026-04-09" });
const locked = ref({ start: "2026-01-01", end: "2026-01-31" });
const overrun = ref({ start: "2026-03-09", end: "2026-04-06" });
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DateRangePicker, type DateRange } from "@ecoma-io/loom";

const report = ref<DateRange>({ start: "2026-03-01", end: "2026-03-31" });
</script>

<template>
  <DateRangePicker v-model="report" aria-label="Report window" />
</template>
```

## The value is a pair of ISO strings

`modelValue` is `{ start?: string; end?: string }`, both halves plain
`"YYYY-MM-DD"`, and `min` and `max` speak the same format. It is an object
rather than a `[start, end]` tuple for one reason above all: **a half-made range
has to be representable.** Between the first click and the second there is a
start and no end, and that state sits on screen for as long as it takes a reader
to decide. A tuple has to put something in the second slot; a single string with
a separator has to invent a spelling for "not yet". Both end up lying about a
state the control is really in. `{ start }` simply says it.

It reads better at a call site, too. `range.start` needs no comment;
`range[0]` needs one.

<Demo title="Two ISO strings in, two ISO strings out">
  <div class="flex w-full max-w-md flex-col gap-3">
    <DateRangePicker v-model="report" aria-label="Report window" />
    <p class="text-xs text-muted-foreground">
      v-model: <span class="tabular">{{ report.start ?? "—" }} → {{ report.end ?? "—" }}</span>
    </p>
  </div>
</Demo>

Nothing bound shows both halves as placeholders, which is what tells a reader
the shape of what is wanted before they have typed anything. A half-made range
shows the start it has and leaves the other half waiting.

<Demo title="Nothing chosen, and half chosen">
  <div class="flex w-full max-w-md flex-col gap-3">
    <DateRangePicker v-model="empty" aria-label="Filter period" />
    <DateRangePicker v-model="half" aria-label="Booking, start only" />
  </div>
</Demo>

An end typed or clicked before its start is sorted rather than refused, and a
half that does not parse empties only that half. A component library refusing to
render is a worse answer than a field that is simply waiting.

## Two months, and one when you ask

A range is usually read across a month boundary, so the calendar shows two
months by default. Below the `sm` breakpoint they stack instead of sitting side
by side — and, importantly, **both months stay in the document at every width.**

Hiding the second one would be a keyboard trap of the quiet kind. The arrow keys
walk the grid by looking the next day up in the panel and calling `focus()` on
it, and `display: none` leaves an element perfectly findable and completely
unfocusable — so a reader pressing the right arrow on the last day of the first
month would get nothing at all, with no error and nothing on screen to explain
it. A tall panel is a worse layout; a silent dead end is a worse control.

Where the host knows it is rendering into something narrow, `:months="1"` asks
for a single month outright.

<Demo title="One month">
  <div class="w-full max-w-md">
    <DateRangePicker v-model="narrow" :months="1" aria-label="Trip, one month" />
  </div>
</Demo>

## Bounds

`min` and `max` fence both ends of the range at once. A day outside them is
announced with `aria-disabled`, greyed and struck through, unclickable and
skipped by the arrow keys, so a keyboard user cannot land on a day they are not
allowed to choose and then wonder why Enter did nothing.

Greyed rather than faded: the number is the cell's whole content, and half
opacity took it from 14.09:1 against the panel to 3.13:1, where the muted colour
measures 5.76:1. The strike is the hueless second cue, and it is what keeps an
unavailable day apart from an adjacent month's — muted too, and still
selectable.

They fence the typed field too, though more gently: a date typed outside the
window marks the field invalid rather than refusing the keystroke, because
refusing it mid-edit makes a date like `2026-04-01` impossible to reach from
`2026-03-01` one segment at a time.

<Demo title="Bounds">
  <div class="w-full max-w-md">
    <DateRangePicker v-model="sprint" min="2026-03-02" max="2026-03-27" aria-label="Sprint window" />
  </div>
</Demo>

## Locale

`locale` decides the order of the segments in both halves, the names of the
months and weekday headers, which day the week starts on, and the wording order
of the summary line inside the panel. It is a presentation choice and it never
reaches the value: the model stays two ISO strings whatever calendar the locale
reads by.

<Demo title="Locale">
  <div class="flex w-full max-w-md flex-col gap-3">
    <DateRangePicker v-model="trip" locale="en-GB" aria-label="Trip, British English" />
    <DateRangePicker v-model="trip" locale="vi-VN" aria-label="Trip, Vietnamese" />
    <DateRangePicker v-model="trip" locale="ja-JP" aria-label="Trip, Japanese" />
  </div>
</Demo>

## Disabled, read-only and invalid

A disabled DateRangePicker drains to a grey fill with muted segments, refuses
the calendar, and leaves nothing of itself in the tab order. Colour rather than
opacity, deliberately: fading the field fades the span inside it, and the span
is the whole content of the control — 14.09:1 becomes 2.99:1 at half alpha, and
the dash between the two halves 2.02:1. Drained, every segment measures 4.67:1
and the field still plainly reads as unavailable. An invalid one still works: it takes the destructive
border and focus ring and sets `aria-invalid`, which is the same error language
every other form control here speaks.

`readonly` is a third state and not a dial on either. A read-only span is a
value on show: the field stays a Tab stop, both halves stay readable and
copyable, it stays in the form's submitted data, and it keeps its text at full
strength. Both states take the same grey fill and the text colour is what
separates them, which is the right way round — a read-only value is there to be
read. The calendar button is dropped outright — Reka's `readonly` reaches the
calendar and makes every cell's click a no-op, so the button would open a panel
in which nothing can be chosen.

<Demo title="Disabled, read-only and invalid">
  <div class="flex w-full max-w-md flex-col gap-3">
    <DateRangePicker v-model="locked" disabled aria-label="Financial year, disabled" />
    <DateRangePicker v-model="trip" readonly aria-label="Booked trip, read-only" />
    <DateRangePicker v-model="overrun" max="2026-03-27" invalid aria-label="Overrunning window" />
  </div>
</Demo>

## Inside a Field

Wrapped in a [Field](./field), DateRangePicker wires itself: the row's id, the
id of its hint or error line, and `required`, `invalid`, `disabled`, `readonly`
and `name` all arrive from the row, so nothing is written at the call site.

```vue
<Field label="Report window" name="window" error="Pick a span inside the year" required>
  <DateRangePicker v-model="report" min="2026-01-01" max="2026-12-31" />
</Field>
```

Every one of those props still wins when you set it, in both directions — which
is why `invalid`, `required`, `disabled` and `readonly` are `boolean | undefined`
and default to `undefined` rather than `false`. `<DateRangePicker />` says
nothing and inherits the row; `<DateRangePicker :invalid="false" />` says this
one field is fine even though its row is not, and it is obeyed.

The row describes the span as a whole, so its description, `aria-required` and
`aria-invalid` land on the **outer** group rather than on either half — a
description repeated onto the start and the end is read out twice for one value.
`id` and `name` reach the hidden input the pair submits through, which is also
the element the row's `<label for>` names, a `role="group"` being unlabelable. A
description you set yourself is kept and the row's is added to it, never
replaced.

## Keyboard and screen readers

The field is **one Tab stop for both halves**, not two and not six. Left and
right arrows move between the six segments as one continuous run — the start's
year is followed by the end's month — and up and down change the segment under
the cursor. Typing digits fills a segment and advances; Backspace empties one.
Each half is a named group, `Start date` and `End date`, because Reka labels a
segment by its part alone, and six segments called "month", "day" and "year"
give a screen reader no way to say which end of the range it is in.

Tab from the field reaches the calendar button. Enter or Space opens the
calendar, and focus lands on the day it is already sitting on. The arrow keys
walk day by day and week by week, across the month boundary and into the second
grid; Enter chooses. The first choice leaves the panel open, because the reader
is not finished — the panel closes on the second, and returns focus to the
button that opened it. Escape closes without choosing and returns focus the
same way.

**The band drawn between the anchor and the pointer is the affordance that makes
a range calendar legible, and a hover state has no reader.** So the same
information is published twice more. It follows keyboard focus as well as the
pointer, so arrowing across the grid drags the band with it. And a
`role="status"` line above the grids says the range in words: what is chosen,
what is wanted next, and — once both ends are in — the span and how many days it
covers, both ends counted. It changes exactly when the selection changes, which
is what makes it announceable; a summary that moved on every arrow key would be
read over the cell the reader had just landed on.

The first day, the last day and the days between are three different states, and
none of them is carried by colour. Each cell's accessible name says its part:
"Saturday, March 14, 2026, first day of the range". A one-day range, where the
first day is also the last, says that as one thing rather than being announced
twice as two. Out of range, a day says nothing extra at all.

Each grid is a real `role="grid"` named by its own month and year, rather than
two grids sharing the heading between them — a reader entering the second one
should not have to guess which month they arrived in. That heading is a polite
live region, because paging moves nothing else a reader can see.

The field has no visible label of its own, so name it: `aria-label` or
`aria-labelledby` lands on the outer `role="group"`, which is where a screen
reader announces it once on entering the control.

## Motion

The panel rises in on the shared `fade-rise` lane — the entrance every overlay
in this library uses, scoped to the open state so a closed panel cannot be left
mounted and invisible over the page.

The day cells deliberately do **not** stagger, and with two months there are
eighty-four of them, which makes the point twice over. `listStaggerDelay` is the
vocabulary for a list of rows arriving in reading order; a grid rippling in cell
by cell reads as a rendering fault rather than as an entrance. Everything
smaller — a segment taking focus, the preview band following the pointer — is a
colour change at `instant` or `fast`, well inside the feedback ceiling.

<Demo title="Every state" :source="dateRangePickerDemoSource">
  <DateRangePickerDemo />
</Demo>

## Labels

Everything this control says out loud is replaceable, and much of it has to be:
**five of these twelve names are English that Reka UI writes of its own
accord**, with no prop of its own to set them — the segment names, the two
paging buttons, and the calendar's own `"Event Date"`. The other seven are
Loom's: the two half-group names, the status line above the grids, and the
accessible name of one calendar cell.

```ts
interface DateRangePickerLabels {
  // The segmented field's parts, in both halves
  month: string; // "Month"
  day: string; // "Day"
  year: string; // "Year"
  era: string; // "Era" — only locales such as ja-JP-u-ca-japanese render one
  empty: string; // "Not set" — what an unfilled segment reports, in place of Reka's "Empty"

  // The calendar popover
  calendar: string; // "Calendar"
  openCalendar: string; // "Open calendar"
  previousMonth: string; // "Previous month"
  nextMonth: string; // "Next month"

  // This control's own
  startDate: string; // "Start date" — the group holding the first half
  endDate: string; // "End date" — the group holding the second
  status: (args: {
    locale: string;
    start: DateValue | undefined;
    end: DateValue | undefined;
    days: number | undefined; // both ends counted: the 14th to the 20th is 7
  }) => string;
  cell: (args: {
    locale: string;
    date: DateValue;
    part: "start" | "end" | "both" | "within" | undefined;
  }) => string;
}
```

`status` and `cell` are **whole sentences rather than phrases Loom joins**, and
that is what makes them translatable. Which end has been chosen, whether a day
count follows the dates or precedes them, and on which side of a date its
qualifier belongs are all properties of a language — a control that emitted them
as separate keys would have decided all three in English. So the raw values
arrive and the finished string comes back: `days` is a number, so
`Intl.PluralRules` picks the form and `Intl.NumberFormat` writes the digits, and
Loom ships neither.

```ts
provideLoomLabels(() => ({
  dateSegments: { month: "Tháng", day: "Ngày", year: "Năm" },
  calendarPanel: { openCalendar: "Mở lịch" },
  dateRange: {
    startDate: "Ngày nhận phòng",
    endDate: "Ngày trả phòng",
    status: ({ start, end, days }) =>
      start && end && days !== undefined
        ? `${fmt(start)} đến ${fmt(end)}, ${days} ngày.`
        : "Chưa chọn ngày nào.",
  },
}));
```

The twelve arrive from four slices, and three of them are shared: `dateSegments`
and `calendarPanel` with every other date control, and `rangeCell` — which
carries `cell` — with DateTimeRangePicker, whose calendar cells say exactly the
same thing. `startDate`, `endDate` and `status` are this control's own
`dateRange` slice, because DateTimeRangePicker says both in different words and
from different facts.

For a whole application, set these once with `provideLoomLabels` rather than at
every call site; the `labels` prop is the per-instance correction. See
[Localisation](/foundations/localisation).

Annotate your own bag with `LabelOverrides<DateRangePickerLabels>` — never with
`DateRangePickerLabels` itself. The override type is partial, so a key added to Loom
in a later release is a key your vocabulary may ignore; the bag interface is
total, and a bag typed with one would stop compiling the day the vocabulary
grew.

## API

<!-- @api DateRangePicker -->
