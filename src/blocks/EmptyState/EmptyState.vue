<script setup lang="ts">
/**
 * EmptyState — the shape of "nothing here yet": icon → title → optional
 * description → at most ONE call-to-action, centered in the empty region. An
 * empty region should explain itself and invite the next step — empty is a
 * welcome, never an error (a failed load renders `InlineError`; an empty
 * *result* renders this).
 *
 * The entrance is a staggered fade-rise film (icon, title, description,
 * action — 60ms apart): this is content appearing, not action feedback, so
 * it budgets like a panel rather than against the interaction-feedback
 * ceiling, all token-tier CSS. Purely presentational: the icon comes via the
 * `icon` slot (decorative, hidden from assistive tech), the CTA via the
 * `action` slot — the host owns behavior and wording, and no fallback copy
 * ships with the component.
 *
 * The icon sits in a hairline medallion — a `bg-subtle` disc with a `border`
 * ring — rather than floating bare. Two reasons: the glyph itself is sized
 * 20px, the emphasis step for an empty-state icon, and a 20px stroke drawing
 * alone in a large blank region has nothing to hold it, so it reads as a
 * stray mark; the medallion gives it a shape to anchor without adding a
 * shadow (a disc is a surface plus a hairline, never a float). `bg-subtle`
 * is chosen over `bg-card` so the disc stays visible on `bg-card` and
 * `bg-background` alike — this block is dropped into both.
 *
 * Type comes from the named scale (`text-title` / `text-small`), not
 * hand-picked `text-sm`/`text-xs` — the empty state is a titled moment, not
 * a caption.
 */
defineProps<{
  /** What is missing, stated plainly — always shown. */
  title: string;
  /** What to do about it. Omit rather than pad the region with filler copy. */
  description?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center sm:py-14">
    <div
      v-if="$slots.icon"
      aria-hidden="true"
      class="animate-fade-rise mb-3 grid h-12 w-12 place-items-center rounded-full border border-border bg-subtle text-muted-foreground [&_svg]:h-5 [&_svg]:w-5"
    >
      <slot name="icon" />
    </div>
    <p class="animate-fade-rise text-title text-foreground" :style="{ animationDelay: '60ms' }">
      {{ title }}
    </p>
    <p
      v-if="description"
      class="animate-fade-rise max-w-sm text-balance text-small text-muted-foreground"
      :style="{ animationDelay: '120ms' }"
    >
      {{ description }}
    </p>
    <div v-if="$slots.action" class="animate-fade-rise mt-4" :style="{ animationDelay: '180ms' }">
      <slot name="action" />
    </div>
  </div>
</template>
