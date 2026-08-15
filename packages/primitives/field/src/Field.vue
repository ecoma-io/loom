<script setup lang="ts">
/* eslint vuejs-accessibility/label-has-for: ["error", { "required": "id" }] */
/*
 * The workspace default for this rule requires BOTH a `for`/id pairing AND
 * the control physically nested inside the `<label>` (`required: {every:
 * ["nesting","id"]}`). Field labels a control passed through the default
 * slot — never nested inside the `<label>` — so "nesting" can never be
 * satisfied by any slot-based composition, regardless of how the label is
 * written. The `for`/id pairing below is itself a fully valid, standard
 * accessible-name association (WCAG 1.3.1 / 4.1.2); this override scopes the
 * rule to that single valid strategy for this file only.
 */
import { computed, useId, useSlots } from "vue";
import InlineError from "@ecoma-io/loom-inline-error";
import { provideFieldContext, useOuterFieldContext } from "@ecoma-io/loom-labels";

/**
 * Field — the form-row wrapper: label + control + one hint-or-error line, so
 * a consumer stops hand-assembling that layout at every call site. Pure
 * composition, not a Reka component — the default slot is the control
 * (TextField, Textarea, a select, …). Setting `error` swaps InlineError in
 * for `hint`, because a row shows one message at a time, never both stacked.
 *
 * **A Loom control in the slot wires itself.** Field publishes the row's id,
 * the id of whichever message is showing, and `required` / `invalid` /
 * `disabled` / `readonly` / `name`; every Loom form control picks those up
 * through `useFieldControl()`. So the three attributes this component used to
 * ask a caller to copy by hand — `id`, `aria-describedby`, `invalid` — are now
 * the default, and forgetting one is no longer a silent defect:
 *
 * ```vue
 * <Field label="Email" error="Invalid address" required>
 *   <TextField />
 * </Field>
 * ```
 *
 * A prop set on the control always wins, in both directions: `undefined` is
 * the only value that yields, `false` is a decision. One control inside a row
 * that is showing an error can still declare itself individually fine.
 *
 * **`for` is not a legacy path.** `provide`/`inject` only reaches a component
 * that injects, so a bare `<input>`, a product's own control or a third-party
 * widget in the slot cannot be wired this way — and that is the case `for` has
 * always answered. Pass it and the label points at your id, the message line
 * publishes `${for}-description` for your own `aria-describedby`, and a Loom
 * control adopts that id rather than a generated one, so an existing call site
 * keeps every id it published.
 */
const props = withDefaults(
  defineProps<{
    /** The visible label text. Renders as a real `<label>` once there is a control for it to name. */
    label?: string;
    /** Supporting text shown below the control. Hidden while `error` is set. */
    hint?: string;
    /** The error message. Renders through InlineError, replaces `hint`, and marks a Loom control inside invalid. */
    error?: string;
    /** Marks the row mandatory: a destructive asterisk on the label, and `aria-required` on a Loom control inside. */
    required?: boolean;
    /** Disables a Loom control inside. Leave unset to let the control decide for itself. */
    disabled?: boolean | undefined;
    /** Renders a Loom control inside read-only: still focusable, still submitted, not editable. */
    readonly?: boolean | undefined;
    /** The name a Loom control inside submits under, for a native form post or `FormData`. */
    name?: string;
    /** The id of the control in the default slot. Omit it and Field generates one for a Loom control. */
    for?: string;
  }>(),
  {
    // `disabled` and `readonly` carry an explicit `undefined` because absent
    // has to stay tellable from `false` all the way down: a Field saying
    // nothing must not overrule a control that disabled itself, and Vue casts
    // an absent Boolean prop with no declared default to `false`. `required`
    // stays a plain boolean — Field is the only thing that claims a row is
    // mandatory, so there is no lower opinion for a `false` to beat.
    required: false,
    disabled: undefined,
    readonly: undefined,
  },
);

// Called unconditionally, even when `for` makes it unused: `useId()` draws
// from a per-app counter walked in setup order, and a conditional call makes
// that sequence depend on props — every id after it shifts, and the server's
// walk stops matching the client's.
const generatedId = useId();

// Whether the call site wrote children at all is a fact about the template,
// not about state, so it is read once rather than computed — `slots` is not a
// reactive source and a `computed` over it would cache and go stale. It also
// has to be answerable during *this* component's render: the server renders a
// component's own output before any of its slot children, so anything Field
// learned from the mounted controls would arrive after the label and the hint
// were already written on the server and before them on the client, which is a
// hydration mismatch by construction.
const hasControl = useSlots().default !== undefined;

// The row's control id is what you passed, or a generated one when there is a
// control in the slot to give it to. Nothing in the slot means nothing to name
// and nothing to describe — a `<label for>` pointing at no control names
// nobody, and an id nothing references is a landmark for no one.
const controlId = computed(() => props.for ?? (hasControl ? generatedId : undefined));

// The label's own id, for group controls that name themselves with
// `aria-labelledby` rather than by `label for`. Follows the same `-label`
// convention as the description line's `-description`, and it exists for the
// same reason: a group element inside the slot cannot be pointed at by `<label
// for>` (that element is not a labelable element), so it needs a second way to
// learn the label's id.
const labelId = computed(() => (controlId.value ? `${controlId.value}-label` : undefined));

// The hint and the error are mutually exclusive, so one id covers whichever is
// showing.
const descriptionId = computed(() =>
  controlId.value ? `${controlId.value}-description` : undefined,
);

// A Fieldset above answers exactly one key this Field also answers, and its
// `readonly` is a claim about the whole group that a row does not get to
// forget. Everything else a Fieldset knows either stops there deliberately
// (`required`, `invalid`, the group's own description) or travels natively
// (`disabled`, through the real `<fieldset>`) — see Fieldset.vue. Merging it
// here rather than inside the context keeps the one overlapping key visible.
const group = useOuterFieldContext();

provideFieldContext({
  controlId: () => controlId.value,
  // Group controls name themselves with `aria-labelledby`, not `label for`, so
  // they need the label's own id. Only when the label is actually rendered: an
  // IDREF that resolves to nothing is worse than no attribute at all.
  labelledBy: () => (props.label ? labelId.value : undefined),
  // Only while a message is actually rendered. An IDREF resolving to nothing
  // is a worse answer than no attribute — the same reasoning Fieldset already
  // carries for its own `aria-describedby`.
  describedBy: () => ((props.error ?? props.hint) ? descriptionId.value : undefined),
  name: () => props.name,
  required: () => props.required || undefined,
  // The row's message and the control's `aria-invalid` are two halves of one
  // state; two independent switches for it is how they come to disagree.
  invalid: () => (props.error ? true : undefined),
  disabled: () => props.disabled,
  readonly: () => props.readonly ?? group?.readonly.value,
});
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label
      v-if="label && controlId"
      :id="labelId"
      :for="controlId"
      class="text-sm font-medium text-foreground"
    >
      {{ label }} <span v-if="required" class="text-destructive-text">*</span>
    </label>
    <span v-else-if="label" class="text-sm font-medium text-foreground">
      {{ label }} <span v-if="required" class="text-destructive-text">*</span>
    </span>
    <slot />
    <p v-if="hint && !error" :id="descriptionId" class="text-xs text-muted-foreground">
      {{ hint }}
    </p>
    <InlineError v-if="error" :id="descriptionId" :message="error" />
  </div>
</template>
