<script setup lang="ts">
/**
 * The frame every live example on this site is shown in.
 *
 * A documentation site for a design system has one failure mode worth
 * designing against: the example that no longer compiles, or that compiles and
 * no longer matches the snippet printed underneath it. So there is no snippet
 * — the source shown here is the demo's own file, read at build time with
 * Vite's `?raw`, which means the two cannot disagree.
 */
withDefaults(
  defineProps<{
    /** What the example is demonstrating. Rendered above the surface. */
    title?: string;
    /** The demo component's own source, imported with `?raw`. */
    source?: string;
    /** Drop the surface padding for a demo that fills its own frame. */
    flush?: boolean;
  }>(),
  { flush: false },
);
</script>

<template>
  <figure class="my-6 overflow-hidden rounded-lg border border-border bg-card">
    <figcaption
      v-if="title"
      class="border-b border-border bg-sunken px-4 py-2 text-xs font-medium text-muted-foreground"
    >
      {{ title }}
    </figcaption>

    <div :class="['flex flex-wrap items-center gap-4', flush ? '' : 'p-6']">
      <slot />
    </div>

    <details v-if="source" class="border-t border-border">
      <summary
        class="cursor-pointer list-none px-4 py-2 text-xs font-medium text-muted-foreground transition-colors duration-fast hover:text-foreground"
      >
        Source
      </summary>
      <pre
        class="overflow-x-auto bg-sunken px-4 py-3 text-xs leading-relaxed"
      ><code>{{ source }}</code></pre>
    </details>
  </figure>
</template>
