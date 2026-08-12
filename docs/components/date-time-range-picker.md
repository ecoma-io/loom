# DateTimeRangePicker

A span between two instants — a day and a time at each end — entered by typing
across one segmented field or by picking the two days out of a two-month
calendar. Reach for it wherever the value is a window with a clock on it: a
meeting, a shift, a maintenance slot, a query over a log.

It is the intersection of two controls this library already has, and it
re-decides nothing either of them settled. From
[DateRangePicker](./date-range-picker) it takes the `{ start, end }` value with
both halves optional, so a half-made range is representable; the two named
halves of the field; the two months that stack rather than dropping one on a
narrow screen; and the status line that gives a keyboard reader what the hover
preview only ever gave a pointer. From [DateTimePicker](./date-time-picker) it
takes the local ISO date-time value with no timezone anywhere near it, and the
bounds that fence an instant while the calendar chooses a day.

What it adds is the consequence of putting those together: **the round trip
doubles and then grows a cross term.** DateTimePicker has one time to protect
when a day is picked. This has the start's time, the end's time, and the case
where both ends fall on the same day at different times — a meeting from 09:00
to 10:00, which is the most ordinary thing anyone will bind here and which a
range calendar that refuses a repeated day, or collapses one to a single
instant, gets wrong.

For a span of whole days reach for [DateRangePicker](./date-range-picker) — a
booking of the 14th to the 20th has no half past nine in it. For one instant,
[DateTimePicker](./date-time-picker); for a time of day with no date at all,
[TimePicker](./time-picker). Two DateTimePickers side by side are two values and
two validations, and nothing between them knows that the second must not fall
before the first.

<script setup lang="ts">
import { ref } from "vue";
import { DateTimeRangePicker } from "@ecoma-io/loom";
import DateTimeRangePickerDemo from "../../src/primitives/DateTimeRangePicker/DateTimeRangePickerDemo.vue";
import dateTimeRangePickerDemoSource from "../../src/primitives/DateTimeRangePicker/DateTimeRangePickerDemo.vue?raw";

const meeting = ref({ start: "2026-03-16T09:00", end: "2026-03-16T10:00" });
const empty = ref();
const half = ref({ start: "2026-03-16T22:00" });
const maintenance = ref({ start: "2026-03-14T01:00", end: "2026-03-16T05:30" });
const booking = ref({ start: "2026-03-16T09:00", end: "2026-03-16T16:00" });
const late = ref({ start: "2026-03-16T09:00", end: "2026-03-16T18:30" });
const reversed = ref({ start: "2026-03-16T10:00", end: "2026-03-16T09:00" });
const lapse = ref({ start: "2026-03-16T09:00:15", end: "2026-03-16T09:45:30" });
const shown = ref({ start: "2026-04-02T18:40", end: "2026-04-09T07:15" });
const narrow = ref({ start: "2026-04-02T18:40", end: "2026-04-09T07:15" });
const audit = ref({ start: "2026-01-01T00:00", end: "2026-01-31T23:59" });
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DateTimeRangePicker, type DateTimeRange } from "@ecoma-io/loom";

const meeting = ref<DateTimeRange>({ start: "2026-03-16T09:00", end: "2026-03-16T10:00" });
</script>

<template>
  <DateTimeRangePicker v-model="meeting" :hour-cycle="24" aria-label="Meeting" />
</template>
```

## The value is a pair of local ISO strings

`modelValue` is `{ start?: string; end?: string }`, both halves plain
`"YYYY-MM-DDTHH:mm"` — `"YYYY-MM-DDTHH:mm:ss"` when `granularity` asks for
seconds — and `min` and `max` speak the same format. A bare `"YYYY-MM-DD"` is
accepted in either half and read as midnight that day.

The type is exported as **`DateTimeRange`**, not `DateRange`.
[DateRangePicker](./date-range-picker) owns that name for a pair of calendar
days, and the two shapes are identical while their strings are not: a
`DateRange` handed to this control has lost its times before it arrives, and a
`DateTimeRange` handed to DateRangePicker carries a `T09:30` no calendar day can
hold. Two names is what stops either mistake compiling.

It is an object rather than a `[start, end]` tuple for DateRangePicker's reason,
which does not change here: **a half-made range has to be representable.**
Between the first click and the second there is a start and no end, and that
state sits on screen for as long as it takes a reader to decide.

**Both instants are _local_, and turning them into absolute ones is your job.**
There is no timezone here, no offset and no `Date` anywhere on this surface.
`"2026-03-16T09:00"` is nine in the morning on the sixteenth wherever it is
read; which nine in the morning that turns out to be is a question only you can
answer, because only you know whose clock is meant. A value carrying an offset
or a trailing `Z` is refused rather than quietly stripped, for the same reason —
and a half that does not parse empties only that half, because a component
library refusing to render is a worse answer than a field that is waiting.

<Demo title="Two local ISO strings in, two local ISO strings out">
  <div class="flex w-full max-w-xl flex-col gap-3">
    <DateTimeRangePicker v-model="meeting" :hour-cycle="24" aria-label="Meeting" />
    <p class="text-xs text-muted-foreground">
      v-model: <span class="tabular">{{ meeting.start ?? "—" }} → {{ meeting.end ?? "—" }}</span>
    </p>
  </div>
</Demo>

Nothing bound shows every segment of both halves as a placeholder, which is what
tells a reader the shape of what is wanted before they have typed anything. A
half-made span shows the start it has and leaves the other end waiting.

<Demo title="Nothing chosen, and half chosen">
  <div class="flex w-full max-w-xl flex-col gap-3">
    <DateTimeRangePicker v-model="empty" aria-label="Log query period" />
    <DateTimeRangePicker v-model="half" :hour-cycle="24" aria-label="Shift, started" />
  </div>
</Demo>

## A same-day span is the normal case

The calendar chooses days and the segments choose times, and the two never
overwrite each other. Pick a new day for the start and its time comes with it;
type a time and the day stays where you put it. That is DateTimePicker's round
trip, and here there are two of them running at once — **each end keeps its
own** time, so moving a 09:00–17:00 window to another pair of days gives you
09:00 and 17:00 again, not 09:00 twice.

The case that follows from it is the one worth naming out loud: clicking the
same day twice is a real range, not a mistake to be refused. A meeting from
09:00 to 10:00 on one day is what most people reach for this control to
express, and it survives being moved — click 19 March twice under that value and
you get the nineteenth from 09:00 to 10:00.

With nothing chosen there is no time to keep, so choosing days invents one, and
**the invented time is midnight at both ends**. A window of "Monday to Friday"
opens at `00:00` on the Monday, which is the beginning of it and not the end.
The segments show it, so nobody has to guess.

One practical consequence, inherited unchanged from DateTimePicker: fill a
half's day before its time when you are using the calendar. A time typed into an
otherwise-empty half is not part of a value yet — a half only exists once every
one of its segments is filled — so a day picked after it starts from midnight.
Typing left to right, which is the order the segments already read in, never
runs into this.

<Demo title="A meeting, and a window across days">
  <div class="flex w-full max-w-xl flex-col gap-3">
    <DateTimeRangePicker v-model="meeting" :hour-cycle="24" aria-label="Meeting, one day" />
    <DateTimeRangePicker v-model="maintenance" :hour-cycle="12" aria-label="Maintenance window" />
  </div>
</Demo>

## Order: days are sorted, times are never swapped

Choosing the end's day before the start's is not an error and is not refused —
the two are sorted, so clicking the 20th and then the 14th gives the 14th to the
20th. That is DateRangePicker's decision and it is unchanged.

What is new is that **an end can now fall before its start on the same day**,
where only the times decide it. That happens two ways: someone types it, or
someone collapses a span onto a single day and the times it kept turn out to run
the wrong way round. Either way the answer is the same one: the span is
**announced invalid, never silently reordered.** It takes the destructive border
and `aria-invalid`, and the status line inside the panel says so in words. A
control that reorders what someone is in the middle of typing is a control
fighting its reader, and sorting days but quietly not times would be worse than
either rule on its own.

<Demo title="Backwards by an hour, inside one day">
  <div class="flex w-full max-w-xl flex-col gap-3">
    <DateTimeRangePicker v-model="reversed" :hour-cycle="24" aria-label="Reversed meeting" />
    <p class="text-xs text-muted-foreground">
      Same day, ten to nine. Nothing about the two dates says it is wrong.
    </p>
  </div>
</Demo>

## Bounds are instants, and the calendar rounds them out to days

`min` and `max` fence an instant rather than a day, so the day at each end is
only partly available: under a window of `09:00` to `17:00` on 16 March, the
sixteenth is a choosable day and `18:30` on it is not a choosable time.

**The calendar bounds by whole days.** A day holding any choosable instant can
be chosen, so the boundary day is never disabled and never unreachable. The
alternative — comparing each cell against the instant — sounds stricter and
behaves worse: a cell carries whatever time the field is holding, so a "not
before now" window would grey out today at nine in the morning because today's
cell reads midnight.

**The field bounds by the instant, at both ends.** What the calendar rounds out
is caught where the times are actually entered: either instant outside `min` or
`max` takes the destructive border and `aria-invalid` on its own, without the
host saying so, and carries a `data-out-of-range` marker distinct from the
`data-invalid` the `invalid` prop sets. Days lying wholly outside the window are
announced with `aria-disabled`, greyed and struck through, unclickable and — the
part that is easy to leave out — skipped by the arrow keys. Greyed rather than
faded: the number is the cell's whole content, and half opacity took it from
14.09:1 against the panel to 3.13:1, where the muted colour measures 5.76:1. The
strike is the hueless second cue that keeps an unavailable day apart from an
adjacent month's.

<Demo title="Bounds">
  <div class="flex w-full max-w-xl flex-col gap-3">
    <DateTimeRangePicker
      v-model="booking"
      min="2026-03-16T09:00"
      max="2026-03-16T17:00"
      :hour-cycle="24"
      aria-label="Booking, inside the window"
    />
    <DateTimeRangePicker
      v-model="late"
      min="2026-03-16T09:00"
      max="2026-03-16T17:00"
      :hour-cycle="24"
      aria-label="Booking, ending an hour late"
    />
    <p class="text-xs text-muted-foreground">
      Both are on 16 March. The second ends an hour past the window and says so.
    </p>
  </div>
</Demo>

## Granularity, hour cycle and locale

`granularity` decides how far down both halves go. `"minute"` is the default and
nearly always right; `"second"` adds a seconds segment to each end and changes
the reported strings to `"YYYY-MM-DDTHH:mm:ss"`. What comes back is what the
segments show — a value carrying seconds bound to a minute-granularity field
reports without them, never a hidden second the reader could not see.

`hourCycle` is `12` or `24`, and unset it follows the locale. It is display only:
the value stays 24-hour either way, because conflating the two is how a
twelve-hour locale ends up storing `"…T01:30"` for half past one in the
afternoon.

`locale` decides the order of the segments in both halves, the separators, the
month and weekday names, which day the week starts on, the twelve-or-twenty-four
hour default, and the wording of the summary line inside the panel. It never
reaches the value: the model stays a pair of Gregorian ISO strings whatever
calendar the locale reads by, so a Thai locale renders the year 2569 in the
field and still hands back `2026-…`.

<Demo title="Granularity, hour cycle and locale">
  <div class="flex w-full max-w-xl flex-col gap-3">
    <DateTimeRangePicker v-model="lapse" granularity="second" :hour-cycle="24" aria-label="To the second" />
    <DateTimeRangePicker v-model="shown" locale="en-GB" aria-label="Trip, British English" />
    <DateTimeRangePicker v-model="shown" locale="vi-VN" aria-label="Trip, Vietnamese" />
    <DateTimeRangePicker v-model="shown" locale="ja-JP" aria-label="Trip, Japanese" />
  </div>
</Demo>

## Two months, and one when you ask

A span is usually read across a month boundary, so the calendar shows two months
by default. Below the `sm` breakpoint they stack instead of sitting side by side
— and, importantly, **both months stay in the document at every width.** Hiding
the second would be a keyboard trap of the quiet kind: the arrow keys walk the
grid by looking the next day up in the panel and calling `focus()` on it, and
`display: none` leaves an element perfectly findable and completely unfocusable.
A tall panel is a worse layout; a silent dead end is a worse control.

Where the host knows it is rendering into something narrow, `:months="1"` asks
for a single month outright.

<Demo title="One month">
  <div class="w-full max-w-xl">
    <DateTimeRangePicker v-model="narrow" :months="1" aria-label="Trip, one month" />
  </div>
</Demo>

## Disabled and invalid

A disabled DateTimeRangePicker drains to a grey fill with muted segments,
refuses the calendar, and leaves nothing of itself in the tab order. Colour
rather than opacity, deliberately: fading the field fades the span inside it,
and the span is the whole content of the control — 14.09:1 becomes 2.99:1 at
half alpha, and the dash between the two halves 2.02:1. Drained, all ten
segments measure 4.67:1 and the field still plainly reads as unavailable. An invalid one still works: it takes the destructive
border and focus ring and sets `aria-invalid`, the same error language every
other form control here speaks. An instant outside the bounds, or a span running
backwards, paints the same way without the prop.

`readonly` is a third state and not a dial on either. A read-only span is a
value on show: the field stays a Tab stop, its segments stay readable and
copyable, it keeps its text at full strength — both states take the same grey
fill and the text colour is what separates them, which is the right way round,
a read-only value being there to be read — and the calendar button is dropped
outright — Reka's read-only reaches the calendar and makes every cell's click a
no-op, so the button would open a panel in which nothing can be chosen.

<Demo title="Disabled, read-only and invalid">
  <div class="flex w-full max-w-xl flex-col gap-3">
    <DateTimeRangePicker v-model="audit" disabled aria-label="Audit period, disabled" />
    <DateTimeRangePicker v-model="audit" readonly aria-label="Audit period, read-only" />
    <DateTimeRangePicker v-model="late" invalid :hour-cycle="24" aria-label="Overrunning booking" />
  </div>
</Demo>

## Inside a Field

Inside a [Field](./field) the control wires itself: the row's id, the id of its
hint or error line, and `required` / `invalid` / `disabled` / `readonly` /
`name` all arrive through the row, so no attributes are needed at the call site.
Every prop still wins over the row when it is set, in both directions. The row
describes the span as a whole and lands on the outer group rather than on either
half — a description repeated onto the start and the end is read out twice for
one value.

## Keyboard and screen readers

The field is **one Tab stop for all of it**. That is ten segments at the default
settings, and fourteen with AM/PM and seconds at both ends — which is worth
saying plainly, because it is a lot of arrow presses to cross a control from end
to end. It is still the right answer: the alternative is fourteen Tab stops for
one value, and a keyboard user tabbing through a form would spend most of it
inside this field. Left and right arrows move between segments as one continuous
run, the start's minute followed by the end's month; up and down change the
segment under the cursor; typing digits fills a segment and advances. Backspace
empties one, and emptying a segment clears that half. Where the count really
bites, `granularity="minute"` and a 24-hour cycle are the ten-segment shape, and
the calendar reaches both days in far fewer presses than the field does.

Each half is a named group — `Start date and time` and `End date and time` —
because Reka labels a segment by its part alone, and ten segments called
"month", "day", "year", "hour" and "minute" give a screen reader no way to say
which end of the span it is in. Each segment is a `role="spinbutton"` carrying
its own name and value, and each hour announces itself the way the reader sees
it rather than the way the value stores it: on a twelve-hour field, half past one
in the afternoon is "1 PM" and not "13 PM".

Tab from the field reaches the calendar button. Enter or Space opens it, and
focus lands on the day the calendar is already sitting on rather than on the
previous-month button. The arrow keys walk day by day and week by week, across
the month boundary and into the second grid; Enter chooses. The first choice
leaves the panel open, because the reader is not finished — the panel closes on
the second and returns focus to the button that opened it. Escape closes without
choosing and returns focus the same way.

**The band drawn between the anchor and the pointer is what makes a range
calendar legible, and a hover state has no reader.** So the same information is
published twice more. It follows keyboard focus as well as the pointer, so
arrowing across the grid drags the band with it. And a `role="status"` line above
the grids says the span in words: what is chosen, what is wanted next, and —
once both ends are in — the two instants and **how long the span is**. That
length is measured as a distance between instants rather than as a count of
days: 09:00 to 10:00 is "1 hour", where DateRangePicker's day count would read
the same span as "1 day". A span running backwards says so there too, so the
destructive border is never the only cue.

The first day, the last day and the days between are three different states, and
none of them is carried by colour. Each cell's accessible name says its part:
"Monday, March 16, 2026, first day of the range". A same-day span, where the
first day is also the last, says that as one thing rather than being announced
twice as two. The times are deliberately not in the cell's name — a cell is a
day, and choosing it changes only the day.

Each grid is a real `role="grid"` named by its own month and year rather than
two grids sharing one heading, and that heading is a polite live region because
paging moves nothing else a reader can see. Today carries `aria-current="date"`
and a dot under its number — a shape rather than a hue, so it survives a colour
deficiency and forced-colors both.

The field has no visible label of its own, so name it: `aria-label` or
`aria-labelledby` lands on the outer `role="group"`, which is where a screen
reader announces it once on entering the control.

## Motion

The panel rises in on the shared `fade-rise` lane — the entrance every overlay in
this library uses, scoped to the open state so a closed panel cannot be left
mounted and invisible over the page.

The day cells deliberately do **not** stagger, and with two months there are
eighty-four of them. `listStaggerDelay` is the vocabulary for a list of rows
arriving in reading order; a grid rippling in cell by cell reads as a rendering
fault rather than as an entrance, so the panel is the only thing that animates
and the cells arrive with it. Everything smaller — a segment taking focus, the
preview band following the pointer — is a colour change at `instant` or `fast`,
well inside the `normal` feedback ceiling, which is the slowest a direct answer
to a keystroke may be.

<Demo title="Every state" :source="dateTimeRangePickerDemoSource">
  <DateTimeRangePickerDemo />
</Demo>

## Labels

Everything this control says out loud is replaceable, and much of it has to be:
**nine of these sixteen names are English that Reka UI writes of its own
accord**, with no prop of its own to set them — every segment name in both
halves, the two paging buttons, and the calendar's own `"Event Date"`. The other
seven are Loom's: the two half-group names, the status line above the grids, and
the accessible name of one calendar cell.

```ts
interface DateTimeRangePickerLabels {
  // The date half of each end's segments
  month: string; // "Month"
  day: string; // "Day"
  year: string; // "Year"
  era: string; // "Era" — only locales such as ja-JP-u-ca-japanese render one
  empty: string; // "Not set" — an unfilled date segment, in place of Reka's "Empty"

  // The clock half of each end's segments
  hour: string; // "Hour"
  minute: string; // "Minute"
  second: string; // "Second" — only at second granularity
  dayPeriod: string; // "AM or PM" — only in a 12-hour field
  empty: string; // "Not set" — an unfilled clock segment; a separate key from the one above,
  //                because the two halves are separate slots (see below)

  // The calendar popover
  calendar: string; // "Calendar"
  openCalendar: string; // "Open calendar"
  previousMonth: string; // "Previous month"
  nextMonth: string; // "Next month"

  // This control's own
  startDate: string; // "Start date and time"
  endDate: string; // "End date and time"
  status: (args: {
    locale: string;
    start: DateValue | undefined;
    end: DateValue | undefined;
    minutes: number | undefined; // signed: negative means the end falls first
    hour12: boolean | undefined;
    seconds: boolean;
  }) => string;
  cell: (args: {
    locale: string;
    date: DateValue;
    part: "start" | "end" | "both" | "within" | undefined;
  }) => string;
}
```

`status` is **one sentence rather than four phrases and a joiner**, and the
duration inside it arrives as `minutes` — a plain signed number — rather than as
words. That is the whole answer to "2 days 3 hours": Loom carries no plural
engine and appends no `"s"`, so the form is picked by your
`Intl.DurationFormat`, `Intl.PluralRules` or translation file. The sign is what
tells you the end falls before the start, a state that within a single day only
the times can decide and that nothing in the grid distinguishes.

```ts
provideLoomLabels(() => ({
  timeSegments: { hour: "Giờ", minute: "Phút" },
  dateTimeRange: {
    status: ({ start, end, minutes }) => {
      if (!start || !end || minutes === undefined) return "Chưa chọn.";
      if (minutes < 0) return "Kết thúc trước khi bắt đầu.";
      return `${fmt(start)} đến ${fmt(end)}, ${minutes} phút.`;
    },
  },
}));
```

The sixteen arrive from five slices, and four of them are shared: `dateSegments`,
`timeSegments` and `calendarPanel` with the rest of the family, and `rangeCell` —
which carries `cell` — with DateRangePicker, whose calendar cells say exactly the
same thing. `startDate`, `endDate` and `status` are this control's own
`dateTimeRange` slice, because DateRangePicker says both in different words and
from different facts.

For a whole application, set these once with `provideLoomLabels` rather than at
every call site; the `labels` prop is the per-instance correction. See
[Localisation](/foundations/localisation).

Annotate your own bag with `LabelOverrides<DateTimeRangePickerLabels>` — never with
`DateTimeRangePickerLabels` itself. The override type is partial, so a key added to Loom
in a later release is a key your vocabulary may ignore; the bag interface is
total, and a bag typed with one would stop compiling the day the vocabulary
grew.

## API

<!-- @api DateTimeRangePicker -->
