<script setup lang="ts">
import { computed } from "vue";
import { ProgressRoot, ProgressIndicator } from "reka-ui";
import { cn } from "../../lib/cn";

/**
 * Progress — determinate progress bar for a task whose extent as a percentage
 * is known (upload %, step 3 of 5). `modelValue` null/undefined renders the
 * *indeterminate* state — an empty track, since there is no percentage yet to
 * paint. For a wait of unknown duration with no percentage at all, use
 * Spinner instead of guessing a Progress value.
 *
 * Built on Reka UI's Progress: role="progressbar" + aria-valuenow/min/max set
 * on the root automatically. `ariaLabel`/`ariaLabelledby` are bound onto
 * ProgressRoot (fallthrough overrides Reka's own generated "`NN%`" label) so
 * the accessible name describes *what* is loading, not just how much.
 */
const props = withDefaults(
  defineProps<{
    /** The completed amount, 0–`max`; `null`/omitted renders indeterminate. */
    modelValue?: number | null;
    /** The value that reads as 100% complete. */
    max?: number;
    /** Accessible name describing the task, overriding Reka's default `NN%` label. */
    ariaLabel?: string;
    /** Accessible name sourced from another element's id, in place of `ariaLabel`. */
    ariaLabelledby?: string;
  }>(),
  {
    max: 100,
  },
);

/** Percentage 0–100, clamped to [0, max]; null while indeterminate. */
const pct = computed<number | null>(() => {
  if (props.modelValue === null || props.modelValue === undefined) return null;
  const clamped = Math.min(Math.max(props.modelValue, 0), props.max);
  return (clamped / props.max) * 100;
});

defineExpose({ pct });
</script>

<template>
  <ProgressRoot
    :model-value="modelValue ?? null"
    :max="max"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabelledby"
    class="relative h-2 w-full overflow-hidden rounded-full bg-muted"
  >
    <!-- Determinate: a full-width bar slid left by the remaining percentage
         (transform eased over --duration-slow). Indeterminate: a short segment
         sweeping the track on a loop, since there is no percentage to paint.
         Completion beat: at 100% the fill turns success (Loom dual-force
         law — a finished piece of work reads as done at a glance), eased in
         over the same --duration-slow lane via the background transition. -->
    <ProgressIndicator
      :class="
        cn(
          'h-full',
          pct === 100 ? 'bg-success' : 'bg-primary',
          pct === null && 'w-1/3 animate-progress-indeterminate rounded-full',
        )
      "
      :style="
        pct === null
          ? undefined
          : {
              transition:
                'transform var(--duration-slow) var(--ease-out), background-color var(--duration-slow) var(--ease-out)',
              transform: `translateX(-${100 - pct}%)`,
            }
      "
    />
  </ProgressRoot>
</template>
