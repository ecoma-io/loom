<script lang="ts">
import type {
  TagsInputLabels,
  TagsInputRejectReason,
  TagsInputRejection,
} from "@ecoma-io/loom-labels";

/**
 * Every refusal names the value, because a reader looking at eight tokens
 * cannot tell which "that one" is.
 *
 * Loom's English does not name the limit, though `rejected` is handed it: a
 * `max` refusal only ever happens when a limit is set, so a sentence that also
 * had to word the limitless case would be a branch nothing can reach. The
 * number is there for a host that wants "only 3 can be added" — and the count
 * description already reads "3 of 3 tags" on focus either way.
 */
function describeRejection(rejection: TagsInputRejection): string {
  switch (rejection.reason) {
    case "duplicate":
      return `${rejection.value} has already been added.`;
    case "max":
      return `${rejection.value} was not added — the field is full.`;
  }
}

/**
 * Loom's English, co-located with the component so it tree-shakes with it, and
 * exported so a host can build a partial vocabulary against the real thing
 * rather than a transcription of it.
 */
export const TAGS_INPUT_LABELS: TagsInputLabels = {
  remove: ({ value }) => `Remove ${value}`,
  count: ({ count, max }) =>
    max === undefined
      ? `${String(count)} ${count === 1 ? "tag" : "tags"}`
      : `${String(count)} of ${String(max)} tags`,
  rejected: ({ rejections }) => rejections.map(describeRejection).join(" "),
  clear: "Clear all tags",
};
</script>

<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from "vue";
import {
  TagsInputRoot,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemText,
  TagsInputClear,
} from "reka-ui";
import { TriangleAlert, X } from "@lucide/vue";
import Chip from "@ecoma-io/loom-chip";
import { cn } from "@ecoma-io/loom-core";
import { useSplitAttrs } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";
import { useFieldControl } from "@ecoma-io/loom-labels";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";

/**
 * TagsInput — several values typed into one field, each committed to a
 * removable token: keywords on an article, recipients on a message, labels on
 * an issue.
 *
 * The line against its neighbours is what the values *are*. A
 * [Select](../Select/Select.vue) or a [Combobox](../Combobox/Combobox.vue)
 * picks from a list somebody else wrote, and cannot produce a value that is not
 * already in it; this field's whole point is that the reader invents the
 * values. A [TextField](../TextField/TextField.vue) holds one value, and a
 * comma-separated string in one is a list the application has to parse and the
 * reader has to punctuate correctly. Reach for
 * [Chip](@ecoma-io/loom-chip) alone when the tokens are a display of something
 * already decided — a chip row nobody types into is not a field.
 *
 * Each token *is* a Chip, in the removable shape Chip already ships, so a token
 * here and a chip elsewhere in the same form are the same object. The remove
 * control is Chip's own rather than Reka's `TagsInputItemDelete`, which is
 * `tabindex="-1"` by design: Reka pairs it with an arrow-key selection that
 * moves no focus and sets no `aria-activedescendant`, so the token it
 * highlights is announced to nobody. Loom keeps the buttons on the tab order
 * and replaces the selection outright — see `onKeydownCapture`.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself: the row's id, the id of
 * the hint or error line, and `required` / `invalid` / `disabled` / `readonly` /
 * `name` all arrive through `useFieldControl()`. Every prop below still wins
 * over the row when it is set, in both directions — which is why the four
 * booleans default to `undefined` rather than `false`.
 *
 * `readonly` and `disabled` are different states here as everywhere else, and
 * the difference is larger than usual because there are two things to freeze. A
 * read-only field shows its tokens, refuses to grow one and drops every remove
 * control, while staying a tab stop and staying in the submitted data. A
 * disabled field is unavailable: not a tab stop, not submitted, and its tokens
 * drain to the neutral fill.
 *
 * That makes **three** resting appearances rather than two, and each is three
 * changes rather than one — fill, text colour and border weight together. See
 * the box's class list for why one channel is not enough.
 */
const props = withDefaults(
  defineProps<{
    /** The committed tokens. Pair with `@update:modelValue` for `v-model`. */
    modelValue?: string[] | undefined;
    /** Text shown in the empty text box. It is hidden once a token exists, where it would sit beside the tokens claiming the field is empty. */
    placeholder?: string;
    /** The most tokens the field will hold. Anything past it is refused and reported rather than dropped. */
    max?: number;
    /** Whether the same value may be committed twice. Off, so a repeated value is refused and says so. */
    duplicates?: boolean;
    /** What commits a token besides Enter. Typing it, or pasting text containing it, splits at it. */
    delimiter?: string;
    /** Renders a control that empties the field in one press. */
    clearable?: boolean;
    /** Disables the field: no tab stop, no editing, no remove controls, nothing submitted. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Shows the tokens without allowing an edit, while staying focusable and still submitted. Unset defers to a wrapping Field. */
    readonly?: boolean | undefined;
    /** Error state: paints the destructive border/ring and sets aria-invalid. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** Marks the field mandatory to assistive tech (`aria-required`). Unset defers to a wrapping Field. */
    required?: boolean | undefined;
    /** The field name for a native form post. Each token is submitted as `name[0]`, `name[1]`, … Unset defers to a wrapping Field. */
    name?: string;
    /** The accessible name of the text box, when no visible element already labels it. */
    ariaLabel?: string;
    /** The id of the visible element that labels the text box (e.g. a Field wrapper's label). */
    ariaLabelledby?: string;
    /**
     * Names for everything this control says out loud, as any subset of
     * `TagsInputLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application: the case it exists for is a field whose tokens are people,
     * where "Remove Ana Duarte" reads and "Remove tag" does not.
     */
    labels?: LabelOverrides<TagsInputLabels>;
  }>(),
  {
    // Not `[]`. An empty array is a concrete value, so it would say "the host
    // owns this list", and a host that binds nothing would watch every token it
    // typed vanish on the next render. `undefined` is what leaves the control
    // managing its own — the same distinction `src/lib/props.ts` exists to
    // preserve for the Reka-backed primitives.
    modelValue: undefined,
    duplicates: false,
    delimiter: ",",
    clearable: false,
    // Not `false`, for any of the four. `false` is a caller saying "this field
    // is fine / enabled / editable even though its row is not"; absent is a
    // caller saying nothing, and only `undefined` survives to mean that past
    // Vue's absent-Boolean-casts-to-false rule. TextField.vue carries the full
    // reasoning.
    disabled: undefined,
    readonly: undefined,
    invalid: undefined,
    required: undefined,
  },
);

const emit = defineEmits<{
  /** The full token list after the change, trimmed and de-duplicated. Never a partial list. */
  "update:modelValue": [values: string[]];
  /** Every value refused by this one interaction, each with the rule that refused it. Fires once per interaction, not once per value. */
  reject: [rejections: TagsInputRejection[]];
}>();

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("tagsInput", TAGS_INPUT_LABELS, () => props.labels);

// `class` sizes the whole control and lands on the outer element; everything
// else a caller passes — `id`, `data-testid`, `aria-describedby`,
// `autocomplete` — describes the real `<input>` and lands there. The outer
// element is not a form control and the input is not the box a caller lays out,
// so there is no one node both belong on.
defineOptions({ inheritAttrs: false });
const { attrs, rest: inputAttrs } = useSplitAttrs();

const generatedId = useId();
const countId = useId();
const messageId = useId();

const inputRef = useTemplateRef<{ $el: HTMLInputElement }>("input");

/**
 * The committed tokens, and the reason this control keeps its own copy rather
 * than forwarding `modelValue` into Reka and letting it manage the state.
 *
 * Loom applies four rules Reka has no notion of — trim, drop the blanks a paste
 * leaves behind, refuse a duplicate, refuse anything past `max` — so Reka is
 * configured to accept everything (`duplicate`, no `max`) and *propose*, and
 * `onProposed` decides. That needs a value flowing back down, which means a
 * `:model-value` that is always defined and always ours.
 *
 * It is `useVModel(…, { passive: true })` written out, and behaves the same way
 * Reka's own would: the change is taken locally and emitted, and a controlled
 * host that declines it is honoured on the next value it does send. Seeded from
 * the prop rather than sanitised, because a list the host already holds is the
 * host's to hold — the rules above are about what this field *accepts*.
 */
const tokens = ref<string[]>([...(props.modelValue ?? [])]);
watch(
  () => props.modelValue,
  (next) => {
    if (next !== undefined) tokens.value = [...next];
  },
  { deep: true },
);

const rejections = ref<TagsInputRejection[]>([]);
const message = computed(() =>
  rejections.value.length > 0
    ? text.value.rejected({ rejections: rejections.value, max: props.max })
    : "",
);

// The refusal message reads first and the count second: both describe the
// field, and the one that just changed is the more specific thing to say. A
// wrapping Field's own hint or error is merged in after both by
// `useFieldControl`, never in place of them.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: [
    message.value.length > 0 ? messageId : undefined,
    countId,
    attrs["aria-describedby"],
  ]
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .join(" "),
  name: props.name,
  disabled: props.disabled,
  readonly: props.readonly,
  invalid: props.invalid,
  required: props.required,
}));

// The `<label for>` a Field renders has to resolve to the text box, and a
// caller passing their own id must not end up with a label pointing at nothing.
const inputId = computed(() => field.id ?? generatedId);

/**
 * A stable key per token, since the token itself cannot be one: `duplicates`
 * makes two identical strings legal and Vue warns on the collision.
 *
 * The n-th occurrence of a value keys as `n:value`, so removing one of two
 * identical tokens unmounts exactly one node and the survivor keeps the other —
 * indistinguishable, because the two say the same thing. Keying by index
 * instead would re-key every row after the one removed, which patches text into
 * nodes that belong to other tokens.
 */
const rows = computed(() => {
  const seen = new Map<string, number>();
  return tokens.value.map((value) => {
    const ordinal = seen.get(value) ?? 0;
    seen.set(value, ordinal + 1);
    return { value, key: `${String(ordinal)}:${value}` };
  });
});

/**
 * Every rule this field applies to a value, in the order a reader meets them,
 * over the *whole* proposal rather than only its tail — the list on screen can
 * never hold a token the box would have refused, whatever a host seeded it with.
 *
 * `settled` is how many entries were already committed, and only what lies past
 * it is *reported*. Everything before it is normalised in silence: a host that
 * seeded two identical values while asking for none is corrected, but saying
 * "design has already been added" about a token that was there when the page
 * loaded, at the moment the reader adds something else entirely, describes
 * nothing they did.
 */
function reduce(
  proposed: readonly string[],
  settled: number,
): { kept: string[]; refused: TagsInputRejection[] } {
  const kept: string[] = [];
  const refused: TagsInputRejection[] = [];

  proposed.forEach((raw, index) => {
    const value = raw.trim();
    // Skipped rather than refused. A blank is what a trailing delimiter leaves
    // behind — "a, b, c," pastes as four segments — and a reader who pasted
    // three values did not ask about a fourth.
    if (value === "") return;

    const reason: TagsInputRejectReason | undefined =
      props.max !== undefined && kept.length >= props.max
        ? "max"
        : !props.duplicates && kept.includes(value)
          ? "duplicate"
          : undefined;

    if (reason === undefined) kept.push(value);
    else if (index >= settled) refused.push({ value, reason });
  });

  return { kept, refused };
}

function same(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function focusInput(): void {
  void nextTick(() => inputRef.value?.$el.focus());
}

function commit(next: string[]): void {
  // The message named values the reader has since edited past. An error sitting
  // under a field somebody is actively fixing reads as an error about the fix.
  rejections.value = [];
  tokens.value = next;
  emit("update:modelValue", next);
}

/**
 * Reka has already written `proposed` into its own model by the time this runs.
 * `tokens.value` is assigned on every path, including the one where nothing
 * changed, and that is load-bearing: `reduce` returns a fresh array, and only a
 * new reference on the prop Reka watches puts its internal copy back in step
 * with what this field actually accepted. Skip the assignment and a refused
 * value stays in Reka's model — invisible on screen, and submitted by the
 * hidden inputs it renders for `name`.
 */
function onProposed(proposed: string[]): void {
  const { kept, refused } = reduce(proposed, tokens.value.length);
  const changed = !same(kept, tokens.value);

  if (changed) commit(kept);
  else tokens.value = kept;

  if (refused.length === 0) return;
  rejections.value = refused;
  emit("reject", refused);

  // One refusal from one typed commit is the reader's own draft, and Reka has
  // just cleared the box under them. Put it back: a field that eats what it
  // will not take leaves the reader retyping a value they can no longer see.
  // Only the single case — restoring one of three pasted values would be
  // choosing between them.
  const only = refused.length === 1 ? refused[0] : undefined;
  if (only === undefined) return;
  void nextTick(() => {
    const input = inputRef.value?.$el;
    if (!input || input.value !== "") return;
    input.value = only.value;
    input.setSelectionRange(only.value.length, only.value.length);
  });
}

function removeAt(index: number): void {
  if (field.disabled || field.readonly) return;
  commit(tokens.value.filter((_, at) => at !== index));
  // The button that was pressed has just unmounted, and a browser drops focus
  // to `<body>` when it does. The text box is where the reader was heading
  // anyway, and it is the one node in this control that never goes away.
  focusInput();
}

/**
 * The keys Reka's `onInputKeydown` claims once the caret sits at the very
 * start of the text box, and the reason this handler runs in the capture phase
 * on the way down rather than as a listener on the input itself: a fallthrough
 * handler is merged *after* Reka's and cannot stop it.
 *
 * What Reka does with them is a virtual selection — Backspace marks the last
 * token, arrows walk it, a second Backspace deletes it — that moves no focus
 * and publishes no `aria-activedescendant`. On screen it is a highlight; to a
 * screen reader it is nothing at all, so the second Backspace destroys a value
 * the reader was never told was chosen. That is the failure this control is
 * most likely to ship, so the whole mechanism is stopped here.
 *
 * In its place, one rule: **Backspace on an empty box lifts the last token back
 * into it**, as editable text with the caret at the end. Nothing is destroyed —
 * the value is on screen, in a box the reader is already focused on, and Enter
 * puts it straight back. The token that left is a `commit`, so a host watching
 * `update:modelValue` sees the edit begin.
 */
const CARET_KEYS = new Set(["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Home", "End"]);

function onKeydownCapture(event: KeyboardEvent): void {
  // An IME's own Backspace edits the composition, and Reka's handlers bail on
  // the same flag for the same reason.
  if (event.isComposing) return;
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (!CARET_KEYS.has(event.key)) return;
  if (input.selectionStart !== 0 || input.selectionEnd !== 0) return;

  // Stopped only for the keys and only at the caret position where Reka would
  // have acted. Everything else — Enter, the delimiter, every printable
  // character — reaches its handlers untouched.
  event.stopPropagation();

  if (event.key !== "Backspace" || input.value !== "") return;
  if (field.disabled || field.readonly) return;
  const last = tokens.value.at(-1);
  if (last === undefined) return;

  event.preventDefault();
  commit(tokens.value.slice(0, -1));
  input.value = last;
  input.setSelectionRange(last.length, last.length);
}

/**
 * A read-only field takes nothing, and the native `readonly` attribute is not
 * enough to say so. Reka's paste handler reads the clipboard and commits from
 * it directly, without ever consulting the input it fired on, so a paste into a
 * read-only field would grow tokens the reader cannot then remove.
 */
function onPasteCapture(event: ClipboardEvent): void {
  if (!field.readonly && !field.disabled) return;
  event.preventDefault();
  event.stopPropagation();
}
</script>

<template>
  <TagsInputRoot
    as="div"
    v-bind="optional({ name: field.name })"
    :model-value="tokens"
    :delimiter="delimiter"
    :disabled="field.disabled"
    :required="field.required"
    add-on-paste
    duplicate
    :class="cn('flex flex-col', attrs.class as string)"
    @update:model-value="onProposed"
    @keydown.capture="onKeydownCapture"
    @paste.capture="onPasteCapture"
  >
    <!-- `duplicate` and the absent `max` above are deliberate: Reka is told to
         accept every value it is offered, so that one place — `reduce` —
         decides what a token is. Two refusal ladders would be two answers to
         `duplicates`, and only one would be the one `reject` reports.

         The state markers live on the box rather than on the root, and not by
         preference: an attribute bound on `TagsInputRoot` is a fallthrough
         attr, and the root renders through Reka's `CollectionSlot`, which does
         not carry one to the element underneath. The box is also the honest
         node for them — it is what the state is painted on. -->
    <div
      :data-disabled="field.disabled || undefined"
      :data-readonly="field.readonly || undefined"
      :data-invalid="field.invalid || undefined"
      :class="
        cn(
          'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-0.5 text-sm text-foreground',
          'transition-[color,background-color,border-color,box-shadow] duration-fast ease-out',
          // Rim-lit at rest, the weave blooms on focus, exactly as TextField's
          // does — a field holding tokens is still a field, and a form row
          // should not have two focus languages in it.
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
          !field.invalid && 'focus-within:shadow-halo',
          // Lifted rather than dimmed, and it keeps its focus ring: a read-only
          // field is a value **on show**, not an unavailable control. The fill
          // rises off `background` to `subtle` so the box reads as settled, and
          // the text stays full strength — 13.45:1 over that fill — because
          // being read is the entire purpose of the state. The border does not
          // move, because nothing about the field's reach has: it is still a
          // tab stop and still submitted.
          field.readonly && 'bg-subtle',
          // Unavailable is a step further down all three channels: the fill
          // drains to `muted`, the text follows to `muted-foreground` (4.67:1
          // over it) and the rim slackens from `input` to the lighter `border`.
          //
          // Read-only and disabled used to share `bg-muted` and part on the
          // text colour alone, which is a distinction made in hue and nothing
          // else — the one thing a reader with a colour deficiency does not
          // receive. Three channels is what makes available → on show →
          // unavailable legible without it.
          //
          // No `opacity-50` anywhere in that, and that is the point. Every
          // token inside is a Chip that has already drained itself to a
          // measured unavailable fill; halving the alpha over the top of that
          // takes its label below the contrast floor. `border-border` and not
          // the strong weight, for the reason `theme.css` gives the strong one:
          // it is for a block that must **assert** its edge, and an unavailable
          // field is the one thing that must not.
          field.disabled && 'cursor-not-allowed border-border bg-muted text-muted-foreground',
          // The same appearance, reached from the other direction: a
          // `<fieldset disabled>` above this field disables the `<input>` and
          // every token's remove button natively and never touches
          // `field.disabled`, so the rule above cannot fire and the box
          // rendered byte-identical to an editable one.
          //
          // `in-[fieldset:disabled]:` reads the attribute that did the
          // disabling, so the fill and the native inertness cannot disagree.
          // See TextField.vue for why it is preferred to a `has-[:disabled]:`
          // rule reading this box's own contents.
          'in-[fieldset:disabled]:cursor-not-allowed in-[fieldset:disabled]:bg-muted in-[fieldset:disabled]:text-muted-foreground',
          // Gated for the reason the two rules below are ordered: Tailwind
          // emits the ancestor half of `in-*` inside `:where()`, so this
          // carries no more specificity than `border-destructive` and would
          // win on emission order alone.
          !field.invalid && 'in-[fieldset:disabled]:border-border',
          // Last of the rules that name a border colour, and the order is
          // load-bearing: `cn()` resolves a border colour by whichever class it
          // saw last, so a field that is both in error and unavailable would
          // lose its destructive rim to the disabled one if this sat above it.
          field.invalid && 'border-destructive focus-within:outline-destructive',
        )
      "
    >
      <!-- A real list, so a reader browsing the field meets the tokens as
           items rather than as a run of buttons. It is not where the count
           comes from, though: Tailwind's preflight sets `list-style: none` on
           every `ul`, and Safari drops the list role from a list styled that
           way — which is why the count below is published in words instead of
           left to the browser. -->
      <ul v-if="tokens.length > 0" class="flex min-w-0 flex-wrap items-center gap-1.5">
        <TagsInputItem
          v-for="(row, index) in rows"
          :key="row.key"
          as="li"
          :value="row.value"
          class="flex animate-fade-rise"
        >
          <Chip
            size="sm"
            :removable="!field.readonly"
            :disabled="field.disabled"
            :remove-label="text.remove({ value: row.value })"
            @remove="removeAt(index)"
          >
            <TagsInputItemText />
          </Chip>
        </TagsInputItem>
      </ul>

      <!-- `field.attrs` spreads **after** the fallthrough attrs, and that
           position is the contract: the bag has already resolved the caller's
           own `id` and `aria-describedby`, and it drops every key that resolved
           to nothing, so it can only add.

           `:id` restates what the bag already holds, or supplies the id a
           Field's `<label for>` needs when it holds none. `:name` undoes one
           key of it on purpose — the text box holds a draft, not the value, and
           a `name` on it would post whatever was half-typed instead of the
           tokens. The value is posted by the hidden inputs the root renders. -->
      <TagsInputInput
        :id="inputId"
        ref="input"
        v-bind="{
          ...inputAttrs,
          ...field.attrs,
          ...optional({ placeholder: tokens.length === 0 ? placeholder : undefined }),
        }"
        :name="undefined"
        :aria-label="ariaLabel"
        :aria-labelledby="ariaLabelledby"
        :readonly="field.readonly"
        class="h-8 min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />

      <TagsInputClear
        v-if="clearable && tokens.length > 0 && !field.readonly"
        :aria-label="text.clear"
        :disabled="field.disabled"
        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast ease-out hover:bg-subtle hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo data-[disabled]:cursor-not-allowed"
        @click="focusInput"
      >
        <X class="h-4 w-4" />
      </TagsInputClear>

      <!-- The count, and the only thing that tells a reader how many tokens are
           in the field without walking them. Reka publishes nothing of the
           sort: its root is an unlabelled `div`. It is wired through
           `aria-describedby` rather than announced, so it is heard on focus and
           on every return to the field, which is when the question is asked. -->
      <span :id="countId" class="sr-only">
        {{ text.count({ count: tokens.length, max }) }}
      </span>
    </div>

    <!-- The region is in the DOM from the first render, empty. A live region
         mounted at the same moment as its text is a region assistive tech was
         not yet watching, so the first refusal — the one that matters most — is
         the one it announces least reliably. -->
    <div aria-live="polite" aria-atomic="true">
      <p
        v-if="message.length > 0"
        :id="messageId"
        class="mt-1.5 flex animate-fade-rise items-start gap-2 text-small text-destructive-text"
      >
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{{ message }}</span>
      </p>
    </div>
  </TagsInputRoot>
</template>
