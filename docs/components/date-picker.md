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
import DatePickerDemo from "../demos/DatePickerDemo.vue";
import datePickerDemoSource from "../demos/DatePickerDemo.vue?raw";

const due = ref("2026-03-14");
const empty = ref<string>();
const sprint = ref("2026-03-16");
const shipped = ref("2026-03-18");
const locked = ref("2026-01-01");
const overdue = ref("2026-04-02");
const signed = ref("2026-02-02");
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
`aria-disabled`, greyed and struck through, unclickable, and — the part that is
easy to leave out — skipped by the arrow keys, so a keyboard user cannot land on
a day they are not allowed to choose and then wonder why Enter did nothing.

It is greyed rather than faded, and that is a legibility decision rather than a
stylistic one: the number is the cell's whole content, and half opacity took
`--color-foreground` from 14.09:1 against the panel to 3.13:1. The muted colour
measures 5.76:1. The strike is the second cue, and a hueless one — it is what
keeps an unavailable day apart from an adjacent month's, which is muted too and
still perfectly selectable.

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

A disabled DatePicker drains to a grey fill with muted segments and a slackened
border, refuses the calendar, and leaves nothing of itself in the tab order. The
state is carried by colour and weight rather than by opacity, deliberately:
fading the field fades the date inside it, and the date is the whole content of
the control — 14.09:1 becomes 2.99:1 at half alpha, and the separators between
the segments 2.02:1. Drained, every segment measures 4.68:1 and the field still
plainly reads as unavailable. An invalid one still works: it takes the destructive border
and focus ring and sets `aria-invalid`, which is the same error language every
other form control here speaks, so a field reporting an error looks the same
whichever control it holds.

<Demo title="Disabled and invalid">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <DatePicker v-model="locked" disabled aria-label="Created on" />
    <DatePicker v-model="overdue" max="2026-03-27" invalid aria-label="Overdue date" />
  </div>
</Demo>

The same treatment answers a [Fieldset](./fieldset) that disables its group, and
here it takes a little help. `<fieldset disabled>` reaches `<input>`,
`<button>`, `<select>` and `<textarea>` and stops there, and this control is
built around `<div role="spinbutton">` segments — so the platform left it
looking available, keeping its tab stop and still typing a date on an arrow key.
It now reads the enclosing fieldset's own `disabled` attribute and resolves it
into the same state its own prop feeds: the same appearance, the same lost tab
stop, the same refused gesture. That is a _read_ of the attribute rather than a
second copy of it, which is why Fieldset still publishes nothing through the
[Field](./field) context — see [Fieldset](./fieldset#disabling-the-group).

## Read-only

A date on show that cannot be edited is a genuine state, and it is not the same
one as disabled. A read-only DatePicker stays a Tab stop, keeps its segments
readable and arrow-navigable, stays in the form's submitted data, and keeps its
date at full strength — Reka marks it `data-readonly` for assistive tech, so the
state never rests on the fill alone. A disabled one is unavailable: no Tab stop,
muted text, nothing submitted. Reaching for `disabled` to show a date nobody may
change tells a screen reader the field is unavailable when it is simply not
editable.

The two are told apart on three channels, not on one. Read-only lifts the fill
one step off an editable field's and stops there — full-strength segments,
`--color-input` still on the rim, because the field is still reachable and still
posted. Disabled drains the fill a step further, mutes the segments with it, and
slackens the rim to `--color-border`. Read-only and disabled used to share a
fill and part on the text colour alone; that is a distinction in hue, and hue is
the channel a reader with a colour deficiency does not have.

All three fills belong to the **segment group**, never to the segments. Every
separator between two segments — the slashes here, the colon in a
[TimePicker](./time-picker), the dash between the halves of a
[DateRangePicker](./date-range-picker) — is a segment of its own, so a fill
painted per segment would leave the separators on the resting colour and write
the date as lozenges on a stripe.

The calendar button is **dropped** while read-only rather than disabled beside a
field that is plainly still alive. A read-only calendar is one where every day
answers a click with nothing, and a button opening a panel that can choose
nothing is a dead end wearing the costume of a working control.

<Demo title="Available, read-only and disabled">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <DatePicker v-model="due" name="dueOn" aria-label="Due on (available)" />
    <DatePicker v-model="signed" name="signedOn" readonly aria-label="Signed on (read-only)" />
    <DatePicker v-model="locked" disabled aria-label="Created on (disabled)" />
  </div>
</Demo>

## Required and name

`required` sets `aria-required` on the segment group and nothing else. It
deliberately does not set the native `required` attribute on the input the
control submits through: that would begin blocking form submissions in
applications that upgrade without changing a line, and it opens a browser-styled
validation bubble no design system controls. Telling assistive technology the
field is mandatory is the accessibility fix; enforcing it stays your form's
decision.

`name` is the key the date posts under. A segmented field has no single native
input a browser could submit, so Reka carries the value on a visually hidden one
inside the group — that is the element `name` lands on, and the element a
`<label for>` can name.

## Inside a Field

Wrapped in a [Field](./field), DatePicker wires itself: the row's id, the id of
its hint or error line, and `required`, `invalid`, `disabled`, `readonly` and
`name` all arrive from the row, so nothing is written at the call site.

```vue
<Field label="Due date" name="due" error="Pick a day inside the sprint" required>
  <DatePicker v-model="due" min="2026-03-02" max="2026-03-27" />
</Field>
```

Every one of those props still wins when you set it, in both directions — which
is why `invalid`, `required`, `disabled` and `readonly` are `boolean | undefined`
and default to `undefined` rather than `false`. `<DatePicker />` says nothing and
inherits the row; `<DatePicker :invalid="false" />` says this one field is fine
even though its row is not, and it is obeyed.

Where the row's answers land is worth knowing, because a date field is not one
element. `id` and `name` reach the hidden input described above; the row's
description, `aria-required` and `aria-invalid` land on the `role="group"`
holding the segments, where a screen reader announces them once on entering the
field rather than once per segment. A description you set yourself is kept and
the row's is added to it, never replaced.

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

## Labels

Everything this control says out loud is replaceable, and most of it has to be:
**five of these eight names are English that Reka UI writes of its own accord**,
with no prop of its own to set them. The three date segments are named `"day,"`,
`"month, "` and `"year, "` — spacing and all — the two paging buttons are called
`"Previous page"` and `"Next page"`, and the calendar itself answers to
`"Event Date"`. Leave one unset and it does not fall back to nothing; it falls
back to English, in a language nobody chose.

```ts
interface DatePickerLabels {
  // The segmented field's parts
  month: string; // "Month"
  day: string; // "Day"
  year: string; // "Year"
  era: string; // "Era" — only locales such as ja-JP-u-ca-japanese render one
  empty: string; // "Not set" — what an unfilled segment reports, in place of Reka's "Empty"

  // The calendar popover
  calendar: string; // "Calendar" — read before the month and year on entering it
  openCalendar: string; // "Open calendar" — the button in the field
  previousMonth: string; // "Previous month"
  nextMonth: string; // "Next month"
}
```

The eight arrive from two shared slices, `dateSegments` and `calendarPanel`,
because DateTimePicker, DateRangePicker and DateTimeRangePicker say the same
words for the same reason — one Reka implementation underneath all four. Name
`previousMonth` once in your vocabulary and every calendar in your application
answers to it.

```ts
provideLoomLabels(() => ({
  dateSegments: { month: "Tháng", day: "Ngày", year: "Năm" },
  calendarPanel: { openCalendar: "Mở lịch", previousMonth: "Tháng trước" },
}));
```

For a whole application, set these once with `provideLoomLabels` rather than at
every call site; the `labels` prop is the per-instance correction. See
[Localisation](/foundations/localisation).

Annotate your own bag with `LabelOverrides<DatePickerLabels>` — never with
`DatePickerLabels` itself. The override type is partial, so a key added to Loom
in a later release is a key your vocabulary may ignore; the bag interface is
total, and a bag typed with one would stop compiling the day the vocabulary
grew.

## API

<!-- @api DatePicker -->
