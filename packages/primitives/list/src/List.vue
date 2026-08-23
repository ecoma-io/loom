<script setup lang="ts">
/**
 * List — a generic composition of rows: leading content, a title and
 * description, trailing metadata or actions. It is the *presentational*
 * vocabulary for row-shaped content, not a navigation primitive — SidebarNav
 * owns wayfinding, Menu owns commands, Table owns columns. This owns "a
 * titled thing per line" wherever that appears: settings groups, pickers,
 * summaries under a page's chrome.
 */
import { cn } from "@ecoma-io/loom-core";

withDefaults(
  defineProps<{
    /** Names the list for assistive technology when surrounding prose does not already say it. */
    label?: string;
    /** Hairline dividers between rows. Off for card-stacked lists. */
    divided?: boolean;
  }>(),
  { divided: true },
);
void cn;
</script>

<template>
  <ul :aria-label="label" :class="cn('m-0 list-none p-0', divided && 'divide-y divide-border')">
    <!-- @slot The rows: one `ListItem` per line. -->
    <slot />
  </ul>
</template>
