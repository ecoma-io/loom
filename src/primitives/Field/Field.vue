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
import { computed } from "vue";
import InlineError from "../InlineError/InlineError.vue";

/**
 * Field — the form-row wrapper: label + control + one hint-or-error line, so
 * a consumer stops hand-assembling that layout at every call site. Pure
 * composition, not a Reka component — the default slot is the control
 * (TextField, Textarea, a select, …). Setting `error` swaps InlineError in
 * for `hint`, because a row shows one message at a time, never both stacked.
 *
 * `for` does two jobs. It is what associates the `<label>` with the control
 * (WCAG 1.3.1 / 4.1.2) — `label` alone, with no `for`, falls back to a plain
 * `<span>` rather than emit a `<label>` with nothing to point at. And it is
 * what the hint/error line derives its own id from (`${for}-description`),
 * which is the missing half of the accessibility contract: Field cannot
 * reach into an arbitrary slotted control to set `aria-describedby` on it,
 * so it publishes a predictable id instead and leaves that one attribute to
 * the consumer — the same way `invalid` already has to be set on the
 * control directly. TextField and Textarea both forward an `aria-describedby`
 * passed to them straight onto their native element, so wiring the two
 * together is exactly:
 *
 * ```vue
 * <Field label="Email" for="email" error="Invalid address">
 *   <TextField id="email" aria-describedby="email-description" invalid />
 * </Field>
 * ```
 */
const props = withDefaults(
  defineProps<{
    /** The visible label text. Renders as a real `<label>` only when `for` is also set. */
    label?: string;
    /** Supporting text shown below the control. Hidden while `error` is set. */
    hint?: string;
    /** The error message. Renders through InlineError and replaces `hint`. */
    error?: string;
    /** Marks the field mandatory and appends a destructive asterisk to the label. */
    required?: boolean;
    /** The id of the control in the default slot — drives the label's `for` and the hint/error id. */
    for?: string;
  }>(),
  { required: false },
);

// The hint and the error are mutually exclusive, so one id covers whichever
// is showing. Undefined without `for`: an id with no control to point at it
// would be a landmark for no one.
const descriptionId = computed(() => (props.for ? `${props.for}-description` : undefined));
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label && props.for" :for="props.for" class="text-sm font-medium text-foreground">
      {{ label }} <span v-if="required" class="text-destructive">*</span>
    </label>
    <span v-else-if="label" class="text-sm font-medium text-foreground">
      {{ label }} <span v-if="required" class="text-destructive">*</span>
    </span>
    <slot />
    <p v-if="hint && !error" :id="descriptionId" class="text-xs text-muted-foreground">
      {{ hint }}
    </p>
    <InlineError v-if="error" :id="descriptionId" :message="error" />
  </div>
</template>
