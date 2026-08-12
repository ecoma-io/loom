# DateTimePicker

One instant — a day and a time of day together — entered by typing across a
single segmented field or by picking the day out of a calendar popover. Reach
for it when both halves are the same decision: a scheduled send, a deadline, an
appointment.

It is [DatePicker](./date-picker) with the clock left on, and it behaves like
one on purpose. The field is one Tab stop whose segments follow the `locale` you
give it; arrow keys change the segment under the cursor and digits fill it and
move on; the calendar is a second path to the day and never the only one. What
is new is that the two halves are one value, and that keeping them one value —
picking a day without losing the time, typing a time without losing the day — is
the whole of the component.

Reach for [DatePicker](./date-picker) when the time of day is not part of the
decision; a date of birth has no half past nine. Reach for
[TimePicker](./time-picker) when the day is not. Two controls side by side are
two values and two validations, which is a fine answer when the two really are
separate and the wrong one when they are not.

<script setup lang="ts">
import { ref } from "vue";
import { DateTimePicker } from "@ecoma-io/loom";
import DateTimePickerDemo from "../../src/primitives/DateTimePicker/DateTimePickerDemo.vue";
import dateTimePickerDemoSource from "../../src/primitives/DateTimePicker/DateTimePickerDemo.vue?raw";

const send = ref("2026-03-14T09:30");
const empty = ref<string>();
const deadline = ref("2026-03-20T00:00");
const booking = ref("2026-03-16T13:00");
const late = ref("2026-03-16T18:30");
const lapse = ref("2026-03-16T13:00:45");
const shown = ref("2026-03-16T13:00");
const created = ref("2026-01-01T08:00");
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { DateTimePicker } from "@ecoma-io/loom";

const sendAt = ref("2026-03-14T09:30");
</script>

<template>
  <DateTimePicker v-model="sendAt" aria-label="Send at" />
</template>
```

## The value is a local ISO string

`modelValue`, `min` and `max` are all plain `"YYYY-MM-DDTHH:mm"` strings —
`"YYYY-MM-DDTHH:mm:ss"` when `granularity` asks for seconds — and the emitted
value is one too. A bare `"YYYY-MM-DD"` is accepted on the way in and read as
midnight that day.

**It is a _local_ instant, and turning it into an absolute one is your job.**
There is no timezone here, no offset and no `Date` anywhere near this
component's surface. `"2026-03-14T09:30"` is half past nine on the fourteenth
wherever it is read; which half past nine that turns out to be is a question only
you can answer, because only you know whose clock is meant — the reader's, the
organisation's, or the one the event is happening in. A component that guessed
would guess the browser's, and guessing the browser's is exactly how a meeting
ends up an hour out. A value carrying an offset or a trailing `Z` is refused
rather than quietly stripped, for the same reason.

Clearing the field emits `undefined`, which is the same thing as never having set
it. A value that cannot be parsed is read as _nothing chosen_ rather than thrown
on, because a component library refusing to render is a worse answer than a field
that is simply empty.

<Demo title="A local ISO string in, a local ISO string out">
  <div class="flex w-full max-w-sm flex-col gap-3">
    <DateTimePicker v-model="send" :hour-cycle="12" aria-label="Send at" />
    <p class="text-xs text-muted-foreground">
      v-model: <span class="tabular">{{ send || "—" }}</span>
    </p>
  </div>
</Demo>

A field with nothing bound to it shows its segment placeholders, which is what
tells a reader the shape of what is wanted before they have typed anything.

<Demo title="Nothing chosen yet">
  <div class="w-full max-w-sm">
    <DateTimePicker v-model="empty" aria-label="Remind me at" />
  </div>
</Demo>

## Picking a day keeps the time, and no time means midnight

The calendar sets the day and leaves the time exactly as it is, in both
directions: choose 20 March under a value of `09:30` and you get
`2026-03-20T09:30`, and nudge the hour afterwards and the day stays where you put
it. That round trip is the reason this control exists rather than a DatePicker
and a TimePicker sitting next to each other.

With nothing chosen yet there is no time to keep, so choosing a day invents one,
and **the invented time is midnight**. That is worth saying out loud rather than
leaving a reader to discover it: a deadline set to "Friday" means Friday at
`00:00`, which is the beginning of Friday and not the end of it. The field shows
it, so nobody has to guess — but if what you meant was end-of-day, the time
segments are right there and the arrow keys reach them.

One practical consequence: fill the day before the time when you are using the
calendar. A time typed into an otherwise-empty field is not part of a value yet
— the value only exists once every segment is filled — so a day picked after it
starts from midnight. Typing left to right, which is the order the segments are
already in, never runs into this.

<Demo title="Midnight, spelled out">
  <div class="flex w-full max-w-sm flex-col gap-3">
    <DateTimePicker v-model="deadline" :hour-cycle="24" aria-label="Deadline" />
    <p class="text-xs text-muted-foreground">
      v-model: <span class="tabular">{{ deadline }}</span> — the beginning of that day.
    </p>
  </div>
</Demo>

## Bounds are instants, and the calendar rounds them out to days

`min` and `max` fence an instant rather than a day, which makes the day at each
end only partly available: under a window of `09:00` to `17:00` on 16 March, the
sixteenth is a choosable day and `18:30` on it is not a choosable time.

**The calendar bounds by whole days.** A day holding any choosable instant can be
chosen, so the boundary day is never disabled and never unreachable. The
alternative — comparing each calendar cell against the instant — sounds stricter
and behaves worse: a cell carries whatever time the field is currently holding,
so a "not before now" deadline would grey out today at nine in the morning
because today's cell reads midnight, and nothing on screen would say why.

**The field bounds by the instant.** What the calendar rounds out is caught
where the time is actually entered: an instant outside `min` or `max` takes the
destructive border and `aria-invalid` on its own, without the host having to say
so, and carries a `data-out-of-range` marker distinct from the `data-invalid` the
`invalid` prop sets. So the right day at the wrong hour reads as an error rather
than as a value that is merely unsaveable later.

Days that lie wholly outside the window are announced with `aria-disabled`,
greyed and struck through, unclickable, and — the part that is easy to leave out
— skipped by the arrow keys. Greyed rather than faded: the number is the cell's
whole content, and half opacity took it from 14.09:1 against the panel to
3.13:1, where the muted colour measures 5.76:1. The strike is the hueless second
cue that keeps an unavailable day apart from an adjacent month's.

<Demo title="Bounds">
  <div class="flex w-full max-w-sm flex-col gap-3">
    <DateTimePicker
      v-model="booking"
      min="2026-03-16T09:00"
      max="2026-03-16T17:00"
      :hour-cycle="24"
      aria-label="Booking, inside the window"
    />
    <DateTimePicker
      v-model="late"
      min="2026-03-16T09:00"
      max="2026-03-16T17:00"
      :hour-cycle="24"
      aria-label="Booking, the right day an hour late"
    />
    <p class="text-xs text-muted-foreground">
      Both are on 16 March. The second is an hour past the window and says so.
    </p>
  </div>
</Demo>

## Granularity and hour cycle

`granularity` decides how far down the field goes. `"minute"` is the default and
nearly always right; `"second"` adds a seconds segment and changes the reported
string to `"YYYY-MM-DDTHH:mm:ss"`. What comes back is what the segments show — a
value carrying seconds bound to a minute-granularity field reports without them,
never a hidden second the reader could not see.

`hourCycle` is `12` or `24`, and unset it follows the locale, which is what a
reader of that locale expects. It is display only: the value stays 24-hour either
way, because conflating the two is how a twelve-hour locale ends up storing
`"…T01:30"` for half past one in the afternoon.

<Demo title="Granularity and hour cycle">
  <div class="flex w-full max-w-sm flex-col gap-3">
    <DateTimePicker v-model="lapse" granularity="second" :hour-cycle="24" aria-label="To the second" />
    <DateTimePicker v-model="shown" :hour-cycle="12" aria-label="Twelve-hour display" />
    <DateTimePicker v-model="shown" :hour-cycle="24" aria-label="Twenty-four-hour display" />
    <p class="text-xs text-muted-foreground">
      The last two are bound to <span class="tabular">{{ shown }}</span>.
    </p>
  </div>
</Demo>

## Locale

`locale` decides the order of the segments, the separator between them, the month
and weekday names, which day the week starts on, and the twelve-or-twenty-four
hour default. It is a presentation choice and it never reaches the value: the
model stays a Gregorian ISO string whatever calendar the locale reads by, so a
Thai locale renders the year 2569 in the field and still hands back `2026-…`.

<Demo title="Locale">
  <div class="flex w-full max-w-sm flex-col gap-3">
    <DateTimePicker v-model="shown" locale="en-GB" aria-label="Booked for, British English" />
    <DateTimePicker v-model="shown" locale="vi-VN" aria-label="Booked for, Vietnamese" />
    <DateTimePicker v-model="shown" locale="ja-JP" aria-label="Booked for, Japanese" />
  </div>
</Demo>

## Disabled, read-only and invalid

A disabled DateTimePicker drains to a grey fill with muted segments and a
slackened border, refuses the calendar, and leaves nothing of itself in the tab
order. Colour and weight rather than opacity, deliberately: fading the field
fades the instant inside it, and the instant is the whole content of the control
— 14.09:1 becomes 2.99:1 at half alpha, and the separators between the five
segments 2.02:1. Drained, every segment measures 4.68:1 and the field still
plainly reads as unavailable. An invalid one still works: it takes the destructive
border and focus ring and sets `aria-invalid`, the same error language every
other form control here speaks, so a field reporting an error looks the same
whichever control it holds. An instant outside `min` or `max` paints the same
way without the prop, as above.

`readonly` is a third state and not a dial on either. A read-only instant is a
value on show: the field stays a Tab stop, its segments stay readable and
copyable, it stays in the form's submitted data, and it keeps its text at full
strength. The calendar button is dropped outright — Reka's `readonly` makes
every cell's click a no-op, so the button would open a panel in which nothing
can be chosen.

The three appearances part on three channels apiece. Read-only lifts the fill
one step off an editable field's and moves nothing else, because the field is
still reachable and still posted; disabled drains it a step further, mutes the
segments with it, and slackens the rim from `--color-input` to
`--color-border`. Read-only and disabled used to share a fill and part on the
text colour alone — a distinction in hue, and hue is the one channel a reader
with a colour deficiency does not have.

The fill belongs to the **segment group**, never to the segments: the slashes,
the comma and the colon are each a segment themselves, so a per-segment fill
would leave them on the resting colour and write the instant as a row of
lozenges on a stripe.

<Demo title="Available, read-only, disabled and invalid">
  <div class="flex w-full max-w-sm flex-col gap-3">
    <DateTimePicker v-model="send" aria-label="Send at, available" />
    <DateTimePicker v-model="booking" readonly aria-label="Booked slot, read-only" />
    <DateTimePicker v-model="created" disabled aria-label="Created at, disabled" />
    <DateTimePicker v-model="late" invalid :hour-cycle="24" aria-label="Overrunning finish" />
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

## Inside a Field

Wrapped in a [Field](./field), DateTimePicker wires itself: the row's id, the id
of its hint or error line, and `required`, `invalid`, `disabled`, `readonly` and
`name` all arrive from the row, so nothing is written at the call site.

```vue
<Field label="Send at" name="sendAt" error="Pick an instant inside the window" required>
  <DateTimePicker v-model="sendAt" min="2026-03-14T09:00" max="2026-03-14T17:00" />
</Field>
```

Every one of those props still wins when you set it, in both directions — which
is why `invalid`, `required`, `disabled` and `readonly` are `boolean | undefined`
and default to `undefined` rather than `false`. `<DateTimePicker />` says nothing
and inherits the row; `<DateTimePicker :invalid="false" />` says this one field
is fine even though its row is not, and it is obeyed.

An instant outside `min` or `max` is the one thing a row cannot overrule: the
field is `aria-invalid` for the row's error **or** for being out of range, so
`:invalid="false"` clears the row's claim and leaves the control's own standing.
`id` and `name` reach the hidden input described above, which is also the
element the row's `<label for>` names; the row's description, `aria-required`
and `aria-invalid` land on the group holding the segments, where a screen reader
announces them once on entering the field rather than once per segment. A
description you set yourself is kept and the row's is added to it, never
replaced.

## Keyboard and screen readers

The field is **one Tab stop** across the date and the time alike — five segments
at the default settings, seven with AM/PM and seconds, and one Tab press to cross
all of them. Left and right arrows move between segments; up and down change the
segment under the cursor; typing digits fills it and advances when it cannot hold
another. Backspace empties a segment, and emptying one clears the instant. On the
AM/PM segment, up and down toggle it and `A` and `P` set it outright.

Each segment is a `role="spinbutton"` carrying its own name and its own current
value, so a screen reader announces "month, 3" and "hour, 9" rather than reading
an instant back as one opaque string. The hour announces itself the way the
reader sees it rather than the way the value stores it: on a twelve-hour field,
half past one in the afternoon is "1 PM" and not "13 PM". The separators between
segments are punctuation rather than controls, and are outside the tab order.

Tab from the field reaches the calendar button. Enter or Space opens the
calendar, and **focus lands on the day the calendar is already sitting on** — the
chosen day, or today when there is none — rather than on the previous-month
button. Inside the grid the arrow keys walk day by day and week by week and page
into the neighbouring month at its edges; Enter chooses, and choosing closes the
calendar and returns focus to the button that opened it. Escape closes it without
choosing, and returns focus the same way.

The calendar is a real `role="grid"` named by its month-and-year heading, and
that heading is a polite live region — paging moves nothing else a reader can
see, so without it the month would silently become a different month. Every day
carries its full date as its accessible name, which is what makes the
single-letter weekday headers safe to keep as single letters.

Three states, three cues, none of them colour: the chosen day is `aria-selected`,
today is `aria-current="date"` and carries a dot under its number, and a day
outside the bounds is `aria-disabled` and unreachable by keyboard.

The field has no visible label of its own, so name it: `aria-label` or
`aria-labelledby` lands on the `role="group"` holding the segments, which is
where a screen reader announces it once on entering the field rather than once
per segment.

## Motion

The calendar rises in on the shared `fade-rise` lane — the entrance every overlay
in this library uses, scoped to the open state so a closed panel cannot be left
mounted and invisible over the page.

The day cells deliberately do **not** stagger. `listStaggerDelay` is the
vocabulary for a list of rows arriving in reading order; a grid rippling in cell
by cell reads as a rendering fault rather than as an entrance, so the panel is the
only thing that animates and the cells arrive with it. Everything smaller — a
segment taking focus, a day highlighting under the pointer — is a colour change
at `instant` or `fast`, well inside the `normal` feedback ceiling, which is the
slowest a direct answer to a keystroke may be.

<Demo title="Every state" :source="dateTimePickerDemoSource">
  <DateTimePickerDemo />
</Demo>

## Labels

Everything this control says out loud is replaceable, and most of it has to be:
**nine of these twelve names are English that Reka UI writes of its own
accord**, with no prop of its own to set them. Every segment is named — `"day,"`,
`"hour, "`, `"AM/PM"` and the rest, spacing and all — the two paging buttons are
called `"Previous page"` and `"Next page"`, and the calendar itself answers to
`"Event Date"`. Leave one unset and it falls back not to nothing but to English.

```ts
interface DateTimePickerLabels {
  // The date half of the segmented field
  month: string; // "Month"
  day: string; // "Day"
  year: string; // "Year"
  era: string; // "Era" — only locales such as ja-JP-u-ca-japanese render one
  empty: string; // "Not set" — an unfilled date segment, in place of Reka's "Empty"

  // The clock half
  hour: string; // "Hour"
  minute: string; // "Minute"
  second: string; // "Second" — only at second granularity
  dayPeriod: string; // "AM or PM" — only in a 12-hour field
  empty: string; // "Not set" — an unfilled clock segment; a separate key from the one above,
  //                because the two halves are separate slots (see below)

  // The calendar popover
  calendar: string; // "Calendar" — read before the month and year on entering it
  openCalendar: string; // "Open calendar" — the button in the field
  previousMonth: string; // "Previous month"
  nextMonth: string; // "Next month"
}
```

The twelve arrive from three shared slices — `dateSegments`, `timeSegments` and
`calendarPanel` — because the other four date and time controls say the same
words for the same reason. Name `hour` once in your vocabulary and every
segmented field in your application answers to it.

```ts
provideLoomLabels(() => ({
  dateSegments: { month: "Tháng", day: "Ngày", year: "Năm" },
  timeSegments: { hour: "Giờ", minute: "Phút" },
  calendarPanel: { openCalendar: "Mở lịch" },
}));
```

For a whole application, set these once with `provideLoomLabels` rather than at
every call site; the `labels` prop is the per-instance correction. See
[Localisation](/foundations/localisation).

Annotate your own bag with `LabelOverrides<DateTimePickerLabels>` — never with
`DateTimePickerLabels` itself. The override type is partial, so a key added to Loom
in a later release is a key your vocabulary may ignore; the bag interface is
total, and a bag typed with one would stop compiling the day the vocabulary
grew.

## API

<!-- @api DateTimePicker -->
