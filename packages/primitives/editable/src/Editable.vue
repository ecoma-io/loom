<script lang="ts">
import type { EditableLabels } from "@ecoma-io/loom-labels";

/**

/**
 * Loom's English, co-located with the component so it tree-shakes with it: a
 * consumer who never imports Editable ships none of these bytes.
 *
 * Exported so a host can build a partial vocabulary against the real thing
 * rather than a transcription of it.
 */
export const EDITABLE_LABELS: EditableLabels = {
  edit: "Edit",
  input: "Editable text",
  submit: "Save",
  cancel: "Cancel",
  restored: ({ value }) => `Empty value discarded, ${value} restored`,
};

/**
 * What a pointer has to do to open the editor. The keyboard is deliberately
 * not on this axis — Enter and Space open it in all three, because a mode a
 * reader cannot reach by keyboard is a control they cannot use.
 *
 *   • `click` — one click on the text opens it. The default: it is the whole
 *     promise of edit-in-place, and the only mode a touch reader can perform.
 *   • `dblclick` — for a row or a cell where a single click already means
 *     something else, selecting it.
 *   • `focus` — landing on it opens it, so Tab walks straight into the
 *     editor. For a column of fields being filled in order, and the mode that
 *     makes Escape's restore-and-hand-focus-back path load-bearing.
 */
export type EditableActivationMode = "click" | "dblclick" | "focus";

/**
 * What commits the edit.
 *
 *   • `both` — Enter, or focus leaving the control. The default: a reader who
 *     typed a value and clicked away meant to keep it.
 *   • `enter` — Enter alone; leaving discards, which suits an edit that is a
 *     deliberate act rather than an incidental one.
 *   • `blur` — leaving alone, for a control inside something that has its own
 *     Enter.
 *
 * Escape abandons under all three.
 */
export type EditableSubmitMode = "blur" | "enter" | "both";
</script>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type ComponentPublicInstance } from "vue";
import {
  EditableRoot,
  EditableArea,
  EditablePreview,
  EditableInput,
  EditableSubmitTrigger,
  EditableCancelTrigger,
} from "reka-ui";
import { Check, Pencil, X } from "@lucide/vue";
import { buttonVariants } from "@ecoma-io/loom-button";
import { cn } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";
import { useSplitAttrs } from "@ecoma-io/loom-core";
import { useFieldControl } from "@ecoma-io/loom-labels";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";

/**
 * Editable — text that becomes an input where it stands: a record's title, a
 * name on a card, a cell in a table. It is the control that makes an
 * operations screen feel direct, because the value is edited where it is read
 * rather than in a dialog opened to hold one field.
 *
 * Reach for a [TextField](../TextField/TextField.vue) instead whenever the
 * value is being *entered* rather than corrected — a form is a set of empty
 * boxes and should look like one. This is for a value that already exists,
 * that is usually right, and that is occasionally wrong.
 *
 * **It takes no `size`, and that is the point.** Every other control in the
 * library picks a height off the shared scale; this one inherits the
 * typography around it, so an editable page title stays the size of a page
 * title and an editable table cell stays the size of a cell. What it pins
 * instead is that the two states are the same size as each other: the preview
 * and the editor are the only two children of one padded box, both single-line
 * and both inheriting that box's type, so the swap cannot move the row below
 * it. The box carries a transparent border at rest and a visible one while
 * editing — the same border width either way, for the same reason.
 *
 * **Escape restores and hands focus back.** Ending an edit hides the editor,
 * and a browser drops focus to `<body>` when the focused node goes away, so
 * without the hand-off a reader who abandoned an edit would lose their place
 * in the document. With `activationMode: "focus"` that hand-off would then
 * re-open the editor it just closed, which is why activation is Loom's rather
 * than Reka's here — the returning focus is suppressed exactly once, until the
 * reader leaves and comes back deliberately.
 *
 * **The model moves on submit, not on keystrokes.** `update:modelValue` fires
 * once, with the committed value, alongside `submit`; `cancel` fires when an
 * edit is abandoned. A control whose whole purpose is that an edit can be
 * taken back cannot publish every intermediate character as though it were
 * the value.
 *
 * Inside a [Field](../Field/Field.vue) it wires itself: the row's id, the id
 * of its hint or error line, `required`, `invalid`, `disabled`, `readonly` and
 * the name the value is submitted under all arrive through `useFieldControl()`.
 * Every prop below still wins over the row when it is set, in both directions
 * — which is why the four booleans default to `undefined` rather than `false`.
 *
 * `readonly` and `disabled` are different states, so the box has **three**
 * resting appearances rather than two. Read-only is a value on show: still
 * focusable, still copyable, still submitted, and lifted onto a fill with its
 * text at full strength. Disabled is unavailable, and drained a step further in
 * fill, in text colour and in border weight together. Three channels rather
 * than one is the point — see `areaClass`.
 *
 * Built on Reka UI's Editable, which owns the state machine — what is showing,
 * what the editor holds before it is committed, and what a dismiss means under
 * each submit mode.
 */
const props = withDefaults(
  defineProps<{
    /** The committed value. Pair with `@update:modelValue` for `v-model`. */
    modelValue?: string;
    /** Shown in place of an empty value, in both the preview and the editor. */
    placeholder?: string;
    /** What a pointer does to open the editor. The keyboard opens it in every mode. */
    activationMode?: EditableActivationMode;
    /** What commits the edit. Escape abandons it under all three. */
    submitMode?: EditableSubmitMode;
    /**
     * Sizes the control to its own text and stacks the two states in one grid
     * cell, for an editable sitting inline in a sentence rather than in a
     * column. It measures the committed value, not what is being typed.
     */
    autoResize?: boolean;
    /** The longest value the editor will accept, in characters. */
    maxLength?: number;
    /**
     * Lets a submitted empty value through. Off by default: an empty submit
     * restores the previous value and reports `cancel` instead, because the
     * damage is asymmetric — a value wrongly kept is on screen and can be
     * edited again, a title wrongly emptied is gone.
     */
    allowEmpty?: boolean;
    /** Unavailable: the preview drops out of the tab order and refuses to open. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
    /** Shows the value without allowing an edit, while staying focusable. Unset defers to a wrapping Field. */
    readonly?: boolean | undefined;
    /** Error state: paints the destructive border and ring, and sets `aria-invalid`. Unset defers to a wrapping Field's `error`. */
    invalid?: boolean | undefined;
    /** Marks the value mandatory to assistive tech (`aria-required`). Unset defers to a wrapping Field. */
    required?: boolean | undefined;
    /** The field name for a native form post or `FormData`. Unset defers to a wrapping Field. */
    name?: string;
    /** The editor's accessible name, when no visible element already labels it. */
    ariaLabel?: string;
    /**
     * Names for everything this control says out loud, as any subset of
     * `EditableLabels` — the rest stay as the host's `provideLoomLabels`
     * vocabulary left them, and then as Loom's English.
     *
     * This is the per-instance correction, not the place to localise an
     * application: the case it exists for is `edit`, where a page of
     * editables reads better as "Rename" or "Correct" than as the same verb
     * five times.
     */
    labels?: LabelOverrides<EditableLabels>;
  }>(),
  {
    activationMode: "click",
    submitMode: "both",
    autoResize: false,
    allowEmpty: false,
    // Not `false`, for any of the four. `false` is a caller saying "this value
    // is fine / available / editable even though its row is not"; absent is a
    // caller saying nothing, and only `undefined` survives to mean that past
    // Vue's absent-Boolean-casts-to-false rule — see TextField.vue, which
    // carries the full reasoning.
    disabled: undefined,
    readonly: undefined,
    invalid: undefined,
    required: undefined,
  },
);

const emit = defineEmits<{
  /** The committed value. Fires on submit only, never per keystroke. */
  "update:modelValue": [value: string];
  /** The edit was committed, with the value that was accepted. */
  submit: [value: string];
  /** The edit was abandoned — Escape, the cancel button, or a refused empty submit. */
  cancel: [];
}>();

defineOptions({ inheritAttrs: false });

// `class` lands on the root rather than on the bordered box inside it: the
// root is what participates in the caller's layout, and it holds the box and
// the two commit controls beside it, so a caller's `w-64` has to size all
// three. Everything else — `id`, `aria-describedby`, `aria-labelledby`,
// `data-testid`, `autocomplete` — describes the *editor*, and lands there.
const { attrs, rest: inputAttrs } = useSplitAttrs();

// `id` and `aria-describedby` reach a bare control as fallthrough attrs rather
// than props, so they are read off `attrs` and handed in as this caller's own
// values — a caller who sets either still beats the row, and the row's
// description is merged into theirs rather than replacing it.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  name: props.name,
  disabled: props.disabled,
  readonly: props.readonly,
  invalid: props.invalid,
  required: props.required,
}));

// `text`, not `labels`: the prop of that name is one of the three sources this
// resolves, and a template reading the raw prop would be reading the overrides
// rather than the answer.
const text = useLabels("editable", EDITABLE_LABELS, () => props.labels);

// The value as this component knows it, which is also what Reka is fed. Two
// things need it. A defined `model-value` is what puts Reka in controlled
// mode, and controlled is what lets a submit be *refused* — Reka's own commit
// then only announces the new value rather than adopting it, so the preview
// keeps showing the old one with nothing to undo. And a host using this
// without `v-model` still needs the value to move, which is what the
// optimistic write in `onSubmit` is for.
const value = ref(props.modelValue ?? "");
watch(
  () => props.modelValue,
  (next) => {
    // `undefined` is a host that never controlled the value, not a host
    // clearing it — adopting it would blank the box on any unrelated re-render.
    if (next !== undefined) value.value = next;
  },
);

// Mirrors Reka's own `isEditing`, off the state event rather than out of the
// slot, because the class bindings and the activation guard both need it in
// the script half as well as in the template.
const editing = ref(false);

const previewRef = ref<ComponentPublicInstance | null>(null);
const rootRef = ref<ComponentPublicInstance | null>(null);

// Reka's parts are components, so the only handle on their DOM node is `$el`,
// which Vue types as `any`. Narrowing through `unknown` keeps that `any` from
// spreading into everything it touches — and answers the SSR case honestly,
// where there is no element at all.
function elementOf(instance: ComponentPublicInstance | null): HTMLElement | null {
  const el = instance?.$el as unknown;
  return el instanceof HTMLElement ? el : null;
}

// Set only when focus was actually handed back to the preview, and cleared the
// moment the reader leaves it. Without it, `activationMode: "focus"` would
// read that hand-off as a fresh arrival and re-open the editor the reader just
// escaped from — a control that cannot be abandoned, which is precisely the
// trap Escape exists to avoid.
let suppressFocusActivation = false;

function activate(edit: () => void): void {
  if (field.disabled || field.readonly || editing.value) return;
  edit();
}

// Reka's own activation is switched off in the template
// (`activation-mode="none"`) and rebuilt in these three handlers, rather than
// passed through. Two things need that. Reka has no click mode at all and no
// keyboard path on its preview, so two of the three modes this component
// publishes would be unreachable without a pointer. And its focus mode cannot
// tell a reader arriving on the control from the focus this component hands
// back after an Escape — which would re-open the editor that Escape just
// abandoned, forever.
//
// A `<button>` turns Enter and Space into a click carrying `detail === 0`,
// which is what lets one handler serve the keyboard in every activation mode:
// `dblclick` cannot be typed, and `focus` must not be the only way in for a
// reader who arrived on the control without meaning to edit yet. `detail` is
// the same signal Pagination reads to tell a synthesised click from a pointer
// one.
function onPreviewClick(event: MouseEvent, edit: () => void): void {
  if (props.activationMode === "dblclick" && event.detail !== 0) return;
  activate(edit);
}

function onPreviewDoubleClick(edit: () => void): void {
  if (props.activationMode !== "dblclick") return;
  activate(edit);
}

function onPreviewFocus(edit: () => void): void {
  if (props.activationMode !== "focus" || suppressFocusActivation) return;
  activate(edit);
}

function onPreviewBlur(): void {
  suppressFocusActivation = false;
}

// The editor is hidden the instant an edit ends, and a browser drops focus to
// `<body>` when the focused node goes away — so a reader who pressed Escape or
// Enter would be left with no position in the document at all.
//
// Only focus that was actually lost is rescued. A submit caused by clicking
// somewhere else has already put the reader where they meant to be, and
// stealing focus back from them would be the worse bug; the same reasoning,
// and the same `<body>` check, as Pagination's edge-control hand-off. jsdom
// leaves focus on the hidden node rather than dropping it, and a click on the
// commit button leaves it on a button that is about to be hidden too, so
// anything still inside this control counts as lost.
function restoreFocus(): void {
  void nextTick(() => {
    const preview = elementOf(previewRef.value);
    const root = elementOf(rootRef.value);
    if (preview === null) return;

    const active = document.activeElement;
    const lost = active === null || active === document.body || (root?.contains(active) ?? false);
    if (!lost) return;

    suppressFocusActivation = true;
    preview.focus();
  });
}

function onState(state: "edit" | "submit" | "cancel"): void {
  editing.value = state === "edit";
  if (state === "edit") return;
  if (state === "cancel") emit("cancel");
  restoreFocus();
}

// The refusal, held for one announcement rather than derived, so the live
// region says something only when a submit was actually turned away — and is
// cleared when the next edit opens, so a second identical refusal is still a
// change to the region and still gets announced.
const restored = ref("");
watch(editing, (isEditing) => {
  if (isEditing) restored.value = "";
});

// Reka's `submit` is an announcement rather than a request — in controlled
// mode it has already told us what it would like the value to be and left the
// deciding here, which is what makes the empty case answerable at all.
function onSubmit(submitted: string | null | undefined): void {
  const next = submitted ?? "";

  // An empty submit is the one genuinely ambiguous outcome: a reader who
  // cleared the box and pressed Enter may have meant to blank the value, and
  // under `submitMode: "blur"` may have meant nothing at all. Loom restores
  // rather than clears, and `allowEmpty` is how a field that can legitimately
  // be emptied says so. `restored` announces it, because a refusal that only
  // shows up as text snapping back is a refusal a screen reader never hears.
  if (next === "" && !props.allowEmpty) {
    restored.value = text.value.restored({ value: value.value });
    emit("cancel");
    return;
  }

  // Optimistic only while uncontrolled. With a `modelValue` prop the host owns
  // the value, and echoing it here would show a value they may be about to
  // reject — the prop watcher above is what applies the one they accept.
  if (props.modelValue === undefined) value.value = next;
  emit("update:modelValue", next);
  emit("submit", next);
}

// A read-only preview is not a control, so it is not rendered as one: a
// `<button>` that refuses to act is worse than plain text. It keeps a
// `tabindex` of its own instead — a read-only value is one a reader may reach
// and copy, the same contract TextField's read-only input keeps — while the
// button state drops Reka's hardcoded `tabindex="0"` entirely, because a
// `<button>` is focusable without it and a *disabled* one carrying it is
// focusable when it should not be.
const previewAs = computed(() => (field.readonly ? "span" : "button"));

const rootProps = computed(() => optional({ name: field.name, maxLength: props.maxLength }));

// `name` is dropped from the bag before it reaches the editor. Reka already
// renders a hidden input under that name for any Editable inside a `<form>`,
// and an editor carrying it as well would post the field twice — once with the
// committed value and once with whatever the box held. Removed from a copy
// rather than listed positively, so a key added to the resolved bag later
// reaches this input without anyone remembering to come back here.
const editorAttrs = computed(() => {
  const aria: Record<string, unknown> = { ...field.attrs };
  delete aria.name;
  return aria;
});

// `aria-label` outranks a `<label for>` in the accessible-name order, so a
// generic fallback would silently replace the name a Field row already gives
// the editor. It is supplied only where nothing else names it at all — which
// is also the state Reka would otherwise fill with "editable input".
const editorLabel = computed<string | undefined>(() => {
  if (props.ariaLabel !== undefined) return props.ariaLabel;
  if (field.id !== undefined) return undefined;
  if (attrs["aria-label"] !== undefined || attrs["aria-labelledby"] !== undefined) return undefined;
  return text.value.input;
});

const areaClass = computed(() =>
  cn(
    // One box, two children. The border is present in both states and only
    // changes colour, the padding never changes, and the floor height keeps an
    // empty value from collapsing the row it sits in — between them, nothing
    // below this control moves when it switches.
    "flex min-h-9 min-w-0 items-center rounded-md border border-transparent px-2 py-1",
    // A control that sizes to its own text cannot also fill its parent: under
    // `autoResize` Reka makes this box an `inline-grid` measured by the two
    // states stacked inside it, and a width of 100% would measure the row
    // instead.
    props.autoResize ? "w-auto" : "w-full",
    "text-inherit transition-[color,background-color,border-color,box-shadow] duration-fast ease-out",
    // Rim-lit at rest, the weave blooms on focus (Signature law), and it blooms
    // for the preview as much as for the editor: at rest the preview is the
    // focusable node, and a control a reader can tab to has to show it.
    "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
    !field.invalid && "focus-within:shadow-halo",
    editing.value && "border-input bg-background",
    // The affordance for a pointer, since the resting state is deliberately
    // just text: the box lights under the cursor and the caret says the text
    // can be typed into. Never the only signal — the preview announces itself,
    // and carries a glyph.
    !editing.value && !field.disabled && !field.readonly && "cursor-text hover:bg-subtle",
    // Lifted rather than dimmed, exactly as a read-only text field is: the
    // value is the whole reason the control is on the page, so it stays at
    // full contrast — 13.45:1 over this fill — whether or not it can be
    // changed. The rim comes up with it, from the resting `transparent` to
    // `input`: at rest this control is deliberately just text, so without a
    // border there is nothing but hue to say the value is on show, and the box
    // was already reserving the width for one.
    field.readonly && "border-input bg-subtle",
    // Drained, not faded, and a step further down all three channels: the fill
    // to `muted`, the text to `muted-foreground` (4.67:1 over it) and the rim
    // to the lighter `border`. Half-opacity text on this box measures under
    // 4.5:1, and a value nobody can read is worse than one nobody can edit.
    //
    // Read-only and disabled used to share `bg-muted` and part on the text
    // colour alone — a distinction made in hue and nothing else, which is the
    // one a reader with a colour deficiency does not receive.
    field.disabled && "cursor-not-allowed border-border bg-muted text-muted-foreground",
    // The same appearance, reached from the other direction: a
    // `<fieldset disabled>` above this control disables the preview `<button>`
    // and the `<input>` behind it natively — both are on the list a fieldset
    // reaches — and never touches `field.disabled`, so the rule above cannot
    // fire and the value rendered byte-identical to an editable one.
    //
    // `in-[fieldset:disabled]:` reads the attribute that did the disabling, so
    // the fill and the native inertness cannot disagree. See TextField.vue for
    // why it is preferred to a `has-[:disabled]:` rule reading this box's own
    // contents.
    "in-[fieldset:disabled]:cursor-not-allowed in-[fieldset:disabled]:bg-muted in-[fieldset:disabled]:text-muted-foreground",
    // Gated for the reason the rule below is ordered: Tailwind emits the
    // ancestor half of `in-*` inside `:where()`, so this carries no more
    // specificity than `border-destructive` and would win on emission order
    // alone.
    !field.invalid && "in-[fieldset:disabled]:border-border",
    // Last of the rules naming a border colour: `cn()` resolves one by
    // whichever class it saw last, so a control both in error and unavailable
    // would lose its destructive rim if this sat above them.
    field.invalid && "border-destructive focus-within:outline-destructive",
  ),
);

// The submit/cancel triggers are glyph-only, so the drained treatment they
// take is the transparent control's: the neutral well under a glyph that is
// already `text-muted-foreground`. `opacity-50` used to fade that glyph below
// contrast — the failure Button records for its own dim — and the native
// `disabled` attribute these Reka triggers carry already tells assistive tech.
const triggerClass = cn(
  buttonVariants({ variant: "ghost", size: "icon-sm" }),
  "disabled:cursor-not-allowed disabled:bg-muted disabled:shadow-none",
);
</script>

<template>
  <EditableRoot
    ref="rootRef"
    v-slot="{ edit }"
    v-bind="rootProps"
    :model-value="value"
    :placeholder="placeholder ?? ''"
    activation-mode="none"
    :disabled="field.disabled"
    :readonly="field.readonly"
    :required="field.required"
    :submit-mode="submitMode"
    :auto-resize="autoResize"
    :data-editing="editing || undefined"
    :data-invalid="field.invalid || undefined"
    :data-readonly="field.readonly || undefined"
    :data-disabled="field.disabled || undefined"
    :class="
      cn(
        'inline-flex items-center gap-1',
        autoResize ? 'w-auto align-baseline' : 'w-full',
        attrs.class as string,
      )
    "
    @update:state="onState"
    @submit="onSubmit"
  >
    <EditableArea :class="areaClass">
      <!-- The preview is the control, and Reka's `EditableEditTrigger` is
           deliberately not rendered beside it: a second button doing the same
           job costs a second Tab stop on one value, and its click handler
           fires in every activation mode, which would make `dblclick` and
           `focus` lies. A real `<button>` rather than a `role`, so Enter and
           Space are the browser's job and the affordance survives
           forced-colors mode. -->
      <EditablePreview
        ref="previewRef"
        :as="previewAs"
        :type="field.readonly ? undefined : 'button'"
        :tabindex="field.readonly ? 0 : undefined"
        :disabled="!field.readonly && field.disabled ? true : undefined"
        :aria-describedby="field.attrs['aria-describedby']"
        :aria-invalid="field.attrs['aria-invalid']"
        class="flex min-w-0 flex-1 items-center gap-1.5 text-start outline-none"
        @click="(event: MouseEvent) => onPreviewClick(event, edit)"
        @dblclick="() => onPreviewDoubleClick(edit)"
        @focus="() => onPreviewFocus(edit)"
        @blur="onPreviewBlur"
      >
        <!-- Single-line and truncated, because the editor it swaps with is a
             single-line input: a preview that wrapped would be a taller box
             than the thing replacing it. -->
        <span :class="cn('truncate', !value && 'text-muted-foreground')">
          {{ value || placeholder }}
        </span>
        <template v-if="!field.readonly">
          <!-- The affordance for a sighted reader, and the counterpart to the
               span below it: the resting state is text, so something has to
               say it is more than text. Hidden from assistive tech, which is
               told the same thing in words. -->
          <Pencil class="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <!-- The whole accessibility problem of edit-in-place, in one span.
               The value reads first so it stays the start of the accessible
               name (WCAG 2.5.3, and what a voice-control reader says out
               loud); the verb follows, so the text announces as something
               that can be acted on rather than as prose. -->
          <span class="sr-only">{{ text.edit }}</span>
        </template>
      </EditablePreview>

      <EditableInput
        v-bind="{ ...inputAttrs, ...editorAttrs }"
        :aria-label="editorLabel"
        class="min-w-0 flex-1 bg-transparent text-inherit outline-none placeholder:text-muted-foreground"
      />
    </EditableArea>

    <!-- Both triggers hide themselves while the preview is showing, so there
         is nothing to guard here. They exist for the reader who has no way to
         know that Enter commits and Escape abandons — an invisible keyboard
         contract is not an affordance. -->
    <EditableSubmitTrigger :aria-label="text.submit" :class="triggerClass">
      <Check class="h-4 w-4" aria-hidden="true" />
    </EditableSubmitTrigger>
    <EditableCancelTrigger :aria-label="text.cancel" :class="triggerClass">
      <X class="h-4 w-4" aria-hidden="true" />
    </EditableCancelTrigger>

    <!-- A refused empty submit changes the screen without moving focus or
         opening anything, which a screen reader would otherwise never
         announce. Empty until there is something to say, so it never repeats
         itself on an unrelated re-render. -->
    <span role="status" class="sr-only">{{ restored }}</span>
  </EditableRoot>
</template>
