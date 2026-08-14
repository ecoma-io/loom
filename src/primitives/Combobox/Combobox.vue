<script lang="ts">
import { cva } from "class-variance-authority";
import type { LabelOf } from "../../lib/labels";

/**
 * Everything this control says that does not come from the host's own options.
 *
 * `trigger` replaces a name Reka UI writes in English of its own accord:
 * `ComboboxTrigger` puts `aria-label="Show popup"` in its own vnode props and
 * exposes no prop for it, so without this the chevron is the one control on a
 * fully localised form still speaking English. A binding on the Loom side
 * arrives as a fallthrough attribute, which Vue merges onto the root vnode
 * after Reka's render function produced it, and `mergeProps` is last-write-wins
 * for everything that is not `class`, `style` or `on*` — so it replaces Reka's
 * rather than competing with it.
 *
 * `empty` is Loom's own, and it is the default beneath the `emptyMessage`
 * prop rather than a competitor to it: the prop is the wording for one box —
 * "No country by that name" — and this is what every other box says.
 *
 * The two multi-select keys take the **number**, never a formatted string, for
 * the reason `src/lib/labels.ts` gives at length: "3 selected" has one plural
 * form in Vietnamese, two in English and six in Arabic, and `+47` is a
 * punctuation choice made in one language. A host handed the integer reaches
 * `Intl.PluralRules` for the category and `Intl.NumberFormat` for the digits.
 */
export interface ComboboxLabels {
  /** The chevron that opens the list. It is not a Tab stop; this is what a screen reader reads on it. */
  readonly trigger: string;
  /** The row shown in place of the list when the filter matches nothing, unless `emptyMessage` says otherwise. */
  readonly empty: string;
  /**
   * How many options are chosen, read out when the box takes focus.
   *
   * Multi-select only, and the only thing that tells a reader the size of a
   * selection without walking the list: the trigger shows the first few tokens
   * and a count for the rest, and neither is announced on its own.
   */
  readonly count: LabelOf<{ count: number }>;
  /** The visible summary standing in for the tokens the trigger did not have room for. */
  readonly overflow: LabelOf<{ hidden: number }>;
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing.
 */
export const COMBOBOX_LABELS: ComboboxLabels = {
  trigger: "Show options",
  empty: "No results",
  count: ({ count }) => `${String(count)} selected`,
  overflow: ({ hidden }) => `+${String(hidden)} more`,
};

/**
 * One row of the list. `value` is what the model carries; `label` is what a
 * reader sees, what the filter matches, and what the input shows once the row
 * is chosen.
 *
 * Identical to `SelectOption` today, and deliberately not the same
 * declaration: the two surfaces are independent, and the first field either
 * one grows — a secondary line here, a group key there — is a field the other
 * should not inherit by accident. A shared alias would make that change look
 * free when it is not.
 */
export interface ComboboxOption {
  /** The value bound to `v-model` when this row is chosen. Unique within the list. */
  value: string;
  /** The text shown on the row, matched by the filter, and put in the input once chosen. */
  label: string;
  /** Present but unchoosable — visible, skipped by the keyboard, unclickable. */
  disabled?: boolean;
}

/**
 * The control's height scale. It matches the text input and Select scales
 * exactly, so a form row mixing a Combobox beside either never comes out
 * uneven — which is why reaching past `size` for an `h-*` class is always the
 * wrong fix.
 */
export type ComboboxSize = "sm" | "md" | "lg";

export const comboboxVariants = cva(
  [
    "flex w-full items-center gap-2 rounded-md border border-input bg-background text-foreground",
    "transition-[color,background-color,border-color,box-shadow] duration-fast ease-out",
    // The focusable node is the input *inside* this box, so the ring is drawn
    // with `focus-within` rather than `focus-visible` — the same choice
    // TextField makes for the same reason, and what keeps the two controls
    // lighting up identically in a form row.
    "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
  ],
  {
    // `satisfies` keeps the two halves honest: the union above is the name a
    // consumer imports and the documentation prints, the map below is the
    // classes. Adding a member to one and not the other stops compiling.
    variants: {
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3 text-sm",
        lg: "h-11 px-4 text-base",
      } satisfies Record<ComboboxSize, string>,
    },
    defaultVariants: { size: "md" },
  },
);

/**
 * The same three numbers as a floor rather than as a fixed height, for the
 * multi-select box only.
 *
 * A box holding tokens is sized by its content, which is TagsInput's call and
 * the reason its field is `min-h-9`. What keeps that from turning into an
 * unbounded control here is `visibleValues`: the token row never wraps, so in
 * practice the box resolves to exactly the height above and a multi-select
 * still lines up with the single-select beside it. The `h-auto` that goes with
 * it in the template is what releases the fixed height `comboboxVariants`
 * already set — Tailwind's merge resolves the two, `min-h-*` does not.
 */
const multiSelectHeights = {
  sm: "min-h-8",
  md: "min-h-9",
  lg: "min-h-11",
} satisfies Record<ComboboxSize, string>;
</script>

<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import {
  ComboboxRoot,
  ComboboxAnchor,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxPortal,
  ComboboxContent,
  ComboboxViewport,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxEmpty,
} from "reka-ui";
import { Check, ChevronDown } from "@lucide/vue";
import Chip from "../Chip/Chip.vue";
import { cn } from "../../lib/cn";
import { listStaggerDelay } from "../../lib/motion";
import { useSplitAttrs } from "../../lib/attrs";
import { useFieldControl } from "../../lib/field-context";
import { useLabels, type LabelOverrides } from "../../lib/labels";
import { optional } from "../../lib/props";

/**
 * Combobox — a text input that narrows a list as you type, for the list too
 * long to scan. Countries, currencies, repositories, people: anywhere a reader
 * knows roughly what they are looking for and would rather type three letters
 * than scroll past two hundred rows.
 *
 * Its neighbour is `Select`, and the boundary is the length of the list rather
 * than the shape of the control. Three to fifteen rows a reader can read
 * through belong in a Select — a search box over eight options is a keystroke
 * charged for nothing. Two to five options that should all be visible at once
 * belong in a segmented control. Past roughly fifteen, searching beats
 * scrolling and this is the control that offers it.
 *
 * Built on Reka UI's Combobox, which supplies the editable-combobox semantics:
 * the `role="combobox"` input wired to the listbox by `aria-expanded` and
 * `aria-controls`, `aria-autocomplete="list"`, and the active row tracked by
 * `aria-activedescendant` while real focus stays in the input. That last part
 * is the one genuine behavioural difference from Select, which moves focus
 * onto the row itself — a combobox cannot, because the reader is still typing.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself: the row's id, the id of
 * its hint or error line, `required`, `invalid`, `disabled` and the name the
 * chosen value is submitted under all arrive through `useFieldControl()`, so
 * `<Field label="Country" error="…"><Combobox … /></Field>` needs no attributes
 * at the call site. Both booleans below still win over the row when they are
 * set, in both directions — which is why they default to `undefined` rather
 * than `false`.
 *
 * A row's `readonly` is deliberately ignored. The text in the box is not the
 * value — it is the chosen option's label, rewritten on every choice — so a
 * `readonly` input here would freeze a caption rather than protect a value,
 * while the list underneath still opened on click. A choice nobody may change
 * is a disabled Combobox, or the label rendered as text.
 *
 * `multiple` turns it into a many-of-many picker. The chosen values render as
 * tokens in the box — the same `Chip` a
 * [TagsInput](../TagsInput/TagsInput.vue) commits its values to, so a selection
 * looks the same wherever a form shows one — and the input goes back to being
 * only a search box. The tokens are **inert**, deliberately: the list is where
 * a choice is made and where it is unmade, so the control stays the single Tab
 * stop it is in single-select, and a value hidden behind the overflow count is
 * reachable by exactly the same gesture as a visible one. That is the one place
 * this diverges from TagsInput, whose tokens carry their own remove control
 * because it has no list to send a reader back to.
 */
const props = withDefaults(
  defineProps<{
    /**
     * The chosen option's `value`, or every chosen value when `multiple`.
     *
     * The union is one prop rather than a generic component, and the invariant
     * is the mode: single-select emits and accepts a `string` and never an
     * array, multi-select an array and never a bare string. A generic would
     * express that in the type system and cost more than it buys — it would
     * print a conditional type in the generated API table below, and it would
     * break `InstanceType<typeof Combobox>`, which is how a consumer types a
     * template ref.
     */
    modelValue?: string | string[] | undefined;
    /** The rows, in the order they are shown. */
    options: ComboboxOption[];
    /** Lets several rows be chosen at once: chosen rows toggle instead of closing the list, and the box shows the selection as tokens. */
    multiple?: boolean;
    /**
     * How many tokens the box shows before the rest collapse into a count.
     *
     * The box must not grow with the selection — it sits in a form row beside
     * controls on a fixed height scale — so past this many the tail becomes one
     * `labels.overflow` summary: five chosen shows three and "+2 more", fifty
     * shows three and "+47 more". Raise it for a wide box; the row never wraps,
     * so a number the box has no room for is a number that truncates.
     */
    visibleValues?: number;
    /** Shown in the empty input, before anything is typed or chosen. */
    placeholder?: string;
    /** Shown as a row of its own when the filter matches nothing. Defaults to `labels.empty`, so say what was searched for rather than restating the default in a second language. */
    emptyMessage?: string | undefined;
    /** Unavailable: dims the control, refuses to open and refuses to take text. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** Control height. It shares the text input scale so mixed form rows stay aligned. */
    size?: ComboboxSize;
    /**
     * Filter `options` against the typed text. Turn it off when the host is
     * producing the list itself — from a server, in response to
     * `update:query` — so a result that does not literally contain what was
     * typed is not then hidden a second time by a filter running underneath it.
     */
    filter?: boolean;
    /**
     * Names for the two strings this control supplies itself, as any subset of
     * `ComboboxLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application. `emptyMessage` is the shorter way to reach `empty` for one
     * box; this is what reaches `trigger`.
     */
    labels?: LabelOverrides<ComboboxLabels>;
  }>(),
  {
    // `modelValue: undefined` is load-bearing rather than redundant: paired
    // with `optional()` below it is what keeps the uncontrolled third state
    // reachable, instead of pinning the control to a value nobody chose.
    modelValue: undefined,
    multiple: false,
    // Three, and the number is a judgement rather than a measurement: two
    // tokens plus a count reads as a control that shows almost nothing, and
    // four leaves a `md` box no room to type in at the default width. It is a
    // prop because the right answer is the box's width, which only the caller
    // knows.
    visibleValues: 3,
    // No English default here any more. The wording moved into `COMBOBOX_LABELS`
    // so a host can set it once for the whole application rather than on every
    // box, and an absent prop is what lets the resolved label through.
    emptyMessage: undefined,
    // Not `false`, for either. `false` is a caller saying "this control is fine
    // / enabled even though its row is not"; absent is a caller saying nothing,
    // and only `undefined` survives to mean that past Vue's
    // absent-Boolean-casts-to-false rule — see TextField.vue, which carries the
    // full reasoning.
    disabled: undefined,
    invalid: undefined,
    size: "md",
    filter: true,
  },
);

const emit = defineEmits<{
  /** The chosen option's `value` — or the whole chosen list, when `multiple`. Single-select fires once per choice and the list closes with it; multi-select fires once per toggle and the list stays open. */
  "update:modelValue": [value: string | string[]];
  /** The text now in the input — as the reader types, and again when a choice puts its label there. */
  "update:query": [query: string];
}>();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("combobox", COMBOBOX_LABELS, () => props.labels);

const query = ref("");

/**
 * The stagger is the list's *reveal*, and re-filtering is not a reveal. This
 * is true from the moment the list opens until the first keystroke, after
 * which every row arrives immediately.
 *
 * Two things go wrong without it. A delay recomputed per keystroke makes the
 * list feel like it is rebuilding under the reader's fingers — the opposite of
 * what a filter is for. And raising `animation-delay` on a row that survived
 * the keystroke rewinds its entrance: the row is still mounted, so the
 * animation is not restarted, it is re-timed, and a row that had finished
 * fading in drops back to half-opacity. Going the other way — stagger to `0ms`
 * — only ever fast-forwards, which is why this flag falls and does not rise
 * again until the content has unmounted and remounted with the next open.
 */
const revealing = ref(true);

const countId = useId();

/**
 * The multi-select's own copy of the selection, and the reason it keeps one:
 * the tokens have to render whether or not the host bound `v-model`.
 *
 * Left uncontrolled, `modelValue` stays `undefined` while Reka manages the
 * choice internally — which is the third state `optional()` exists to preserve
 * — so a trigger reading the prop would sit empty while the list showed three
 * checked rows. This mirrors rather than drives: it is never fed back into
 * Reka, so nothing about the uncontrolled control changes.
 *
 * Seeded from the prop rather than sanitised, for TagsInput's reason: a list
 * the host already holds is the host's to hold.
 */
const selected = ref<string[]>(Array.isArray(props.modelValue) ? [...props.modelValue] : []);
watch(
  () => props.modelValue,
  (next) => {
    if (Array.isArray(next)) selected.value = [...next];
  },
  { deep: true },
);

/**
 * The chosen values as the box shows them, and the fallback is the point: a
 * host driving `options` from a search hands back only the rows matching the
 * current query, so a value chosen from an earlier one has no option to look
 * its label up in. Falling back to the value keeps the token on screen — a
 * chosen value that vanished from the trigger while it was still in the model
 * would be the control lying about what it holds.
 */
const tokens = computed(() =>
  selected.value.map((value) => ({
    value,
    label: props.options.find((option) => option.value === value)?.label ?? value,
  })),
);

const visibleTokens = computed(() => tokens.value.slice(0, Math.max(0, props.visibleValues)));
const hiddenTokens = computed(() => tokens.value.length - visibleTokens.value.length);

/**
 * What the input shows once a row is chosen. Without this Reka falls back to
 * the model value's own `toString()`, which would leave `en` in the box where
 * the reader picked "English".
 *
 * A multi-select shows nothing: the tokens are the selection, and the input
 * beside them is a search box. Reka calls this on close rather than on choose,
 * so the query the reader typed survives every toggle and one search can pick
 * several rows — which is the whole reason the list stays open.
 */
function displayValue(value: unknown): string {
  if (props.multiple) return "";
  return props.options.find((option) => option.value === value)?.label ?? "";
}

/**
 * Reka hands back the whole selection on every toggle, never a delta, so the
 * emitted array is always the complete list — the same contract TagsInput's
 * `update:modelValue` carries, and the reason a host can assign it straight
 * back.
 */
function onChoice(value: unknown): void {
  if (!props.multiple) {
    emit("update:modelValue", String(value));
    return;
  }
  const values = Array.isArray(value) ? value.map(String) : [];
  selected.value = values;
  emit("update:modelValue", values);
}

function onQuery(text: string): void {
  // Reka rewrites the input's text on its own account — once as the component
  // mounts, and again when a choice puts the chosen label back in the box —
  // and each of those arrives here as an update. Reporting a query that did
  // not change would have a host running the same search twice on mount, so
  // only a real change is passed on.
  if (text === query.value) return;
  query.value = text;
  revealing.value = false;
  emit("update:query", text);
}

// The root renders no DOM node of its own, so fallthrough attributes would be
// dropped on the floor. They go to the input, which is the element they
// describe and the only one a name can land on — the chevron trigger already
// carries Reka's own `aria-label`, and naming the control means naming the
// `role="combobox"` node.
//
// `class` is pulled out of that spread and merged through `cn()` onto the
// anchor instead, because the anchor is the box a caller means when they pass
// `w-64`. Spreading it alongside the anchor's own `:class` would only
// concatenate the two lists — Vue's merge is generic, not Tailwind-aware — so
// a caller's width would win or lose depending on which utility Tailwind
// happened to emit last.
defineOptions({ inheritAttrs: false });
const { attrs, rest: inputAttrs } = useSplitAttrs();

// `id` and `aria-describedby` reach this control as fallthrough attrs rather
// than props, so they are read off `attrs` and handed in as this caller's own
// values — a caller who sets either still beats the row, and the row's
// description is merged into theirs rather than replacing it. `name`,
// `readonly` and `required` are absent from this object because there is no
// prop to oppose the row with; the row's answer stands unopposed, which is
// what is wanted.
//
// The multi-select's count joins that list rather than replacing anything: it
// is one more thing this control says about itself, and it reads after the
// caller's own description and before the row's message — the same
// most-specific-first order `useFieldControl` applies one layer out. Wired
// through `aria-describedby` rather than announced, which is TagsInput's call
// for the same fact: it is heard on focus and on every return to the box, which
// is when the question is asked, and a live region would speak the whole total
// over the top of the `aria-selected` change the row itself already announces.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: [attrs["aria-describedby"] as string | undefined, props.multiple ? countId : ""]
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .join(" "),
  disabled: props.disabled,
  invalid: props.invalid,
}));

// `name` is the one resolved key that does not travel with the bag, and here
// it is a defect rather than a nicety: the bag lands on the input, and what
// the input holds is the chosen option's *label*. A `name` on it would post
// "Viet Nam" where the model carries `vn`. Reka submits the value itself
// through a hidden control it renders from the root's own `name`, so that is
// where the row's name goes. Everything else in the bag — the id, the merged
// description, `aria-required`, `aria-invalid` — belongs on the
// `role="combobox"` node, which is the input.
const inputFieldAttrs = computed(() => {
  // Removed from a copy rather than listed positively, so a key added to the
  // resolved bag later reaches this input without anyone remembering to come
  // back here.
  const aria: Record<string, unknown> = { ...field.attrs };
  delete aria.name;
  return aria;
});
</script>

<template>
  <!-- `open-on-click` and not `open-on-focus`: clicking the box is a reader
       asking to see the list, while focus arrives by Tab as often as by
       intent, and a list that unfolds over the next field every time someone
       tabs through a form is an obstruction. Typing opens it either way. -->
  <ComboboxRoot
    v-bind="optional({ modelValue, name: field.name })"
    :multiple="multiple"
    :disabled="field.disabled"
    :ignore-filter="!filter"
    open-on-click
    @update:model-value="onChoice"
    @update:open="revealing = true"
  >
    <ComboboxAnchor
      :data-disabled="field.disabled || undefined"
      :data-invalid="field.invalid || undefined"
      :class="
        cn(
          comboboxVariants({ size }),
          // A box holding tokens is sized by them — see `multiSelectHeights`.
          // `h-auto` is what releases the fixed height the variant just set;
          // Tailwind's merge resolves two `h-*` utilities and leaves a `min-h-*`
          // beside either of them alone.
          multiple && ['h-auto', multiSelectHeights[size], 'gap-1.5'],
          !field.invalid && 'focus-within:shadow-halo',
          field.invalid && 'border-destructive focus-within:outline-destructive',
          // The box holds the chosen value, so it is drained rather than
          // dimmed: `opacity-50` composited the input's text down to 3.06:1,
          // and what a reader needs from an unavailable Combobox is precisely
          // what it is set to. The neutral well says unavailable on its own —
          // the input's own `disabled:text-muted-foreground` below carries the
          // text to 4.67:1 over it.
          //
          // The hairline recedes with the fill, and that second channel is the
          // point: unavailable is a difference in *shape* as well as in colour,
          // so it survives a reader who cannot resolve `muted` from
          // `background`. This control has no read-only state to be told apart
          // from — see the docblock — so it takes the unavailable row alone.
          field.disabled && 'cursor-not-allowed border-border bg-muted text-muted-foreground',
          attrs.class as string,
        )
      "
    >
      <!-- The selection, as the tokens a TagsInput commits its values to, so a
           chosen set looks the same wherever a form shows one. Inert on
           purpose: the list is where a value is chosen and where it is
           unchosen, which keeps the whole control one Tab stop and keeps a
           value behind the overflow count reachable by the same gesture as a
           visible one. -->
      <template v-if="multiple">
        <Chip
          v-for="token in visibleTokens"
          :key="token.value"
          size="sm"
          :disabled="field.disabled"
          class="min-w-0 animate-fade-rise"
        >
          {{ token.label }}
        </Chip>
        <!-- Not a token: it stands for values rather than being one, and a
             fourth pill saying "+47 more" would read as a forty-eighth
             choice. -->
        <span v-if="hiddenTokens > 0" class="tabular shrink-0 text-small text-muted-foreground">
          {{ text.overflow({ hidden: hiddenTokens }) }}
        </span>
      </template>

      <ComboboxInput
        v-bind="{ ...inputAttrs, ...inputFieldAttrs }"
        :model-value="query"
        :display-value="displayValue"
        :placeholder="multiple && tokens.length > 0 ? undefined : placeholder"
        class="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
        @update:model-value="onQuery"
      />
      <!-- Reka takes this button out of the tab order itself, so the whole
           control is one Tab stop: the input. It also names it, in English —
           `aria-label="Show popup"`, written inside its own render function
           with no prop to reach it by — and the binding below replaces that
           rather than competing with it, because Vue merges a fallthrough
           attribute onto the root vnode after the render function produced it.
           Removing it does not fall back to nothing; it falls back to Reka's
           English, which no test of Loom's own strings would catch. -->
      <ComboboxTrigger
        :aria-label="text.trigger"
        class="group shrink-0 text-muted-foreground disabled:cursor-not-allowed"
      >
        <ChevronDown
          class="h-4 w-4 transition-transform duration-fast ease-out group-data-[state=open]:rotate-180"
        />
      </ComboboxTrigger>

      <!-- The size of the selection, and the only thing that carries it to a
           reader who cannot see the tokens: the visible row shows the first few
           and a count for the rest, and neither is announced. Reka publishes
           nothing of the sort — the listbox's `aria-multiselectable` says the
           control takes several values, never how many it holds. -->
      <span v-if="multiple" :id="countId" class="sr-only">
        {{ text.count({ count: tokens.length }) }}
      </span>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent
        position="popper"
        :side-offset="6"
        :class="
          cn(
            'z-50 max-h-72 min-w-[var(--reka-combobox-trigger-width)] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md',
            // Scoped to the open state, never unconditional. Reka keeps the
            // closed content mounted while it waits for an animationend that a
            // mount-only animation never fires again — an invisible overlay
            // eating clicks. Scoping it makes the closed element compute
            // `animation-name: none`, which is the immediate-unmount branch.
            'data-[state=open]:animate-fade-rise',
          )
        "
      >
        <ComboboxViewport class="p-1">
          <!-- A filter that matches nothing has to say so. An empty popover
               reads as a broken one, and a screen reader is told nothing at
               all — so the message is a row inside the listbox rather than a
               caption beside it. `role="option"` because a bare div is not a
               legitimate child of `role="listbox"` and is skipped; disabled
               because it is a statement, not a choice. -->
          <ComboboxEmpty
            role="option"
            aria-disabled="true"
            class="animate-fade-rise px-3 py-1.5 text-sm text-muted-foreground"
          >
            {{ emptyMessage ?? text.empty }}
          </ComboboxEmpty>

          <!-- Keyed by value rather than by index: a row that survives a
               keystroke keeps its DOM node, so its entrance animation is not
               re-run and the list settles instead of flashing. Keyed by index,
               every row below a filtered-out one would be reused for different
               content while the tail remounted — an animation playing on the
               wrong rows.

               `text-value` pins the filter to the label. Left off, Reka falls
               back to whatever the row happens to render, which is the label
               today and the label plus a badge, a hint or a count the first
               time a row grows one. -->
          <ComboboxItem
            v-for="(option, index) in options"
            :key="option.value"
            :value="option.value"
            :text-value="option.label"
            :disabled="option.disabled ?? false"
            :style="{ animationDelay: revealing ? listStaggerDelay(index) : '0ms' }"
            :class="
              cn(
                'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-1.5 pr-8 text-sm text-foreground outline-none',
                'transition-colors duration-fast ease-out',
                'animate-fade-rise',
                'data-[highlighted]:bg-subtle',
                'data-[state=checked]:bg-primary-muted data-[state=checked]:text-primary-text',
                // Inert, but still readable. `data-[disabled]:opacity-50` took
                // the label to 3.13:1 on the popover; the colour on the span
                // below leaves it at 5.76:1 and still visibly lighter than the
                // rows around it.
                'data-[disabled]:pointer-events-none',
              )
            "
          >
            <!-- The mute lives on this span rather than on the row, and it has
                 to. `data-[disabled]:` sorts *before* `data-[state=checked]:`
                 in Tailwind's variant order, so a disabled row that is also the
                 chosen one would take `text-primary-text` from the container — and a
                 container colour is only inherited. Declared here it wins
                 whatever the row resolved to. -->
            <span :class="option.disabled && 'text-muted-foreground'">{{ option.label }}</span>
            <ComboboxItemIndicator class="absolute right-2 inline-flex items-center">
              <Check class="h-4 w-4" />
            </ComboboxItemIndicator>
          </ComboboxItem>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
