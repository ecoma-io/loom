<script lang="ts">
/** The visible label text and optional link target for one step in the trail. */
export interface BreadcrumbItem {
  /** The visible label text. */
  label: string;
  /** The link target. Omit for the current (last) item. */
  href?: string;
}

/** Visual separators between breadcrumb steps. `chevron` renders an inline SVG. */
export type BreadcrumbSeparator = "/" | "\\" | ">" | "→" | "chevron";
</script>

<script setup lang="ts">
import { cn } from "../../lib/cn";

/**
 * Breadcrumb — a navigation trail showing the page's position in the site
 * hierarchy. The last item is always the current page (no href,
 * `aria-current="page"`); items with an href render as links. Built without
 * Reka UI, which has no Breadcrumb primitive.
 */
withDefaults(
  defineProps<{
    /** The breadcrumb trail, last item is the current page. */
    items: BreadcrumbItem[];
    /** Visual separator between items. `chevron` renders an inline SVG arrow. */
    separator?: BreadcrumbSeparator;
  }>(),
  { separator: "/" },
);
</script>

<template>
  <nav aria-label="Breadcrumb">
    <ol class="flex items-center gap-1.5 text-sm">
      <template v-for="(item, index) in items" :key="index">
        <li v-if="index > 0" aria-hidden="true" :class="cn('text-muted-foreground/50')">
          <svg
            v-if="separator === 'chevron'"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <template v-else>{{ separator }}</template>
        </li>

        <!-- The last item is always the current page, regardless of href -->
        <li v-if="index === items.length - 1">
          <span aria-current="page" :class="cn('text-foreground font-medium')">
            {{ item.label }}
          </span>
        </li>
        <li v-else>
          <a
            :href="item.href"
            :class="
              cn('text-muted-foreground hover:text-foreground transition-colors duration-fast')
            "
          >
            {{ item.label }}
          </a>
        </li>
      </template>
    </ol>
  </nav>
</template>
