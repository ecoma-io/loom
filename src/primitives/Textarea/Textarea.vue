<script lang="ts">
import {
  COUNT_LABELS,
  warningWindow,
  type CountBand,
  type CountLabels,
} from "../../lib/count-labels";

export type TextareaResize = "none" | "vertical";

/**
 * Everything this control says out loud, and every word of it is Loom's own —
 * a bare `<textarea>` renders no English of anybody else's, so a dropped key
 * here falls back to nothing rather than to a stray untranslated string.
 *
 * These are TextField's five counter keys, by name and by argument shape, and
 * deliberately so: a host that has already worded a character counter should be
 * able to copy that bag across unchanged. They come from
 * `src/lib/count-labels.ts` rather than being declared a second time. They are
 * a slot of their own rather than a share of `textField`'s because that slot
 * also carries `reveal`, and handing a textarea's translator a password-toggle
 * key to fill in is asking a question the control cannot answer.
 */
export type TextareaLabels = CountLabels;

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing
 * rather than a transcription of it.
 */
export const TEXTAREA_LABELS: TextareaLabels = COUNT_LABELS;
</script>

<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";
import { useFieldControl } from "../../lib/field-context";
import { useLabels, type LabelOverrides } from "../../lib/labels";

/**
 * Textarea — multi-line text entry, around a native `<textarea>`. The
 * accessible name is a first-class prop pair (`aria-label`/`aria-labelledby`,
 * camelized by Vue) bound onto the textarea explicitly, the same contract as
 * TextField.
 *
 * The border, focus ring and invalid state live on the wrapper so optional
 * `#leading`/`#trailing` adornments sit *inside* the field and share its focus
 * bloom, instead of every caller re-inventing an icon-inside-input layout.
 * The slot names and positions match TextField's, and the vertical alignment
 * differs — `items-start` for multi-line, where the text begins, versus
 * `items-center` for single-line — because a five-row box with a centered icon
 * mid-field reads as a mistake rather than a choice.
 *
 * Wrapping a rendered structure means the fallthrough `class` must land on the
 * wrapper (so a caller's `w-64`/`flex-1` sizes the whole field) while the rest
 * of the attrs (`id`, `name`, `data-testid`, `aria-describedby`) belong on the
 * real `<textarea>` — the split-attrs convention shared with TextField.
 *
 * That same wrapper is why the character counter is a prop here rather than a
 * `CountedField` beside this one. A counter rendered *below* the field would
 * have to move the fallthrough `class` off the box a caller sizes with it, and
 * a textarea has no free column to hang one in — the value fills the box and
 * scrolls, and the bottom-right corner belongs to the native resize grabber.
 * The counter sits below the border, where `resize` moves the box's bottom
 * edge and the counter travels with it rather than floating over the text.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself through
 * `useFieldControl()` — the row's id, the id of its hint or error line, and
 * `required` / `invalid` / `disabled` / `readonly` / `name` — so
 * `<Field label="Bio" hint="…"><Textarea /></Field>` needs no attributes at the
 * call site. Every prop below still wins over the row when it is set, in both
 * directions, which is why the four booleans default to `undefined` rather
 * than `false`.
 *
 * `readonly` and `disabled` are different states, and they are told apart on
 * three channels rather than one. A read-only field is a value on show: the
 * subtle fill, the text at full strength, the input hairline, still a Tab stop
 * and still submitted. A disabled one is unavailable: the deeper neutral fill,
 * the muted text, and the hairline receding to the plain border — a difference
 * in shape as well as in colour, which is what survives a reader who cannot
 * resolve the two fills apart.
 */
const props = withDefaults(
  defineProps<{
    /** The current value. Pair with `@update:modelValue` for `v-model`. */
    modelValue?: string;
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
    /** Initial height in text rows. */
    rows?: number;
    /** Whether a person can drag-resize the field; `none` locks it to `rows`. The counter sits below the box either way, so a drag never moves it onto the value. */
    resize?: TextareaResize;
    /** The accessible name, when no visible element already labels the field. */
    ariaLabel?: string;
    /** The id of the visible element that labels the field (e.g. a Field wrapper's label). */
    ariaLabelledby?: string;
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
     * `TextareaLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application: the case it exists for is a field counting something other
     * than characters, where "80 words left" is the true sentence.
     */
    labels?: LabelOverrides<TextareaLabels>;
  }>(),
  {
    // Not `false`, for any of the four — see TextField.vue, which carries the
    // full reasoning. `false` is a caller's decision that must beat the row;
    // absent is a caller saying nothing, and only `undefined` survives to mean
    // that past Vue's absent-Boolean-casts-to-false rule.
    disabled: undefined,
    readonly: undefined,
    invalid: undefined,
    required: undefined,
    rows: 3,
    resize: "vertical",
    // `undefined` for the same Boolean-cast reason, and here it is the whole
    // feature: `showCount ?? (maxLength !== undefined)` would be a dead branch
    // if an absent prop arrived as `false`.
    showCount: undefined,
  },
);

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

defineOptions({ inheritAttrs: false });
const { attrs, rest: textareaAttrs } = useSplitAttrs();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("textarea", TEXTAREA_LABELS, () => props.labels);

const countId = useId();

/**
 * What is actually in the box, which is not always `modelValue` — TextField's
 * reasoning, and the same defect waiting on this side of it.
 *
 * Used without `v-model` this component is uncontrolled, so `modelValue` stays
 * `undefined` while the reader types and the counter still has to count. And
 * binding `:value="currentValue"` rather than `:value="modelValue"` is
 * load-bearing rather than cosmetic: Vue's `value` patch coerces
 * `null`/`undefined` to `""`, so any re-render of an uncontrolled field wipes
 * it — a defect nothing had met only because nothing in this component
 * re-rendered on a keystroke until the counter did.
 */
const typed = ref(props.modelValue ?? "");
const currentValue = computed(() => props.modelValue ?? typed.value);

function onInput(event: Event): void {
  const value = (event.target as HTMLTextAreaElement).value;
  typed.value = value;
  emit("update:modelValue", value);
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
 * What the live region says, and it changes **only when the band changes** —
 * TextField's decision, taken once for the pair rather than re-litigated here.
 *
 * A region holding the counter itself would speak on every keystroke, burying
 * the field's own echo of the character just typed under a number nobody asked
 * for. What a reader needs is the two facts they cannot see coming — the limit
 * is close, and the limit is passed — so this fires once at each crossing and
 * goes quiet again on the way back down. The numbers are therefore true at the
 * moment they are spoken and not after; the visible counter carries the live
 * figure, and it is wired into `aria-describedby`, so the exact count is one
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

// `id` and `aria-describedby` arrive as fallthrough attrs rather than props, so
// they are handed in as this caller's own values: a caller who sets either
// still beats the row, and the row's description is merged into theirs. The
// counter joins that list rather than replacing anything — it reads after the
// caller's own description and before the row's message, which is the same
// most-specific-first order `useFieldControl` applies one layer out.
//
// `field.attrs` then spreads **after** `textareaAttrs`, and that position is
// the contract — see TextField.vue, which carries the full reasoning. The
// `:aria-invalid` binding that used to sit below went with it: an individual
// attribute written after a `v-bind` wins, so keeping one would overwrite the
// resolved value with the raw prop.
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
  <!-- Layout, and nothing else: no fallthrough attribute lands here and nothing
       is painted on it. `inline-flex` is what makes it shrink-wrap the field
       frame — a block wrapper would be as wide as the column, and the counter
       would right-align to that column rather than to the field's own edge. -->
  <div class="inline-flex max-w-full flex-col align-top">
    <!-- The field frame: border, focus, state. Like TextField, the border lives
         here so optional #leading/#trailing adornments sit inside the field and
         share its focus bloom, instead of every caller re-inventing an
         icon-inside-input layout. -->
    <div
      :data-disabled="field.disabled || undefined"
      :data-readonly="field.readonly || undefined"
      :data-invalid="field.invalid || undefined"
      :class="
        cn(
          'group flex items-start gap-2 rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm',
          'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
          // Rim-lit at rest, the weave blooms on focus (Signature law): the field
          // catches light instead of casting a shadow, and focus draws it tight.
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
          !field.invalid && 'focus-within:shadow-halo',
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
          // The text colour is declared here rather than on the `<textarea>` because
          // the textarea sets no resting colour of its own and inherits this one,
          // which also carries it to the adornments in the same box.
          field.disabled && 'cursor-not-allowed border-border bg-muted text-muted-foreground',
          // The same appearance, reached from the other direction: a
          // `<fieldset disabled>` above this field disables the `<textarea>` inside
          // it natively and never touches `field.disabled`, so the rule above
          // cannot fire and the field rendered byte-identical to an editable one.
          //
          // `in-[fieldset:disabled]:` is a *read* of the attribute that did the
          // disabling, so the fill and the native inertness cannot disagree — the
          // fieldset element is still the only place the fact is written. It is
          // preferred to `has-[:disabled]:` (a wrapper reading its own contents)
          // because that proxy is wrong wherever a control holds a part that
          // disables itself.
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
      <textarea
        v-bind="{ ...textareaAttrs, ...field.attrs }"
        :aria-label="ariaLabel"
        :aria-labelledby="ariaLabelledby"
        :value="currentValue"
        :placeholder="placeholder"
        :disabled="field.disabled"
        :readonly="field.readonly"
        :rows="rows"
        :class="
          cn(
            'min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed',
            resize === 'none' ? 'resize-none' : 'resize-y',
          )
        "
        @input="onInput"
      />
      <span
        v-if="$slots.trailing"
        class="inline-flex shrink-0 items-center gap-1 text-muted-foreground transition-colors duration-fast ease-out group-focus-within:text-foreground"
      >
        <slot name="trailing" />
      </span>
    </div>
    <!-- Below the box, never inside it. A textarea's value fills its box and
         scrolls, so there is no free column to hang a readout in, and the
         bottom-right corner belongs to the native resize grabber — an inset
         counter would sit on top of the one affordance that says the field can
         be dragged. Here it travels with the bottom edge instead, so `resize`
         moves it rather than moving the box out from under it.

         `tabular` because the number changes under itself on every keystroke,
         and proportional digits would shuffle the whole readout sideways as
         they do. -->
    <span
      v-if="showsCount"
      :id="countId"
      :data-over-limit="band === 'over' || undefined"
      :class="
        cn(
          'tabular mt-1 select-none self-end text-small',
          band === 'under' && 'text-muted-foreground',
          // Colour, and never only colour: `countOverMax` says the limit is
          // passed in words as well, and `approachingLimit` announces the near
          // band once. The digits themselves are the third reading — 21/20 is
          // over the limit whatever it is painted.
          band === 'near' && 'text-warning',
          band === 'over' && 'text-destructive',
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
  </div>
</template>
