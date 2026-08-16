<script lang="ts">
import type { TextFieldLabels } from "@ecoma-io/loom-labels";
import { COUNT_LABELS, warningWindow, type CountBand } from "@ecoma-io/loom-labels";

export type TextFieldType = "text" | "email" | "password" | "search" | "url" | "tel";

export type TextFieldSize = "sm" | "md" | "lg";

/**

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing
 * rather than a transcription of it.
 */
export const TEXT_FIELD_LABELS: TextFieldLabels = {
  ...COUNT_LABELS,
  reveal: "Show password",
};
</script>

<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from "vue";
import { Eye, EyeOff } from "@lucide/vue";
import { cn } from "@ecoma-io/loom-core";
import { useSplitAttrs } from "@ecoma-io/loom-core";
import { useFieldControl } from "@ecoma-io/loom-labels";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";

/**
 * TextField — single-line text entry (text · email · password · search · url ·
 * tel). The border, focus ring and invalid state live on the wrapper so
 * optional `#leading`/`#trailing` adornments (a search icon, a unit suffix)
 * sit *inside* the field and share its focus bloom, instead of every caller
 * re-inventing an icon-inside-input layout. For numeric entry reach for a
 * number field; for a bounded continuous value, a slider.
 *
 * Wrapping a rendered structure means the fallthrough `class` must land on
 * the wrapper (so a caller's `w-64`/`flex-1` sizes the whole field) while the
 * rest of the attrs (`id`, `name`, `data-testid`, `aria-describedby`,
 * `autocomplete`) belong on the real `<input>` — the split-attrs convention
 * shared with the other bare controls. The accessible name is a first-class
 * prop pair (`aria-label`/`aria-labelledby`, camelized by Vue) rather than a
 * loose fallthrough attr, so it is bound onto the input explicitly and shows
 * up in the props table — a bare input primitive can only be named by its
 * host.
 *
 * That same wrapper is why `revealable` and the character counter are props
 * here rather than a `PasswordField` and a `CountedField` beside it. `password`
 * is already a `TextFieldType` and the adornment row already exists, so a
 * second component would duplicate an entire input, its Field wiring and its
 * three sizes to add one button; and a counter rendered *below* the field
 * would have to move the fallthrough `class` off the box a caller sizes with
 * it. Both live inside the border, where the adornments already live.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself: the row's id, the id
 * of the hint or error line, and `required` / `invalid` / `disabled` /
 * `readonly` / `name` all arrive through `useFieldControl()`, so
 * `<Field label="Email" error="…"><TextField /></Field>` needs no attributes at
 * the call site. Every prop below still wins over the row when it is set, in
 * both directions — which is why the four booleans default to `undefined`
 * rather than `false`.
 *
 * `readonly` and `disabled` are different states, not two dials on one, so the
 * field has **three** resting appearances rather than two. A read-only field
 * is a value the reader may see and copy but not change: it stays a Tab stop,
 * stays in the form's submitted data, and takes a lifted fill with its text at
 * full strength. A disabled field is unavailable: no Tab stop, not submitted,
 * and drained a step further, in fill, in text colour and in border weight
 * together. Three channels rather than one is the point — see the class list.
 */
const props = withDefaults(
  defineProps<{
    /** The current value. Pair with `@update:modelValue` for `v-model`. */
    modelValue?: string;
    /** The native input type — also the on-screen keyboard hint on mobile. */
    type?: TextFieldType;
    /** Text shown in the empty field. */
    placeholder?: string;
    /** Disables the field and blocks pointer and keyboard input. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Shows the value without allowing an edit, while staying focusable and still submitted. Unset defers to a wrapping Field. */
    readonly?: boolean | undefined;
    /** Error state: paints the destructive border/ring and sets aria-invalid. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** Marks the field mandatory to assistive tech (`aria-required`). Unset defers to a wrapping Field. */
    required?: boolean | undefined;
    /** The field name for a native form post or `FormData`. Unset defers to a wrapping Field. */
    name?: string;
    /** Control height. */
    size?: TextFieldSize;
    /** The accessible name, when no visible element already labels the field. */
    ariaLabel?: string;
    /** The id of the visible element that labels the field (e.g. a Field wrapper's label). */
    ariaLabelledby?: string;
    /**
     * Adds a toggle that shows the typed password in place, for
     * `type="password"` **and nothing else** — on any other type it renders
     * nothing at all, because there is nothing to reveal.
     */
    revealable?: boolean;
    /**
     * The character limit the counter reports against, and the point past
     * which it reads as over-limit.
     *
     * Advisory, exactly as `required` is: it does **not** set the native
     * `maxlength`, which silently truncates a paste and tells the reader
     * nothing. Pass `maxlength` yourself as a plain attribute where you want
     * the browser to enforce it too.
     */
    maxLength?: number;
    /**
     * Forces the counter on or off. Left unset it follows `maxLength` — a
     * limit the reader is never shown is one they can only discover by
     * exceeding it — so set it `true` for a running total with no limit, and
     * `false` to hold a limit the field reports nowhere.
     */
    showCount?: boolean | undefined;
    /**
     * Names for everything this control says out loud, as any subset of
     * `TextFieldLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application: the case it exists for is a field counting something other
     * than characters, where "80 words left" is the true sentence.
     */
    labels?: LabelOverrides<TextFieldLabels>;
  }>(),
  {
    type: "text",
    // Not `false`, for any of the four. `false` is a caller saying "this field
    // is fine / enabled / editable even though its row is not"; absent is a
    // caller saying nothing, and only `undefined` survives to mean that. The
    // explicit default is also what beats Vue's absent-Boolean-casts-to-false
    // rule — the same reason Checkbox's `modelValue` carries one.
    disabled: undefined,
    readonly: undefined,
    invalid: undefined,
    required: undefined,
    size: "md",
    revealable: false,
    // `undefined` for the same Boolean-cast reason, and here it is the whole
    // feature: `showCount ?? (maxLength !== undefined)` would be a dead branch
    // if an absent prop arrived as `false`.
    showCount: undefined,
  },
);

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

defineOptions({ inheritAttrs: false });
const { attrs, rest: inputAttrs } = useSplitAttrs();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("textField", TEXT_FIELD_LABELS, () => props.labels);

const inputRef = useTemplateRef<HTMLInputElement>("input");
const countId = useId();

/**
 * What is actually in the box, which is not always `modelValue`.
 *
 * Used without `v-model` this component is uncontrolled — `modelValue` stays
 * `undefined` while the reader types — and the counter still has to count. So
 * the last typed value is kept here and `currentValue` prefers the prop: a
 * controlled host that *declines* an update keeps the count honest, and an
 * uncontrolled one gets the text in front of it.
 *
 * Binding `:value="currentValue"` rather than `:value="modelValue"` is
 * load-bearing and not cosmetic. Vue's `value` patch coerces `null`/`undefined`
 * to `""`, so any re-render of an uncontrolled field wipes the input — a defect
 * nothing had met only because nothing in this component re-rendered on a
 * keystroke until the counter did.
 */
const typed = ref(props.modelValue ?? "");
const currentValue = computed(() => props.modelValue ?? typed.value);

function onInput(event: Event): void {
  const value = (event.target as HTMLInputElement).value;
  typed.value = value;
  emit("update:modelValue", value);
}

/**
 * The reveal, and the two guards that make `revealable` inert rather than
 * surprising on a non-password field: the toggle is not rendered, and the type
 * cannot flip. A `type` that stops being `password` also drops the reveal —
 * coming back as a password already revealed would put a secret on screen that
 * nobody asked for a second time.
 */
const canReveal = computed(() => props.revealable && props.type === "password");
const revealed = ref(false);
watch(canReveal, (able) => {
  if (!able) revealed.value = false;
});

const inputType = computed(() => (canReveal.value && revealed.value ? "text" : props.type));

/**
 * Flipping `type` is what loses the caret: the input is re-created enough,
 * engine by engine, that the selection lands back at 0 or at the end, and a
 * reader who was fixing the third character of a long passphrase is now
 * somewhere else with no way to tell where. So the range is read before the
 * flip and written back after the DOM has it.
 *
 * Both `password` and `text` support the selection API (`email`, `url` and
 * `number` do not, and throw), and this path is unreachable for any other type
 * by construction — see `canReveal`.
 *
 * Focus is deliberately *not* moved back to the input. A reader who pressed
 * this with the keyboard is standing on the toggle and will very often press
 * it again; dropping them into the field would make hiding the password a
 * Shift+Tab away. The restored range is what greets them when they do return.
 */
function toggleReveal(): void {
  const input = inputRef.value;
  const start = input?.selectionStart ?? null;
  const end = input?.selectionEnd ?? null;
  const direction = input?.selectionDirection ?? "none";

  revealed.value = !revealed.value;

  if (input === null || start === null || end === null) return;
  void nextTick(() => {
    input.setSelectionRange(start, end, direction);
  });
}

/**
 * Length in UTF-16 code units, which is what the platform's own `maxlength`
 * counts. `[...value].length` would count code points and disagree with the
 * browser on any astral character, so a caller who pairs this with a native
 * `maxlength` would watch the counter and the enforcement drift apart.
 */
const count = computed(() => currentValue.value.length);
const showsCount = computed(() => props.showCount ?? props.maxLength !== undefined);

const band = computed<CountBand>(() => {
  const max = props.maxLength;
  if (max === undefined) return "under";
  const remaining = max - count.value;
  if (remaining < 0) return "over";
  return remaining <= warningWindow(max) ? "near" : "under";
});

const countText = computed(() => {
  const max = props.maxLength;
  if (max === undefined) return text.value.count({ count: count.value });
  const over = count.value - max;
  return over > 0
    ? text.value.countOverMax({ count: count.value, max, over })
    : text.value.countOfMax({ count: count.value, max });
});

/**
 * What the live region says, and it changes **only when the band changes**.
 *
 * A region holding the counter itself would speak on every keystroke, which is
 * worse than silence: it buries the field's own echo of the character just
 * typed under a number nobody asked for. What a reader needs is the two facts
 * they cannot see coming — the limit is close, and the limit is passed — so
 * this fires once at each crossing and goes quiet again on the way back down.
 *
 * The numbers are therefore true at the moment they are spoken and not after.
 * That is the deliberate trade: the visible counter carries the live figure,
 * and it is wired into `aria-describedby`, so the exact count is one
 * re-read away whenever the reader wants it rather than pushed at them.
 */
const announcement = ref("");
watch(band, (now) => {
  const max = props.maxLength;
  if (max === undefined || now === "under") {
    announcement.value = "";
    return;
  }
  announcement.value =
    now === "over"
      ? text.value.limitExceeded({ over: count.value - max, max })
      : text.value.approachingLimit({ remaining: max - count.value, max });
});

// `id` and `aria-describedby` reach a bare control as fallthrough attrs rather
// than props, so they are read off `attrs` and handed in as this caller's own
// values — a caller who sets either still beats the row, and the row's
// description is merged into theirs rather than replacing it. The counter joins
// that list rather than replacing anything: it is one more thing this field
// says about itself, and it reads after the caller's own description and before
// the row's message, which is the same most-specific-first order
// `useFieldControl` applies one layer out.
//
// `field.attrs` then spreads onto the `<input>` **after** `inputAttrs`, and
// that position is the contract: the bag has already resolved the caller's own
// values, and it drops every key that resolved to nothing, so it can only add.
// The `:aria-invalid` binding that used to sit on the input is gone with it —
// an individual attribute written after a `v-bind` wins, so keeping one would
// overwrite the resolved value with the raw prop and quietly re-break the link
// to the row.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: [attrs["aria-describedby"] as string | undefined, showsCount.value ? countId : ""]
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .join(" "),
  name: props.name,
  disabled: props.disabled,
  readonly: props.readonly,
  invalid: props.invalid,
  required: props.required,
}));
</script>

<template>
  <div
    :data-disabled="field.disabled || undefined"
    :data-readonly="field.readonly || undefined"
    :data-invalid="field.invalid || undefined"
    :class="
      cn(
        'group flex items-center gap-2 rounded-md border border-input bg-background text-foreground',
        'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
        // Rim-lit at rest, the weave blooms on focus (Signature law): the field
        // catches light instead of casting a shadow, and focus draws it tight.
        'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
        !field.invalid && 'focus-within:shadow-halo',
        size === 'sm' && 'h-8 px-2.5 text-xs',
        size === 'md' && 'h-9 px-3 text-sm',
        size === 'lg' && 'h-11 px-4 text-base',
        // The three resting appearances, and each is three changes rather than
        // one. Read-only and disabled used to share `bg-muted` and part only on
        // the text colour, which is a distinction carried by hue alone — the
        // one thing a reader with a colour deficiency, or a low-quality
        // display, or forced-colors, does not get. The fill separates them and
        // the border weight separates them again, so the progression
        // available → on show → unavailable is legible on three channels.
        //
        // Read-only is a value **on show**: the fill lifts off `background` to
        // `subtle` so the row reads as settled rather than editable, and the
        // text stays full strength — 13.46:1 over that fill — because being
        // read is the entire purpose of the state. The border does not move,
        // because nothing about the control's reach has: it is still a Tab stop
        // and still submitted. The native `readonly` attribute below carries
        // the same fact to assistive tech, so nothing here rests on colour.
        field.readonly && 'bg-subtle',
        // Disabled is **unavailable**: the fill drains one step further to
        // `muted`, the text follows it down to `muted-foreground` (4.68:1 over
        // it, still AA), and the rim slackens from `input` to the lighter
        // `border`.
        //
        // Drained rather than faded, and `opacity` is never the mechanism. The
        // element a dim would sit on is the box, and the box is wrapped around
        // the one thing a reader still needs: measured on the built site,
        // `opacity-50` put a disabled field's value at 3.08:1 and its
        // placeholder — already the muted colour before the fade — at 2.07:1.
        // The text colour is declared here rather than on the `<input>` because
        // the input sets no resting colour of its own and inherits this one,
        // which also carries it to the counter and the adornments in the same
        // box.
        field.disabled && 'cursor-not-allowed border-border bg-muted text-muted-foreground',
        // The same appearance, reached from the other direction: a
        // `<fieldset disabled>` above this field disables the `<input>` inside
        // it natively and never touches `field.disabled`, so the rule above
        // cannot fire and the field rendered byte-identical to an editable one.
        //
        // `in-[fieldset:disabled]:` is a *read* of the attribute that did the
        // disabling, so the fill and the native inertness cannot disagree — the
        // fieldset element is still the only place the fact is written. It is
        // preferred to `has-[:disabled]:` (a wrapper reading its own contents)
        // because that proxy is wrong wherever a control holds a part that
        // disables itself: measured on this branch, NumberField's increment
        // button goes `:disabled` at `max`, so a `has-` rule would drain a
        // perfectly editable field the moment its value reached the top.
        // Nothing about this field is a proxy — the fieldset either disabled it
        // or it did not.
        'in-[fieldset:disabled]:cursor-not-allowed in-[fieldset:disabled]:bg-muted in-[fieldset:disabled]:text-muted-foreground',
        // Gated where the two rules below are ordered, and for the same reason.
        // Tailwind emits the ancestor half of `in-*` inside `:where()`, so this
        // carries no more specificity than `border-destructive` and would win
        // on emission order alone — an unavailable field that is also in error
        // would quietly lose its destructive rim.
        !field.invalid && 'in-[fieldset:disabled]:border-border',
        // Last of the three rules that name a border colour, and the order is
        // load-bearing: `cn()` resolves a border colour by whichever class it
        // saw last, so a field that is both in error and unavailable would lose
        // its destructive rim to the disabled one if this sat above it.
        field.invalid && 'border-destructive focus-within:outline-destructive',
        attrs.class as string,
      )
    "
  >
    <span
      v-if="$slots.leading"
      class="inline-flex shrink-0 text-muted-foreground transition-colors duration-fast ease-out group-focus-within:text-foreground"
    >
      <slot name="leading" />
    </span>
    <input
      ref="input"
      v-bind="{ ...inputAttrs, ...field.attrs }"
      :aria-label="ariaLabel"
      :aria-labelledby="ariaLabelledby"
      :type="inputType"
      :value="currentValue"
      :placeholder="placeholder"
      :disabled="field.disabled"
      :readonly="field.readonly"
      class="min-w-0 flex-1 self-stretch bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      @input="onInput"
    />
    <!-- The counter is an adornment like any other, and it renders inside the
         border for the reason the icons do: the box is what a caller's `class`
         sizes, so a readout hung underneath it would need an outer element and
         `w-64` would then size something other than the field. Absent, both
         nodes are gone and the box is exactly what it was.

         `tabular` because the number changes under itself on every keystroke,
         and proportional digits would shuffle the whole readout sideways as
         they do. -->
    <span
      v-if="showsCount"
      :id="countId"
      :data-over-limit="band === 'over' || undefined"
      :class="
        cn(
          'tabular shrink-0 select-none text-small',
          band === 'under' && 'text-muted-foreground',
          // Colour, and never only colour: `countOverMax` says the limit is
          // passed in words as well, and `approachingLimit` announces the near
          // band once. The digits themselves are the third reading — 21/20 is
          // over the limit whatever it is painted.
          band === 'near' && 'text-warning',
          band === 'over' && 'text-destructive-text',
        )
      "
    >
      {{ countText }}
    </span>
    <!-- In the DOM from the first render, empty. A live region mounted at the
         same moment as its text is a region assistive tech was not yet
         watching, so the first warning — the one that matters most — is the one
         it announces least reliably. -->
    <span v-if="showsCount && maxLength !== undefined" role="status" class="sr-only">
      {{ announcement }}
    </span>
    <span
      v-if="$slots.trailing || canReveal"
      class="inline-flex shrink-0 items-center gap-1 text-muted-foreground transition-colors duration-fast ease-out group-focus-within:text-foreground"
    >
      <slot name="trailing" />
      <!-- Last in the row and last in the tab order, which is the requirement:
           a control that acts on the input must never stand between the reader
           and the input itself.

           `aria-pressed` rather than a name that changes with the state, and
           the two are not interchangeable. A name alone can only say what
           pressing will do, so a reader arriving on "Hide password" has to
           infer the state from the offer — and on activation the announcement
           is a *rename*, which some screen readers re-read and some do not, so
           the state change can pass in silence. A pressed state changes under a
           stable name, which every major screen reader announces as a state
           change, and it leaves the control findable by voice under the one
           name it always had. The glyph swap is the sighted half of the same
           fact.

           It stays available while the field is read-only: `readonly` is about
           changing the value, and revealing does not. -->
      <button
        v-if="canReveal"
        type="button"
        :aria-label="text.reveal"
        :aria-pressed="revealed"
        :disabled="field.disabled"
        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo disabled:cursor-not-allowed"
        @click="toggleReveal"
      >
        <EyeOff v-if="revealed" class="h-4 w-4" aria-hidden="true" />
        <Eye v-else class="h-4 w-4" aria-hidden="true" />
      </button>
    </span>
  </div>
</template>
