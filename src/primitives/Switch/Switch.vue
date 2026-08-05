<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from "reka-ui";
import { cn } from "../../lib/cn";
import { optional } from "../../lib/props";

/**
 * Switch — toggles a boolean setting that takes effect immediately, with no
 * "Save" step. Built on Reka UI's Switch for role="switch" + aria-checked +
 * Space/Enter. Label and description live on the surrounding setting row —
 * wire them in with `aria-labelledby`, since Switch renders a button, not a
 * labelable input.
 */
withDefaults(
  defineProps<{
    /** Whether the setting is currently on. Omit to let the switch own its own state. */
    modelValue?: boolean | undefined;
    /** Blocks both click and keyboard input, and dims the control. */
    disabled?: boolean;
  }>(),
  {
    // Not `false` — see Checkbox: a concrete default claims host ownership and
    // leaves an unbound switch emitting updates while never moving.
    modelValue: undefined,
    disabled: false,
  },
);

defineEmits<{ "update:modelValue": [value: boolean] }>();
</script>

<template>
  <SwitchRoot
    v-bind="optional({ modelValue })"
    :disabled="disabled"
    :class="
      cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent',
        'transition-[background-color,filter,box-shadow] duration-instant ease-out',
        'hover:brightness-95',
        // Checked = a human decision (Loom law): the track fills flat warp.
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/30',
        // Focus draws the weave tight: the brand ring blooms.
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
        'disabled:cursor-not-allowed disabled:opacity-50',
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
          'absolute top-1/2 left-0.5 block h-4 w-4 -translate-y-1/2 rounded-full bg-background shadow-sm',
          'active:scale-x-[1.15] active:scale-y-[0.85]',
          'data-[state=checked]:left-[1.125rem]',
        )
      "
    />
  </SwitchRoot>
</template>
