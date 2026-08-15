<script setup lang="ts">
import { computed } from "vue";
import InlineError from "@ecoma-io/loom-inline-error";
import { cn } from "@ecoma-io/loom-core";
import { useSplitAttrs } from "@ecoma-io/loom-core";
import { provideFieldContext } from "@ecoma-io/loom-labels";

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
 *   <Field label="Street"><TextField /></Field>
 *   <Field label="City"><TextField /></Field>
 * </Fieldset>
 * ```
 *
 * **The group hands down exactly one thing: `readonly`.** Everything else it
 * knows either travels natively or is a claim about the group that is not
 * automatically a claim about each control in it, and the reasoning is worth
 * stating because the next person will ask:
 *
 * - `disabled` travels through the real `<fieldset>`, and a second mechanism
 *   alongside it would be actively harmful rather than merely redundant. One
 *   fact carried two ways lets the two disagree: a control written
 *   `:disabled="false"` beats a context by the precedence rule, while the
 *   native attribute disables it anyway — leaving a control that renders
 *   enabled and silently refuses input. The element also reaches strictly
 *   further, which is the argument for rendering a `<fieldset>` at all.
 * - `required` and `invalid` stop here. "This group is mandatory" is not
 *   "every control in it is mandatory" — an address block needs a street and
 *   not an apartment number — and a group-level error does not make each
 *   control in it individually wrong. `aria-required` or `aria-invalid` on a
 *   control that is fine is a false statement to the only audience that hears
 *   it.
 * - The description stops here too, because unlike Field this component owns a
 *   real element and already points its own `aria-describedby` at the message.
 * - `controlId` would collide with the id on the `<fieldset>` itself, and one
 *   shared `name` is right for a set of radios and wrong for everything else.
 *
 * `readonly` is left because nothing else can carry it: there is no native
 * `<fieldset readonly>`, and a group shown in view mode is a real state.
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
    /** Renders every Loom control inside read-only: still focusable, still submitted, not editable. */
    readonly?: boolean | undefined;
    /** Set on the `<fieldset>`, and what the hint/error id is derived from (`${id}-description`). */
    id?: string;
  }>(),
  {
    required: false,
    disabled: false,
    // Explicitly `undefined`, not `false`: a Fieldset that says nothing about
    // `readonly` must not overrule a Field or a control that set it, and Vue
    // casts an absent Boolean prop with no declared default to `false`.
    readonly: undefined,
  },
);

provideFieldContext({
  controlId: () => undefined,
  describedBy: () => undefined,
  name: () => undefined,
  required: () => undefined,
  invalid: () => undefined,
  disabled: () => undefined,
  readonly: () => props.readonly,
});

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
        // `group`, and no `opacity`. Dimming the group was the worst instance
        // of that mistake in the library, because opacity *composites* and
        // therefore multiplies: this element's 50% ran over a Switch's or a
        // Select's own 50%, so a control inside a disabled group rendered at
        // 25% effective alpha and its label measured 1.65:1 — and the group's
        // own hint, one dim rather than two, still came out at 2.05:1. Neither
        // was reachable by fixing the controls, because neither was the
        // controls' doing.
        //
        // Removing it here is what un-multiplies them: a nested control now
        // computes only its own drained treatment (Select and OtpInput land
        // their labels on 4.67:1 that way), and nothing this element does
        // reduces it further. The group still reads as unavailable — the
        // legend below mutes, and every control in it wears its own disabled
        // state — and the native `disabled` attribute carries the fact to
        // assistive tech, so none of it rests on colour alone.
        //
        // And no fill either, which is the other half of the same answer. Every
        // control in the library drains to `bg-muted` when it is unavailable,
        // so a `bg-muted` on the group would be that exact colour running
        // edge-to-edge behind them: the fills would meet at 1:1 and a row of
        // disabled controls would read as one grey slab with no controls in it.
        // The group is a grouping, not a surface — it has no fill available and
        // no `readonly` appearance either, because a read-only group is a group
        // of read-only controls, each of which now says so on its own.
        'disabled:cursor-not-allowed',
        'group',
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
    <!-- The legend is where "this whole group is unavailable" is now painted:
         it is the group's accessible name and the only text the group owns
         rather than borrows. `group-disabled:` reads the real `:disabled` on
         the `<fieldset>` above, so there is no second copy of the state to fall
         out of step with the attribute. 14.09:1 available, 5.25:1 not — a drop
         a reader can see, at a colour they can still read. -->
    <legend
      v-if="legend"
      class="mb-2 text-sm font-medium text-foreground group-disabled:text-muted-foreground"
    >
      {{ legend }} <span v-if="required" class="text-destructive-text">*</span>
    </legend>
    <!-- @slot The controls in the group — Fields, most often. -->
    <slot />
    <p v-if="hint && !error" :id="descriptionId" class="text-xs text-muted-foreground">
      {{ hint }}
    </p>
    <InlineError v-if="error" :id="descriptionId" :message="error" />
  </fieldset>
</template>
