<script setup lang="ts">
/**
 * LoadingState — the shape of "not yet known": a Spinner for short waits or a
 * column of skeleton lines for content-shaped waits. This replaces the "flash
 * of EmptyState" antipattern — never show EmptyState before the real result is
 * known, because an empty state that flickers and disappears is a short-lived
 * lie.
 *
 * Two modes controlled by `mode`:
 * - `spinner` (default): centred Spinner with an optional label. Good for
 *   indeterminate waits where the host does not know the content shape.
 * - `skeleton`: a column of skeleton lines that approximate the content the
 *   host is loading. The default lines are three bars of varying width — enough
 *   to suggest paragraph-shaped content without the host having to compose
 *   anything. Hosts that know their own shape provide a default slot and render
 *   whatever Skeleton arrangement matches their real layout.
 *
 * The Spinner carries its own accessible label (`aria-label` on the primitive)
 * so this block does not add a redundant one. The skeleton lines are purely
 * decorative (`aria-hidden` on each Skeleton) — the host's real content will
 * replace them.
 */
import Spinner from "../../primitives/Spinner/Spinner.vue";
import Skeleton from "../../primitives/Skeleton/Skeleton.vue";

withDefaults(
  defineProps<{
    /** Shown below the spinner in spinner mode. Omit for a spinner-only wait. */
    label?: string;
    /** `spinner` for short indeterminate waits; `skeleton` for content-shaped waits. */
    mode?: "spinner" | "skeleton";
  }>(),
  { mode: "spinner" },
);
</script>

<template>
  <div
    v-if="mode === 'spinner'"
    class="flex flex-col items-center justify-center gap-3 px-6 py-10 sm:py-14"
  >
    <Spinner size="lg" />
    <p v-if="label" class="text-small text-muted-foreground">{{ label }}</p>
  </div>
  <div v-else class="flex flex-col gap-3 px-6 py-10 sm:py-14">
    <slot>
      <!-- Default skeleton lines approximate paragraph-shaped content without
           requiring the host to compose anything. Hosts that know their own
           shape slot their own Skeleton arrangement instead. -->
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-3/4" />
      <Skeleton class="h-4 w-5/6" />
    </slot>
  </div>
</template>
