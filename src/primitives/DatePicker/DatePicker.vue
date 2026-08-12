<script lang="ts">
import type { CalendarPanelLabels, DateSegmentLabels } from "../../lib/date-labels";

/**
 * Everything this control publishes to assistive technology, which is two
 * shared slices and nothing of its own: the names of the field's segments and
 * the calendar popover's chrome. Both are declared in `src/lib/date-labels.ts`,
 * because `DateTimePicker`, `DateRangePicker` and `DateTimeRangePicker` say the
 * same words for the same reason — they are all one Reka implementation
 * underneath — and four copies of `Previous month` is a translator writing the
 * same word four times.
 *
 * An intersection rather than a third interface, so this name is the type a
 * consumer annotates their own bag with and the two halves stay one definition
 * each. Annotate with `LabelOverrides<DatePickerLabels>` and never with this
 * directly: this one is total, and a key added in a later release would stop a
 * consumer's build.
 */
export type DatePickerLabels = DateSegmentLabels & CalendarPanelLabels;
</script>

<script setup lang="ts">
import { computed, ref, useId } from "vue";
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
import { CalendarDays, ChevronLeft, ChevronRight } from "@lucide/vue";
import {
  getLocalTimeZone,
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
  emptySegmentValueText,
  isDateSegmentPart,
} from "../../lib/date-labels";

/**
 * DatePicker — one calendar date, entered either by typing it into a segmented
 * field or by picking it out of a calendar popover. Reach for it wherever a
 * date is a value rather than a search: a due date, a start date, a date of
 * birth.
 *
 * The segmented field is the reason this is not an `<input type="date">`.
 * Arrow keys change the segment under the cursor, typing digits fills it and
 * advances, and the segment order and the month names follow `locale` rather
 * than the browser's own — which is what lets a Vietnamese reader and an
 * American reader see the same date written the way each of them writes it.
 * The calendar is the second path to the same value, not the only one.
 *
 * **The model value is a plain ISO date string, `"YYYY-MM-DD"`, never a
 * `DateValue`.** Reka and `@internationalized/date` model a date as a calendar
 * object, and that object is the right shape *inside* a date control — it
 * knows about calendars other than the Gregorian one, about month lengths, and
 * about what "next month" means on the 31st. It is the wrong shape at the
 * boundary: a host binding a due date has a string from its API and wants a
 * string back for it, and nobody should have to learn a date library to bind a
 * date. So the string is parsed on the way in and re-serialised on the way
 * out, the same instinct as Slider exposing a scalar where Reka models an
 * array. `min`, `max` and the emitted value all speak that one format.
 *
 * A value that does not parse — a half-typed string, an empty one, a
 * datetime — is read as *no date chosen* rather than thrown on. A component
 * library cannot decide that a host's bad data is fatal, and a date field that
 * crashes the page while someone types into the host's own text input beside
 * it is the worst possible reading of "strict".
 *
 * For a span rather than a single day, compose two of these — a range control
 * shares almost none of this one's model. For a month or a year alone, neither
 * this nor a Select is right; that is a control this library does not have yet.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself: the row's id, the id of
 * its hint or error line, and `required` / `invalid` / `disabled` / `readonly` /
 * `name` all arrive through `useFieldControl()`, so `<Field label="Due date"
 * error="…"><DatePicker /></Field>` needs no attributes at the call site. Every
 * prop below still wins over the row when it is set, in both directions — which
 * is why the four booleans default to `undefined` rather than `false`.
 *
 * `readonly` and `disabled` are different states, not two dials on one. A
 * read-only date is a value on show: the field stays a Tab stop, its segments
 * stay readable and copyable, and it is filled rather than dimmed. A disabled
 * one is unavailable: no Tab stop, dimmed, nothing submitted.
 */
const props = withDefaults(
  defineProps<{
    /**
     * The chosen date as ISO `YYYY-MM-DD`. Unset, empty or unparseable means no
     * date is chosen. The explicit `| undefined` is what lets `v-model` bind a
     * ref that clears — the emitted value drops to `undefined` when the field
     * is emptied, and a plain optional prop refuses to take it back.
     */
    modelValue?: string | undefined;
    /** The earliest choosable date, same ISO format. Days before it are announced disabled and skipped by the keyboard. */
    min?: string;
    /** The latest choosable date, same ISO format. Days after it are announced disabled and skipped by the keyboard. */
    max?: string;
    /** BCP 47 tag driving the order of the field's segments, the month and weekday names, and which day a week starts on. */
    locale?: string;
    /** Unavailable: dims the control, refuses the calendar, and takes the field out of the tab order. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Shows the date without allowing an edit: the field stays a Tab stop and stays submitted, and the calendar button is dropped because nothing in the calendar could be chosen. Unset defers to a wrapping Field. */
    readonly?: boolean | undefined;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** Marks the field mandatory to assistive tech (`aria-required` on the segment group). Unset defers to a wrapping Field. */
    required?: boolean | undefined;
    /** The field name for a native form post or `FormData`, carried on the hidden input Reka submits the date through. Unset defers to a wrapping Field. */
    name?: string;
    /**
     * Names for everything this control says out loud, as any subset of
     * `DatePickerLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application: six of the nine names replace English literals Reka UI
     * writes of its own accord, and a language is set once with
     * `provideLoomLabels`.
     */
    labels?: LabelOverrides<DatePickerLabels>;
  }>(),
  {
    locale: "en",
    // Not `false`, for any of the four — TextField.vue carries the full
    // reasoning. `false` is a caller deciding this one control is fine,
    // enabled or editable even though its row is not; absent is a caller
    // saying nothing, and only `undefined` survives to mean that past Vue's
    // absent-Boolean-casts-to-false rule.
    disabled: undefined,
    readonly: undefined,
    invalid: undefined,
    required: undefined,
  },
);

const emit = defineEmits<{
  /** The chosen date as ISO `YYYY-MM-DD`, or `undefined` once the field has been cleared. */
  "update:modelValue": [value: string | undefined];
}>();

// Two slots, one prop. `text` is the name everywhere else in the library, and
// there is no single `text` here because there is no single slot: the segment
// names and the popover's chrome are separate vocabularies with separate
// registry entries, and naming them apart is what keeps a reader of the
// template able to see which one a binding came from. The one `labels` prop
// feeds both — a getter returning the intersection satisfies either half, and
// the keys the other half does not know are ignored by `useLabels`' own return
// type.
const segmentText = useLabels("dateSegments", DATE_SEGMENT_LABELS, () => props.labels);
const panelText = useLabels("calendarPanel", CALENDAR_PANEL_LABELS, () => props.labels);

// Read through the ref on every call rather than resolved into a lookup table
// once: a table built in `setup` freezes the first language and every later
// switch silently does nothing. `undefined` for the parts this slice does not
// name — the `literal` separators, which Reka renders `aria-hidden` and which
// must stay unnamed.
function segmentLabel(part: string): string | undefined {
  return isDateSegmentPart(part) ? segmentText.value[part] : undefined;
}

// The companion to `segmentLabel`, and the reason it returns an object rather
// than a string is in `emptySegmentValueText`: Reka's `aria-valuetext` is a
// hard-coded "Empty" only while the segment holds nothing, so this replaces
// that case and leaves the filled one — a number, and the locale's own month
// name — exactly as Reka wrote it.
function segmentValueText(part: string, value: string): { "aria-valuetext"?: string } {
  return emptySegmentValueText(part, value, segmentText.value.empty);
}

// `class` sizes the whole control, so it lands on the anchor — the element the
// caller's `max-w-xs` has to reach, and the one the popover measures itself
// against. Every other fallthrough attribute goes one level in, onto the
// `role="group"` field: `aria-label`, `aria-labelledby` and `aria-describedby`
// name and describe the thing being entered, and a group is what a screen
// reader announces that name on entering. Putting them on the anchor instead
// would name a layout div nothing ever lands in.
defineOptions({ inheritAttrs: false });
const { attrs, rest: fieldAttrs } = useSplitAttrs();

// `id` and `aria-describedby` reach this control as fallthrough attrs rather
// than props, so they are read off `attrs` and handed in as this caller's own
// values — a caller who sets either still beats the row, and the row's
// description is merged into theirs rather than replacing it.
//
// `field.attrs` spreads onto `DatePickerField` **after** `fieldAttrs`, which is
// the node those two were already landing on, and the position is the contract:
// the bag has resolved the caller's own values already and drops every key that
// resolved to nothing, so it can only add. Where each key ends up is Reka's
// decision and worth knowing: `DateFieldRoot` declares `id` and `name` as props
// and puts both on the visually-hidden `<input>` it submits the date through —
// which is the element a `<label for>` can actually name, a `role="group"` div
// being unlabelable — while `aria-describedby`, `aria-required` and
// `aria-invalid` are undeclared, fall through to `$attrs`, and land on the group
// itself, where a screen reader announces them once on entering the field.
//
// The `:aria-invalid` binding that used to sit on the field is gone with it: an
// individual attribute written after a `v-bind` wins, so keeping one would
// overwrite the resolved value with the raw prop.
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

// `toString()` already normalises to the Gregorian ISO form whatever calendar
// the value carries — a locale such as `th-TH` makes Reka's own placeholder a
// Buddhist date whose year reads 2569, and it still prints `2026-08-11`. What
// `toCalendarDate` adds is dropping a time component before it can turn the
// string into `2026-08-11T00:00:00`. `granularity="day"` below is what makes
// that unreachable today; this is what keeps it unreachable if it ever moves.
function toIso(date: DateValue): string {
  return toCalendarDate(date).toString();
}

// `optional()` rather than three separate bindings: an absent bound forwarded
// as an explicit `undefined` is still a key Reka sees, and an absent
// `modelValue` forwarded that way is what turns an uncontrolled field into a
// permanently empty one. Dropping the key says what is true.
const rootValue = computed(() =>
  optional({
    modelValue: fromIso(props.modelValue),
    minValue: fromIso(props.min),
    maxValue: fromIso(props.max),
  }),
);

// The panel's open state is owned here rather than left to Reka's
// `closeOnSelect`, which closes by watching its *own* model value — and that
// value only moves for a host that echoes the emitted date straight back down.
// A host that validates before accepting one, or that binds nothing at all,
// would pick a day and watch the calendar stay open over the field it just
// filled. Closing on the choice itself does not depend on anyone answering.
const open = ref(false);

function onDateChange(date: DateValue | undefined) {
  open.value = false;
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

// The field is one Tab stop, not three. Reka leaves every segment tabbable,
// which turns a single date into three stops a keyboard user has to walk
// through — and the control everyone already knows, the browser's own date
// input, is one stop with the arrow keys moving inside it. So a roving
// tabindex names exactly one segment as the stop, and Reka's own
// ArrowLeft/ArrowRight handling (and its auto-advance after a filled segment)
// moves between them by calling `focus()` directly, which ignores tabindex
// entirely and so keeps working untouched.
const focusedPart = ref<string>();

function segmentTabIndex(part: string, segments: readonly { part: string }[]): number | undefined {
  // A disabled field has no stop at all; returning `undefined` removes the
  // attribute, which is exactly what Reka does for the same case. A read-only
  // one keeps every stop it had — the value is on show and a reader still
  // arrows across it to read it, which is the whole difference between the two
  // states.
  if (field.disabled || part === "literal") return undefined;
  const editable = segments.filter((segment) => segment.part !== "literal");
  // The remembered segment is dropped when a locale change takes it away —
  // a field with no tab stop is unreachable, and `en` has no era segment that
  // `ja-JP-u-ca-japanese` does.
  const active =
    focusedPart.value !== undefined &&
    editable.some((segment) => segment.part === focusedPart.value)
      ? focusedPart.value
      : editable[0]?.part;
  return part === active ? 0 : -1;
}

// The month/year heading names the grid, so the two are wired together rather
// than the grid being an unnamed table of numbers.
const headingId = useId();

const panel = ref<HTMLElement | null>(null);

// Reka's focus scope would land on the first tabbable thing in the panel,
// which is the previous-month button — so a keyboard user opening the calendar
// arrives one Tab away from the grid and two from the day they came for.
// Focus goes to the day the calendar is already sitting on instead: the
// selected date, or today when nothing is selected, which is the cell Reka has
// given the grid's own roving tabindex to.
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
    granularity="day"
    prevent-deselect
    @update:model-value="onDateChange"
  >
    <!-- The invalid marker lives out here, on the control as a whole, because
         the field group below already carries a `data-invalid` of Reka's own
         with a different meaning: that the *typed* date falls outside `min` and
         `max`. Two markers spelled the same on one element is how a style rule
         starts answering a question nobody asked it. -->
    <DatePickerAnchor
      :data-invalid="field.invalid || undefined"
      :data-readonly="field.readonly || undefined"
      :class="cn('block w-full', attrs.class as string)"
    >
      <DatePickerField
        v-slot="{ segments }"
        v-bind="{ ...fieldAttrs, ...field.attrs }"
        :class="
          cn(
            // The text input's own height scale, so a date sitting in a form
            // row beside a text field lines up rather than nearly lining up.
            // No gap: the separator between two segments is itself a segment,
            // so spacing them apart writes the date as `3 / 14 / 2026`.
            'flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-foreground',
            'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
            // The box carries the ring, exactly as TextField's wrapper does,
            // and the focused segment below carries a fill instead of a second
            // outline — a ring drawn inside a ring reads as a rendering fault.
            'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
            !field.invalid && 'focus-within:shadow-halo',
            field.invalid && 'border-destructive focus-within:outline-destructive',
            // Filled rather than dimmed, and it keeps its focus ring: a
            // read-only date is a value on show, not an unavailable control,
            // and the two must not look alike. Reka's own `data-readonly` on
            // this group carries the same state to assistive tech, so nothing
            // here rests on colour.
            field.readonly && 'bg-muted',
            field.disabled && 'cursor-not-allowed opacity-50',
          )
        "
      >
        <!-- Every `:aria-label` from here down replaces one Reka writes in
             English inside its own render function. Each reaches the DOM node
             as a fallthrough attribute, which Vue merges last, so it is a
             replacement rather than a second name. Removing one does not fall
             back to nothing; it falls back to Reka's English, which is the
             failure the label seam exists to close and which no test of Loom's
             own strings would catch. -->
        <DatePickerInput
          v-for="(item, index) in segments"
          :key="index"
          :part="item.part"
          :tabindex="segmentTabIndex(item.part, segments)"
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
          @focusin="focusedPart = item.part"
        >
          {{ item.value }}
        </DatePickerInput>

        <!-- Dropped entirely while read-only rather than disabled beside a
             field that is plainly still alive. Reka's `readonly` reaches the
             calendar too and makes every cell's click a no-op, so the button
             would open a panel in which nothing can be chosen — a dead end that
             looks like a working control, which is worse than not offering it.
             The segments are still there to read the date off. -->
        <DatePickerTrigger
          v-if="!field.readonly"
          :aria-label="panelText.openCalendar"
          class="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed"
        >
          <CalendarDays class="h-4 w-4" />
        </DatePickerTrigger>
      </DatePickerField>
    </DatePickerAnchor>

    <DatePickerContent
      align="start"
      :side-offset="6"
      :class="
        cn(
          'z-50 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-md outline-none',
          // Scoped to the open state, never unconditional. Reka's Presence
          // keeps the closed content mounted until an animationend arrives,
          // and a mount-only animation never fires a second one — so an
          // unconditional class strands an invisible panel over the page,
          // eating clicks. Scoped, the closed element computes
          // `animation-name: none` and Presence unmounts it immediately.
          'data-[state=open]:animate-fade-rise',
        )
      "
      @open-auto-focus="onOpenAutoFocus"
    >
      <!-- The whole panel rises as one piece. The 42 cells deliberately carry
           no stagger of their own: `listStaggerDelay` is the vocabulary for a
           list of rows arriving in reading order, and a grid rippling in cell
           by cell reads as a rendering glitch rather than as an entrance. -->
      <div ref="panel" class="flex flex-col gap-3">
        <!-- `calendarLabel` is a real Reka prop rather than a literal to
             override, and it defaults to `"Event Date"` — a name for somebody
             else's application. It is published twice: as the calendar
             container's `aria-label`, and inside a visually-hidden live region
             Reka renders itself, which a fallthrough attribute could not have
             reached. -->
        <DatePickerCalendar v-slot="{ grid, weekDays }" :calendar-label="panelText.calendar">
          <DatePickerHeader class="flex items-center justify-between gap-2">
            <DatePickerPrev
              :aria-label="panelText.previousMonth"
              class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            >
              <ChevronLeft class="h-4 w-4" />
            </DatePickerPrev>

            <!-- Paging the calendar changes nothing a reader is looking at
                 except this line, and nothing moves focus — so without the
                 live region the month silently becomes a different month. -->
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
                  <DatePickerCellTrigger
                    v-slot="{ dayValue, today }"
                    :day="day"
                    :month="month.value"
                    :aria-current="isDateToday(day) ? 'date' : undefined"
                    class="group relative inline-flex h-9 w-9 items-center justify-center rounded-sm text-sm text-foreground transition-colors duration-fast ease-out hover:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo data-[outside-view]:text-muted-foreground data-[selected]:bg-primary data-[selected]:text-primary-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                  >
                    {{ dayValue }}
                    <!-- Today's second cue. The dot is decoration to a screen
                         reader — `aria-current` on the cell is what it reads —
                         but it is the whole cue for a reader who is looking at
                         the grid, and it is a shape rather than a hue so it
                         survives a colour deficiency and forced-colors both. -->
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
