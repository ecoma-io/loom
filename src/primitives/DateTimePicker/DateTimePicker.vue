<script lang="ts">
import type {
  CalendarPanelLabels,
  DateSegmentLabels,
  TimeSegmentLabels,
} from "../../lib/date-labels";

/**
 * Everything this control publishes to assistive technology, which is three
 * shared slices and nothing of its own: the date half of the field's segments,
 * the clock half, and the calendar popover's chrome. All three are declared in
 * `src/lib/date-labels.ts`, because the other four members of this family say
 * the same words for the same reason — they are one Reka implementation
 * underneath.
 *
 * An intersection rather than a fourth interface, so this name is the type a
 * consumer annotates their own bag with and each slice stays one definition.
 * Annotate with `LabelOverrides<DateTimePickerLabels>` and never with this,
 * which is total.
 */
export type DateTimePickerLabels = DateSegmentLabels & TimeSegmentLabels & CalendarPanelLabels;
</script>

<script setup lang="ts">
import { computed, ref, useId, useTemplateRef } from "vue";
import {
  DatePickerRoot,
  DatePickerAnchor,
  DatePickerField,
  DatePickerInput,
  DatePickerTrigger,
  DatePickerContent,
  DatePickerCalendar,
  DatePickerHeader,
  DatePickerPrev,
  DatePickerHeading,
  DatePickerNext,
  DatePickerGrid,
  DatePickerGridHead,
  DatePickerGridRow,
  DatePickerHeadCell,
  DatePickerGridBody,
  DatePickerCell,
  DatePickerCellTrigger,
} from "reka-ui";
import { CalendarClock, ChevronLeft, ChevronRight } from "@lucide/vue";
import {
  getLocalTimeZone,
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
import { optional } from "../../lib/props";
import { useLabels, type LabelOverrides } from "../../lib/labels";
import {
  CALENDAR_PANEL_LABELS,
  DATE_SEGMENT_LABELS,
  TIME_SEGMENT_LABELS,
  emptySegmentValueText,
  isDateSegmentPart,
  isTimeSegmentPart,
} from "../../lib/date-labels";

/**
 * DateTimePicker — one instant: a day and a time of day together, entered by
 * typing across a single segmented field or by picking the day out of a
 * calendar popover. Reach for it when both halves are the same decision — a
 * scheduled send, a deadline, an appointment.
 *
 * It is DatePicker with the clock left on. Everything that control decides,
 * this one inherits and does not restate: the segmented field rather than a
 * native input, the roving tabindex that makes the field one Tab stop, the
 * popover owning its own open state, the calendar laid out by a real table.
 * Read `DatePicker.vue` for the reasoning behind each; the comments below are
 * only for where this one has to differ.
 *
 * **The model value is a plain ISO *local* date-time string,
 * `"YYYY-MM-DDTHH:mm"`** — or `"YYYY-MM-DDTHH:mm:ss"` when `granularity` asks
 * for seconds, because a segment the reader can type is a segment the value has
 * to carry. There is no timezone, no offset and no `Date` anywhere on this
 * surface. `"2026-03-14T09:30"` is half past nine on the fourteenth *wherever it
 * is read*, and turning that into an absolute instant is the host's job, because
 * the host is the one that knows whose clock is meant. Guessing on its behalf is
 * exactly how a meeting ends up an hour out.
 *
 * Reach for DatePicker when the time of day is not part of the decision — a date
 * of birth has no half past nine — and for TimePicker when the day is not. Two
 * controls side by side are two values and two validations; this is one value
 * that happens to be written in two halves.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself through
 * `useFieldControl()` — the row's id, the id of its hint or error line, and
 * `required` / `invalid` / `disabled` / `readonly` / `name` — so `<Field
 * label="Send at" error="…"><DateTimePicker /></Field>` needs no attributes at
 * the call site. Every prop below still wins over the row when it is set, in
 * both directions, which is why the four booleans default to `undefined` rather
 * than `false`. `readonly` and `disabled` are different states, so the field
 * rests in three appearances rather than two: read-only is an instant on show —
 * still a Tab stop, still submitted, a lifted fill with the segments at full
 * strength — where disabled is unavailable and drained a step further, in fill,
 * text colour and border weight together.
 */
const props = withDefaults(
  defineProps<{
    /**
     * The chosen instant as ISO `"YYYY-MM-DDTHH:mm"`, local, with no timezone or
     * offset. A bare `"YYYY-MM-DD"` is accepted and read as midnight that day.
     * Unset, empty or unparseable means nothing is chosen. The explicit
     * `| undefined` is what lets `v-model` bind a ref that clears — the emitted
     * value drops to `undefined` when the field is emptied, and a plain optional
     * prop refuses to take it back.
     */
    modelValue?: string | undefined;
    /** The earliest choosable instant, same format. The calendar disables every day that lies wholly before it; a time before it on the boundary day is announced invalid rather than refused. */
    min?: string;
    /** The latest choosable instant, same format. The calendar disables every day that lies wholly after it; a time after it on the boundary day is announced invalid rather than refused. */
    max?: string;
    /** How far down the field goes. `"minute"` reports `"YYYY-MM-DDTHH:mm"`; `"second"` adds a seconds segment and reports `"YYYY-MM-DDTHH:mm:ss"`. */
    granularity?: "minute" | "second";
    /** Whether the time reads as 12-hour with an AM/PM segment or as 24-hour. Display only: the value stays 24-hour. Unset follows `locale`. */
    hourCycle?: 12 | 24;
    /** BCP 47 tag driving the order of the segments, the month and weekday names, which day a week starts on, and the 12-or-24-hour default. */
    locale?: string;
    /** Unavailable: dims the control, refuses the calendar, and takes the field out of the tab order. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Shows the instant without allowing an edit: the field stays a Tab stop and stays submitted, and the calendar button is dropped because nothing in the calendar could be chosen. Unset defers to a wrapping Field. */
    readonly?: boolean | undefined;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. An instant outside `min`/`max` does the same on its own, whatever this says. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** Marks the field mandatory to assistive tech (`aria-required` on the segment group). Unset defers to a wrapping Field. */
    required?: boolean | undefined;
    /** The field name for a native form post or `FormData`, carried on the hidden input Reka submits the instant through. Unset defers to a wrapping Field. */
    name?: string;
    /**
     * Names for everything this control says out loud, as any subset of
     * `DateTimePickerLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application: eleven of the fourteen names replace English literals Reka UI
     * writes of its own accord, and a language is set once with
     * `provideLoomLabels`.
     */
    labels?: LabelOverrides<DateTimePickerLabels>;
  }>(),
  {
    granularity: "minute",
    locale: "en",
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
  /** The chosen instant as ISO `"YYYY-MM-DDTHH:mm"` (or `…:ss`), or `undefined` once the field has been cleared. */
  "update:modelValue": [value: string | undefined];
}>();

// Three slots, one prop. There is no single `text` here because there is no
// single slot: the two halves of the field and the popover's chrome are
// separate vocabularies with separate registry entries, and naming them apart
// is what keeps a reader of the template able to see which one a binding came
// from. The one `labels` prop feeds all three — a getter returning the
// intersection satisfies each slice, and the keys a slice does not know are
// ignored by `useLabels`' own return type.
const dateText = useLabels("dateSegments", DATE_SEGMENT_LABELS, () => props.labels);
const timeText = useLabels("timeSegments", TIME_SEGMENT_LABELS, () => props.labels);
const panelText = useLabels("calendarPanel", CALENDAR_PANEL_LABELS, () => props.labels);

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
//
// For filled segments, the month and dayPeriod carry English that a host needs
// to be able to replace — see `filledMonth` on `DateSegmentLabels` and
// `filledDayPeriod` on `TimeSegmentLabels`.
function segmentValueText(
  part: string,
  value: string,
  monthValue?: number,
): { "aria-valuetext"?: string } {
  const empty = isTimeSegmentPart(part) ? timeText.value.empty : dateText.value.empty;
  const emptyResult = emptySegmentValueText(part, value, empty);
  if (emptyResult["aria-valuetext"]) return emptyResult;
  if (part === "month" && monthValue !== undefined) {
    return {
      "aria-valuetext": dateText.value.filledMonth({ value: monthValue, locale: props.locale }),
    };
  }
  if (part === "dayPeriod") {
    return { "aria-valuetext": timeText.value.filledDayPeriod({ dayPeriod: value }) };
  }
  return {};
}

// Routed exactly as DatePicker routes it, and for the same reasons: `class`
// sizes the whole control so it lands on the anchor, and everything else names
// or describes the value so it lands on the `role="group"` field.
defineOptions({ inheritAttrs: false });
const { attrs, rest: fieldAttrs } = useSplitAttrs();

function fromIso(value: string | undefined): CalendarDateTime | undefined {
  if (!value) return undefined;
  try {
    // `parseDateTime` reads a bare `"YYYY-MM-DD"` as midnight on that day, which
    // is the same default a day picked out of the calendar before any time gets.
    // It refuses an offset or a `Z`, and that refusal is wanted: an absolute
    // instant is not this component's value, and silently dropping the offset
    // would shift the time by hours without saying so.
    return parseDateTime(value);
  } catch {
    return undefined;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Written out rather than taken from `toString()`, which always prints seconds
// and appends a fractional part when the value carries one — a
// minute-granularity field would report `"2026-03-14T09:30:00"` for a value its
// segments never showed a second of. `toCalendarDate` is what normalises the day
// half to the Gregorian ISO form whatever calendar the locale reads by, exactly
// as it does in DatePicker; `toCalendarDateTime` drops a time zone before it can
// reach the string and fills midnight for a value carrying no time of its own.
function toIso(date: DateValue): string {
  const instant = toCalendarDateTime(date);
  const stamp = `${toCalendarDate(instant).toString()}T${pad(instant.hour)}:${pad(instant.minute)}`;
  return props.granularity === "second" ? `${stamp}:${pad(instant.second)}` : stamp;
}

// `min` and `max` bound an *instant*, and the calendar chooses a *day*, so the
// boundary day is only partly available. Reka compares each grid cell against
// these bounds at full precision, and a cell carries whatever time the field is
// currently holding — so with the exact bounds forwarded, a "not before now"
// deadline disables today outright at 09:00 because today's cell reads
// midnight, and the one day the reader most wants is unreachable for a reason
// nothing on screen explains.
//
// So the calendar is bounded by whole days: a day holding any choosable instant
// can be chosen. What that gives up is caught below — `outOfRange` re-applies
// the bound at instant precision where the instant is actually entered, so a
// reachable day with an unreachable time reads as an error instead of as fine.
function startOfDay(date: CalendarDateTime | undefined) {
  return date?.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
}

function endOfDay(date: CalendarDateTime | undefined) {
  return date?.set({ hour: 23, minute: 59, second: 59, millisecond: 999 });
}

// `optional()` rather than plain bindings, for the reason written out in
// DatePicker — and `hourCycle` joins them here, because `undefined` is how Reka
// is told to follow the locale rather than a cycle nobody asked for.
const rootValue = computed(() =>
  optional({
    modelValue: fromIso(props.modelValue),
    minValue: startOfDay(fromIso(props.min)),
    maxValue: endOfDay(fromIso(props.max)),
    hourCycle: props.hourCycle,
  }),
);

// The half of the bound the calendar gave up. Reka's own `data-invalid` on the
// field group now only fires for a whole day out of range, and a value like
// "today at 00:00" under a `min` of "today at 14:30" would otherwise look
// perfectly well-formed while being unschedulable. This is why the error state
// is derived here rather than left entirely to the host, which is where
// DatePicker leaves it: there, a day is the whole value and Reka's comparison is
// already exact.
const outOfRange = computed(() => {
  const value = fromIso(props.modelValue);
  if (!value) return false;
  const lower = fromIso(props.min);
  const upper = fromIso(props.max);
  return (!!lower && value.compare(lower) < 0) || (!!upper && value.compare(upper) > 0);
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
// theirs. `field.attrs` then spreads onto `DatePickerField` **after**
// `fieldAttrs`, which is the node both were already landing on — DatePicker.vue
// carries the full account of that position and of where Reka then puts each
// key.
//
// `outOfRange` is deliberately **not** folded in here. `field.invalid` is the
// claim about this control — the host's or, unset, the row's — and the two
// markers on the anchor below depend on it staying that: one says the host
// called this wrong, the other says the instant misses bounds the host itself
// declared, and a single resolved boolean cannot say both. What they share is
// the error *presentation*, which is `errored`.
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

const errored = computed(() => field.invalid || outOfRange.value);

// The panel's open state is owned here, not left to Reka's `closeOnSelect` —
// see DatePicker for why a host that validates before accepting would otherwise
// watch the calendar refuse to close.
const open = ref(false);

// The date handed back already carries the time the field is holding: Reka
// builds each grid cell as `placeholder.set({ day })`, and the placeholder
// follows the model value. That is the whole round trip, and it is load-bearing
// enough to be pinned in both directions in the tests — picking a day keeps the
// time, typing a time keeps the day. With nothing chosen yet the placeholder is
// today at midnight, so a day chosen before any time means midnight, and
// `toCalendarDateTime` above says the same thing a second time for a value that
// somehow arrives without a clock at all.
function onDateChange(date: DateValue | undefined) {
  open.value = false;
  emit("update:modelValue", date ? toIso(date) : undefined);
}

function isDateToday(date: DateValue): boolean {
  return isToday(date, getLocalTimeZone());
}

// One Tab stop across all of it — five segments here, or seven with an AM/PM
// and a seconds segment, which is the difference between one Tab press and
// seven to cross one control. The mechanism and the reason Reka's own
// ArrowLeft/ArrowRight survives it are in DatePicker.
const focusedPart = ref<string>();

function segmentTabIndex(part: string, segments: readonly { part: string }[]): number | undefined {
  // Read-only keeps every stop it had, unlike disabled: the instant is on show
  // and a reader still arrows across the segments to read it.
  if (field.disabled || part === "literal") return undefined;
  const editable = segments.filter((segment) => segment.part !== "literal");
  // The remembered segment is dropped when a granularity, locale or hour-cycle
  // change takes it away — a field whose only tab stop is a seconds segment that
  // no longer exists is a field nothing can reach.
  const active =
    focusedPart.value !== undefined &&
    editable.some((segment) => segment.part === focusedPart.value)
      ? focusedPart.value
      : editable[0]?.part;
  return part === active ? 0 : -1;
}

// Reka seeds the field's segment values from the granularity and builds its
// formatter from the hour cycle once, at setup, and watches neither. TimePicker
// carries the observed symptoms — a 13:30 field relabelling itself "1:30 AM",
// and a widened granularity rendering a segment with no role. Both are
// structural, so the field is keyed on them and rebuilt rather than patched.
// `locale` is deliberately not in the key: Reka does watch that, and rebuilding
// would throw away focus mid-edit for a change it already handles.
const shape = computed(() => `${props.granularity}-${props.hourCycle}`);

/**
 * The same "13 PM" defect TimePicker documents, in the same shared Reka segment
 * code: the hour publishes `aria-valuenow` off the internal 24-hour value while
 * declaring its range as 1–12. The announcement is rebuilt from what the segment
 * is actually showing, and only under an explicit 12-hour cycle — left to the
 * locale, Reka defers to the formatter and the pair already agrees.
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
  <DatePickerRoot
    v-model:open="open"
    v-bind="rootValue"
    :locale="locale"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :granularity="granularity"
    prevent-deselect
    @update:model-value="onDateChange"
  >
    <!-- Two markers rather than one spelled twice: `data-invalid` is the host
         saying so, `data-out-of-range` is the instant falling outside `min` and
         `max`. Reka already spells a third meaning `data-invalid` on the field
         group below, which is why neither of these lives there. -->
    <DatePickerAnchor
      ref="anchor"
      :data-invalid="field.invalid || undefined"
      :data-out-of-range="outOfRange || undefined"
      :data-readonly="field.readonly || undefined"
      :class="cn('block w-full', attrs.class as string)"
    >
      <!-- The one control in this family that keeps an `aria-invalid` binding
           after the `v-bind`, and the exception is narrow: an individual
           attribute wins over the spread, so the rule everywhere else is to
           delete it rather than overwrite `field.attrs`' resolved value with a
           raw prop. Here it is not a raw prop — `errored` is that same resolved
           value *plus* an out-of-range instant, so this can only ever add the
           attribute where the spread already omitted it, never take it away. -->
      <DatePickerField
        :key="shape"
        v-slot="{ segments }"
        v-bind="{ ...fieldAttrs, ...field.attrs }"
        :aria-labelledby="groupLabelledBy"
        :aria-invalid="errored || undefined"
        :class="
          cn(
            // The text input's own height scale, so an instant sitting in a form
            // row beside a text field lines up rather than nearly lining up. No
            // gap: every separator between two segments — the slashes, the
            // comma, the colon — is itself a segment, so spacing them apart
            // writes the value as `3 / 14 / 2026 , 09 : 30`.
            'flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-foreground',
            'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
            'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
            !errored && 'focus-within:shadow-halo',
            // Three resting appearances, all three painted on this group rather
            // than on the segments: a per-segment fill leaves the slashes, the
            // comma and the colon on `background`, and the instant comes out
            // striped.
            //
            // Read-only lifts to `subtle` and keeps its focus ring and its
            // full-strength text — a read-only instant is a value on show, not
            // an unavailable control — with the rim left at `input`, because the
            // field is still a Tab stop and still submitted. Reka's own
            // `data-readonly` on this group says the same thing to assistive
            // tech, so nothing here rests on colour.
            field.readonly && 'bg-subtle',
            // Drained rather than faded, for the reason DatePicker writes out:
            // `opacity-50` here took the five segments down with the box, from
            // 14.09:1 to 2.99:1, and the segments are the whole value. The fill
            // drains one step past read-only, the muted text over it is 4.68:1,
            // and the rim slackens from `input` to `border` — three channels, so
            // the two states do not part on hue alone. Set on the group because
            // no segment declares a resting colour of its own, so each inherits
            // this one.
            field.disabled && 'cursor-not-allowed border-border bg-muted text-muted-foreground',
            // Last of the rules that name a border colour: `cn()` resolves one
            // by whichever class it saw last, so a field both in error and
            // unavailable would otherwise lose its destructive rim.
            errored && 'border-destructive focus-within:outline-destructive',
          )
        "
      >
        <!-- Every `:aria-label` from here down replaces one Reka writes in
             English inside its own render function. Each reaches the DOM node
             as a fallthrough attribute, which Vue merges last, so it is a
             replacement rather than a second name. Removing one does not fall
             back to nothing; it falls back to Reka's English, which is the
             failure the label seam exists to close. -->
        <DatePickerInput
          v-for="(item, index) in segments"
          :key="index"
          :part="item.part"
          :tabindex="segmentTabIndex(item.part, segments)"
          :aria-label="segmentLabel(item.part)"
          v-bind="{
            ...segmentValueText(item.part, item.value, fromIso(props.modelValue)?.month),
            ...(item.part === 'hour' ? hourAnnouncement(segments) : undefined),
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
          @focusin="focusedPart = item.part"
        >
          {{ item.value }}
        </DatePickerInput>

        <!-- Named for what it opens, which is a calendar and not a clock: the
             time is entered in the segments to its left and has no panel.
             Dropped entirely while read-only, as in DatePicker: Reka's
             `readonly` makes every cell's click a no-op, so the button would
             open a panel in which nothing can be chosen. -->
        <DatePickerTrigger
          v-if="!field.readonly"
          :aria-label="panelText.openCalendar"
          class="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed"
        >
          <CalendarClock class="h-4 w-4" />
        </DatePickerTrigger>
      </DatePickerField>
    </DatePickerAnchor>

    <DatePickerContent
      align="start"
      :side-offset="6"
      :class="
        cn(
          'z-50 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none',
          // Scoped to the open state, never unconditional — an unconditional
          // entrance never re-fires, Reka never unmounts the closed content, and
          // an invisible panel is left over the page eating clicks.
          'data-[state=open]:animate-fade-rise',
        )
      "
      @open-auto-focus="onOpenAutoFocus"
    >
      <!-- The whole panel rises as one piece; the cells carry no stagger of
           their own, for the reason DatePicker writes out. -->
      <div ref="panel" class="flex flex-col gap-3">
        <!-- `calendarLabel` is a real Reka prop rather than a literal to
             override, and it defaults to `"Event Date"`. It is published twice:
             as the calendar container's `aria-label`, and inside a
             visually-hidden live region Reka renders itself, which a
             fallthrough attribute could not have reached. -->
        <DatePickerCalendar v-slot="{ grid, weekDays }" :calendar-label="panelText.calendar">
          <DatePickerHeader class="flex items-center justify-between gap-2">
            <!-- The pagers keep their opacity where the field and the cells
                 gave it up: a chevron is a glyph, and fading one costs a reader
                 nothing. Their names live in `aria-label`, not in dimmed text. -->
            <DatePickerPrev
              :aria-label="panelText.previousMonth"
              class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <ChevronLeft class="h-4 w-4" />
            </DatePickerPrev>

            <!-- Paging changes nothing a reader is looking at except this line,
                 and nothing moves focus, so without the live region the month
                 silently becomes a different month. -->
            <DatePickerHeading
              :id="headingId"
              aria-live="polite"
              class="text-sm font-medium text-foreground"
            />

            <DatePickerNext
              :aria-label="panelText.nextMonth"
              class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <ChevronRight class="h-4 w-4" />
            </DatePickerNext>
          </DatePickerHeader>

          <DatePickerGrid
            v-for="month in grid"
            :key="month.value.toString()"
            role="grid"
            :aria-labelledby="headingId"
            class="border-collapse select-none"
          >
            <!-- `role="grid"` over Reka's `role="application"`, and rows laid
                 out by the table rather than by flex — `display: flex` on a `tr`
                 drops its implicit `row` mapping and leaves `role="gridcell"`
                 inside a grid with no row between them. Both are DatePicker's
                 findings, kept identical here on purpose. -->
            <DatePickerGridHead>
              <DatePickerGridRow>
                <DatePickerHeadCell
                  v-for="(day, index) in weekDays"
                  :key="index"
                  class="w-9 text-xs font-normal text-muted-foreground"
                >
                  {{ day }}
                </DatePickerHeadCell>
              </DatePickerGridRow>
            </DatePickerGridHead>

            <DatePickerGridBody>
              <DatePickerGridRow v-for="(week, weekIndex) in month.rows" :key="weekIndex">
                <DatePickerCell
                  v-for="day in week"
                  :key="day.toString()"
                  :date="day"
                  class="p-0 text-center"
                >
                  <!-- Out of range is colour and a strike, not a fade: the
                       number is the cell's whole content, and half alpha took
                       it from 14.09:1 to 3.13:1. Muted is 5.76:1, the
                       `:not([data-selected])` keeps it from ever ordering
                       against the selected fill's own text colour, and the
                       strike is what separates an unavailable day from an
                       adjacent month's — muted too, and still selectable. -->
                  <DatePickerCellTrigger
                    v-slot="{ dayValue, today }"
                    :day="day"
                    :month="month.value"
                    :aria-current="isDateToday(day) ? 'date' : undefined"
                    class="group relative inline-flex h-9 w-9 items-center justify-center rounded-sm text-sm text-foreground transition-colors duration-fast ease-out hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo data-[outside-view]:text-muted-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:line-through [&[data-disabled]:not([data-selected])]:text-muted-foreground"
                  >
                    {{ dayValue }}
                    <!-- Today's second cue: a shape rather than a hue, so it
                         survives a colour deficiency and forced-colors both.
                         `aria-current` on the cell is what a screen reader
                         reads. -->
                    <span
                      v-if="today"
                      aria-hidden="true"
                      class="absolute bottom-1 h-1 w-1 rounded-full bg-primary group-data-[selected]:bg-primary-foreground"
                    />
                  </DatePickerCellTrigger>
                </DatePickerCell>
              </DatePickerGridRow>
            </DatePickerGridBody>
          </DatePickerGrid>
        </DatePickerCalendar>
      </div>
    </DatePickerContent>
  </DatePickerRoot>
</template>
