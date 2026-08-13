<script setup lang="ts">
import Reading from "./Reading.vue";
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">With header, content, and footer</div>
      <div class="text-xs text-muted-foreground">
        The content area is capped at ~65ch. Header and footer span full-width.
      </div>
    </div>

    <div class="overflow-hidden rounded border border-border">
      <Reading>
        <template #header>
          <div class="border-b border-border bg-card px-4 py-3 text-sm font-medium">
            Publication title
          </div>
        </template>

        <p>
          Typography is the art and technique of arranging type to make written language legible,
          readable, and appealing when displayed. The arrangement of type involves selecting
          typefaces, point sizes, line lengths, line-spacing, and letter-spacing, and adjusting the
          space between pairs of letters.
        </p>
        <p>
          The term typography is also applied to the style, arrangement, and appearance of the
          letters, numbers, and symbols created by the process. Type design is a closely related
          craft, sometimes considered part of typography; most typographers do not design typefaces,
          and some type designers do not consider themselves typographers.
        </p>
        <p>
          Modern typography is attributed to the German printer Johannes Gutenberg, who introduced
          metal movable type to Europe in the fifteenth century. His printing press made books
          widely available in Europe, and the book revolution it triggered has been credited with
          the growth of literacy and the spread of learning across the continent.
        </p>

        <template #footer>
          <div class="border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground">
            Published 2026. All rights reserved.
          </div>
        </template>
      </Reading>
    </div>

    <div class="flex flex-col gap-3">
      <div class="text-sm font-medium">Without gutters</div>
      <div class="text-xs text-muted-foreground">
        Set <code>:gutter="false"</code> when the content manages its own padding.
      </div>
    </div>

    <div class="overflow-hidden rounded border border-border">
      <Reading :gutter="false">
        <p>
          Content without gutters — the reading cap still applies, but horizontal padding is left to
          the host. Useful when the content itself carries padding, or when the layout nests inside
          a container that already provides margins.
        </p>
      </Reading>
    </div>
  </div>
</template>
