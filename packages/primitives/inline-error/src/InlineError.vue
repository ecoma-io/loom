<script setup lang="ts">
import { TriangleAlert } from "@lucide/vue";
import { cn } from "@ecoma-io/loom-core";

/**
 * InlineError — the one error contract for a field or a section, instead of
 * a paragraph here and a badge there. `role="alert"` on the root means a
 * screen reader announces it the instant it enters the DOM, which is also
 * why a host must mount it with `v-if` rather than hide it with `v-show`:
 * CSS visibility leaves the node in the DOM, so a message change under
 * `v-show` may not re-announce.
 *
 * Persists until the host resolves the cause it names — there is no
 * auto-dismiss timer and no built-in close button. A transient notice that
 * hides itself belongs to a toast, not here.
 */
defineProps<{
  /** The error text. A default-slot child overrides this when both are given. */
  message?: string;
}>();
</script>

<template>
  <div
    role="alert"
    :class="
      cn(
        'flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-text',
        'animate-fade-rise',
      )
    "
  >
    <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <slot>{{ message }}</slot>
    </div>
    <div v-if="$slots.action" class="shrink-0"><slot name="action" /></div>
  </div>
</template>
