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

## Disabled and invalid

A disabled TimePicker dims, refuses the keyboard, and leaves nothing of itself
in the tab order. An invalid one still works: it takes the destructive border
and focus ring and sets `aria-invalid`, the same error language every other form
control here speaks, so a field reporting an error looks the same whichever
control it holds.

<Demo title="Disabled and invalid">
  <div class="flex w-full max-w-xs flex-col gap-3">
    <TimePicker v-model="closed" disabled aria-label="Closes at" />
    <TimePicker v-model="overrun" invalid aria-label="Overrunning finish time" />
  </div>
</Demo>

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

## API

<!-- @api TimePicker -->
