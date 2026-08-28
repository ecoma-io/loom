<script lang="ts">
import type { SkipLinkLabels } from "@ecoma-io/loom-labels";

/**
 * SkipLink — the WCAG 2.4.1 (Bypass Blocks) affordance.
 *
 * A link to the main content that is the page's first focusable element and
 * stays visually hidden until something focuses it. A keyboard user tabs
 * once from the top of the document and lands on it; a pointer user never
 * meets it. It is a primitive beside `Link` rather than a variant of it
 * because the two answer different questions: `Link` navigates, `SkipLink`
 * bypasses — and its entire presentation *is* the hidden-until-focus
 * contract, which is exactly what no consumer should re-answer per product.
 *
 * Placement is the consumer's half of the contract: render it first in the
 * DOM, before the header and navigation it bypasses (next to the app shell),
 * and give the destination `tabindex="-1"` so following the link moves focus
 * there instead of only scrolling.
 */
export const SKIP_LINK_LABELS: SkipLinkLabels = {
  label: "Skip to main content",
};

/**
 * Visually hidden until focused. `absolute` takes the link out of flow so
 * being first in the document reserves no space; the 1px clipped box is the
 * visually-hidden pattern — out of sight but focusable, so DOM order keeps
 * it the first tab stop.
 *
 * The reveal keys on `:focus`, deliberately not `:focus-visible`: focus
 * arriving from a skip target's own activation, from programmatic handoff
 * or from an assistive technology is real focus, and a link that stays
 * hidden for it would be a trap. Every reveal utility carries the `:focus`
 * variant, so each out-specifies its hidden twin and the pair cannot
 * reorder regardless of stylesheet order.
 *
 * The revealed state speaks tokens only — `bg-primary`/`text-primary-text`
 * is the theme's pinned contrast pair and `outline-ring` + `shadow-halo`
 * are the shared focus markers — and carries no transition, so
 * `prefers-reduced-motion` needs no exception here.
 */
export const skipLinkClass = [
  "absolute h-px w-px overflow-hidden whitespace-nowrap [clip:rect(0,0,0,0)]",
  "focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:[clip:auto] focus:p-4 focus:rounded-md focus:bg-primary focus:text-primary-text focus:text-sm focus:font-medium focus:underline focus:underline-offset-4 focus:shadow-halo focus:outline-2 focus:outline-offset-2 focus:outline-ring",
].join(" ");
</script>

<script setup lang="ts">
import { cn } from "@ecoma-io/loom-core";
import { useLabels, type LabelOverrides } from "@ecoma-io/loom-labels";

const props = withDefaults(
  defineProps<{
    /** The in-page destination. Defaults to `#main`, the id the documentation names as the main-content landmark. */
    href?: string;
    /**
     * Names for what the link says, as any subset of `SkipLinkLabels` — the
     * per-instance correction over `SKIP_LINK_LABELS`, in the same shape
     * every component's `labels` prop takes.
     */
    labels?: LabelOverrides<SkipLinkLabels>;
  }>(),
  { href: "#main" },
);

// `text`, not `labels`: the prop of that name is one of the three sources
// this resolves (own prop, then the host vocabulary from
// `provideLoomLabels`, then these English defaults), and a template reading
// the raw prop would be reading the overrides rather than the answer.
const text = useLabels("skipLink", SKIP_LINK_LABELS, () => props.labels);
</script>

<template>
  <a :href="href" :class="cn(skipLinkClass, $attrs.class)">{{ text.label }}</a>
</template>
