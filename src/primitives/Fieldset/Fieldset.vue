<script setup lang="ts">
import { computed } from "vue";
import InlineError from "../InlineError/InlineError.vue";
import { cn } from "../../lib/cn";
import { useSplitAttrs } from "../../lib/attrs";

/**
 * Fieldset — several related controls under one name and one shared
 * hint-or-error line: an address block, a set of notification switches, a
 * date range. Where Field is a single row (label, control, message), Fieldset
 * is the group those rows sit in, and the two nest — a Fieldset of Fields is
 * the shape it was drawn for. A lone control does not need a group; that is a
 * Field.
 *
 * It renders a real `<fieldset>` and `<legend>`, and that choice is most of
 * the component. A `<div role="group" aria-labelledby>` names the group just
 * as well and gives up `<fieldset disabled>`, which disables every form
 * control inside it natively — including controls that arrived through the
 * default slot and that Fieldset holds no reference to. Nothing adds that
 * back from a `div`: a wrapper cannot pass a `disabled` prop to a control it
 * never rendered.
 *
 * The hint-or-error line answers exactly as Field's does, for the reason
 * Field.vue sets out — a wrapper cannot reach into a slotted control to set
 * `aria-describedby`, so it publishes a predictable `${id}-description` and
 * leaves that one attribute to the caller. One half differs: Fieldset owns a
 * real element, so it points the group's own `aria-describedby` at that id
 * itself. Wire a control inside to the same id only when you want the message
 * announced a second time on that control.
 *
 * ```vue
 * <Fieldset legend="Shipping address" id="shipping" hint="Where the order goes" required>
 *   <Field label="Street" for="street"><TextField id="street" /></Field>
 *   <Field label="City" for="city"><TextField id="city" /></Field>
 * </Fieldset>
 * ```
 */
const props = withDefaults(
  defineProps<{
    /** The group's name, rendered as a real `<legend>` — the accessible name of the group. */
    legend?: string;
    /** Supporting text shown below the group. Hidden while `error` is set. */
    hint?: string;
    /** The group's error message. Renders through InlineError and replaces `hint`. */
    error?: string;
    /** Marks the group mandatory and appends a destructive asterisk to the legend. */
    required?: boolean;
    /** Disables every control inside, slotted ones included, and dims the group. */
    disabled?: boolean;
    /** Set on the `<fieldset>`, and what the hint/error id is derived from (`${id}-description`). */
    id?: string;
  }>(),
  { required: false, disabled: false },
);

// The hint and the error are mutually exclusive, so one id covers whichever
// is showing. Undefined without `id`, exactly as in Field: an id nothing can
// be pointed at is a landmark for no one. Undefined with no message either —
// unlike Field, this id is also spent on the group's own `aria-describedby`,
// and an IDREF resolving to nothing is a worse answer than no attribute.
const descriptionId = computed(() =>
  props.id && (props.hint ?? props.error) ? `${props.id}-description` : undefined,
);

// One rendered node, so this split is only about `class`. Vue's own
// fallthrough merge concatenates the two lists rather than resolving them, so
// a caller's `min-w-full` would beat — or lose to — the `min-w-0` below on
// Tailwind's emission order instead of on being the later declaration. That
// one utility is load-bearing (see the root class), so the merge has to be
// Tailwind-aware.
defineOptions({ inheritAttrs: false });
const { attrs, rest: fieldsetAttrs } = useSplitAttrs();
</script>

<template>
  <fieldset
    v-bind="fieldsetAttrs"
    :id="id"
    :disabled="disabled"
    :aria-describedby="descriptionId"
    :class="
      cn(
        'flex flex-col gap-4',
        // Not defensive. Every UA stylesheet gives `<fieldset>` a
        // `min-inline-size: min-content` that no `width` can beat, so a group
        // holding a text input refuses to shrink below that input's intrinsic
        // width and blows out the column of any consumer who drops one into a
        // form grid. Overriding the minimum itself is the only fix.
        'min-w-0',
        // The whole group dims as one unit — it is the group that is
        // unavailable, not each control's own idea of it. A control that also
        // dims itself from `:disabled` (Switch, RadioGroup, Select) ends up
        // fainter still inside a disabled group; that reads as a coherently
        // inactive block, where the alternative reads as a live control
        // silently refusing input. The native `disabled` attribute carries the
        // same state to assistive tech, so nothing here rests on colour alone.
        'disabled:cursor-not-allowed disabled:opacity-50',
        attrs.class as string,
      )
    "
  >
    <!-- Deliberately borderless, like Field: with no border to interrupt, the
         legend's notch rendering never arises and the group is spaced rather
         than boxed. The margin is not a stand-in for the container's `gap`
         either — a rendered legend sits outside the anonymous box that holds
         a fieldset's content, so it is never a flex item and no `gap` reaches
         it. -->
    <legend v-if="legend" class="mb-2 text-sm font-medium text-foreground">
      {{ legend }} <span v-if="required" class="text-destructive">*</span>
    </legend>
    <!-- @slot The controls in the group — Fields, most often. -->
    <slot />
    <p v-if="hint && !error" :id="descriptionId" class="text-xs text-muted-foreground">
      {{ hint }}
    </p>
    <InlineError v-if="error" :id="descriptionId" :message="error" />
  </fieldset>
</template>
