# Calendar

A month on a page: a heading naming it, a row of weekday names, and a grid of
days a reader browses and picks from directly. It is always visible — there is
no field, no trigger, no popover, and no open state to manage.

<script setup lang="ts">
import { ref } from "vue";
import { Calendar } from "@ecoma-io/loom";
import CalendarDemo from "../demos/CalendarDemo.vue";
import calendarDemoSource from "../demos/CalendarDemo.vue?raw";

const chosen = ref("2026-03-14");
</script>

## Not a date picker

Loom has four pickers — [DatePicker](./date-picker),
[DateRangePicker](./date-range-picker), DateTimePicker, DateTimeRangePicker —
and every one of them renders a grid inside a popover attached to a segmented
field. Calendar is the other half of that experience extracted into an
independent surface built on the same engine.

The differences are the interface, not details:

- **No field and no value echo.** A picker shows the chosen date in its input;
  this surface shows it in the grid alone, so each day cell carries its full
  date as its accessible name.
- **No trigger and no open state.** There is nothing to open, nothing to
  close, and no focus to hand back anywhere. Selecting a day does not navigate,
  close anything, or move focus.
- **The month is always on show**, which makes it the right control for
  availability boards, dashboard filters and scheduling views — places where
  the temporal surface _is_ the interface rather than a helper beside an input.

For a single date inside a form, reach for DatePicker: typing is faster than
browsing, and a field can be labelled, required and validated. Range selection
is out of scope here by design; a `RangeCalendar` will land as its own sibling
primitive, following the house precedent of DatePicker and DateRangePicker
being separate components over one engine.

## Usage

```vue
<script setup lang="ts">
import { ref } from "vue";
import { Calendar } from "@ecoma-io/loom";

const due = ref("2026-03-14");
</script>

<template>
  <Calendar v-model="due" aria-label="Due date" />
</template>
```

<Demo title="A value bound, shown where it was chosen">
  <div class="flex flex-col gap-3">
    <Calendar v-model="chosen" aria-label="Chosen day" />
    <p class="text-xs text-muted-foreground">
      v-model: <span class="tabular">{{ chosen || "—" }}</span>
    </p>
  </div>
</Demo>

## The state model

Three states live on the surface, each with exactly one owner:

- **Selected** — yours, through `modelValue`. Clicking a day (or pressing
  Enter on it) chooses it; clicking the chosen day again clears it. This is a
  browsing surface with nothing to be surprised by a clearing, so the toggle
  stays live and the cleared state arrives as `undefined` — announced as it
  happens by the status line described under
  [keyboard and screen readers](#keyboard-and-screen-readers).
- **Focused** — internal, driven by Reka's roving tabindex across the cells.
  It is not a prop, and the whole grid is exactly one Tab stop; the arrow keys
  walk from there.
- **Visible month** — internal, and deliberately uncontrolled in this release.
  The two pager buttons move it; nothing else does. If a use case needs to
  drive the view programmatically, that is a placeholder prop waiting for the
  use case to arrive, not a prop reserved speculatively.

## The value is an ISO string

`modelValue`, `min` and `max` are plain `"YYYY-MM-DD"` strings, and the emitted
value is one too — the same boundary every date control in Loom draws. A value
that cannot be parsed is read as _no date chosen_ rather than thrown on, so a
host's half-written data never crashes the page it lands on.

## Bounds

`min` and `max` fence the grid. A day outside them is announced disabled,
greyed and struck through, unclickable, and skipped by the arrow keys — so a
keyboard user cannot land on a day they are not allowed to choose and then
wonder why Enter did nothing.

It is greyed rather than faded on purpose: the number is the cell's whole
content, and half opacity took `--color-foreground` from 14.09:1 against the
panel to 3.13:1. Muted measures 5.76:1, and the strike is the second cue, a
hueless one — it is what keeps an unavailable day apart from an adjacent
month's, which is muted too and still perfectly selectable.

## Localisation and timezones

`locale` drives the month and weekday names, each cell's full-date name, and
which day a week starts on; `dir` flips the writing direction, mirrors the two
pager chevrons and swaps which arrow key moves backwards — and when it is left
unset it is read off the document, so a page written `<html dir="rtl">` gets a
genuinely right-to-left grid without passing anything. Both pager names are
part of the label seam — see [Localisation](/foundations/localisation) for
setting them once per application.

Everything here operates on bare calendar dates: no instants, and no timezone
conversion anywhere. "Today" resolves against the host's local timezone via
`getLocalTimeZone()`, which is the only timezone reading the component ever
makes — a server-rendered page and its reader in another zone each get their
own today, exactly as a paper calendar would.

## Keyboard and screen readers

Only these keys are wired, because only these keys are wired:

| Key                    | What it does                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| `Tab`                  | Reaches the grid once — the focused day. Leaves it the same way.     |
| `Arrow Right` / `Left` | Moves focus one day forward / back, paging the month at either edge. |
| `Arrow Down` / `Up`    | Moves focus one week down / up, paging the month at either edge.     |
| `Enter` / `Space`      | Chooses the focused day — or clears it if it was already chosen.     |

PageUp/PageDown/Home/End do nothing here; they are not part of the engine's
keyboard model, and the table above is the contract.

The grid is a real `role="grid"` named by its month-and-year heading, and the
heading is a polite live region — paging moves nothing else a reader can see,
so without it the month would silently become a different month. Every cell is
named with its full date ("Saturday, March 14, 2026"), which is what makes the
single-letter weekday headers safe to keep as single letters, and what stands
in for the value echo a picker's field would have given.

Choosing is announced as well as shown. A quiet `role="status"` line under the
header names the chosen day in full — "Saturday, March 14, 2026 chosen." — and
returns to "No date chosen." once it is cleared. Without it a choice would be
silent: the engine publishes a selection only as `aria-selected` flipping on a
cell, and an attribute flipping under a focus point that has not moved
announces nothing. The line changes exactly when the selection does, which is
what makes it announceable rather than noise; DateRangePicker's summary above
its grids is the same precedent at range size. Both strings are part of the
label seam, like every other word the surface says.

Three states, three cues, none of them colour: the selected day is
`aria-selected`, today is `aria-current="date"` and carries a dot under its
number, and an out-of-bounds day is `aria-disabled`, struck through, and
unreachable by keyboard.

Name the surface when the page holds more than one:
`aria-label` or `aria-labelledby` lands on the root container.

<Demo title="Default, bounded, localised" :source="calendarDemoSource">
  <CalendarDemo />
</Demo>

## API

<!-- @api Calendar -->
