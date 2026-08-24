<script lang="ts">
import type { TimeSegmentLabels } from "@ecoma-io/loom-labels";

/**
 * Everything this control publishes to assistive technology: the four names
 * Reka UI would otherwise give the segments in English of its own accord.
 * There is nothing else — the icon is decoration and hidden, and the field
 * group takes its name from the caller or from a wrapping Field.
 *
 * An alias for the shared slice rather than a fifth interface. The same four
 * names are said by `DateTimePicker` and `DateTimeRangePicker`, they come from
 * one Reka implementation, and `src/lib/date-labels.ts` carries why they are
 * declared once. The alias exists so this control's `labels` prop reads like
 * every other one's; annotate with `LabelOverrides<TimePickerLabels>` rather
 * than with this, which is total.
 */
export type TimePickerLabels = TimeSegmentLabels;
</script>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";
import { TimeFieldInput, TimeFieldRoot, type TimeValue } from "reka-ui";
import { Clock } from "@lucide/vue";
import { parseTime } from "@internationalized/date";
import { cn } from "@ecoma-io/loom-core";
import { useSplitAttrs } from "@ecoma-io/loom-core";
import { useAncestorDisabled } from "@ecoma-io/loom-labels";
import { useFieldControl } from "@ecoma-io/loom-labels";
import { optional } from "@ecoma-io/loom-core";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";
import { TIME_SEGMENT_LABELS, segmentAriaLabel, segmentAriaValueText } from "@ecoma-io/loom-labels";

/**
 * TimePicker — a time of day, typed into a segmented field. Reach for it
 * wherever a clock time is a value: a meeting start, a reminder, opening hours.
 *
 * **There is no clock face and no dropdown, deliberately.** A clock dial is
 * slower than typing for every reader who can type, and unusable for several
 * who cannot; a 96-row list of quarter hours is worse again. The segmented
 * field already is the control — arrow keys change the segment under the
 * cursor, digits fill it and advance — so a panel would only be a second, worse
 * path to the same value. That is the one place this diverges from DatePicker,
 * where the calendar earns its panel by answering "which Tuesday?", a question
 * a time never has.
 *
 * **The model value is a plain `"HH:mm"` string in 24-hour time**, or
 * `"HH:mm:ss"` when `granularity` asks for seconds — the same boundary
 * DatePicker draws for `"YYYY-MM-DD"`, and drawn here for the same reason: a
 * host has a string from its API and should not have to learn a date library to
 * bind a time. `hourCycle` moves the *display* to 12-hour and never the value,
 * because conflating the two is how a 12-hour locale ends up storing `"01:30"`
 * for half past one in the afternoon.
 *
 * **A time is not a date.** There is no timezone here, no offset, and no `Date`
 * anywhere near the public surface: `"09:00"` is nine in the morning wherever
 * it is read, and the moment that turns into is the host's question, not this
 * component's. Pair it with a DatePicker when an instant is what is wanted.
 *
 * Unlike DatePicker there are no `min`/`max` bounds. A time of day has no
 * ordering that survives midnight — a night shift is "not before 22:00" *and*
 * "not after 02:00", two bounds that cross rather than fence — so a min/max
 * pair would quietly call 01:00 out of range for the exact case it was reached
 * for. A window like that belongs to the host, which knows which day each end
 * is on.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself through
 * `useFieldControl()` — the row's id, the id of its hint or error line, and
 * `required` / `invalid` / `disabled` / `readonly` / `name` — so `<Field
 * label="Starts at" error="…"><TimePicker /></Field>` needs no attributes at the
 * call site. Every prop below still wins over the row when it is set, in both
 * directions, which is why the four booleans default to `undefined` rather than
 * `false`. `readonly` and `disabled` are different states, so the field rests in
 * three appearances rather than two: read-only is a time on show — still a Tab
 * stop, still submitted, a lifted fill with the segments at full strength —
 * where disabled is unavailable and drained a step further, in fill, text
 * colour and border weight together.
 */
const props = withDefaults(
  defineProps<{
    /**
     * The chosen time as `"HH:mm"`, or `"HH:mm:ss"` at second granularity, in
     * 24-hour time whatever the field displays. Unset, empty or unparseable
     * means no time is chosen. The explicit `| undefined` is what lets
     * `v-model` bind a ref that clears — the emitted value drops to `undefined`
     * when the field is emptied, and a plain optional prop refuses to take it
     * back.
     */
    modelValue?: string | undefined;
    /**
     * Whether the field reads as 12-hour with an AM/PM segment or as 24-hour.
     * Display only: the value stays 24-hour either way. Unset follows `locale`,
     * which is what a reader of that locale expects to see.
     */
    hourCycle?: 12 | 24;
    /** How far down the field goes. `"hour"` and `"minute"` report `"HH:mm"`; `"second"` adds a seconds segment and reports `"HH:mm:ss"`. */
    granularity?: "hour" | "minute" | "second";
    /** BCP 47 tag driving the order of the segments, the separator between them, and the 12-or-24-hour default. */
    locale?: string;
    /** Unavailable: dims the control and takes the field out of the tab order. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Shows the time without allowing an edit: the field stays a Tab stop, stays submitted, and is filled rather than dimmed. Unset defers to a wrapping Field. */
    readonly?: boolean | undefined;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** Marks the field mandatory to assistive tech (`aria-required` on the segment group). Unset defers to a wrapping Field. */
    required?: boolean | undefined;
    /** The field name for a native form post or `FormData`, carried on the hidden input Reka submits the time through. Unset defers to a wrapping Field. */
    name?: string;
    /**
     * Names for the four segments, as any subset of `TimePickerLabels` — the
     * rest stay as the host's `provideLoomLabels` vocabulary left them, and then
     * as Loom's English.
     *
     * Every one of them replaces a literal Reka writes itself, so this is not
     * decoration: leave the vocabulary unset and the segments are named in
     * English rather than named not at all.
     */
    labels?: LabelOverrides<TimePickerLabels>;
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
  /** The chosen time as `"HH:mm"` (or `"HH:mm:ss"`), or `undefined` once the field has been cleared. */
  "update:modelValue": [value: string | undefined];
}>();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("timeSegments", TIME_SEGMENT_LABELS, () => props.labels);

// Read through the ref on every call rather than resolved into a lookup table
// once: a table built in `setup` freezes the first language and every later
// switch silently does nothing. The resolution rules themselves are the shared
// helpers' — five hand-copied pairs of these two functions drifted once
// already, so the branches live in `@ecoma-io/loom-labels` now and only the
// refs stay here. `undefined` for the `literal` separators, which Reka renders
// `aria-hidden` and which must stay unnamed.
function segmentLabel(part: string): string | undefined {
  return segmentAriaLabel({ time: text.value }, part);
}

function segmentValueText(part: string, value: string): { "aria-valuetext"?: string } {
  return segmentAriaValueText({ time: text.value, part, value, locale: props.locale });
}

// One rendered node, so both halves of the fallthrough land on it — the split
// exists only because `class` needs the Tailwind-aware merge and Vue's own
// fallthrough would concatenate a caller's `h-11` after our `h-9` instead of
// replacing it. That node is Reka's `role="group"`, which is also where
// `aria-label` belongs: a screen reader announces a group's name once on
// entering it, rather than once per segment.
//
// It is also why `invalid` is announced with `aria-invalid` and nothing else.
// DatePicker moves its `data-invalid` marker onto the anchor because the field
// group already spells that attribute with Reka's own meaning; here there is no
// second element to move it to, and an attribute Reka binds itself wins outright
// — its template merges `$attrs` first and its own bindings after, so a
// `data-invalid` passed in from out here is overwritten by Reka's own
// `undefined` before it reaches the DOM. Setting it would look like it worked
// and silently do nothing.
defineOptions({ inheritAttrs: false });
const { attrs, rest: fieldAttrs } = useSplitAttrs();

/**
 * The time segments are `<div role="spinbutton" tabindex="0">`, and
 * `<fieldset disabled>` reaches only `<input>`, `<button>`, `<select>` and
 * `<textarea>` — so Reka's hidden input went inert inside a disabled group
 * while the segments a reader actually uses still typed. Measured in jsdom: an
 * empty hour segment became `12` on an arrow key.
 *
 * Read off the DOM rather than taken from the Field context, which publishes no
 * `disabled` on purpose — see `../../lib/ancestor-disabled.ts`.
 */
const root = useTemplateRef<{ $el?: Element }>("root");
const groupDisabled = useAncestorDisabled(() => root.value?.$el);

// `id` and `aria-describedby` reach this control as fallthrough attrs rather
// than props, so they are handed in as this caller's own values: a caller who
// sets either still beats the row, and the row's description is merged into
// theirs rather than replacing it. `field.attrs` then spreads onto
// `TimeFieldRoot` **after** `fieldAttrs`, which is the node both were already
// landing on.
//
// **Where each key ends up was checked rather than assumed**, given what the
// note above says about attributes this node overwrites. The set Reka spells
// itself is `role`, `aria-disabled`, `data-disabled`, `data-readonly`,
// `data-invalid` and `dir`, and `field.attrs` spells none of them:
// `aria-describedby`, `aria-required` and `aria-invalid` are undeclared and land
// on the `role="group"` as intended, while `id` and `name` are declared props
// and land on the visually-hidden `<input>` the field submits through — which is
// the element a `<label for>` can actually name, a `role="group"` div not being
// labelable.
//
// The `:aria-invalid` binding that used to sit on the root is gone with it: an
// individual attribute written after a `v-bind` wins, so keeping one would
// overwrite the resolved value with the raw prop.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  ariaLabelledby: attrs["aria-labelledby"] as string | undefined,
  name: props.name,
  // The fieldset beats the prop in both directions, exactly as it does for the
  // native input Reka renders inside this very control.
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

function fromClock(value: string | undefined): TimeValue | undefined {
  if (!value) return undefined;
  try {
    return parseTime(value);
  } catch {
    // Same contract as DatePicker: a half-typed or wrongly-shaped value is read
    // as no time chosen. A component library cannot decide that a host's bad
    // data is fatal.
    return undefined;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// Written out rather than taken from `Time.toString()`, which always prints
// seconds and appends a fractional part when the value carries one — so a
// minute-granularity field would report `"09:30:00"`, and a value the host
// parsed from `"09:30:00.5"` would round-trip a half second the field never
// showed. The string that comes back is the string the segments are showing.
function toClock(time: TimeValue): string {
  const hhmm = `${pad(time.hour)}:${pad(time.minute)}`;
  return props.granularity === "second" ? `${hhmm}:${pad(time.second)}` : hhmm;
}

// `optional()` rather than plain bindings: Reka reads an explicit `undefined`
// `modelValue` as a value the host owns and is holding empty, which turns an
// uncontrolled field into a permanently empty one, and an `hourCycle` of
// `undefined` is how it is told to follow the locale. Dropping the keys says
// what is true.
const rootValue = computed(() =>
  optional({ modelValue: fromClock(props.modelValue), hourCycle: props.hourCycle }),
);

function onTimeChange(time: TimeValue | undefined) {
  emit("update:modelValue", time ? toClock(time) : undefined);
}

// The field is one Tab stop, not four. The reasoning, and the reason Reka's own
// ArrowLeft/ArrowRight handling survives it untouched, is written out in
// DatePicker — it moves focus with `focus()` directly, which ignores tabindex.
// It matters more here: a 12-hour field with seconds is four segments, so
// leaving Reka's default in place costs a keyboard reader four Tab presses to
// cross one control.
const focusedPart = ref<string>();

function segmentTabIndex(part: string, segments: readonly { part: string }[]): number | undefined {
  // Read-only keeps every stop it had, unlike disabled: the time is on show and
  // a reader still arrows across the segments to read it.
  if (field.disabled || part === "literal") return undefined;
  const editable = segments.filter((segment) => segment.part !== "literal");
  // The remembered segment is dropped when a granularity or locale change takes
  // it away — a field whose only tab stop is a seconds segment that no longer
  // exists is a field nothing can reach.
  const active =
    focusedPart.value !== undefined &&
    editable.some((segment) => segment.part === focusedPart.value)
      ? focusedPart.value
      : editable[0]?.part;
  return part === active ? 0 : -1;
}

// Reka reads `hourCycle` once, when it builds its formatter, and seeds its
// segment values from the granularity in the same breath — neither is watched.
// Observed: a field showing 13:30 that is moved to a 12-hour cycle relabels
// itself "1:30 AM", half a day wrong, because the AM/PM segment appears with
// its initial value and nothing recomputes it from the hour. Widening the
// granularity on an empty field is the same fault with a different symptom: the
// new seconds segment arrives with no entry to read, so it renders without a
// role at all.
//
// Both are structural changes — they add and remove segments — so keying the
// field on them rebuilds it rather than patching a half-migrated one. `locale`
// is deliberately not in the key: Reka does watch that, and rebuilding on it
// would throw away focus mid-edit for a change it handles correctly.
const shape = computed(() => `${props.granularity}-${props.hourCycle}`);

/**
 * Reka's hour segment publishes `aria-valuenow` and `aria-valuetext` straight
 * off the internal 24-hour value while publishing `aria-valuemin`/`max` as
 * 1–12, so half past one in the afternoon announces itself as "13 PM", out of
 * its own declared range. The displayed hour is the one the reader is being
 * asked about, so the announcement is rebuilt from what the segment actually
 * shows. Only under an explicit 12-hour cycle: left to the locale, Reka defers
 * to the formatter and the pair is already consistent.
 */
function hourAnnouncement(
  segments: readonly { part: string; value: string }[],
): Record<string, string | number> | undefined {
  if (props.hourCycle !== 12) return undefined;
  const shown = Number(segments.find((segment) => segment.part === "hour")?.value);
  const period = segments.find((segment) => segment.part === "dayPeriod")?.value;
  // An unfilled hour reads as its placeholder rather than a number, and there is
  // no number to announce for it. The empty case is not left to Reka's English
  // "Empty" either — `segmentValueText` binds the vocabulary's word for it on
  // the same element, and the two never collide: this returns a value only for
  // a filled hour and that one only for an empty segment.
  if (!Number.isInteger(shown) || period === undefined) return undefined;
  return { "aria-valuenow": shown, "aria-valuetext": `${shown} ${period}` };
}
</script>

<template>
  <TimeFieldRoot
    ref="root"
    :key="shape"
    v-slot="{ segments }"
    v-bind="{ ...rootValue, ...fieldAttrs, ...field.attrs }"
    :aria-labelledby="groupLabelledBy"
    :locale="locale"
    :granularity="granularity"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :class="
      cn(
        // The text input's own height scale, so a time sitting in a form row
        // beside a text field lines up rather than nearly lining up. No gap:
        // the colon between two segments is itself a segment, so spacing them
        // apart writes the time as `09 : 30`.
        'flex h-9 w-full items-center rounded-md border border-input bg-background px-3 text-sm text-foreground',
        'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
        // The box carries the ring and the focused segment below carries a fill
        // instead of a second outline, exactly as DatePicker's field does — a
        // ring drawn inside a ring reads as a rendering fault.
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
        !field.invalid && 'focus-within:shadow-halo',
        // Three resting appearances, and each is painted on this group rather
        // than on the segments inside it: a per-segment fill leaves the colon
        // between them on `background`, and the time comes out striped.
        //
        // Read-only lifts to `subtle` and keeps its focus ring and its
        // full-strength segments — 13.46:1 over that fill — because a read-only
        // time is a value on show, not an unavailable control. The rim stays
        // `input`: the field is still a Tab stop and still submitted. Reka's own
        // `data-readonly` on this node carries the same state to assistive tech,
        // so nothing here rests on colour.
        field.readonly && 'bg-subtle',
        // Drained rather than faded, for the reason DatePicker and
        // DateTimePicker both write out — this control was the one member of
        // the family the sweep still caught. `opacity-50` took the segments
        // down with the box: measured on the built site, the hour and the
        // period read 3.08:1 and the colon between them 2.07:1, and those
        // segments *are* the value. The fill drains one step past read-only,
        // the muted text over it is 4.68:1, and the rim slackens from `input`
        // to `border` — three channels, so the two states do not part on hue
        // alone. Set on the group because no segment declares a resting colour
        // of its own, so each inherits this one.
        field.disabled && 'cursor-not-allowed border-border bg-muted text-muted-foreground',
        // Last of the rules that name a border colour: `cn()` resolves one by
        // whichever class it saw last, so a field both in error and unavailable
        // would otherwise lose its destructive rim to the disabled one.
        field.invalid && 'border-destructive focus-within:outline-destructive',
        attrs.class as string,
      )
    "
    @update:model-value="onTimeChange"
  >
    <!-- Leading, where DatePicker's calendar button is trailing: that trailing
         slot is a button in every other member of this family, and a glyph
         sitting in it that opens nothing would promise a panel this control
         does not have. Decoration, so it is hidden from the accessibility
         tree — the group's own name says what the field is. -->
    <Clock aria-hidden="true" class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />

    <!-- The `:aria-label` replaces the one Reka writes in English inside its
         own render function. It reaches the DOM node as a fallthrough
         attribute, which Vue merges last, so it is a replacement rather than a
         second name. Removing it does not fall back to nothing; it falls back
         to Reka's English. -->
    <TimeFieldInput
      v-for="(item, index) in segments"
      :key="index"
      :part="item.part"
      :tabindex="segmentTabIndex(item.part, segments)"
      :aria-label="segmentLabel(item.part)"
      v-bind="{
        ...segmentValueText(item.part, item.value),
        ...(item.part === 'hour' ? hourAnnouncement(segments) : undefined),
      }"
      :class="
        cn(
          'tabular rounded-sm px-0.5 outline-none',
          'transition-colors duration-instant ease-out',
          'focus:bg-primary-muted focus:text-primary-text',
          'data-[placeholder]:text-muted-foreground',
          item.part === 'literal' && 'text-muted-foreground',
        )
      "
      @focusin="focusedPart = item.part"
    >
      {{ item.value }}
    </TimeFieldInput>
  </TimeFieldRoot>
</template>
