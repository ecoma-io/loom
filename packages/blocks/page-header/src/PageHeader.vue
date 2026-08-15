<script setup lang="ts">
/**
 * PageHeader — the band that turns a scrolling document into a workspace
 * surface: it pins to the top of the scroll container, carries the
 * surface's name, its live count and one line of orientation, and owns the
 * surface's primary actions.
 *
 * Two things it deliberately does:
 *
 * - **Pinned, and separated by a hairline — never a shadow.** It sits on
 *   `bg-background`, the same plane as the work area rather than a sunken
 *   navigation plane, because this is the surface's own header, not chrome
 *   that recedes. Rows scroll *under* it, so the plane is translucent and
 *   blurred; the opaque `bg-background` is declared first and remains the
 *   fallback wherever `backdrop-filter` is unsupported.
 * - **The count is a number, so it is `tabular`** — a count that changes as
 *   items resolve must not shift the title beside it. It is deliberately
 *   NOT a Badge: a badge is a status chip, and "how many rows are below" is
 *   a fact, not a status. Wrap it in a Badge at the call site on the rare
 *   surface where the count itself is the alarm.
 *
 * Presentational only: the host owns wording, the actions, and the scroll
 * container this sticks inside (`position: sticky` resolves against the
 * nearest scrolling ancestor — a header that will not stick is almost
 * always an ancestor with `overflow: hidden`, not this component).
 *
 * Two width behaviors. Gutters step up (`sm`, then `3xl`) rather than
 * holding one value, so the band is not padded like a phone on a 1920px
 * canvas. And the description is capped at `max-w-prose` instead of
 * tracking the viewport — a one-line orientation stretched across an
 * ultra-wide monitor is unreadable; the width that opens up belongs to the
 * actions and the work below, not to a longer measure. The title itself is
 * uncapped: it truncates, so it can only ever occupy one line.
 */
defineProps<{
  title: string;
  /** One line of orientation under the title. Say what the surface is FOR, not what it is called again. */
  description?: string;
  /** Live row count shown beside the title. Omit rather than pass 0 — "0" beside a title reads as a broken fetch; the empty state carries that message. */
  count?: number;
}>();
</script>

<template>
  <header
    class="sticky top-0 z-20 flex flex-wrap items-start gap-x-6 gap-y-3 border-b border-border bg-background px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 sm:px-6 sm:py-4 3xl:px-8"
  >
    <!-- `basis-56` is the wrap threshold, not a width: flex line-breaking reads
         the basis, so the actions drop to their own row once the title cannot
         hold ~14rem — instead of staying crammed alongside a title truncated to
         a few glyphs. `min-w-0` still lets the block shrink under that on the
         narrowest screens, and keeps the h1's truncate working. -->
    <div class="min-w-0 flex-1 basis-56">
      <div class="flex items-baseline gap-2">
        <h1 class="text-heading min-w-0 truncate text-foreground">{{ title }}</h1>
        <span v-if="count !== undefined" class="tabular shrink-0 text-small text-muted-foreground">
          {{ count }}
        </span>
      </div>
      <p v-if="description" class="mt-0.5 max-w-prose text-small text-muted-foreground">
        {{ description }}
      </p>
    </div>
    <!-- `ml-auto`, not the header's `justify-between`: once the actions wrap to
         their own line the two are no longer distributed, and justify-between
         would drop them flush LEFT under the title. -->
    <div v-if="$slots.actions" class="ml-auto flex shrink-0 items-center gap-2">
      <!-- @slot The surface's primary actions, trailing the title. Convention: at most one `variant="primary"` Button, the rest `outline`/`subtle`. -->
      <slot name="actions" />
    </div>
  </header>
</template>
