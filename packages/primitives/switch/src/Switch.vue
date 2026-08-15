<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from "reka-ui";
import { cn } from "@ecoma-io/loom-core";
import { useSplitAttrs } from "@ecoma-io/loom-core";
import { useFieldControl } from "@ecoma-io/loom-labels";

/**
 * Switch — toggles a boolean setting that takes effect immediately, with no
 * "Save" step. Built on Reka UI's Switch for role="switch" + aria-checked +
 * Space/Enter. Label and description live on the surrounding setting row —
 * wire them in with `aria-labelledby`, since Switch renders a button, not a
 * labelable input.
 *
 * Inside a [Field](../Field/Field.vue) that row is the wrapper itself, and the
 * wiring stops being the caller's job: `useFieldControl()` puts the row's id on
 * the button — labelable, so the row's `<label for>` names the control that has
 * no name of its own — and brings the row's description, `name`, `required` and
 * `invalid` with it.
 *
 * There is no `readonly` here, and a row's is ignored rather than approximated.
 * A switch that cannot be flipped is disabled; one that looks live and refuses
 * the flip is the only state worse than either.
 */
const props = withDefaults(
  defineProps<{
    /** Whether the setting is currently on. Omit to let the switch own its own state. */
    modelValue?: boolean | undefined;
    /** Blocks both click and keyboard input, and dims the control. Unset defers to a wrapping Field. */
    disabled?: boolean | undefined;
  }>(),
  {
    // Not `false` — see Checkbox: a concrete default claims host ownership and
    // leaves an unbound switch emitting updates while never moving.
    modelValue: undefined,
    // Not `false` either: absent has to stay tellable from `false` for a Field
    // above to disable the row and for `:disabled="false"` to overrule one that
    // does. Vue casts an absent Boolean prop with no declared default to
    // `false`, which would leave the context wired and inert.
    disabled: undefined,
  },
);

defineEmits<{ "update:modelValue": [value: boolean] }>();

defineOptions({ inheritAttrs: false });
const { attrs, rest: switchAttrs } = useSplitAttrs();

// One rendered node, so the split is only about `class` — a caller's class
// needs a Tailwind-aware merge rather than Vue's concatenating fallthrough.
//
// `id` and `aria-describedby` arrive as fallthrough attrs rather than props, so
// they are handed in as this caller's own values; `field.attrs` then spreads
// **after** `switchAttrs`, and that position is the contract (see
// TextField.vue). `name` in that bag reaches SwitchRoot's own `name` prop,
// which is what mints the hidden input a `<form>` submits.
//
// `name`, `required` and `invalid` are omitted below because Switch has no prop
// for any of them: the row's answer stands unopposed. `readonly` is omitted for
// the reason the docblock gives.
//
// The resolved `required` then reaches the element through Reka's own prop
// rather than the `aria-required` in `field.attrs` — see Checkbox.vue, which
// carries the reasoning. SwitchRoot happens to spread the fallthrough last, so
// the attribute would win here; going through the prop keeps the four
// Reka-rooted controls one shape instead of four merge orders to re-derive.
const field = useFieldControl(() => ({
  id: attrs.id as string | undefined,
  describedBy: attrs["aria-describedby"] as string | undefined,
  disabled: props.disabled,
}));
</script>

<template>
  <SwitchRoot
    v-bind="{ modelValue, ...switchAttrs, ...field.attrs }"
    :disabled="field.disabled"
    :required="field.required"
    :class="
      cn(
        'relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border border-transparent',
        'transition-[background-color,filter,box-shadow] duration-instant ease-out',
        'hover:brightness-95',
        // Checked = a decision (Loom law): the track fills with primary.
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30',
        // Focus draws the weave tight: the brand ring blooms.
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
        'disabled:cursor-not-allowed disabled:opacity-50',
        attrs.class as string,
      )
    "
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <SwitchThumb
      style="
        transition:
          left var(--duration-instant) var(--ease-out),
          transform var(--duration-fast) var(--ease-spring);
      "
      :class="
        cn(
          'absolute top-1/2 left-0.5 block h-5 w-5 -translate-y-1/2 rounded-full bg-background shadow-sm',
          'active:scale-x-[1.15] active:scale-y-[0.85]',
          'data-[state=checked]:left-[1.125rem]',
        )
      "
    />
  </SwitchRoot>
</template>
