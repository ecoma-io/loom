<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  ColorAreaRoot,
  ColorAreaArea,
  ColorAreaThumb,
  ColorSliderRoot,
  ColorSliderTrack,
  ColorSliderThumb,
  ColorFieldRoot,
  ColorFieldInput,
  ColorSwatch,
  ColorSwatchPickerRoot,
  ColorSwatchPickerItem,
  colorToString,
  isValidColor,
  type Color,
} from "reka-ui";
import { cn } from "../../lib/cn";
import { optional } from "../../lib/props";
import { useSplitAttrs } from "../../lib/attrs";
import { useFieldControl } from "../../lib/field-context";

/**
 * ColorPicker — choose one colour, as `#rrggbb`. A saturation/brightness
 * area, a hue slider, an editable hex field, and an optional row of presets.
 * Reach for it when the colour itself is the value being authored: a label
 * colour, a chart series, a theme override.
 *
 * When the choice is actually a small closed set — a status colour, a brand
 * palette — a Select or a RadioGroup names the options and this does not.
 * A picker offers sixteen million answers, which is the wrong control for a
 * question with six.
 *
 * Built on Reka UI's colour parts, which supply the whole semantic layer:
 * `role="slider"` on both thumbs, the area's two-axis arrow stepping, the
 * listbox roving focus over the presets, and the parsing that turns typed text
 * into a colour. Every part models its value as a colour string and emits hex,
 * which is what lets this expose one plain `#rrggbb` rather than a channel
 * object.
 *
 * **Where the "no raw colour values" rule falls here.** The colour a person is
 * picking is *data*: the area's gradient, the hue track and every swatch fill
 * are bound from the model value at run time, and a token could not express
 * them. Everything that is *chrome* — the borders, the focus ring, the field,
 * the labels, the disabled state, the rings that keep the thumbs visible —
 * comes from `theme.css` and nothing else. A literal colour in this file is a
 * defect unless it is a value being picked.
 *
 * **The hex is the non-colour channel.** A control that communicates only in
 * colour is unusable by the readers most likely to need help choosing one, so
 * the hex value is always on screen as text and is itself the edit surface;
 * presets are named ("vibrant red") rather than left as bare squares; and the
 * disabled state is carried by `aria-disabled` as well as by the dimming.
 *
 * The event contract matches Slider and NumberField. `update:modelValue` is
 * transient — every position a thumb passes through — and `commit` fires once
 * per gesture, so one drag across the area is one undo entry rather than a
 * hundred.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself through
 * `useFieldControl()`, and the row's answers land on two different nodes — see
 * the comment above `groupFieldAttrs`, which is where that split is decided.
 * **A row's label does not name the picker.** `<label for>` names a labelable
 * element and this renders a `div[role="group"]`, so the row's label resolves
 * to it and announces nobody; `ariaLabel`/`ariaLabelledby` below are what name
 * the picker, exactly as they were before.
 *
 * There is no `readonly`, and a row's is ignored rather than approximated. A
 * colour that may be looked at but not changed is a swatch — the `ColorSwatch`
 * beside the hex value already is one — and none of the four parts has a
 * read-only state to put it in, so the honest options were a picker that looks
 * live and swallows every gesture, or none at all.
 */
const props = withDefaults(
  defineProps<{
    /** The chosen colour as `#rrggbb`. There is no alpha channel in this version. */
    modelValue?: string;
    /** Preset colours shown as a row of named swatches. Omit it and no row is rendered. */
    swatches?: string[];
    /** Unavailable: dims the picker and refuses the pointer, the keyboard and the field. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** The accessible name for the picker as a whole, when nothing visible already labels it. */
    ariaLabel?: string;
    /** The id of the visible element that labels the picker (a Field wrapper's label, say). */
    ariaLabelledby?: string;
  }>(),
  {
    // Not `false`: absent has to stay tellable from `false` for a Field above
    // to disable the row and for `:disabled="false"` to overrule one that does.
    // Vue casts an absent Boolean prop with no declared default to `false`,
    // which would leave the context wired and inert.
    disabled: undefined,
  },
);

const emit = defineEmits<{
  /** Transient: every colour a drag or an arrow step passes through. Not a checkpoint. */
  "update:modelValue": [value: string];
  /** Committed: once per gesture — drag release, arrow step, hex entry, preset click. */
  commit: [value: string];
}>();

// The seed for an unset or unparseable model value. Reka's ColorArea, ColorField
// and ColorSlider each fall back to this same string internally, so matching it
// is what keeps the four parts agreeing about what "no colour yet" looks like
// rather than each inventing its own. It is picked data, not a theme colour.
const FALLBACK = "#000000";

// A colour a consumer supplied is parsed by Reka inside a render function, and
// an unparseable one throws there — taking the host's page down, not just this
// component. A library cannot do that with a prop, so every value entering
// `current` is checked first. `isValidColor` is Reka's own parser rather than a
// regex here, so what this accepts and what the parts accept cannot drift.
function toColor(value: string | undefined): string {
  return value !== undefined && isValidColor(value) ? value : FALLBACK;
}

// The working colour, fed to all four parts. Seeded from the prop and advanced
// on every tick, exactly as Slider's `lastValue` is: given a defined model value
// Reka runs fully controlled, so a host that correctly withholds transient
// values until commit would otherwise freeze the thumbs at the gesture's start.
const current = ref(toColor(props.modelValue));

// The value the host last acknowledged. Every commit path compares against it,
// which is what makes a gesture that ends where it started — a click that lands
// on the thumb, an arrow at the edge of the area, the same hex retyped, the
// already-selected preset clicked again — produce no checkpoint at all.
const lastCommitted = ref(current.value);

// An incoming value equal to `current` is this component's own emit echoing
// back through a `v-model`, and re-baselining on it would swallow the commit at
// the end of the gesture that produced it. Anything else is the host moving the
// colour itself, which is a new baseline by definition — which is why this
// needs no "is a gesture in flight?" flag to tell the two apart.
watch(
  () => props.modelValue,
  (value) => {
    const next = toColor(value);
    if (next === current.value) return;
    current.value = next;
    lastCommitted.value = next;
  },
);

// Every one of Reka's parts writes a hex string back into its own model, but
// each types its update as `string | Color` because that union is what it will
// *accept* coming in. Narrowing it here rather than casting keeps the object
// half real: a future part that emits one still resolves to hex instead of
// stringifying to "[object Object]" and failing to parse two frames later.
function applyFromPart(value: string | Color): void {
  apply(typeof value === "string" ? value : colorToString(value, "hex"));
}

function apply(next: string): void {
  const value = toColor(next);
  if (value === current.value) return;
  current.value = value;
  emit("update:modelValue", value);
}

function onFieldCommit(value: string | Color): void {
  applyFromPart(value);
  commitCurrent();
}

function commitCurrent(): void {
  if (current.value === lastCommitted.value) return;
  lastCommitted.value = current.value;
  emit("commit", current.value);
}

// Reka commits the area on pointer release only — `ColorAreaArea` calls its
// root's `commitValues` from `pointerup` and not from its own key handler — so
// an arrow-stepped colour would never reach a host's undo stack. Deferring by a
// tick is what makes this independent of whether Vue runs this listener before
// or after Reka's on the same element: by then the step has been applied and
// `current` holds it. `commitCurrent` swallows the no-op at the axis limits.
const AREA_STEP_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
]);

function onAreaKeydown(event: KeyboardEvent): void {
  if (field.disabled || !AREA_STEP_KEYS.has(event.key)) return;
  void nextTick(commitCurrent);
}

// A preset that will not parse is dropped rather than rendered: it would be an
// invisible square that sets an unusable value, and an empty row would leave a
// `role="listbox"` with no options, which is an ARIA violation of its own. The
// row is therefore rendered only when something survives this.
const presets = computed(() => (props.swatches ?? []).filter((swatch) => isValidColor(swatch)));

function onPresetPick(value: unknown): void {
  if (typeof value !== "string") return;
  apply(value);
  commitCurrent();
}

// Unlike Slider and Select, `class` and the remaining fallthrough attributes go
// to the same node. The picker has four interactive parts and no single one of
// them is what an `aria-describedby` or a `data-testid` is about — the group
// around them is. `class` still needs the `cn()` merge rather than Vue's plain
// concatenation, so it is bound separately from the spread.
defineOptions({ inheritAttrs: false });
const { attrs, rest: groupAttrs } = useSplitAttrs();

// `id` and `aria-describedby` arrive as fallthrough attrs rather than props, so
// they are handed in as this caller's own values: a caller who sets either
// still beats the row, and the row's description is merged into theirs rather
// than replacing it. `name`, `required` and `invalid` are absent because this
// component has no prop for any of them — the row's answer stands unopposed.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  disabled: props.disabled,
}));

/**
 * The half of the resolved bag the group takes, and the reason there are two
 * halves at all.
 *
 * A row describes *the picker*, and no one of the four parts is the picker —
 * the colour is authored across all of them — so the group around them is what
 * carries the identity and the description, exactly as a `data-testid` does.
 *
 * `name` and `aria-required` cannot follow them there. ARIA allows neither on
 * `role="group"`, and `aria-allowed-attr` is a WCAG 4.1.2 rule
 * `e2e/accessibility.e2e.ts` runs over every docs page, so shipping the whole
 * bag here would turn that gate red. They go to the hex field instead, which is
 * the picker's one real form control: a native `<input>` holding exactly the
 * `#rrggbb` this component emits, so — unlike NumberField's spinbutton, which
 * holds a *formatted* number and would post its grouping separators — a `name`
 * on it submits the model value itself. `aria-invalid` rides along with them,
 * because a state announced on entering a group is a state most readers meet
 * once, while the field is where an error about the value is actually read.
 */
const groupFieldAttrs = computed(() =>
  optional({ id: field.id, "aria-describedby": field.attrs["aria-describedby"] }),
);

// Both thumbs sit on a surface whose colour is the value being chosen, so they
// have to read against white, against black and against every hue in between. A
// single-colour thumb cannot: the light ring vanishes on a pale fill and the
// dark one vanishes on a dark fill. The pair — a `background` band inside a
// `foreground` hairline — always leaves one of the two in contrast.
const THUMB =
  "block size-4 rounded-full border-2 border-background bg-transparent ring-1 ring-foreground shadow-sm " +
  "transition-transform duration-fast ease-spring hover:scale-110 active:scale-95 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo " +
  "data-[disabled]:pointer-events-none";
</script>

<template>
  <div
    v-bind="{ ...groupAttrs, ...groupFieldAttrs }"
    role="group"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    :aria-disabled="field.disabled || undefined"
    :data-disabled="field.disabled || undefined"
    :class="
      cn(
        'flex w-full max-w-xs flex-col gap-3',
        field.disabled && 'cursor-not-allowed opacity-50',
        attrs.class as string,
      )
    "
  >
    <!-- Saturation across, brightness up. `style` is Reka's own gradient for
         those two axes at the current hue — the picked colour rendered as a
         surface, which is data and not a token. -->
    <ColorAreaRoot
      v-slot="{ style }"
      :model-value="current"
      color-space="hsb"
      x-channel="saturation"
      y-channel="brightness"
      :disabled="field.disabled"
      @update:model-value="applyFromPart"
      @change-end="commitCurrent"
    >
      <!-- Reka gives this `role="application"`, which hands every key straight
           to the area rather than to the screen reader's own navigation. That
           only works if the region says what it is, so it is named here; the
           thumb inside carries the per-axis values. -->
      <ColorAreaArea
        :style="style"
        aria-label="Saturation and brightness"
        class="relative h-40 w-full rounded-md border border-border"
        @keydown="onAreaKeydown"
      >
        <ColorAreaThumb :class="THUMB" />
      </ColorAreaArea>
    </ColorAreaRoot>

    <ColorSliderRoot
      :model-value="current"
      channel="hue"
      color-space="hsb"
      :disabled="field.disabled"
      class="relative flex w-full touch-none items-center py-1"
      @update:model-value="applyFromPart"
      @change-end="commitCurrent"
    >
      <ColorSliderTrack class="relative h-3 w-full grow rounded-full border border-border" />
      <ColorSliderThumb :class="THUMB" />
    </ColorSliderRoot>

    <!-- The hex is the picker's text channel, so it is always on screen and it
         is the edit surface too. Typing writes the model on blur and on Enter
         rather than per keystroke, so a half-typed value is never emitted and
         text that will not parse is reverted to the current colour; the arrow
         keys nudge it a step at a time. Both paths arrive here already at a
         boundary, which is why the field's update is itself the checkpoint. -->
    <ColorFieldRoot
      :model-value="current"
      :disabled="field.disabled"
      class="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground transition-[color,background-color,box-shadow] duration-fast ease-out focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring focus-within:shadow-halo data-[disabled]:cursor-not-allowed"
      @update:model-value="onFieldCommit"
    >
      <ColorSwatch
        :color="current"
        :style="{ backgroundColor: current }"
        class="size-5 shrink-0 rounded-sm border border-border"
      />
      <!-- The row's three form-control answers, which the group cannot hold —
           see `groupFieldAttrs`. `aria-label` stays: it names the *field*, not
           the picker, and a row's label never reached this element anyway. -->
      <ColorFieldInput
        aria-label="Hex value"
        :name="field.name"
        :aria-required="field.required || undefined"
        :aria-invalid="field.invalid || undefined"
        class="tabular min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed"
      />
    </ColorFieldRoot>

    <!-- One tab stop, not one per swatch: Reka's swatch picker is a listbox
         with roving focus, so arrows move between presets and Enter or Space
         chooses. `replace` rather than Reka's default `toggle`: a row of
         presets is a choice, not a set of switches, so clicking the one
         already showing must re-affirm the colour rather than clear it to
         nothing. `onPresetPick`'s string check holds the same line from the
         other side, for the empty selection `toggle` would emit. -->
    <ColorSwatchPickerRoot
      v-if="presets.length > 0"
      :model-value="current"
      :disabled="field.disabled"
      :aria-disabled="field.disabled || undefined"
      selection-behavior="replace"
      aria-label="Presets"
      class="flex flex-wrap gap-2"
      @update:model-value="onPresetPick"
    >
      <ColorSwatchPickerItem
        v-for="preset in presets"
        :key="preset"
        :value="preset"
        :disabled="field.disabled"
        :style="{ backgroundColor: preset }"
        class="size-6 cursor-pointer rounded-sm border border-border transition-transform duration-fast ease-spring hover:scale-110 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo aria-selected:ring-2 aria-selected:ring-primary aria-selected:ring-offset-2 aria-selected:ring-offset-background data-[disabled]:pointer-events-none"
      />
    </ColorSwatchPickerRoot>
  </div>
</template>
