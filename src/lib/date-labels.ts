import { getLocalTimeZone, type DateValue } from "@internationalized/date";
import type { LabelOf } from "./labels";

/**
 * The four slices the five date and time controls share, and the one decision
 * behind putting them here rather than five times over.
 *
 * Every other component in the library declares its own bag beside its own
 * markup, because its vocabulary is its own. These five do not have five
 * vocabularies: `DatePicker`, `DateTimePicker`, `DateRangePicker` and
 * `DateTimeRangePicker` all say *Open calendar*, *Previous month* and *Next
 * month*, and all five name the parts of a segmented field with the same
 * words — the words are Reka UI's `useDateField` and `CalendarRoot` speaking,
 * one implementation underneath all five. Declared per component that would be
 * fifty-two keys with the same twelve strings written four times, and a
 * translator doing the same work four times to make one language complete.
 *
 * **Sliced by what a control actually says, not merged into one family bag.**
 * A `TimePicker` has no calendar and never renders a month or a year, so it
 * registers `timeSegments` alone: its documented vocabulary is four keys, and a
 * consumer importing only that control ships only those four strings. One
 * shared bag for the whole family would have made every one of the five carry
 * all twenty, and would have printed keys on `TimePicker`'s API page that it
 * has no element to put them on.
 *
 * What is deliberately *not* shared is the two range controls' half-group names
 * and status lines. They name the same concepts with different words (`Start
 * date` against `Start date and time`) and from different facts (a count of
 * whole days against a signed duration in minutes), so a shared key would have
 * to be a sentence that is never true of both. Their calendar cells' names are
 * shared, because those differ in neither.
 */

/**
 * The names Reka UI's `useDateField` writes onto the day, month, year and era
 * segments — `"day,"`, `"month, "`, `"year, "`, `"era"`, each with the spacing
 * of a string it meant to concatenate.
 *
 * There is no prop for any of them. A binding on Loom's side reaches the
 * segment as a fallthrough attribute, which Vue merges onto the rendered vnode
 * *after* Reka's own render function produced it, and `mergeProps` is
 * last-write-wins for everything that is not `class`, `style` or `on*` — so
 * these replace Reka's rather than competing with it. Leave one unset and the
 * segment is not unnamed, it is named in English, which is the failure this
 * seam exists to close.
 *
 * Loom's defaults differ from Reka's by their capitalisation, which is what
 * lets a test assert *whose* string reached the DOM rather than merely what it
 * said.
 */
export interface DateSegmentLabels {
  /** The month segment of a date field. */
  readonly month: string;
  /** The day-of-month segment. */
  readonly day: string;
  /** The year segment. */
  readonly year: string;
  /**
   * The era segment, which most locales never render — `ja-JP-u-ca-japanese`
   * is the ordinary case that does.
   */
  readonly era: string;
  /**
   * What a segment with nothing in it yet reports as its value, replacing the
   * `aria-valuetext="Empty"` Reka writes on an unfilled day, month or year.
   *
   * A segment shows the locale's own placeholder — `mm`, `jj`, `aaaa` — while
   * announcing this instead, so it is the one word standing between a fully
   * localised date field and a reader who is told "Empty" in English.
   *
   * Present on this slice *and* on `TimeSegmentLabels` rather than shared
   * between them, for the reason the slices exist at all: a `TimePicker`
   * registers no `dateSegments`, and a key it could only reach through the
   * date half would be a key it could not set.
   */
  readonly empty: string;
}

/**
 * Loom's English for the date segments, co-located so it tree-shakes with the
 * controls that use it, and exported so a host can build a partial vocabulary
 * against the real thing rather than a transcription of it.
 */
export const DATE_SEGMENT_LABELS: DateSegmentLabels = {
  month: "Month",
  day: "Day",
  year: "Year",
  era: "Era",
  // "Not set" rather than Reka's own "Empty", and the difference is load-bearing
  // in the same way the capitalisation of the names above is: it is what lets a
  // test assert whose string reached the DOM. It also reads better spoken — a
  // reader is being told this field has no value yet, not that it is blank.
  empty: "Not set",
};

/**
 * The same, for the clock half of a segmented field: Reka writes `"hour, "`,
 * `"minute, "`, `"second, "` and `"AM/PM"`, and offers a prop for none of them.
 *
 * `dayPeriod` is spelled `AM or PM` rather than `AM/PM` so that it reads as
 * words when it is spoken, and so the capitalisation trick above still works on
 * the one segment whose name Reka already capitalises.
 */
export interface TimeSegmentLabels {
  /** The hour segment. */
  readonly hour: string;
  /** The minute segment. */
  readonly minute: string;
  /** The seconds segment, which only a control at second granularity renders. */
  readonly second: string;
  /** The AM/PM segment, which only a 12-hour field renders. */
  readonly dayPeriod: string;
  /** What an hour, minute or second with nothing in it yet reports. See `DateSegmentLabels.empty`. */
  readonly empty: string;
}

/** Loom's English for the time segments. See `DATE_SEGMENT_LABELS`. */
export const TIME_SEGMENT_LABELS: TimeSegmentLabels = {
  hour: "Hour",
  minute: "Minute",
  second: "Second",
  dayPeriod: "AM or PM",
  empty: "Not set",
};

/**
 * The parts each slice actually names — every key of its bag except `empty`,
 * which is a message *about* a segment rather than the name of one.
 *
 * Both the type and the set below are written out rather than derived from the
 * bags, which is what they were before `empty` joined them. Derived, the guards
 * would answer `true` for `"empty"` and narrow a part to a key that names no
 * element, and `segmentLabel` would happily return the empty message as a
 * segment's accessible name.
 */
export type DateSegmentName = Exclude<keyof DateSegmentLabels, "empty">;
export type TimeSegmentName = Exclude<keyof TimeSegmentLabels, "empty">;

const DATE_SEGMENT_PARTS = new Set<DateSegmentName>(["month", "day", "year", "era"]);
const TIME_SEGMENT_PARTS = new Set<TimeSegmentName>(["hour", "minute", "second", "dayPeriod"]);

/**
 * The six segments Reka reports as `aria-valuetext="Empty"` when they hold
 * nothing — and, not by coincidence, the six that render as digits when they
 * hold something. `dayPeriod` and `era` are absent because Reka never writes
 * "Empty" on either: an unset `dayPeriod` reads `AM` and an unset `era` reads
 * the placeholder's own era, both of which are already the locale's words.
 */
const EMPTIABLE_SEGMENT_PARTS = new Set<string>([
  "day",
  "month",
  "year",
  "hour",
  "minute",
  "second",
]);

/**
 * The `aria-valuetext` override for one segment, as an object to `v-bind`
 * rather than a string to bind directly — and that is the whole point of it.
 *
 * Reka writes `aria-valuetext="Empty"` on an unfilled segment and the number
 * on a filled one, and only the first is a hard-coded English literal: the
 * second is `${valueNow}`, and the month's `"3 - March"` takes its month name
 * from the field's own `locale`. So this replaces exactly the empty case and
 * leaves the rest alone. Binding `:aria-valuetext` directly could not do that
 * — Vue merges a fallthrough `undefined` over Reka's value and *removes* the
 * attribute, so a filled segment would lose the number it is there to read
 * out. An absent key merges as nothing at all, which is what `optional()`
 * exists for elsewhere and what returning `{}` does here.
 *
 * Emptiness is read off the digits in the segment's own displayed value, which
 * is sound in both directions for these six parts: every locale's placeholder
 * for them is letters (`mm`, `jj`, `aaaa`) and every value they can hold is
 * digits. The two parts where that would not hold are the two excluded above.
 */
export function emptySegmentValueText(
  part: string,
  value: string,
  empty: string,
): { "aria-valuetext"?: string } {
  return EMPTIABLE_SEGMENT_PARTS.has(part) && !/\d/.test(value) ? { "aria-valuetext": empty } : {};
}

/**
 * Whether a part named by Reka's `segments` slot is one this slice names.
 *
 * A guard rather than an index, because the slot also yields `literal` — the
 * slashes and colons between the segments, which Reka renders `aria-hidden`
 * and which must stay unnamed — and `timeZoneName`, which none of these five
 * controls can produce: their values parse through `parseDate`, `parseTime` and
 * `parseDateTime`, none of which yields a zoned value, and no prop on any of
 * them accepts a zone. Reka's `"timezone, "` is therefore unreachable from
 * here, and a key for it would be a key nothing could ever render.
 */
export function isDateSegmentPart(part: string): part is DateSegmentName {
  return DATE_SEGMENT_PARTS.has(part as DateSegmentName);
}

/** Whether a part named by Reka's `segments` slot belongs to the clock half. */
export function isTimeSegmentPart(part: string): part is TimeSegmentName {
  return TIME_SEGMENT_PARTS.has(part as TimeSegmentName);
}

/**
 * Everything the calendar popover says that is not a date: the panel's own
 * name, the button that opens it, and the two that page the months.
 *
 * `calendar` is Reka's `CalendarRoot`/`RangeCalendarRoot` `calendarLabel` prop,
 * whose default is the string `"Event Date"` — a name for somebody else's
 * application, published both as the grid container's `aria-label` and inside a
 * visually-hidden live region that a screen reader reads on every month change.
 * It is a documented prop rather than a hard-coded literal, so it is the one
 * name in this file that is set rather than overridden.
 *
 * `previousMonth` and `nextMonth` do replace literals: Reka writes
 * `"Previous page"` and `"Next page"` on those two buttons, which is both
 * English and wrong — what they move is a month.
 */
export interface CalendarPanelLabels {
  /** The calendar's own name, read before the month and year on entering it. */
  readonly calendar: string;
  /** The button in the field that opens the calendar popover. */
  readonly openCalendar: string;
  /** The button that pages the calendar back one month. */
  readonly previousMonth: string;
  /** The button that pages the calendar on one month. */
  readonly nextMonth: string;
}

/** Loom's English for the calendar popover. See `DATE_SEGMENT_LABELS`. */
export const CALENDAR_PANEL_LABELS: CalendarPanelLabels = {
  calendar: "Calendar",
  openCalendar: "Open calendar",
  previousMonth: "Previous month",
  nextMonth: "Next month",
};

/**
 * Which part of a chosen span one calendar cell plays, handed to the cell's
 * label rather than resolved into words by the control.
 *
 * Four sibling keys and a joiner would be four phrases a translator cannot
 * reorder around the date they qualify — and in several languages the qualifier
 * does not follow the date at all. One argument carrying the variant is what
 * keeps the whole cell name one sentence the host writes.
 */
export type RangeCellPart = "start" | "end" | "both" | "within";

/**
 * The accessible name of one day in a range calendar, shared by both range
 * controls because they say it identically and from identical facts — a day
 * and its part in the span. `DateTimeRangePicker`'s cells carry no time: the
 * cell *is* a day, and choosing it moves only the day.
 *
 * The two controls' other strings are not shared, because they differ in words
 * and in facts. This one does neither, and a translator writing it twice would
 * be writing it twice for no reason.
 */
export interface RangeCellLabels {
  /**
   * One calendar cell's accessible name, which replaces the one Reka writes
   * rather than adding to it: a cell's part in the range has to arrive *with*
   * the date, and an element has no second slot for a name.
   *
   * `part` is `undefined` for a day with no part in the range at all.
   */
  readonly cell: LabelOf<{
    locale: string;
    date: DateValue;
    part: RangeCellPart | undefined;
  }>;
}

/**
 * Loom's English for a range calendar's cells. The three fills that carry the
 * first day, the last and the ones between are three shades of one colour,
 * which survives neither a colour deficiency nor forced-colors mode — naming
 * the part is what tells them apart, and it is what makes a one-day span say so
 * once rather than announce itself twice as two different things.
 */
export const RANGE_CELL_LABELS: RangeCellLabels = {
  cell: ({ locale, date, part }) => {
    const full = formatFullDay(locale, date);
    if (part === "both") return `${full}, the whole range, first and last day`;
    if (part === "start") return `${full}, first day of the range`;
    if (part === "end") return `${full}, last day of the range`;
    return part === "within" ? `${full}, within the range` : full;
  },
};

// One formatter per locale, kept, because a range calendar's cell label runs
// forty-two to eighty-four times per render and `Intl.DateTimeFormat`'s
// constructor is the expensive half of it. The map is bounded by the number of
// locales an application actually renders, which is one in nearly every case.
const dayFormatters = new Map<string, Intl.DateTimeFormat>();

/**
 * A whole day written out — weekday, day, month and year — in the control's
 * locale, which is the half of a range cell's name that is not a qualifier.
 *
 * Exported because both range controls' English defaults need it and neither
 * should own it; a host replacing those defaults formats with whatever their
 * own application already uses and never calls this.
 */
export function formatFullDay(locale: string, date: DateValue): string {
  let formatter = dayFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    dayFormatters.set(locale, formatter);
  }
  return formatter.format(date.toDate(getLocalTimeZone()));
}
