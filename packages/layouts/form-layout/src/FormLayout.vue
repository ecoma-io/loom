<script lang="ts">
/**
 * FormLayout — a centered form page with constrained width for readability.
 *
 * Forms are narrower than general content: a line length comfortable for reading
 * prose is already wider than the labels and inputs a form needs. FormLayout
 * enforces that cap so the host never ships a form that stretches across an
 * ultrawide monitor. The `maxWidth` prop maps to named steps rather than a pixel
 * value, so the host names intent and the layout owns the geometry.
 *
 * The `#actions` slot flows with the content rather than being sticky, because a
 * submit button that stays pinned while the user scrolls is a button that gets
 * clicked before the form is filled. The gap between content and actions is a
 * fixed `mt-8` — a visual separator is the layout's responsibility, and a wider
 * gap than Stack's `lg` step is warranted to make the boundary unmistakable.
 *
 * The header slot is full-width, above the centered content, so a page title or
 * breadcrumb never competes for horizontal space with the constrained form.
 * Gutters widen at wider breakpoints so ultrawide viewports add whitespace rails
 * rather than stretching the form.
 */
export type FormLayoutMaxWidth = "sm" | "md" | "lg" | "xl";

const maxWidthClass: Record<FormLayoutMaxWidth, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const;

export { maxWidthClass };
</script>

<script setup lang="ts">
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** Max-width for the form column. Forms should be narrower than general content. */
    maxWidth?: FormLayoutMaxWidth;
  }>(),
  { maxWidth: "md" },
);
</script>

<template>
  <div :class="cn('min-h-dvh flex flex-col')">
    <!--
      The header is full-width, above the centered form content, so a page
      title or breadcrumb never competes for horizontal space.
    -->
    <header v-if="$slots.header" :class="cn('px-4 sm:px-6 3xl:px-8')">
      <slot name="header" />
    </header>

    <!--
      The content area fills available vertical space and centres the form
      horizontally. `max-w-md` (default) keeps labels and inputs at a
      comfortable width — wider than that and the eye has to travel too far
      between label and input. Gutters widen at wider breakpoints so
      ultrawide viewports add whitespace rails rather than stretching lines.
    -->
    <div :class="cn('mx-auto w-full flex-1 px-4 sm:px-6 3xl:px-8', maxWidthClass[maxWidth])">
      <slot />

      <!--
        The actions slot is separated from the form content by a wider gap
        than Stack's lg step, so the boundary between "fill in" and "submit"
        is unmistakable. It flows with the content rather than being sticky,
        because a submit button pinned to the viewport is a button clicked
        before the form is filled.
      -->
      <div v-if="$slots.actions" :class="cn('mt-8')">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
