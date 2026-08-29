<script lang="ts">
import type { CalendarLabels } from "@ecoma-io/loom-labels";

/**
 * Loom's English for what this surface speaks of its own account — the two
 * pager names and the selection line — co-located so it tree-shakes with the
 * component that renders it, and exported so a host can build a partial
 * vocabulary against the real thing.
 */
export const CALENDAR_LABELS: CalendarLabels = {
  previousMonth: "Previous month",
  nextMonth: "Next month",
  chosen: ({ date }) => `${date} chosen.`,
  cleared: "No date chosen.",
};
</script>

<script setup lang="ts">
import { computed, ref, useId } from "vue";
import {
  CalendarRoot,
  CalendarHeader,
  CalendarHeading,
  CalendarPrev,
  CalendarNext,
  CalendarGrid,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarGridBody,
  CalendarCell,
  CalendarCellTrigger,
} from "reka-ui";
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import {
  getLocalTimeZone,
  isToday,
  parseDate,
  toCalendarDate,
  type DateValue,
} from "@internationalized/date";
import { cn } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";
import { useSplitAttrs } from "@ecoma-io/loom-core";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";
import { CALENDAR_PANEL_LABELS } from "@ecoma-io/loom-labels";
import { formatFullDay } from "@ecoma-io/loom-labels";

/**
 * Calendar — a month on a page: a heading naming it, a row of weekday names,
 * and a grid of days a reader browses and picks from directly.
 *
 * **This is not a date picker, and the difference is the whole point.**
 * DatePicker is a field first — a segmented input a reader types into, with a
 * popover calendar as its second path. This is the calendar alone: no field,
 * no trigger, no open state, nothing to close, and no value echoed anywhere.
 * Reach for it wherever the temporal surface *is* the interface — a booking
 * board's availability grid, a dashboard filter showing the month at all
 * times, a scheduling view a host embeds beside other content.
 *
 * The engine underneath is the same one the four pickers wrap — Reka UI's
 * standalone `CalendarRoot` family — so the month arithmetic, the locale
 * handling and the roving-focus keyboard model are Reka's, not hand-written
 * here. What Loom adds is the value boundary, the label seam and the
 * accessibility decisions documented below.
 *
 * **The model value is a plain ISO date string, `"YYYY-MM-DD"`** — parsed on
 * the way in, re-serialised on the way out, exactly as DatePicker draws the
 * same boundary. A value that does not parse is read as *no date chosen*
 * rather than thrown on; a component library cannot decide that a host's bad
 * data is fatal.
 *
 * Three states live on this surface and each has exactly one owner:
 *
 * - **Selected** — the host's, through `modelValue`. Clicking (or pressing
 *   Enter on) an already-chosen day clears it; there is no field here whose
 *   clearing could be a surprise, and a browsing surface that cannot be
 *   un-picked is worse than one that can.
 * - **Focused** — Reka's, through a roving tabindex across the cell triggers.
 *   It is not a prop: the whole grid is exactly one Tab stop, and the arrow
 *   keys walk it.
 * - **Visible month** — internal, deliberately uncontrolled in this release.
 *   Paging buttons move it; selecting a day does not navigate anything, close
 *   anything or move focus. A host that needs to drive the view gets a
 *   placeholder prop when a use case asks for one, not before.
 *
 * **Timezone assumptions:** everything here operates on bare calendar dates.
 * There are no instants and no conversions — "today" resolves against the
 * host's local timezone via `getLocalTimeZone()`, which is the only timezone
 * reading this component ever makes.
 *
 * **Range selection is out of scope here by design.** A future
 * `RangeCalendar` lands as its own sibling primitive — the house precedent is
 * DatePicker and DateRangePicker, separate components sharing an engine,
 * because a span has a different model from a point and pretending otherwise
 * produces a control wrong at both ends.
 */
const props = withDefaults(
  defineProps<{
    /**
     * The chosen date as ISO `YYYY-MM-DD`. Unset, empty or unparseable means
     * no date is chosen. The explicit `| undefined` is what lets `v-model`
     * bind a ref that clears — clicking the chosen day again emits
     * `undefined`, and a plain optional prop refuses to take it back.
     */
    modelValue?: string | undefined;
    /** The earliest choosable date, same ISO format. Days before it are announced disabled and skipped by the keyboard. */
    min?: string;
    /** The latest choosable date, same ISO format. Days after it are announced disabled and skipped by the keyboard. */
    max?: string;
    /** BCP 47 tag driving the month and weekday names, each cell's full-date name, and which day a week starts on. */
    locale?: string;
    /**
     * Writing direction of the whole surface: mirrors the pager chevrons and
     * flips which arrow key moves backwards.
     *
     * Absent, it is seeded from the document's own direction — because Reka
     * never reads the document itself. Left to its own devices it resolves
     * `dir` through its ConfigProvider context, defaulting `"ltr"`, so under
     * `<html dir="rtl">` with nothing forwarded the `rtl:` chevron classes
     * still fire off the CSS cascade while the arrow-key sign stays LTR:
     * visuals and semantics disagreeing on one surface. An explicit prop
     * wins over the seed, and a host driving direction through Reka's own
     * ConfigProvider keeps that where the document declares nothing.
     */
    dir?: "ltr" | "rtl";
    /**
     * Names for everything this control says out loud, as any subset of
     * `CalendarLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application: both keys name controls every calendar in the library
     * pages with, and a language is set once with `provideLoomLabels`.
     */
    labels?: LabelOverrides<CalendarLabels>;
  }>(),
  { locale: "en" },
);

const emit = defineEmits<{
  /** The chosen date as ISO `YYYY-MM-DD`, or `undefined` once the choice has been cleared. */
  "update:modelValue": [value: string | undefined];
}>();

// Two slots resolved, one of them behind the prop. `text` is this control's
// own pager vocabulary; the panel slice answers only for the surface's own
// name (`calendar`), which Reka publishes twice — as the container's
// `aria-label` and inside a visually-hidden live region a fallthrough
// attribute could not reach — and which defaults to `"Event Date"`, a name
// for somebody else's application. The per-instance `labels` prop stays
// exactly `CalendarLabels`: a standalone surface renders no open button, so
// the rest of that shared slice would be keys nothing on it could say.
const text = useLabels("calendar", CALENDAR_LABELS, () => props.labels);
const chromeText = useLabels("calendarPanel", CALENDAR_PANEL_LABELS);

// The root is the whole surface, so every fallthrough attribute belongs on it
// — there is no second node they could sensibly describe. `class` is pulled
// out of that spread and merged through `cn()` instead: spreading it alongside
// the root's own `:class` only concatenates the two lists, so a caller's
// `w-full` would win or lose depending on which utility Tailwind emitted last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: rootAttrs } = useSplitAttrs();

function fromIso(value: string | undefined): DateValue | undefined {
  if (!value) return undefined;
  try {
    return parseDate(value);
  } catch {
    return undefined;
  }
}

// `toString()` already normalises to the Gregorian ISO form whatever calendar
// the value carries — a locale such as `th-TH` gives Reka a Buddhist
// placeholder whose year reads 2569, and it still prints `2026-08-11`. What
// `toCalendarDate` adds is dropping a time component if one ever arrives.
function toIso(date: DateValue): string {
  return toCalendarDate(date).toString();
}

// Reka resolves direction through its ConfigProvider context and defaults
// `"ltr"` — it never reads the document (its `useDirection` is literally
// `dir || context.dir || "ltr"`). Seeding the forwarded direction from the
// document closes the half-behaviour that leaves behind: chevrons mirrored by
// CSS, arrows still LTR. Only `"rtl"` is ever injected rather than a resolved
// `"ltr"` too — forwarding `"ltr"` unconditionally would clobber a
// ConfigProvider context the host set on purpose, and absence lets Reka's own
// chain answer. `typeof document` guards the server-side pass that builds the
// documentation site, where there is no document to read.
const resolvedDir = computed(() => {
  if (props.dir) return props.dir;
  if (typeof document === "undefined") return undefined;
  return document.documentElement.dir === "rtl" ? "rtl" : undefined;
});

// `optional()` rather than four separate bindings: an absent bound forwarded
// as an explicit `undefined` is still a key Reka sees, and an absent
// `modelValue` forwarded that way is what turns an uncontrolled surface into
// a permanently empty one. Dropping the key says what is true — including
// for `dir`, whose absence defers to Reka's own resolution wherever neither
// the prop nor the document speaks.
const rootValue = computed(() =>
  optional({
    modelValue: fromIso(props.modelValue),
    minValue: fromIso(props.min),
    maxValue: fromIso(props.max),
    dir: resolvedDir.value,
  }),
);

// The status line below announces by changing, but a live region also
// announces its content the moment it enters the document — so a calendar
// mounted with a preselected value would read the chosen date out as if the
// user had just picked it. `announced` stays false until the first real
// selection event, and the line is aria-hidden meanwhile: hidden, it says
// nothing at mount; revealed on the first change, it announces exactly that
// change. Programmatic `modelValue` sets never fire this handler, so they
// correctly stay silent too — only a user's own action opens the region.
const announced = ref(false);

function onDateChange(date: DateValue | undefined) {
  announced.value = true;
  emit("update:modelValue", date ? toIso(date) : undefined);
}

// Today is a state, and it may not be carried by the marker dot alone — a
// reader who cannot see the dot gets `aria-current="date"`, which is the one
// attribute screen readers already announce for "this is the current one".
// Reka publishes today only as a `data-` attribute and a slot prop, neither of
// which can reach an attribute binding on the cell itself.
function isDateToday(date: DateValue): boolean {
  return isToday(date, getLocalTimeZone());
}

// The month-and-year heading names the grid, so the two are wired together
// rather than the grid being an unnamed table of numbers.
const headingId = useId();

// Each cell's accessible name is formatted here rather than read off Reka,
// replacing Reka's own — the same mechanism DateRangePicker's cells rely on:
// the binding reaches the node as a fallthrough attribute, which Vue merges
// last, so it replaces rather than competes. A standalone calendar has no
// input echoing the chosen value back, so the full date is the only thing a
// screen reader ever says for a day, and it comes from the shared cached
// formatter rather than a second `Intl` path built for this one component.
function dayLabel(day: DateValue): string {
  return formatFullDay(props.locale, day);
}

// A choice announces itself through no attribute of this engine: Reka
// publishes a selection only as `aria-selected` flipping on a cell under an
// unmoved focus point, and a flipped attribute announces nothing — there is
// no field here whose value change would speak instead. DateRangePicker met
// the identical fieldless-announcement problem with a `role="status"` line,
// and this mirrors that precedent. It changes exactly when the selection
// changes, which is what makes it announceable rather than noise.
//
// It reads the selection off Reka's own slot rather than off `modelValue`:
// the two agree once a host binds one, but this surface is usable unbound,
// and a line wired to the prop would stay silent about exactly the clicks it
// exists to announce.
function selectionStatus(selected: DateValue | DateValue[] | undefined): string {
  const value = Array.isArray(selected) ? undefined : selected;
  return value ? text.value.chosen({ date: dayLabel(value) }) : text.value.cleared;
}
</script>

<template>
  <CalendarRoot
    v-slot="{ grid, weekDays, modelValue: selected }"
    v-bind="{ ...rootAttrs, ...rootValue }"
    :locale="locale"
    :calendar-label="chromeText.calendar"
    :class="
      cn(
        'flex w-fit flex-col gap-3 rounded-md border border-border bg-popover p-3 text-popover-foreground',
        attrs.class as string,
      )
    "
    @update:model-value="onDateChange"
  >
    <CalendarHeader class="flex items-center justify-between gap-2">
      <!-- The two pagers keep `data-[disabled]:opacity-50` where the cells
           gave it up, and the difference is what is inside them: a chevron and
           nothing else. Fading a glyph costs a reader nothing, and the buttons
           carry their name in `aria-label` rather than in dimmed text. -->
      <CalendarPrev
        :aria-label="text.previousMonth"
        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      >
        <ChevronLeft class="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
      </CalendarPrev>

      <!-- Paging the calendar changes nothing a reader is looking at except
           this line, and nothing moves focus — so without the live region the
           month silently becomes a different month. -->
      <CalendarHeading
        :id="headingId"
        aria-live="polite"
        class="text-sm font-medium text-foreground"
      />

      <CalendarNext
        :aria-label="text.nextMonth"
        class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
      >
        <ChevronRight class="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
      </CalendarNext>
    </CalendarHeader>

    <!-- Visually subordinate on purpose — the grid is the interface, and this
         is its spoken half: what a picker's field would have echoed. -->
    <p
      role="status"
      :aria-hidden="announced ? undefined : 'true'"
      class="text-xs text-muted-foreground"
    >
      {{ selectionStatus(selected) }}
    </p>

    <CalendarGrid
      v-for="month in grid"
      :key="month.value.toString()"
      role="grid"
      :aria-labelledby="headingId"
      class="border-collapse select-none"
    >
      <!-- Reka renders `role="application"` here, which hands every key
            straight to the page and takes the table's own semantics away
            with it. A calendar is a grid: `role="grid"` is what makes the
            cells rows and columns to a screen reader rather than 42
            unrelated buttons, and the arrow-key handling Reka installs on
            the cells is what a grid promises anyway.

            The rows and cells below are laid out by the table itself
            rather than by flex, and that is load-bearing: `display: flex`
            on a `tr` drops its implicit `row` mapping in Chromium and
            WebKit, which leaves `role="gridcell"` inside a grid with no
            row between them — a broken grid that looks identical. -->
      <CalendarGridHead>
        <CalendarGridRow>
          <CalendarHeadCell
            v-for="(day, index) in weekDays"
            :key="index"
            class="w-9 text-xs font-normal text-muted-foreground"
          >
            {{ day }}
          </CalendarHeadCell>
        </CalendarGridRow>
      </CalendarGridHead>

      <CalendarGridBody>
        <CalendarGridRow v-for="(week, weekIndex) in month.rows" :key="weekIndex">
          <CalendarCell
            v-for="day in week"
            :key="day.toString()"
            :date="day"
            class="p-0 text-center"
          >
            <!-- The `:aria-label` below replaces one Reka writes inside its
                  own render function, reaching the DOM node as a fallthrough
                  attribute that Vue merges last. Removing it falls back not
                  to English but to the engine's own locale-formatted cell
                  names. -->
            <CalendarCellTrigger
              v-slot="{ dayValue, today }"
              :day="day"
              :month="month.value"
              :aria-label="dayLabel(day)"
              :aria-current="isDateToday(day) ? 'date' : undefined"
              class="group relative inline-flex h-9 w-9 items-center justify-center rounded-sm text-sm text-foreground transition-colors duration-fast ease-out hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo data-[outside-view]:text-muted-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:line-through [&[data-disabled]:not([data-selected])]:text-muted-foreground"
            >
              {{ dayValue }}
              <!-- Today's second cue. The dot is decoration to a screen
                   reader — `aria-current` on the cell is what it reads — but
                   it is the whole cue for a reader who is looking at the
                   grid, and it is a shape rather than a hue so it survives a
                   colour deficiency and forced-colors both. -->
              <span
                v-if="today"
                aria-hidden="true"
                class="absolute bottom-1 h-1 w-1 rounded-full bg-primary group-data-[selected]:bg-primary-foreground"
              />
            </CalendarCellTrigger>
          </CalendarCell>
        </CalendarGridRow>
      </CalendarGridBody>
    </CalendarGrid>
  </CalendarRoot>
</template>
