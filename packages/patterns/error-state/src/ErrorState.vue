<script setup lang="ts">
/**
 * ErrorState — the shape of "something went wrong": icon → title → optional
 * description → optional retry action, centered in the error region. This is
 * EmptyState's mirror: where that block says "nothing here yet" and invites
 * the next step, this one says "something broke" and offers a retry.
 *
 * No staggered entrance. EmptyState is content appearing — a welcome, budgeted
 * like a panel reveal. An error is not content; it is a problem that needs
 * attention now, and a fade-rise film that delays the message reads as
 * indifference. Everything renders at once.
 *
 * The icon sits in a hairline medallion — the same shape as EmptyState's, but
 * tinted `bg-destructive/10` with a `border-destructive/30` ring — because a
 * bare glyph in a region that already signals alarm has no anchor and the
 * colour alone does the work that EmptyState's neutral medallion needed
 * `bg-subtle` for. The icon is decorative and `aria-hidden`; the title already
 * carries the meaning.
 *
 * The action slot is semantically a retry affordance but remains a generic
 * slot — the host owns the wording and behaviour, and no fallback copy ships
 * with the component.
 */
defineProps<{
  /** What went wrong, stated plainly — always shown. */
  title: string;
  /** More context about the error. Omit rather than pad the region with filler copy. */
  description?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-1.5 px-6 py-10 text-center sm:py-14">
    <div
      v-if="$slots.icon"
      aria-hidden="true"
      class="grid h-12 w-12 place-items-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive-text [&_svg]:h-5 [&_svg]:w-5"
    >
      <slot name="icon" />
    </div>
    <p class="text-title text-foreground">
      {{ title }}
    </p>
    <p v-if="description" class="max-w-sm text-balance text-small text-muted-foreground">
      {{ description }}
    </p>
    <div v-if="$slots.action" class="mt-4">
      <slot name="action" />
    </div>
  </div>
</template>
