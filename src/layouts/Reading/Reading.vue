<script setup lang="ts">
import { cn } from "../../lib/cn";

withDefaults(
  defineProps<{
    /** Whether to add horizontal gutters that widen at wider breakpoints. */
    gutter?: boolean;
  }>(),
  { gutter: true },
);
</script>

<template>
  <!--
    Reading — a long-form reading layout that caps the content area at a
    comfortable line length (~65ch). The header and footer span full-width
    (site chrome, navigation, copyright), while only the reading content is
    constrained to `max-w-prose` — the width that research identifies as the
    fastest for sustained reading. Extra viewport on ultrawide monitors goes
    to intentional whitespace, never to stretching lines.

    The content wrapper is always prose-width with no prop: this layout exists
    to enforce that cap. A reading layout that can go full-width is not a
    reading layout. The `gutter` prop controls horizontal padding, not width.
  -->
  <div :class="cn('min-h-dvh flex flex-col')">
    <header v-if="$slots.header" :class="cn(gutter ? 'px-4 sm:px-6 3xl:px-8' : undefined)">
      <slot name="header" />
    </header>

    <div
      :class="
        cn(
          'mx-auto w-full max-w-prose flex-1',
          gutter ? 'px-4 sm:px-6 3xl:px-8' : undefined,
          'py-8 sm:py-12',
        )
      "
    >
      <slot />
    </div>

    <footer v-if="$slots.footer" :class="cn(gutter ? 'px-4 sm:px-6 3xl:px-8' : undefined)">
      <slot name="footer" />
    </footer>
  </div>
</template>
