<script lang="ts">
import type { LabelOf } from "../../lib/labels";
import type {
  CalendarPanelLabels,
  DateSegmentLabels,
  RangeCellLabels,
  TimeSegmentLabels,
} from "../../lib/date-labels";
import { optional } from "../../lib/props";

/**
 * A span between two instants as the outside world holds it: two plain ISO
 * local date-time strings, `"YYYY-MM-DDTHH:mm"`, both optional.
 *
 * The shape is `DateRange`'s and the reasoning behind it is `DateRange`'s — a
 * half-made range has to be representable, and `range.start` reads where
 * `range[0]` needs a comment. What is deliberately not shared is the **name**.
 * Two identically-shaped types whose strings are in different formats are
 * exactly what distinct names are for: a `DateRange` handed to this control
 * loses its times, and a `DateTimeRange` handed to DateRangePicker carries a
 * `T09:30` no calendar day can hold. One name for both would let either mistake
 * compile.
 */
export interface DateTimeRange {
  /** The instant the span opens at, ISO `"YYYY-MM-DDTHH:mm"`. Absent while nothing has been chosen. */
  start?: string | undefined;
  /** The instant the span closes at, ISO `"YYYY-MM-DDTHH:mm"`. Absent while only the start has been chosen. */
  end?: string | undefined;
}

/**
 * The strings this control says that no other member of the family says: the
 * two half-group names and the status line above the grids.
 *
 * They are **not** shared with `DateRangePicker`, which says both in different
 * words and from different facts — `Start date` against `Start date and time`,
 * a count of whole days against a signed duration. A key shared between them
 * would have to be a sentence that is never true of both. Its calendar cells'
 * names *are* shared, in `rangeCell`, because those differ in neither.
 *
 * The segment names and the calendar chrome, which every one of the five
 * shares, come from `src/lib/date-labels.ts` too.
 */
export interface DateTimeRangeLabels {
  /** The group holding the first half of the field. Reka names a segment `hour` or `year` alone, which is ten segments and two identical sets of five names with nothing to tell the ends apart. */
  readonly startDate: string;
  /** The group holding the second half of the field. */
  readonly endDate: string;
  /**
   * The `role="status"` line above the grids — what has been chosen, what is
   * wanted next, how long the finished span is, and whether it runs backwards.
   *
   * **One message rather than four sentences and a joiner**, and that collapse
   * is what deleted this control's hand-rolled pluraliser rather than moving
   * it. `minutes` is the whole duration as a number, so a host builds "2 days
   * 3 hours" with `Intl.DurationFormat`, `Intl.PluralRules` or their own
   * translation file — Loom ships no plural engine and appends no `"s"`.
   *
   * `minutes` is **signed**: negative means the end falls before the start,
   * which within a single day only the times can decide and which nothing in
   * the grid distinguishes. It is `undefined` while the range is half made.
   *
   * `locale`, `hour12` and `seconds` arrive only because Loom's own English
   * default has to format the two instants somehow, and they are the control's
   * own props rather than anything it has already decided. A host replacing
   * this formats with whatever their application already uses and ignores all
   * three.
   */
  readonly status: LabelOf<{
    locale: string;
    start: DateValue | undefined;
    end: DateValue | undefined;
    minutes: number | undefined;
    hour12: boolean | undefined;
    seconds: boolean;
  }>;
}

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1440;

/** A date and a time in the control's locale, at the precision the field is showing. */
function formatInstant(
  locale: string,
  date: DateValue,
  hour12: boolean | undefined,
  seconds: boolean,
): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: seconds ? "medium" : "short",
    // Absent means "follow the locale", which is what an unset `hourCycle`
    // means everywhere else on this surface; a concrete `false` would force
    // 24-hour onto a reader whose locale writes AM and PM.
    ...optional({ hour12 }),
  }).format(date.toDate(getLocalTimeZone()));
}

/**
 * English's plural rule, in English's own bag, which is the only place a plural
 * rule belongs. It is not extracted, not shared, and applies to nothing a host
 * supplies: `status` hands over the minutes and receives a finished sentence,
 * so a language with one form or with six selects its own.
 */
function englishDuration(minutes: number): string {
  if (minutes === 0) return "no time at all";
  const days = Math.floor(minutes / MINUTES_PER_DAY);
  const hours = Math.floor((minutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return [
    [days, "day"],
    [hours, "hour"],
    [rest, "minute"],
  ]
    .filter(([count]) => (count as number) > 0)
    .map(([count, name]) => `${String(count)} ${String(name)}${count === 1 ? "" : "s"}`)
    .join(" ");
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const DATE_TIME_RANGE_LABELS: DateTimeRangeLabels = {
  startDate: "Start date and time",
  endDate: "End date and time",
  status: ({ locale, start, end, minutes, hour12, seconds }) => {
    const anchor = start ?? end;
    if (!anchor) return "Nothing chosen. Choose the first day of the range.";
    if (!start || !end || minutes === undefined) {
      return `${formatInstant(locale, anchor, hour12, seconds)} chosen. Choose the last day of the range.`;
    }
    const span = `${formatInstant(locale, start, hour12, seconds)} to ${formatInstant(locale, end, hour12, seconds)}`;
    if (minutes < 0) return `${span}. The end falls before the start.`;
    return `${span}, ${englishDuration(minutes)}.`;
  },
};

/**
 * Everything this control can be asked to say: the four shared slices, plus its
 * own. Annotate a bag with `LabelOverrides<DateTimeRangePickerLabels>` and never
 * with this, which is total.
 */
export type DateTimeRangePickerLabels = DateSegmentLabels &
  TimeSegmentLabels &
  CalendarPanelLabels &
  RangeCellLabels &
  DateTimeRangeLabels;
</script>

<script setup lang="ts">
import { computed, ref, useId, useTemplateRef, watch } from "vue";
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
  parseDateTime,
  toCalendarDate,
  toCalendarDateTime,
  type CalendarDateTime,
  type DateValue,
} from "@internationalized/date";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";
import { useAncestorDisabled } from "../../lib/ancestor-disabled";
import { useFieldControl } from "../../lib/field-context";
import { useLabels, type LabelOverrides } from "../../lib/labels";
import {
  CALENDAR_PANEL_LABELS,
  DATE_SEGMENT_LABELS,
  RANGE_CELL_LABELS,
  TIME_SEGMENT_LABELS,
  emptySegmentValueText,
  isDateSegmentPart,
  isTimeSegmentPart,
  type RangeCellPart,
} from "../../lib/date-labels";

/** The range as Reka models it, which is the same shape carrying calendar objects. */
type CalendarRangeValue = { start: DateValue | undefined; end: DateValue | undefined };

/** Which end of the range a segment belongs to, as Reka's field parts name it. */
type SegmentType = "start" | "end";

/** A time of day with no day attached, which is the half of an instant the calendar never touches. */
type TimeOfDay = { hour: number; minute: number; second: number };

/**
 * DateTimeRangePicker — a span between two instants: a day and a time at each
 * end, entered either by typing across one segmented field or by picking the
 * two days out of a two-month calendar. Reach for it wherever the value is a
 * window with a clock on it — a meeting, a shift, a maintenance slot, a log
 * query.
 *
 * It is the intersection of two controls that already exist, and it re-decides
 * nothing either of them settled. From
 * [DateRangePicker](../DateRangePicker/DateRangePicker.vue): the
 * `{ start, end }` model with both halves optional so a half-made range is
 * representable, the two named half-groups, the two months that stack rather
 * than dropping one below `sm`, and the `role="status"` line that gives a
 * keyboard reader what the hover preview only gives a pointer. From
 * [DateTimePicker](../DateTimePicker/DateTimePicker.vue): the local ISO
 * date-time value with no timezone in it, `min`/`max` widened to whole days on
 * the way into the calendar with instant precision re-applied here, the field
 * keyed on `${granularity}-${hourCycle}` because Reka reads both once, and the
 * rewritten hour announcement. Read those two files for the reasoning; the
 * comments below cover only what having two ends *and* a clock changes.
 *
 * **What it changes is that the round trip doubles and then grows a cross
 * term.** DateTimePicker has one time to protect through a day being picked.
 * This has the start's time, the end's time, and the case where both ends fall
 * on the same day at different times — a meeting from 09:00 to 10:00, which is
 * the single most ordinary thing anyone will bind to this control and which a
 * range calendar that refuses a repeated day, or collapses one to a single
 * instant, gets wrong. `heldTimes` below is what keeps all three.
 *
 * Ordering is inherited rather than re-decided, and the two halves of it are
 * inherited from different parents. The calendar orders **days**: clicking the
 * 20th and then the 14th gives the 14th to the 20th, because refusing the
 * second half of a backwards gesture explains nothing. It never orders
 * **times** — those are only ever the ones each half already had, so a range
 * that ends before it starts (which within one day only the times can decide)
 * is announced invalid, exactly as a typed one is, rather than silently
 * swapped. Normalising across days and quietly not within one would be the
 * trap.
 *
 * For a span of whole days reach for DateRangePicker; for one instant,
 * DateTimePicker; for a time of day with no date, TimePicker. Two
 * DateTimePickers side by side are two values and two validations, and nothing
 * between them knows that the second must not fall before the first.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself through
 * `useFieldControl()` — the row's id, the id of its hint or error line, and
 * `required` / `invalid` / `disabled` / `readonly` / `name` — so `<Field
 * label="Meeting" error="…"><DateTimeRangePicker /></Field>` needs no
 * attributes at the call site. Every prop below still wins over the row when it
 * is set, in both directions, which is why the four booleans default to
 * `undefined` rather than `false`. The row describes the span as a whole and
 * not either end: a description repeated onto both halves is read out twice for
 * one value.
 */
const props = withDefaults(
  defineProps<{
    /**
     * The chosen span, as `{ start, end }` ISO `"YYYY-MM-DDTHH:mm"` strings —
     * `"…:ss"` when `granularity` asks for seconds. Either half may be absent:
     * `{}` is nothing chosen, `{ start }` is a range half made. A bare
     * `"YYYY-MM-DD"` is accepted in either half and read as midnight that day.
     * The explicit `| undefined` is what lets `v-model` bind a ref that clears.
     */
    modelValue?: DateTimeRange | undefined;
    /** The earliest choosable instant, same format. The calendar disables every day that lies wholly before it; a time before it on the boundary day is announced invalid rather than refused. */
    min?: string;
    /** The latest choosable instant, same format. The calendar disables every day that lies wholly after it; a time after it on the boundary day is announced invalid rather than refused. */
    max?: string;
    /** How far down both halves of the field go. `"minute"` reports `"YYYY-MM-DDTHH:mm"`; `"second"` adds a seconds segment to each end and reports `"YYYY-MM-DDTHH:mm:ss"`. */
    granularity?: "minute" | "second";
    /** Whether both times read as 12-hour with an AM/PM segment or as 24-hour. Display only: the value stays 24-hour. Unset follows `locale`. */
    hourCycle?: 12 | 24;
    /** BCP 47 tag driving the order of the segments in both halves, the month and weekday names, which day a week starts on, and the 12-or-24-hour default. */
    locale?: string;
    /** How many months the calendar shows at once. Two is the default because a span is usually read across a month boundary; one is for a host that knows it is rendering into a narrow shell. */
    months?: 1 | 2;
    /** Unavailable: dims the control, refuses the calendar, and takes the field out of the tab order. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Shows the span without allowing an edit: the field stays a Tab stop and stays submitted, and the calendar button is dropped because nothing in the calendar could be chosen. Unset defers to a wrapping Field. */
    readonly?: boolean | undefined;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. An instant outside `min`/`max`, or an end before its start, does the same on its own whatever this says. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** Marks the field mandatory to assistive tech (`aria-required` on the group holding both halves). Unset defers to a wrapping Field. */
    required?: boolean | undefined;
    /** The field name for a native form post or `FormData`. Reka submits the whole span through one hidden input, as `start - end`. Unset defers to a wrapping Field. */
    name?: string;
    /**
     * Names for everything this control says out loud, as any subset of
     * `DateTimeRangePickerLabels` — the rest stay as the host's
     * `provideLoomLabels` vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application: eleven of the eighteen names replace English literals Reka UI
     * writes of its own accord, and a language is set once with
     * `provideLoomLabels`.
     */
    labels?: LabelOverrides<DateTimeRangePickerLabels>;
  }>(),
  {
    granularity: "minute",
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
  /** The chosen span as ISO `"YYYY-MM-DDTHH:mm"` strings. A half-made range arrives as `{ start }`; a cleared one as `{}`. */
  "update:modelValue": [value: DateTimeRange];
}>();

const SEGMENT_TYPES: readonly SegmentType[] = ["start", "end"];

// Five slots, one prop. There is no single `text` for the whole control because
// there is no single slot: four of the five are vocabularies this control
// shares with its siblings and only the last is its own. Naming them apart is
// what keeps a reader of the template able to see which one a binding came
// from. The one `labels` prop feeds all five — a getter returning the
// intersection satisfies each slice, and the keys a slice does not know are
// ignored by `useLabels`' own return type.
const dateText = useLabels("dateSegments", DATE_SEGMENT_LABELS, () => props.labels);
const timeText = useLabels("timeSegments", TIME_SEGMENT_LABELS, () => props.labels);
const panelText = useLabels("calendarPanel", CALENDAR_PANEL_LABELS, () => props.labels);
const cellText = useLabels("rangeCell", RANGE_CELL_LABELS, () => props.labels);
const text = useLabels("dateTimeRange", DATE_TIME_RANGE_LABELS, () => props.labels);

// Read through the refs on every call rather than resolved into a lookup table
// once: a table built in `setup` freezes the first language and every later
// switch silently does nothing. `undefined` for the `literal` separators, which
// Reka renders `aria-hidden` and which must stay unnamed.
function segmentLabel(part: string): string | undefined {
  if (isDateSegmentPart(part)) return dateText.value[part];
  return isTimeSegmentPart(part) ? timeText.value[part] : undefined;
}

// The companion to `segmentLabel`, and the reason it returns an object rather
// than a string is in `emptySegmentValueText`: Reka's `aria-valuetext` is a
// hard-coded "Empty" only while the segment holds nothing, so this replaces
// that case and leaves the filled one — a number, and the locale's own month
// name — exactly as Reka wrote it.
// The half that owns the part owns its empty message too, so a host localising
// only `timeSegments` still reaches the clock segments of this control.
function segmentValueText(part: string, value: string): { "aria-valuetext"?: string } {
  const empty = isTimeSegmentPart(part) ? timeText.value.empty : dateText.value.empty;
  return emptySegmentValueText(part, value, empty);
}

// Routed exactly as both parents route it, and for the same reasons: `class`
// sizes the whole control so it lands on the anchor, and everything else names
// or describes the value, so it lands on the `role="group"` field.
defineOptions({ inheritAttrs: false });
const { attrs, rest: fieldAttrs } = useSplitAttrs();

function fromIso(value: string | undefined): CalendarDateTime | undefined {
  if (!value) return undefined;
  try {
    // `parseDateTime` reads a bare `"YYYY-MM-DD"` as midnight that day and
    // refuses an offset or a `Z` outright — DateTimePicker carries why that
    // refusal is wanted rather than tolerated.
    return parseDateTime(value);
  } catch {
    return undefined;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Written out rather than taken from `toString()`, for the reason DateTimePicker
// gives: `toString()` always prints seconds, so a minute-granularity field would
// report a second of its own invention.
function toIso(date: DateValue): string {
  const instant = toCalendarDateTime(date);
  const stamp = `${toCalendarDate(instant).toString()}T${pad(instant.hour)}:${pad(instant.minute)}`;
  return props.granularity === "second" ? `${stamp}:${pad(instant.second)}` : stamp;
}

// The calendar chooses a day and the bounds fence an instant, so the boundary
// day is only partly available and is widened here to be reachable at all.
// DateTimePicker carries the full account — and what it gives up, `outOfRange`
// below takes back at the precision the time is actually entered.
function startOfDay(date: CalendarDateTime | undefined) {
  return date?.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
}

function endOfDay(date: CalendarDateTime | undefined) {
  return date?.set({ hour: 23, minute: 59, second: 59, millisecond: 999 });
}

const rootValue = computed(() =>
  optional({
    // Half of a range is still a range, so the two ends are converted
    // independently and an unparseable one only empties its own half. The whole
    // key is dropped when nothing at all is bound, which is what keeps an
    // unbound control uncontrolled — see `optional()`.
    modelValue: props.modelValue
      ? { start: fromIso(props.modelValue.start), end: fromIso(props.modelValue.end) }
      : undefined,
    minValue: startOfDay(fromIso(props.min)),
    maxValue: endOfDay(fromIso(props.max)),
    hourCycle: props.hourCycle,
  }),
);

// The half of the bound the calendar gave up, applied to **both** ends: a span
// whose start is an hour early is as unbookable as one whose end is an hour
// late, and Reka's own comparison now only sees the widened whole-day bounds.
const outOfRange = computed(() => {
  const lower = fromIso(props.min);
  const upper = fromIso(props.max);
  if (!lower && !upper) return false;
  return SEGMENT_TYPES.some((type) => {
    const value = fromIso(props.modelValue?.[type]);
    if (!value) return false;
    return (!!lower && value.compare(lower) < 0) || (!!upper && value.compare(upper) > 0);
  });
});

// An end before its start. DateRangePicker never had to derive this: two days
// out of a calendar are ordered by Reka on the way out, and a backwards range
// could only ever be typed. Here it can also be *built* — collapsing a span onto
// one day keeps each end's own time, and 17:00 to 09:00 is what that is — so the
// state is real however it arrived, and it is invisible without something
// saying so. The status line says it in words; this is what paints it.
const backwards = computed(() => {
  const start = fromIso(props.modelValue?.start);
  const end = fromIso(props.modelValue?.end);
  return !!start && !!end && end.compare(start) < 0;
});

/**
 * The segments are `<div role="spinbutton" tabindex="0">`, and
 * `<fieldset disabled>` reaches only `<input>`, `<button>`, `<select>` and
 * `<textarea>` — so the trigger button inside a disabled group went inert while
 * the segments beside it still typed. Measured on this branch: an empty `mm`
 * segment became `8` on an arrow key. Exactly the defect DatePicker carries,
 * and fixed exactly the way DatePicker fixes it.
 *
 * Read off the DOM rather than taken from the Field context, which publishes no
 * `disabled` on purpose — see `../../lib/ancestor-disabled.ts`.
 */
const anchor = useTemplateRef<{ $el?: Element }>("anchor");
const groupDisabled = useAncestorDisabled(() => anchor.value?.$el);

// `id` and `aria-describedby` reach this control as fallthrough attrs rather
// than props, so they are handed in as this caller's own values: a caller who
// sets either still beats the row, and the row's description is merged into
// theirs. `field.attrs` then spreads onto `DateRangePickerField` **after**
// `fieldAttrs`, which is the node both were already landing on — DatePicker.vue
// carries the full account of that position and of where Reka then puts each
// key. It is the outer field group and not either half's own group: a
// description repeated onto the start and the end is read out twice for one
// span.
//
// Neither derived error is folded in here, for DateTimePicker's reason: three
// separate claims — the host called this wrong, the instants miss the bounds
// the host declared, the span runs backwards — cannot be carried by one
// resolved boolean. What they share is the error *presentation*, `errored`.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  ariaLabelledby: attrs["aria-labelledby"] as string | undefined,
  name: props.name,
  // The fieldset beats the prop in both directions, exactly as it does for the
  // trigger button inside this very control.
  disabled: groupDisabled.value ? true : props.disabled,
  readonly: props.readonly,
  invalid: props.invalid,
  required: props.required,
}));

// `aria-labelledby` for the group, resolved against the row — DatePicker's
// reasoning, and the same three-way guard.
const groupLabelledBy = computed(() =>
  attrs["aria-label"] || attrs["aria-labelledby"] ? undefined : field.labelledBy,
);

const errored = computed(() => field.invalid || outOfRange.value || backwards.value);

// Owned here rather than left to Reka's `closeOnSelect`, for the reason
// DatePicker gives, and closing on the *second* choice for the reason
// DateRangePicker gives: the panel stays open over a half-made range because
// the reader is not finished.
const open = ref(false);

/**
 * The time each half last carried.
 *
 * Every calendar cell carries the placeholder's time, and the placeholder
 * follows the *start*. That is the whole round trip in DateTimePicker and it is
 * only half of one here: picking the end's day out of the calendar would give
 * the end the start's time. Worse, Reka's two-click protocol drops the end
 * outright on the click that begins a new range, so by the second click the
 * end's own time is nowhere in the model to be read back.
 *
 * So it is remembered here, and deliberately not as a computed: a computed over
 * `modelValue` is exactly the thing that has already gone. A half is forgotten
 * only when it is cleared while the panel is **closed** — that is a reader
 * emptying the field and meaning it, where a half missing mid-gesture is Reka's
 * protocol and its time still has an owner.
 */
const heldTimes: Record<SegmentType, TimeOfDay | undefined> = { start: undefined, end: undefined };

watch(
  () => [props.modelValue?.start, props.modelValue?.end] as const,
  ([start, end]) => {
    for (const [type, iso] of [
      ["start", start],
      ["end", end],
    ] as const) {
      const value = fromIso(iso);
      heldTimes[type] = value
        ? { hour: value.hour, minute: value.minute, second: value.second }
        : open.value
          ? heldTimes[type]
          : undefined;
    }
  },
  { immediate: true },
);

function keepTime(type: SegmentType, picked: DateValue, fromCalendar: boolean): DateValue {
  // The field is the only other thing that can move a value, and it moves the
  // time itself — re-timing what it reports would overwrite the keystroke.
  if (!fromCalendar) return picked;
  const current = fromIso(props.modelValue?.[type]);
  // A segment typed while the panel happens to be open lands on a day that has
  // not moved, and that edit's time is the one that must win. Where the day did
  // move, the held time and the current one agree anyway, so this costs
  // nothing and closes the one case where they would not.
  if (current && isSameDay(current, picked)) return picked;
  const held = heldTimes[type];
  return held ? toCalendarDateTime(picked).set(held) : picked;
}

function onRangeChange(range: CalendarRangeValue) {
  // Read before `open` is written below. While the panel is open the calendar
  // is what moved, and the calendar only ever chooses a day.
  const fromCalendar = open.value;
  if (range.start && range.end) open.value = false;
  emit(
    "update:modelValue",
    optional({
      start: range.start ? toIso(keepTime("start", range.start, fromCalendar)) : undefined,
      end: range.end ? toIso(keepTime("end", range.end, fromCalendar)) : undefined,
    }),
  );
}

function isDateToday(date: DateValue): boolean {
  return isToday(date, getLocalTimeZone());
}

// One Tab stop for the whole field, which is ten segments at the default
// settings and fourteen with AM/PM and seconds at both ends. DateRangePicker's
// roving stop, unchanged: Reka collects both halves' segments into one ordered
// set and walks it with ArrowLeft/ArrowRight, so a stop per half would be an
// arbitrary place to make a keyboard user press Tab. The remembered segment is
// keyed by half *and* part — `hour` alone names two different segments here.
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
  // Dropped when a granularity, hour-cycle or locale change takes the
  // remembered segment away — a field whose only tab stop is a seconds segment
  // that no longer exists is a field nothing can reach.
  const active =
    focusedSegment.value !== undefined && editable.includes(focusedSegment.value)
      ? focusedSegment.value
      : editable[0];
  return segmentKey(type, part) === active ? 0 : -1;
}

// Reka seeds the field's segment values from the granularity and builds its
// formatter from the hour cycle once, at setup, and watches neither — the same
// shared code, and so the same two observed symptoms TimePicker and
// DateTimePicker record. Both are structural, so the field is rebuilt rather
// than patched. `locale` is deliberately not in the key: Reka does watch that.
const shape = computed(() => `${props.granularity}-${String(props.hourCycle)}`);

/**
 * The same "13 PM" defect DateTimePicker and TimePicker document, in the same
 * shared Reka segment code: the hour publishes `aria-valuenow` off the internal
 * 24-hour value while declaring its range as 1–12. Rebuilt from what the
 * segment is actually showing, and only under an explicit 12-hour cycle — left
 * to the locale, Reka defers to the formatter and the pair already agrees. It
 * takes one half's segments at a time, because the two hours are two segments
 * showing two different numbers.
 */
function hourAnnouncement(
  segments: readonly { part: string; value: string }[],
): Record<string, string | number> | undefined {
  if (props.hourCycle !== 12) return undefined;
  const shown = Number(segments.find((segment) => segment.part === "hour")?.value);
  if (!Number.isInteger(shown)) return undefined;
  const period = segments.find((segment) => segment.part === "dayPeriod")?.value;
  return { "aria-valuenow": shown, "aria-valuetext": period ? `${shown} ${period}` : `${shown}` };
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

const MS_PER_MINUTE = 60_000;

/**
 * How long the span is, as a signed count of minutes — a number handed over,
 * never words. The `unit(count, name)` that used to append an `"s"` here was
 * English's plural rule sitting in a control that renders in every language;
 * it is deleted rather than extracted, and English's own copy of it lives in
 * `DATE_TIME_RANGE_LABELS` where nothing else inherits it.
 *
 * DateRangePicker counts **days with both ends included**, because a booking of
 * the 14th to the 20th is seven days. That rule is wrong here, and wrong in the
 * direction that matters most: it reads a meeting from 09:00 to 10:00 as "1
 * day". A span between two instants is the distance between them, so this
 * measures that instead — and signs it, so an end before its start arrives as a
 * negative rather than as a second boolean the label would have to be handed.
 *
 * Measured through UTC rather than the local zone: this value carries no
 * timezone at all, so the honest answer is wall-clock. Converting through the
 * reader's zone would add or drop an hour across a daylight-saving boundary for
 * two instants that never claimed to be in it.
 */
function spanMinutes(start: DateValue, end: DateValue): number {
  const from = toCalendarDateTime(start).toDate("UTC").getTime();
  const to = toCalendarDateTime(end).toDate("UTC").getTime();
  return Math.round((to - from) / MS_PER_MINUTE);
}

// **The accessibility decision this control inherits and has to say more in.**
// The band drawn between the anchor and the pointer is what makes a range
// calendar legible and it is worth nothing to a reader who is not looking at
// it. Reka moves the preview on `focusin` as well as `mouseenter`, which covers
// the reader who can see the grid; this line is the same information as text,
// in a `role="status"` above the grids.
//
// It says more than DateRangePicker's does because it has more to say: the two
// ends are instants, not days, so the summary names them with their times and
// reports how long the span actually is. The backwards case gets its own
// sentence — that state is now reachable within a single day, where nothing in
// the grid distinguishes it, and it must not be carried by the destructive
// border alone.
function rangeStatus(range: CalendarRangeValue): string {
  // The whole line is one label taking raw values — two instants and a signed
  // count of minutes — rather than four sentences this control joins. Which end
  // is chosen, where a duration sits in the sentence and how "2 days 3 hours"
  // is written are all properties of a language.
  return text.value.status({
    locale: props.locale,
    start: range.start,
    end: range.end,
    minutes: range.start && range.end ? spanMinutes(range.start, range.end) : undefined,
    hour12: props.hourCycle === undefined ? undefined : props.hourCycle === 12,
    seconds: props.granularity === "second",
  });
}

/**
 * A cell's part in the range, or nothing when it has none. DateRangePicker's,
 * unchanged in substance: the first day, the last and the ones between are
 * three states drawn as three shades of one colour, which survives neither a
 * colour deficiency nor forced-colors mode, so the part is named in the cell's
 * accessible name instead.
 *
 * The one-day case is the boundary that matters more here than there. A span
 * from 09:00 to 17:00 on one day is an ordinary meeting rather than a
 * degenerate range, and its single cell is genuinely both ends — announced once
 * as that, not twice as two different things.
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
// times are deliberately not in it: the cell is a day, and choosing it changes
// only the day.
function dayLabel(day: DateValue, range: CalendarRangeValue): string {
  return cellText.value.cell({ locale: props.locale, date: day, part: rangePart(day, range) });
}

const panel = ref<HTMLElement | null>(null);

// Focus lands on the day the calendar is already sitting on rather than on the
// previous-month button; DatePicker carries the reasoning.
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
    :granularity="granularity"
    prevent-deselect
    @update:model-value="onRangeChange"
  >
    <!-- Three markers rather than one spelled three ways: `data-invalid` is the
         host saying so, `data-out-of-range` is an end falling outside `min` and
         `max`, `data-backwards` is the span running the wrong way. Reka already
         spells a fourth meaning `data-invalid` on the field group below, which
         is why none of these lives there. -->
    <DateRangePickerAnchor
      ref="anchor"
      :data-invalid="field.invalid || undefined"
      :data-out-of-range="outOfRange || undefined"
      :data-backwards="backwards || undefined"
      :data-readonly="field.readonly || undefined"
      :class="cn('block w-full', attrs.class as string)"
    >
      <!-- The `aria-invalid` binding after the `v-bind` is the same narrow
           exception DateTimePicker makes: everywhere else the rule is to delete
           it rather than overwrite `field.attrs`' resolved value with a raw
           prop, and here it is not a raw prop — `errored` is that resolved
           value *plus* the two derived states, so it can only add the attribute
           where the spread already omitted it. -->
      <DateRangePickerField
        :key="shape"
        v-slot="{ segments }"
        v-bind="{ ...fieldAttrs, ...field.attrs }"
        :aria-labelledby="groupLabelledBy"
        :aria-invalid="errored || undefined"
        :class="
          cn(
            // The text input's own height scale, so a span sitting in a form row
            // beside a text field lines up rather than nearly lining up. No gap:
            // every separator between two segments is itself a segment, so
            // spacing them apart writes the value as `3 / 14 / 2026 , 09 : 30`.
            'flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-foreground',
            'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
            'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
            !errored && 'focus-within:shadow-halo',
            // Three resting appearances, all three painted on this group rather
            // than on the segments: ten segments and their separators, so a
            // per-segment fill would leave every slash, comma, colon and the
            // dash between the halves on `background` — a striped control.
            //
            // Read-only lifts to `subtle` and keeps its focus ring and its
            // full-strength text — a read-only span is a value on show, not an
            // unavailable control — with the rim left at `input`, because the
            // field is still a Tab stop and still submitted. Reka's own
            // `data-readonly` on this group says the same thing to assistive
            // tech, so nothing here rests on colour.
            field.readonly && 'bg-subtle',
            // Drained rather than faded, for the reason DatePicker writes out:
            // `opacity-50` took all ten segments and the dash between the halves
            // down with the box, from 14.09:1 to 2.99:1 and the dash to 2.02:1.
            // The fill drains one step past read-only, the muted text over it is
            // 4.68:1, and the rim slackens from `input` to `border` — three
            // channels, so the two states do not part on hue alone. The dash
            // declares its own colour and the segments declare none, so this one
            // line covers both by inheritance.
            field.disabled && 'cursor-not-allowed border-border bg-muted text-muted-foreground',
            // Last of the rules that name a border colour: `cn()` resolves one
            // by whichever class it saw last, so a field both in error and
            // unavailable would otherwise lose its destructive rim.
            errored && 'border-destructive focus-within:outline-destructive',
          )
        "
      >
        <!-- Each half is its own named group, as in DateRangePicker and for a
             reason this control doubles: Reka labels a segment by its part
             alone, which is ten segments and two identical sets of five names.
             The group name is announced once on entering the half rather than
             folded into every segment.

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
              v-bind="{
                ...segmentValueText(item.part, item.value),
                ...(item.part === 'hour' ? hourAnnouncement(segments[type]) : undefined),
              }"
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

        <!-- Named for what it opens, which is a calendar of days and not a
             clock: the times are entered in the segments to its left and have no
             panel. `CalendarRange` rather than DateTimePicker's `CalendarClock`
             for the same reason — what is behind the button is two months with a
             band drawn across them. Dropped entirely while read-only, as in both
             parents: Reka's `readonly` reaches the calendar and makes every
             cell's click a no-op, so the button would open a panel in which
             nothing can be chosen. -->
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
            <!-- The pagers keep their opacity where the field and the cells gave
                 it up: a chevron is a glyph, and fading one costs a reader
                 nothing. Their names live in `aria-label`, not in dimmed text. -->
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

          <!-- Two months stacked below `sm`, side by side above it — and both of
               them in the document at every width. DateRangePicker carries the
               account of why hiding one is a keyboard trap of the quiet kind. -->
          <div class="flex flex-col gap-3 sm:flex-row sm:gap-5">
            <DateRangePickerGrid
              v-for="month in grid"
              :key="month.value.toString()"
              role="grid"
              :aria-label="format(monthFormat, month.value)"
              class="border-collapse select-none"
            >
              <!-- `role="grid"` over Reka's `role="application"`, and the rows
                   laid out by the table rather than by flex: DatePicker carries
                   the reasoning for both. The name is each grid's own month
                   rather than the shared heading, because two grids sharing one
                   name leaves a reader entering the second with no idea which
                   month they are in. -->
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
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
                          'data-[outside-view]:text-muted-foreground',
                          // Out of range is colour and a strike, not a fade —
                          // DatePicker carries the measured account. The
                          // `:not([data-selected])` is there for the same reason
                          // the fills below are written that way, and the strike
                          // is what separates an unavailable day from an
                          // adjacent month's: muted too, and still pickable.
                          'data-[disabled]:pointer-events-none data-[disabled]:line-through',
                          '[&[data-disabled]:not([data-selected])]:text-muted-foreground',
                          // The four competing fills, written as `:not()` of one
                          // another so no cell ever has two backgrounds for the
                          // stylesheet to order — DateRangePicker carries why
                          // that is not something a class list can otherwise
                          // state.
                          'data-[selection-start]:bg-primary data-[selection-start]:text-primary-foreground',
                          'data-[selection-end]:bg-primary data-[selection-end]:text-primary-foreground',
                          '[&[data-selected]:not([data-selection-start]):not([data-selection-end])]:bg-primary-muted',
                          '[&[data-selected]:not([data-selection-start]):not([data-selection-end])]:text-primary',
                          '[&[data-highlighted]:not([data-selected])]:bg-subtle',
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
