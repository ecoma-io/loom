<script lang="ts">
import type { Component } from "vue";

/** One destination in the sidebar. */
export interface SidebarNavItem {
  /** A Lucide icon component (e.g. `Home` from `@lucide/vue`) — decorative; the label carries the meaning. */
  icon?: Component;
  label: string;
  /** Marks this as the current page — the sole `--primary` accent drawn in the list. */
  active?: boolean;
  /** Renders the item as a real `<a>` instead of a `<button>`. The host owns the router/navigation. */
  href?: string;
  /** Short count/status shown after the label. Hidden in collapsed mode — folded into its tooltip instead. */
  badge?: string | number;
}

/** A labeled group of items; `label` may be omitted for an unlabeled leading group. */
export interface SidebarNavSection {
  label?: string;
  items: SidebarNavItem[];
}
</script>

<script setup lang="ts">
import Tooltip from "../../primitives/Tooltip/Tooltip.vue";
import Badge from "../../primitives/Badge/Badge.vue";
import Separator from "../../primitives/Separator/Separator.vue";
import { cn } from "../../lib/cn";

/**
 * SidebarNav — the primary NAVIGATION chrome: a `<nav>` landmark of sections
 * and destinations, pinned to the sunken plane (the recessed layer of the
 * shell — sunken < background < card, so work surfaces read as lifted and
 * navigation recedes).
 *
 * The active item carries a flat `--primary` fill and an inset accent bar —
 * a human decides which surface they are on, so this is the primary force
 * alone. It never mixes in `--accent`: this is navigation chrome, not a place
 * reporting a second semantic category.
 *
 * Presentational only: the host owns routing (`href` renders a real anchor)
 * and which item is `active` — this component does not track a current
 * route itself.
 *
 * Collapsed mode drops to icon-only rows: each item still needs an
 * accessible name once its label text is hidden, so it moves to `aria-label`
 * (Tooltip's own contract is `aria-describedby`, never the *only* source of
 * a name) and its Tooltip doubles as the visible hint. Native `<a>`/`<button>`
 * elements are used throughout, so Enter/Space activation and tab order come
 * from the platform, not custom key handling.
 *
 * Collapsed rows are square (`h-9 w-9`) rather than full-width, so the nav
 * centers its own children in that mode. The host is what narrows the rail,
 * and it may narrow it late or not at all — without the centering, a collapsed
 * nav still sitting in an expanded-width container leaves a column of icons
 * hugging the left edge of a wide empty panel. Centering makes the mode read
 * correctly at every container width, and the host's width animation then only
 * has to tighten what already looks right.
 */
withDefaults(
  defineProps<{
    sections: SidebarNavSection[];
    /** Icon-only rail: section headings and item labels hide; each item's name moves into a Tooltip. */
    collapsed?: boolean;
    /** Accessible name for the `<nav>` landmark — the host owns wording (see `AppHeader`'s same prop). */
    ariaLabel?: string;
  }>(),
  { collapsed: false },
);

const emit = defineEmits<{ select: [item: SidebarNavItem] }>();

function tooltipContent(item: SidebarNavItem): string {
  return item.badge !== undefined && item.badge !== null
    ? `${item.label} · ${item.badge}`
    : item.label;
}

function itemClass(item: SidebarNavItem, collapsed: boolean): string {
  return cn(
    "relative flex items-center gap-2 rounded-md text-left text-sm outline-none",
    "transition-colors duration-fast ease-out",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo",
    collapsed ? "h-9 w-9 justify-center" : "h-9 w-full px-2.5",
    item.active
      ? "bg-primary/10 font-medium text-primary"
      : // Hover lifts the row to the raised plane rather than tinting it with
        // `--subtle`. `--subtle` is the neutral hover fill for surfaces sitting
        // on `--background` (96% L), where it lands 2% darker and reads. This
        // nav sits on `--sunken` (93% L) and `--subtle` is 94% — one percent
        // apart, so the hover state was there in the markup and invisible on
        // screen. Lifting to `bg-card` is the elevation rhythm's own answer
        // (sunken < background < card): the row the pointer is on comes
        // forward.
        "text-muted-foreground hover:bg-card hover:text-foreground",
  );
}
</script>

<template>
  <nav
    :aria-label="ariaLabel"
    class="flex h-full w-full flex-col gap-1 overflow-y-auto overscroll-contain bg-sunken p-2"
    :class="collapsed && 'items-center'"
  >
    <template v-for="(section, sectionIndex) in sections" :key="sectionIndex">
      <Separator v-if="sectionIndex > 0" class="my-1" />
      <p
        v-if="section.label && !collapsed"
        class="select-none px-2 pb-1 pt-2 text-micro font-medium uppercase tracking-wide text-muted-foreground"
      >
        {{ section.label }}
      </p>
      <ul class="flex flex-col gap-0.5">
        <li v-for="(item, itemIndex) in section.items" :key="itemIndex">
          <Tooltip v-if="collapsed" :content="tooltipContent(item)" side="right">
            <template #trigger>
              <component
                :is="item.href ? 'a' : 'button'"
                :type="item.href ? undefined : 'button'"
                :href="item.href"
                :aria-current="item.active ? 'page' : undefined"
                :aria-label="item.label"
                :class="itemClass(item, true)"
                @click="emit('select', item)"
              >
                <span
                  v-if="item.active"
                  aria-hidden="true"
                  class="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                />
                <component :is="item.icon" v-if="item.icon" aria-hidden="true" class="shrink-0" />
              </component>
            </template>
          </Tooltip>

          <component
            :is="item.href ? 'a' : 'button'"
            v-else
            :type="item.href ? undefined : 'button'"
            :href="item.href"
            :aria-current="item.active ? 'page' : undefined"
            :class="itemClass(item, false)"
            @click="emit('select', item)"
          >
            <span
              v-if="item.active"
              aria-hidden="true"
              class="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
            />
            <component :is="item.icon" v-if="item.icon" aria-hidden="true" class="shrink-0" />
            <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            <Badge v-if="item.badge !== undefined" variant="neutral" class="shrink-0">
              {{ item.badge }}
            </Badge>
          </component>
        </li>
      </ul>
    </template>
  </nav>
</template>
