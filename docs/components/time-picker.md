# TimePicker

A time of day, typed into a segmented field. Reach for it wherever a clock time
is a value: a meeting start, a reminder, the hour a shift begins. Arrow keys
change the segment under the cursor, digits fill it and move on, and the
separator, the segment order and the twelve-or-twenty-four-hour default all
follow the `locale` you give it.

**There is no clock face and no dropdown, and that is the design rather than an
omission.** A dial is slower than typing for every reader who can type, and
unusable for several who cannot; a list of ninety-six quarter hours is worse
again. The segmented field already is the control, so a panel would only be a
second, worse path to the same value. This is where TimePicker parts company
with DatePicker, whose calendar earns its popover by answering "which Tuesday?"
— a question a time never has.

For a date, reach for [DatePicker](./date-picker); for an instant, compose
the two, because a time of day carries no date and cannot be one. For a small
fixed set of slots — the four appointment windows a clinic offers — reach for a
[Select](./select) instead, where the point is choosing from a list rather
than entering a value. For a length of time rather than a point in it ("45
minutes"), this is the wrong control entirely: that is a number with a unit, and
a [NumberField](./number-field) says so.

<script setup lang="ts">
import { ref } from "vue";
import { TimePicker } from "@ecoma-io/loom";
import TimePickerDemo from "../../src/primitives/TimePicker/TimePickerDemo.vue";
import timePickerDemoSource from "../../src/primitives/TimePicker/TimePickerDemo.vue?raw";

const standup = ref("09:30");
const twelve = ref("13:30");
const midnight = ref("00:00");
const noon = ref("12:00");
const empty = ref<string>();
const lapse = ref("00:01:30");
const doors = ref("19:00");
const closed = ref("17:00");
const overrun = ref("22:00");
</script>

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { TimePicker } from "@ecoma-io/loom";

const startsAt = ref("09:30");
</script>

<template>
  <TimePicker v-model="startsAt" aria-label="Starts at" />
</template>
```

## The value is a 24-hour string

`modelValue` is a plain `"HH:mm"` string — `"HH:mm:ss"` when `granularity` asks
for seconds — and the emitted value is one too. It is **always 24-hour**,
whatever the field is displaying: `hourCycle` and `locale` are presentation, and
conflating presentation with the value is how a twelve-hour locale ends up
storing `"01:30"` for half past one in the afternoon.

Clearing the field emits `undefined`, which is the same thing as never having
set it. A value that cannot be parsed — a half-typed string, `"9:3"`, a whole
timestamp — is read as _no time chosen_ rather than thrown on, because a
component library refusing to render is a worse answer than a field that is
simply empty.

<Demo title="A 24-hour string in, a 24-hour string out">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <TimePicker v-model="standup" :hour-cycle="12" aria-label="Stand-up starts at" />
    <p class="text-xs text-muted-foreground">
      v-model: <span class="tabular">{{ standup || "—" }}</span>
    </p>
  </div>
</Demo>

A field with nothing bound to it shows its segment placeholders, which is what
tells a reader the shape of what is wanted before they have typed anything.

<Demo title="Nothing chosen yet">
  <div class="w-full max-w-xs">
    <TimePicker v-model="empty" aria-label="Remind me at" />
  </div>
</Demo>

## Hour cycle

`hourCycle` is `12` or `24`, and unset it follows the locale — which is what a
reader of that locale expects to see. Under a twelve-hour cycle the field grows
an AM/PM segment, and that segment is a segment like any other: it has its own
name, it takes the arrow keys, and `A` and `P` set it directly.

Midnight and noon are where a twelve-hour field is easiest to get wrong, so
they are worth stating plainly: **`"12:00 AM"` is `00:00` and `"12:00 PM"` is
`12:00`**. Toggling AM/PM moves the stored value by twelve hours in the
direction the reader can see, never by one.

<Demo title="Hour cycle">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <TimePicker v-model="twelve" :hour-cycle="12" aria-label="Twelve-hour display" />
    <TimePicker v-model="twelve" :hour-cycle="24" aria-label="Twenty-four-hour display" />
    <p class="text-xs text-muted-foreground">
      Both are bound to <span class="tabular">{{ twelve }}</span>.
    </p>
  </div>
</Demo>

<Demo title="Midnight and noon">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <TimePicker v-model="midnight" :hour-cycle="12" aria-label="Midnight" />
    <TimePicker v-model="noon" :hour-cycle="12" aria-label="Noon" />
    <p class="text-xs text-muted-foreground">
      <span class="tabular">{{ midnight }}</span> and
      <span class="tabular">{{ noon }}</span>, twelve hours apart.
    </p>
  </div>
</Demo>

## Granularity

`granularity` decides how far down the field goes. `"minute"` is the default and
the right answer nearly always; `"second"` adds a seconds segment and changes
the reported string to `"HH:mm:ss"`; `"hour"` drops everything below the hour,
for the cases where a minutes segment would only invite a value nobody means.

A value carrying more precision than the field shows is accepted and displayed
to the field's own precision, and what comes back is what the segments show —
`"09:30:45"` bound to a minute-granularity field reports `"09:31"` when its
minute is nudged, never a hidden second the reader could not see.

<Demo title="Granularity">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <TimePicker v-model="doors" granularity="hour" :hour-cycle="12" aria-label="Doors open" />
    <TimePicker v-model="lapse" granularity="second" :hour-cycle="24" aria-label="Time lapse" />
  </div>
</Demo>

## No timezone, and no `Date`

A time of day is not an instant. `"09:00"` is nine in the morning wherever it is
read, and there is no offset, no timezone segment and no `Date` object anywhere
near this component's surface. Which nine in the morning it turns out to be is a
question only a date can answer, so pair this with a
[DatePicker](./date-picker) when the answer matters — the host owns the
joining of the two, because the host is the one that knows which calendar day it
means.

For the same reason there are no `min` and `max` bounds here, where DatePicker
has them. A time of day has no ordering that survives midnight: a night shift is
"not before 22:00" _and_ "not after 02:00", two bounds that cross rather than
fence, and a min/max pair would quietly call 01:00 out of range for the exact
case it was reached for.

## Disabled, read-only and invalid

A disabled TimePicker dims, refuses the keyboard, and leaves nothing of itself
in the tab order. An invalid one still works: it takes the destructive border
and focus ring and sets `aria-invalid`, the same error language every other form
control here speaks, so a field reporting an error looks the same whichever
control it holds.

`readonly` is a third state and not a dial on either. A read-only time is a
value on show: the field stays a Tab stop, its segments stay readable and
copyable, it stays in the form's submitted data, and it is filled rather than
dimmed — Reka marks it `data-readonly`, so the state never rests on the fill
alone. Reaching for `disabled` to show a time nobody may change tells a screen
reader the field is unavailable when it is simply not editable.

<Demo title="Disabled, read-only and invalid">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <TimePicker v-model="closed" disabled aria-label="Closes at, disabled" />
    <TimePicker v-model="doors" readonly aria-label="Doors open, read-only" />
    <TimePicker v-model="overrun" invalid aria-label="Overrunning finish time" />
  </div>
</Demo>

## Inside a Field

Wrapped in a [Field](./field), TimePicker wires itself: the row's id, the id of
its hint or error line, and `required`, `invalid`, `disabled`, `readonly` and
`name` all arrive from the row, so nothing is written at the call site.

```vue
<Field label="Doors open" name="doors" error="Pick a time before the show" required>
  <TimePicker v-model="doors" />
</Field>
```

Every one of those props still wins when you set it, in both directions — which
is why `invalid`, `required`, `disabled` and `readonly` are `boolean | undefined`
and default to `undefined` rather than `false`. `<TimePicker />` says nothing and
inherits the row; `<TimePicker :readonly="false" />` says this one field is
editable even though its row is not, and it is obeyed.

Where the row's answers land is worth knowing, because a segmented field is not
one element. `id` and `name` reach the hidden input described above — which is
also the element the row's `<label for>` names, a `role="group"` being
unlabelable. The row's description, `aria-required` and `aria-invalid` land on
the group holding the segments, where a screen reader announces them once on
entering the field rather than once per segment. A description you set yourself
is kept and the row's is added to it, never replaced.

## Keyboard and screen readers

The field is **one Tab stop**, not three or four. Left and right arrows move
between the segments; up and down change the segment under the cursor and wrap
at its ends; typing digits fills a segment and advances when it cannot hold
another. Backspace empties a segment, and emptying one clears the time.
On the AM/PM segment, up and down toggle it and `A` and `P` set it
outright — it is reachable and settable from the keyboard alone, with no
pointer anywhere in the path.

Each segment is a `role="spinbutton"` carrying its own name and its own current
value, so a screen reader announces "hour, 9" and "minute, 30" rather than
reading the time back as one opaque string. The AM/PM segment is named too, and
the hour announces itself the way the reader sees it rather than the way the
value stores it: on a twelve-hour field, half past one in the afternoon is
"1 PM" and not "13 PM". The colon between the segments
is `aria-hidden` and outside the tab order, because it is punctuation rather
than a control.

The field has no visible label of its own, so name it: `aria-label` or
`aria-labelledby` lands on the `role="group"` holding the segments, which is
where a screen reader announces it once on entering the field rather than once
per segment.

## Motion

Nothing here opens, so nothing here has an entrance. The only motion in a
TimePicker is the fill that marks the segment under the cursor and the ring that
marks the focused field, both colour changes on the `instant` and `fast` lanes —
well inside the `normal` feedback ceiling, which is the slowest a direct
response to a keystroke may be. A control answering a keypress is the one place
in this library where a deliberately unhurried transition would read as lag.

<Demo title="Every state" :source="timePickerDemoSource">
  <TimePickerDemo />
</Demo>

## Labels

Every name this control publishes is one Reka UI would otherwise write in
English of its own accord — `"hour, "`, `"minute, "`, `"second, "` and
`"AM/PM"`, spacing and all, with no prop to set them. There is nothing else on
this control to name: the clock glyph is decoration and hidden from assistive
technology, and the field group takes its name from your `aria-label` or from a
wrapping [Field](/components/field). So these four are not decoration — leave
one unset and the segment is named in English rather than named not at all.

```ts
interface TimePickerLabels {
  hour: string; // "Hour"
  minute: string; // "Minute"
  second: string; // "Second" — only at second granularity
  dayPeriod: string; // "AM or PM" — only in a 12-hour field
  empty: string; // "Not set" — what an unfilled segment reports, in place of Reka's "Empty"
}
```

They arrive from a shared `timeSegments` slice, because DateTimePicker and
DateTimeRangePicker name their clock segments with the same words. Name them
once and every time field in your application answers to it.

```ts
provideLoomLabels(() => ({
  timeSegments: { hour: "Giờ", minute: "Phút" },
}));
```

For a whole application, set these once with `provideLoomLabels` rather than at
every call site; the `labels` prop is the per-instance correction. See
[Localisation](/foundations/localisation).

Annotate your own bag with `LabelOverrides<TimePickerLabels>` — never with
`TimePickerLabels` itself. The override type is partial, so a key added to Loom
in a later release is a key your vocabulary may ignore; the bag interface is
total, and a bag typed with one would stop compiling the day the vocabulary
grew.

## API

<!-- @api TimePicker -->
