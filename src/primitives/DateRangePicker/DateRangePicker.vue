<script lang="ts">
import type { LabelOf } from "../../lib/labels";
import type {
  CalendarPanelLabels,
  DateSegmentLabels,
  RangeCellLabels,
} from "../../lib/date-labels";

/**
 * A span of days as the outside world holds it: two plain ISO `YYYY-MM-DD`
 * strings, both optional.
 *
 * An object rather than a `[start, end]` tuple, and both halves optional
 * rather than one string with a separator in it, because **a half-made range
 * has to be representable**. Between the first click and the second there is a
 * range with a start and no end, and that state lives on screen for as long as
 * it takes a reader to decide — a tuple has to fill the second slot with
 * something, and a single string has to invent a spelling for "not yet". Both
 * end up lying about a state the control is genuinely in. `{ start }` says it.
 *
 * It reads at a call site, too: `range.start` needs no comment, `range[0]`
 * needs one.
 */
export interface DateRange {
  /** The first day of the span, ISO `YYYY-MM-DD`. Absent while nothing has been chosen. */
  start?: string | undefined;
  /** The last day of the span, ISO `YYYY-MM-DD`, and part of it. Absent while only the start has been chosen. */
  end?: string | undefined;
}

/**
 * The strings this control says that no other member of the family says: the
 * two half-group names and the status line above the grids.
 *
 * They are **not** shared with `DateTimeRangePicker`, which says both in
 * different words and from different facts — `Start date` against `Start date
 * and time`, a count of whole days against a signed duration. A key shared
 * between them would have to be a sentence that is never true of both. Its
 * calendar cells' names *are* shared, in `rangeCell`, because those differ in
 * neither.
 *
 * The segment names and the calendar chrome, which every one of the five
 * shares, come from `src/lib/date-labels.ts` too.
 */
export interface DateRangeLabels {
  /** The group holding the first half of the field. Reka names a segment `day` or `year` alone, which is two identical sets of three names with nothing to tell the ends apart. */
  readonly startDate: string;
  /** The group holding the second half of the field. */
  readonly endDate: string;
  /**
   * The `role="status"` line above the grids — what has been chosen, what is
   * wanted next, and how long the finished span is.
   *
   * One message rather than four phrases and a joiner. Which end is chosen,
   * whether a count follows the dates or precedes them, and how "7 days" is
   * written are all properties of a language, and a control that emitted them
   * as separate nodes would have decided all three in English.
   *
   * `days` counts **both ends**, which is how a reader counts a booking: the
   * 14th to the 20th is seven days. It arrives as a number so the plural
   * category is the host's to select — Loom ships no plural engine — and
   * `locale` arrives with it only because Loom's own English default has to
   * format the two dates somehow. A host replacing this formats with whatever
   * their application already uses and ignores it.
   */
  readonly status: LabelOf<{
    locale: string;
    start: DateValue | undefined;
    end: DateValue | undefined;
    days: number | undefined;
  }>;
}

/** A day, month and year in the control's locale — the status line's own shape, without the weekday a cell's name carries. */
function formatDay(locale: string, date: DateValue): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date.toDate(getLocalTimeZone()));
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 *
 * The `day`/`days` choice below is English's plural rule sitting in English's
 * own bag, which is the only place a plural rule belongs. It is not extracted,
 * shared or applied to anything a host supplies: `status` hands over the number
 * and receives a finished sentence, so a language with one form or with six
 * selects its own.
 */
export const DATE_RANGE_LABELS: DateRangeLabels = {
  startDate: "Start date",
  endDate: "End date",
  status: ({ locale, start, end, days }) => {
    const anchor = start ?? end;
    if (!anchor) return "No dates chosen. Choose the first day of the range.";
    if (!start || !end || days === undefined) {
      return `${formatDay(locale, anchor)} chosen. Choose the last day of the range.`;
    }
    return `${formatDay(locale, start)} to ${formatDay(locale, end)}, ${String(days)} ${days === 1 ? "day" : "days"}.`;
  },
};

/**
 * Everything this control can be asked to say: the three shared slices, plus
 * its own. Annotate a bag with
 * `LabelOverrides<DateRangePickerLabels>` and never with this, which is total.
 */
export type DateRangePickerLabels = DateSegmentLabels &
  CalendarPanelLabels &
  RangeCellLabels &
  DateRangeLabels;
</script>

<script setup lang="ts">
import { computed, ref, useId } from "vue";
import {
  DateRangePickerRoot,
  DateRangePickerAnchor,
  DateRangePickerField,
  DateRangePickerInput,
  DateRangePickerTrigger,
  DateRangePickerContent,
  DateRangePickerCalendar,
  DateRangePickerHeader,
  DateRangePickerPrev,
  DateRangePickerHeading,
  DateRangePickerNext,
  DateRangePickerGrid,
  DateRangePickerGridHead,
  DateRangePickerGridRow,
  DateRangePickerHeadCell,
  DateRangePickerGridBody,
  DateRangePickerCell,
  DateRangePickerCellTrigger,
} from "reka-ui";
import { CalendarRange, ChevronLeft, ChevronRight } from "@lucide/vue";
import {
  getLocalTimeZone,
  isSameDay,
  isToday,
  parseDate,
  toCalendarDate,
  type DateValue,
} from "@internationalized/date";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";
import { useFieldControl } from "../../lib/field-context";
import { optional } from "../../lib/props";
import { useLabels, type LabelOverrides } from "../../lib/labels";
import {
  CALENDAR_PANEL_LABELS,
  DATE_SEGMENT_LABELS,
  RANGE_CELL_LABELS,
  emptySegmentValueText,
  isDateSegmentPart,
  type RangeCellPart,
} from "../../lib/date-labels";

/** The range as Reka models it, which is the same shape carrying calendar objects. */
type CalendarRangeValue = { start: DateValue | undefined; end: DateValue | undefined };

/** Which end of the range a segment belongs to, as Reka's field parts name it. */
type SegmentType = "start" | "end";

/**
 * DateRangePicker — a span of days with a first and a last, entered either by
 * typing both ends into one segmented field or by picking them out of a
 * two-month calendar. Reach for it wherever the value is the window rather
 * than the day: a report period, a booking, a filter over a table.
 *
 * It is DatePicker with two ends. Everything that control decides, this one
 * inherits and does not restate: the segmented field rather than a native
 * input, the roving tabindex that makes the whole field one Tab stop, the
 * popover owning its own open state rather than trusting a host to echo a
 * value back, the calendar laid out by a real table because `display: flex` on
 * a `tr` drops its row semantics, and the panel animating as one piece with no
 * per-cell stagger. Read `DatePicker.vue` for the reasoning behind each; the
 * comments below cover only what having two ends changes.
 *
 * **The model value is a pair of plain ISO date strings** — see `DateRange`
 * above for why it is an object with two optional halves rather than a tuple.
 * As in DatePicker, `min`, `max` and both emitted halves speak that one
 * format, and a value that does not parse is read as *not chosen* rather than
 * thrown on.
 *
 * Choosing the end before the start is not an error and is not refused: the
 * two are sorted on the way out, so a reader who clicks the 20th and then the
 * 14th gets `{ start: "…-14", end: "…-20" }`. Refusing it would mean a control
 * that rejects the second half of every backwards gesture with nothing on
 * screen explaining what it wanted instead.
 *
 * For a single day reach for DatePicker; for a day and a time together,
 * DateTimePicker. Two DatePickers side by side are two values and two
 * validations, and nothing between them knows that the second must not fall
 * before the first — which is the whole reason this control exists.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself through
 * `useFieldControl()` — the row's id, the id of its hint or error line, and
 * `required` / `invalid` / `disabled` / `readonly` / `name` — so `<Field
 * label="Report period" error="…"><DateRangePicker /></Field>` needs no
 * attributes at the call site. Every prop below still wins over the row when it
 * is set, in both directions, which is why the four booleans default to
 * `undefined` rather than `false`. The row describes the field as a whole and
 * not either half: a description repeated onto both ends would be read out
 * twice for one span.
 */
const props = withDefaults(
  defineProps<{
    /**
     * The chosen span, as `{ start, end }` ISO `YYYY-MM-DD` strings. Either
     * half may be absent: `{}` is nothing chosen, `{ start }` is a range
     * half made. The explicit `| undefined` is what lets `v-model` bind a ref
     * that clears.
     */
    modelValue?: DateRange | undefined;
    /** The earliest choosable day, ISO `YYYY-MM-DD`. Days before it are announced disabled and skipped by the keyboard. */
    min?: string;
    /** The latest choosable day, ISO `YYYY-MM-DD`. Days after it are announced disabled and skipped by the keyboard. */
    max?: string;
    /** BCP 47 tag driving the order of the field's segments, the month and weekday names, and which day a week starts on. */
    locale?: string;
    /** How many months the calendar shows at once. Two is the default because a range is usually read across a month boundary; one is for a host that knows it is rendering into a narrow shell. */
    months?: 1 | 2;
    /** Unavailable: dims the control, refuses the calendar, and takes the field out of the tab order. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Shows the span without allowing an edit: the field stays a Tab stop and stays submitted, and the calendar button is dropped because nothing in the calendar could be chosen. Unset defers to a wrapping Field. */
    readonly?: boolean | undefined;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** Marks the field mandatory to assistive tech (`aria-required` on the group holding both halves). Unset defers to a wrapping Field. */
    required?: boolean | undefined;
    /** The field name for a native form post or `FormData`. Reka submits the whole span through one hidden input, as `start - end`. Unset defers to a wrapping Field. */
    name?: string;
    /**
     * Names for everything this control says out loud, as any subset of
     * `DateRangePickerLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application: six of the thirteen names replace English literals Reka UI
     * writes of its own accord, and a language is set once with
     * `provideLoomLabels`.
     */
    labels?: LabelOverrides<DateRangePickerLabels>;
  }>(),
  {
    locale: "en",
    months: 2,
    // Not `false`, for any of the four — TextField.vue carries the full
    // reasoning: `false` is a caller's decision that must beat the row, absent
    // is a caller saying nothing, and only `undefined` survives to mean that
    // past Vue's absent-Boolean-casts-to-false rule.
    disabled: undefined,
    readonly: undefined,
    invalid: undefined,
    required: undefined,
  },
);

const emit = defineEmits<{
  /** The chosen span as ISO `YYYY-MM-DD` strings. A half-made range arrives as `{ start }`; a cleared one as `{}`. */
  "update:modelValue": [value: DateRange];
}>();

const SEGMENT_TYPES: readonly SegmentType[] = ["start", "end"];

// Four slots, one prop. There is no single `text` for the whole control
// because there is no single slot: the segment names and the popover's chrome
// are shared vocabularies with their own registry entries, and only the third
// is this control's own. Naming them apart is what keeps a reader of the
// template able to see which one a binding came from.
const dateText = useLabels("dateSegments", DATE_SEGMENT_LABELS, () => props.labels);
const panelText = useLabels("calendarPanel", CALENDAR_PANEL_LABELS, () => props.labels);
const cellText = useLabels("rangeCell", RANGE_CELL_LABELS, () => props.labels);
const text = useLabels("dateRange", DATE_RANGE_LABELS, () => props.labels);

// Read through the ref on every call rather than resolved into a lookup table
// once: a table built in `setup` freezes the first language and every later
// switch silently does nothing. `undefined` for the `literal` separators, which
// Reka renders `aria-hidden` and which must stay unnamed.
function segmentLabel(part: string): string | undefined {
  return isDateSegmentPart(part) ? dateText.value[part] : undefined;
}

// The companion to `segmentLabel`, and the reason it returns an object rather
// than a string is in `emptySegmentValueText`: Reka's `aria-valuetext` is a
// hard-coded "Empty" only while the segment holds nothing, so this replaces
// that case and leaves the filled one — a number, and the locale's own month
// name — exactly as Reka wrote it.
function segmentValueText(part: string, value: string): { "aria-valuetext"?: string } {
  return emptySegmentValueText(part, value, dateText.value.empty);
}

// Routed exactly as DatePicker routes it, and for the same reasons: `class`
// sizes the whole control so it lands on the anchor, and everything else names
// or describes the value, so it lands on the `role="group"` field.
defineOptions({ inheritAttrs: false });
const { attrs, rest: fieldAttrs } = useSplitAttrs();

// `id` and `aria-describedby` reach this control as fallthrough attrs rather
// than props, so they are handed in as this caller's own values: a caller who
// sets either still beats the row, and the row's description is merged into
// theirs. `field.attrs` then spreads onto `DateRangePickerField` **after**
// `fieldAttrs`, which is the node both were already landing on — DatePicker.vue
// carries the full account of that position and of where Reka then puts each
// key. It is the outer field group and not either half's own group, which is
// the point: a description repeated onto the start and the end is read out
// twice for one span. The `:aria-invalid` binding that used to sit there went
// with it — an individual attribute after a `v-bind` wins, so keeping one would
// overwrite the resolved value.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  name: props.name,
  disabled: props.disabled,
  readonly: props.readonly,
  invalid: props.invalid,
  required: props.required,
}));

function fromIso(value: string | undefined): DateValue | undefined {
  if (!value) return undefined;
  try {
    return parseDate(value);
  } catch {
    return undefined;
  }
}

function toIso(date: DateValue): string {
  return toCalendarDate(date).toString();
}

const rootValue = computed(() =>
  optional({
    // Half of a range is still a range, so the two ends are converted
    // independently and an unparseable one only empties its own half. The
    // whole key is dropped when nothing at all is bound, which is what keeps
    // an unbound control uncontrolled — see `optional()`.
    modelValue: props.modelValue
      ? { start: fromIso(props.modelValue.start), end: fromIso(props.modelValue.end) }
      : undefined,
    minValue: fromIso(props.min),
    maxValue: fromIso(props.max),
  }),
);

// Owned here rather than left to Reka's `closeOnSelect`, for the reason
// DatePicker gives. What differs is *when*: a range is not chosen until both
// ends are, so the panel stays open over a half-made selection. Closing on the
// first click would hide the calendar exactly when the reader still needs it.
const open = ref(false);

function onRangeChange(range: CalendarRangeValue) {
  if (range.start && range.end) open.value = false;
  emit(
    "update:modelValue",
    optional({
      start: range.start ? toIso(range.start) : undefined,
      end: range.end ? toIso(range.end) : undefined,
    }),
  );
}

function isDateToday(date: DateValue): boolean {
  return isToday(date, getLocalTimeZone());
}

// One Tab stop for the whole field, not six. The roving stop is DatePicker's,
// widened: Reka collects the start's segments and the end's into a single
// ordered set and walks it with ArrowLeft/ArrowRight, so the two halves are
// one continuous run and a stop per half would be an arbitrary place to make
// a keyboard user press Tab. The remembered segment is therefore keyed by
// half *and* part — `year` alone names two different segments here.
const focusedSegment = ref<string>();

function segmentKey(type: SegmentType, part: string): string {
  return `${type}:${part}`;
}

function segmentTabIndex(
  type: SegmentType,
  part: string,
  segments: Record<SegmentType, readonly { part: string }[]>,
): number | undefined {
  // Read-only keeps every stop it had, unlike disabled: the span is on show and
  // a reader still arrows across the segments to read it.
  if (field.disabled || part === "literal") return undefined;
  const editable = SEGMENT_TYPES.flatMap((each) =>
    segments[each]
      .filter((segment) => segment.part !== "literal")
      .map((segment) => segmentKey(each, segment.part)),
  );
  // Dropped when a locale change takes the remembered segment away, exactly as
  // in DatePicker: a field with no tab stop is unreachable.
  const active =
    focusedSegment.value !== undefined && editable.includes(focusedSegment.value)
      ? focusedSegment.value
      : editable[0];
  return segmentKey(type, part) === active ? 0 : -1;
}

const headingId = useId();

// Each grid's own name is formatted here rather than read off Reka because it
// is needed in the parent scope of the cells, where Reka's slot props are not
// in scope — and it is a date rather than a label, so `Intl` and `locale` are
// the whole answer. A Thai reader gets a Buddhist year in it, as in the field.
const monthFormat = computed(
  () => new Intl.DateTimeFormat(props.locale, { month: "long", year: "numeric" }),
);

function format(formatter: Intl.DateTimeFormat, date: DateValue): string {
  return formatter.format(date.toDate(getLocalTimeZone()));
}

const MS_PER_DAY = 86_400_000;

/** Days in the span counting both ends, which is how a reader counts a booking. */
function spanLength(start: DateValue, end: DateValue): number {
  const from = toCalendarDate(start).toDate("UTC").getTime();
  const to = toCalendarDate(end).toDate("UTC").getTime();
  return Math.round((to - from) / MS_PER_DAY) + 1;
}

// **This is the accessibility decision this control turns on.** The band of
// highlight drawn between the anchor and the pointer is what makes a range
// calendar legible, and it is worth nothing to a reader who is not looking at
// it: the preview is a hover state, and a hover state has no reader.
//
// Reka gets a keyboard reader half of it for free — it moves the preview on
// `focusin` as well as on `mouseenter`, so arrowing across the grid drags the
// band along. That covers the reader who can see the grid and is not using a
// pointer. It does nothing for the one who cannot.
//
// So the same information is published as text, in a `role="status"` line
// above the grids: which end has been chosen, what is wanted next, and once
// both are in, the span and how long it is. It changes exactly when the
// selection changes, which is what makes it announceable — a summary that
// moved with every arrow key would be read over the cell the reader had just
// landed on. The per-cell half of the story is `dayLabel` below.
function rangeStatus(range: CalendarRangeValue): string {
  // The whole sentence is one label taking raw values — the two ends and a
  // count — rather than phrases this control joins. The `day`/`days` choice
  // that used to live here was English's plural rule written into a component
  // that renders in every language; it now lives in `DATE_RANGE_LABELS`, where
  // it applies to English and to nothing else.
  return text.value.status({
    locale: props.locale,
    start: range.start,
    end: range.end,
    days: range.start && range.end ? spanLength(range.start, range.end) : undefined,
  });
}

/**
 * A cell's part in the range, or nothing when it has none.
 *
 * The first, the last and every day between are three different states, and
 * the fills that carry them are three shades of one colour — which is a
 * distinction that survives neither a colour deficiency nor forced-colors
 * mode. Reka's own `aria-pressed` separates "in the range" from "outside it"
 * and stops there, so the three read identically to a screen reader. Naming
 * the part in the cell's accessible name is what tells them apart, and it is
 * also what makes the boundary case — a one-day range, where the first day is
 * also the last — say so rather than being announced twice as two things.
 */
function rangePart(day: DateValue, range: CalendarRangeValue): RangeCellPart | undefined {
  const isStart = range.start !== undefined && isSameDay(day, range.start);
  const isEnd = range.end !== undefined && isSameDay(day, range.end);
  if (isStart && isEnd) return "both";
  if (isStart) return "start";
  if (isEnd) return "end";
  if (range.start && range.end && day.compare(range.start) > 0 && day.compare(range.end) < 0) {
    return "within";
  }
  return undefined;
}

// Reka labels every cell with its full date already; this replaces that label
// rather than adding to it, because a cell's part in the range has to arrive
// *with* the date and there is no second slot on an element for a name. The
// date and the part are handed over raw: which side of the date the qualifier
// belongs on is a property of the language, not of this control.
function dayLabel(day: DateValue, range: CalendarRangeValue): string {
  return cellText.value.cell({ locale: props.locale, date: day, part: rangePart(day, range) });
}

const panel = ref<HTMLElement | null>(null);

function onOpenAutoFocus(event: Event) {
  const day = panel.value?.querySelector<HTMLElement>(
    '[data-reka-calendar-cell-trigger][tabindex="0"]',
  );
  if (!day) return;
  event.preventDefault();
  day.focus();
}
</script>

<template>
  <DateRangePickerRoot
    v-slot="{ modelValue: range }"
    v-model:open="open"
    v-bind="rootValue"
    :locale="locale"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :number-of-months="months"
    granularity="day"
    prevent-deselect
    @update:model-value="onRangeChange"
  >
    <!-- The invalid marker is on the control as a whole, not on the field:
         Reka spells its own `data-invalid` on the field group already, and
         there it means that the *typed* range is out of bounds or runs
         backwards. Same reasoning as DatePicker. -->
    <DateRangePickerAnchor
      :data-invalid="field.invalid || undefined"
      :data-readonly="field.readonly || undefined"
      :class="cn('block w-full', attrs.class as string)"
    >
      <DateRangePickerField
        v-slot="{ segments }"
        v-bind="{ ...fieldAttrs, ...field.attrs }"
        :class="
          cn(
            'flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-foreground',
            'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
            'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
            !field.invalid && 'focus-within:shadow-halo',
            field.invalid && 'border-destructive focus-within:outline-destructive',
            // Filled rather than dimmed, and it keeps its focus ring — a
            // read-only span is a value on show, not an unavailable control.
            // Reka's own `data-readonly` on this group says the same thing to
            // assistive tech, so nothing here rests on colour.
            field.readonly && 'bg-muted',
            field.disabled && 'cursor-not-allowed opacity-50',
          )
        "
      >
        <!-- Each half is its own named group. Reka labels a segment by its
             part alone — "month", "day", "year" — which is six segments and
             two identical sets of three names, and no way for a screen reader
             to tell which end of the range it is sitting in. The group is
             where that name belongs: it is announced once on entering the
             half, rather than folded into every segment.

             Every `:aria-label` from here down replaces one Reka writes in
             English inside its own render function, reaching the DOM node as a
             fallthrough attribute that Vue merges last. Removing one falls back
             not to nothing but to Reka's English. -->
        <template v-for="(type, typeIndex) in SEGMENT_TYPES" :key="type">
          <span v-if="typeIndex > 0" aria-hidden="true" class="px-1.5 text-muted-foreground"
            >–</span
          >

          <div
            role="group"
            :aria-label="type === 'start' ? text.startDate : text.endDate"
            class="flex items-center"
          >
            <DateRangePickerInput
              v-for="(item, index) in segments[type]"
              :key="index"
              :part="item.part"
              :type="type"
              :tabindex="segmentTabIndex(type, item.part, segments)"
              :aria-label="segmentLabel(item.part)"
              v-bind="segmentValueText(item.part, item.value)"
              :class="
                cn(
                  'tabular rounded-sm px-0.5 outline-none',
                  'transition-colors duration-instant ease-out',
                  'focus:bg-primary-muted focus:text-primary',
                  'data-[placeholder]:text-muted-foreground',
                  item.part === 'literal' && 'text-muted-foreground',
                )
              "
              @focusin="focusedSegment = segmentKey(type, item.part)"
            >
              {{ item.value }}
            </DateRangePickerInput>
          </div>
        </template>

        <!-- Dropped entirely while read-only, as in DatePicker: Reka's
             `readonly` reaches the calendar and makes every cell's click a
             no-op, so the button would open a panel in which no range can be
             chosen. The segments are still there to read the span off. -->
        <DateRangePickerTrigger
          v-if="!field.readonly"
          :aria-label="panelText.openCalendar"
          class="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed"
        >
          <CalendarRange class="h-4 w-4" />
        </DateRangePickerTrigger>
      </DateRangePickerField>
    </DateRangePickerAnchor>

    <DateRangePickerContent
      align="start"
      :side-offset="6"
      :class="
        cn(
          'z-50 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none',
          // Scoped to the open state, never unconditional — DatePicker carries
          // the full account of why.
          'data-[state=open]:animate-fade-rise',
        )
      "
      @open-auto-focus="onOpenAutoFocus"
    >
      <div ref="panel" class="flex flex-col gap-3">
        <!-- `calendarLabel` is a real Reka prop rather than a literal to
             override, and it defaults to `"Event Date"`. It is published twice:
             as the calendar container's `aria-label`, and inside a
             visually-hidden live region Reka renders itself, which a
             fallthrough attribute could not have reached. -->
        <DateRangePickerCalendar v-slot="{ grid, weekDays }" :calendar-label="panelText.calendar">
          <DateRangePickerHeader class="flex items-center justify-between gap-2">
            <DateRangePickerPrev
              :aria-label="panelText.previousMonth"
              class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <ChevronLeft class="h-4 w-4" />
            </DateRangePickerPrev>

            <DateRangePickerHeading
              :id="headingId"
              aria-live="polite"
              class="text-sm font-medium text-foreground"
            />

            <DateRangePickerNext
              :aria-label="panelText.nextMonth"
              class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <ChevronRight class="h-4 w-4" />
            </DateRangePickerNext>
          </DateRangePickerHeader>

          <p role="status" class="text-xs text-muted-foreground">{{ rangeStatus(range) }}</p>

          <!-- Two months stacked below `sm`, side by side above it — and both
               of them in the document at every width. Hiding the second one
               instead would be a keyboard trap of the quiet kind: Reka walks
               the arrow keys by looking up the next day's `[data-value]` in
               the panel and calling `focus()` on it, and `display: none`
               leaves the element findable and unfocusable, so the reader
               presses ArrowRight at the end of the first month and nothing at
               all happens. A tall panel is a worse layout; a silent dead end
               is a worse control. -->
          <div class="flex flex-col gap-3 sm:flex-row sm:gap-5">
            <DateRangePickerGrid
              v-for="month in grid"
              :key="month.value.toString()"
              role="grid"
              :aria-label="format(monthFormat, month.value)"
              class="border-collapse select-none"
            >
              <!-- `role="grid"` over Reka's `role="application"`, and the rows
                   laid out by the table rather than by flex: DatePicker
                   carries the reasoning for both. The name is each grid's own
                   month rather than the shared heading, because two grids
                   sharing one name leaves a reader entering the second with
                   no idea which month they are in. -->
              <DateRangePickerGridHead>
                <DateRangePickerGridRow>
                  <DateRangePickerHeadCell
                    v-for="(day, index) in weekDays"
                    :key="index"
                    class="w-9 text-xs font-normal text-muted-foreground"
                  >
                    {{ day }}
                  </DateRangePickerHeadCell>
                </DateRangePickerGridRow>
              </DateRangePickerGridHead>

              <DateRangePickerGridBody>
                <DateRangePickerGridRow v-for="(week, weekIndex) in month.rows" :key="weekIndex">
                  <DateRangePickerCell
                    v-for="day in week"
                    :key="day.toString()"
                    :date="day"
                    class="p-0 text-center"
                  >
                    <DateRangePickerCellTrigger
                      v-slot="{ dayValue, today }"
                      :day="day"
                      :month="month.value"
                      :aria-label="dayLabel(day, range)"
                      :aria-current="isDateToday(day) ? 'date' : undefined"
                      :class="
                        cn(
                          'group relative inline-flex h-9 w-9 items-center justify-center rounded-sm text-sm text-foreground',
                          'transition-colors duration-fast ease-out hover:bg-subtle',
                          // The outline sits outside the cell and the halo
                          // outside that, so neither is painted over by the
                          // fill of the day beside it — which is what keeps
                          // the focused day findable in the middle of a
                          // filled band.
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
                          'data-[outside-view]:text-muted-foreground',
                          'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                          // Four fills compete on one cell — the two ends, the
                          // days between, and the uncommitted preview — and
                          // between two variants of the same property the
                          // winner is whichever Tailwind emits last, which is
                          // not something a class list can state. Writing the
                          // three weaker ones as `:not()` of the stronger
                          // makes them mutually exclusive, so no cell ever has
                          // two backgrounds to order and the result does not
                          // depend on generated stylesheet order.
                          'data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground',
                          'data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground',
                          '[&[data-selected]:not([data-selection-start]):not([data-selection-end])]:bg-primary-muted',
                          '[&[data-selected]:not([data-selection-start]):not([data-selection-end])]:text-primary',
                          // The preview is deliberately the neutral hover
                          // surface rather than a wash of the action colour:
                          // it is a proposal, and it must not read as a range
                          // that has already been made.
                          '[&[data-highlighted]:not([data-selected])]:bg-subtle',
                          // Square in the middle so the band reads as one
                          // stretch of days rather than a row of pills.
                          '[&[data-selected]:not([data-selection-start]):not([data-selection-end])]:rounded-none',
                          '[&[data-highlighted]:not([data-highlighted-start]):not([data-highlighted-end])]:rounded-none',
                        )
                      "
                    >
                      {{ dayValue }}
                      <span
                        v-if="today"
                        aria-hidden="true"
                        class="absolute bottom-1 h-1 w-1 rounded-full bg-primary group-data-[selection-start]:bg-primary-foreground group-data-[selection-end]:bg-primary-foreground"
                      />
                    </DateRangePickerCellTrigger>
                  </DateRangePickerCell>
                </DateRangePickerGridRow>
              </DateRangePickerGridBody>
            </DateRangePickerGrid>
          </div>
        </DateRangePickerCalendar>
      </div>
    </DateRangePickerContent>
  </DateRangePickerRoot>
</template>
