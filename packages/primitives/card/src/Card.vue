<script lang="ts">
import type { SurfacePad } from "@ecoma-io/loom-surface";

/**
 * Card — a compositional surface. The box styling is Surface's own `card`
 * variant consumed as data (`surfaceVariants`), so a card and a bare Surface
 * can never drift apart on radius, hairline or ground, while Card owns what
 * Surface deliberately does not: the section rhythm, the title/description
 * contract and the two ways a card becomes interactive.
 *
 * Interactive comes in exactly two shapes, because a third would be a lie:
 *
 *   • `href` — the whole card IS one link. One tab stop, one action, real
 *     anchor semantics, the content itself for an accessible name — and one
 *     rule: nothing interactive may be placed inside, because nested
 *     controls inside an anchor are unreadable to assistive tech.
 *   • `interactive` — hover/press language only. The host owns the role,
 *     tabindex and handler, exactly as `Surface.interactive` documents; a
 *     component cannot invent semantics for somebody else's behaviour.
 */
export type { SurfacePad as CardPad };
</script>

<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@ecoma-io/loom-core";
import { surfaceVariants } from "@ecoma-io/loom-surface";

const props = defineProps<{
  /** The card's heading. Omit for a purely visual composition. */
  title?: string;
  /** Supporting line under the title. */
  description?: string;
  /**
   * Renders the whole card as one link. The strongest card-link semantics —
   * a real anchor, one Tab stop — and therefore a rule: nothing interactive
   * may be placed inside.
   */
  href?: string;
  /**
   * Hover/press language for a clickable card whose behaviour belongs to the
   * host. Like `Surface.interactive`, this paints intent only — attach the
   * role, `tabindex` and handler yourself, or reach for `href` when the card
   * genuinely navigates.
   */
  interactive?: boolean;
}>();

/** Section rhythm: one inset owned once, so every card padds alike. */
const CARD_SECTIONS = {
  header: "px-4 pt-4",
  body: "px-4 py-4",
  // A recessed strip under a hairline: the footer reads as chrome for the
  // content above it, not as more content.
  footer: "border-t border-border bg-muted/40 px-4 py-3",
} as const;

const rootClasses = computed(() =>
  cn(
    // Box styling stays Surface's decision, consumed as data so the two
    // cannot drift; `pad: none` because the sections carry their own rhythm.
    // The interactive language rides the same map for both shapes — an anchor
    // is simply always interactive.
    surfaceVariants({
      variant: "card",
      pad: "none",
      interactive: Boolean(props.href) || props.interactive,
    }),
    "overflow-hidden",
    props.href &&
      // Focus and press join the library's languages only when there is
      // something to act on. The transform composite mirrors Button's:
      // scale on spring, colour steady on ease-out.
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo [transition:transform_var(--duration-fast)_var(--ease-spring),background-color_var(--duration-fast)_var(--ease-out)] active:scale-press",
  ),
);
</script>

<template>
  <component :is="href ? 'a' : 'div'" :href="href" :class="rootClasses">
    <!-- @slot Edge-to-edge media above every section; the card clips its corners. -->
    <div v-if="$slots.media" class="[&>img]:block [&>img]:w-full">
      <slot name="media" />
    </div>

    <div v-if="$slots.header || title || description" :class="cn(CARD_SECTIONS.header)">
      <!-- @slot Replaces the title/description pair wholesale for custom header layouts. -->
      <slot name="header">
        <p v-if="title" class="text-sm font-medium">{{ title }}</p>
        <p v-if="description" class="mt-1 text-small text-muted-foreground">{{ description }}</p>
      </slot>
    </div>

    <!-- @slot The card's substance. -->
    <div :class="cn(CARD_SECTIONS.body)"><slot /></div>

    <!-- @slot Actions or metadata, recessed under a hairline. -->
    <div v-if="$slots.footer" :class="cn(CARD_SECTIONS.footer)">
      <slot name="footer" />
    </div>
  </component>
</template>
