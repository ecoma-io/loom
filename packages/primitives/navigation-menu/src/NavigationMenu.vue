<script lang="ts">
/**
 * A navigation link shown inside a dropdown panel. The list is data rather than
 * markup because the primitive stays free of routing logic — the host provides
 * `href` values and decides what navigation means.
 */
export interface NavigationMenuLink {
  /** Visible label. */
  label: string;
  /** Link target. */
  href: string;
  /** Whether this link is the current page. */
  active?: boolean;
  /** Optional description shown below the label. */
  description?: string;
  /** Disabled state. */
  disabled?: boolean;
}

/**
 * One top-level navigation entry. An item with `children` opens a dropdown
 * panel; an item without them is a plain link.
 */
export interface NavigationMenuItem {
  /** Visible label for the trigger button. */
  label: string;
  /** Unique key identifying this item. */
  value: string;
  /** The link target. When set, this item is a simple link rather than a dropdown trigger. */
  href?: string;
  /** Whether this item is currently active (shows aria-current). */
  active?: boolean;
  /** Nested navigation items shown in a dropdown panel. */
  children?: NavigationMenuLink[];
  /** Disabled state. */
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import {
  NavigationMenuRoot,
  NavigationMenuList,
  NavigationMenuItem as RekaNavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink as RekaNavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
} from "reka-ui";
import { cn } from "@ecoma-io/loom-core";
import { listStaggerDelay } from "@ecoma-io/loom-core";
import { optional } from "@ecoma-io/loom-core";

/**
 * NavigationMenu — the WAI-ARIA navigation menu pattern: a landmark containing
 * triggers that open dropdown panels of navigation links.
 *
 * Unlike `DropdownMenu` (button → command list) or `Menubar` (horizontal strip
 * of command menus), this component is a site-navigation landmark. Its panels
 * contain links, not actions, and the whole structure is wrapped in a `<nav>`
 * landmark.
 *
 * Items are data rather than markup. A top-level item with `children` opens a
 * dropdown panel; one without renders as a direct link. The keyboard model
 * follows the APG Navigation Menu pattern: roving tabindex across triggers,
 * Left/Right arrows move between triggers, ArrowDown opens, Escape closes.
 */
withDefaults(
  defineProps<{
    /** The top-level navigation items, in order. */
    items: NavigationMenuItem[];
    /** Layout direction of the trigger bar. */
    orientation?: "horizontal" | "vertical";
    /** Reading direction. Mirrors arrow keys when right-to-left. */
    dir?: "ltr" | "rtl";
    /** Drive the open trigger from the host; omit it and the menu owns its own state. */
    modelValue?: string | undefined;
    /** Accessible label for the nav landmark. */
    ariaLabel?: string;
  }>(),
  // `modelValue: undefined` is load-bearing — it keeps the uncontrolled third
  // state reachable past Vue's absent-Boolean casting. `optional()` in the
  // template is the other half.
  { modelValue: undefined, orientation: "horizontal", ariaLabel: "Navigation" },
);

defineEmits<{ "update:modelValue": [value: string] }>();
</script>

<template>
  <nav :aria-label="ariaLabel" :dir="dir">
    <NavigationMenuRoot
      :orientation="orientation"
      v-bind="optional({ modelValue, dir })"
      class="relative"
      @update:model-value="$emit('update:modelValue', $event)"
    >
      <NavigationMenuList
        :class="
          cn('flex items-center gap-0.5', orientation === 'vertical' && 'flex-col items-stretch')
        "
      >
        <RekaNavigationMenuItem v-for="item in items" :key="item.value" :value="item.value">
          <!-- Items with children get a trigger button that opens a panel. -->
          <NavigationMenuTrigger
            v-if="item.children && item.children.length > 0"
            :disabled="item.disabled ?? false"
            aria-haspopup="menu"
            :class="
              cn(
                'min-h-6 rounded-sm px-2 py-1 text-sm text-muted-foreground transition-colors duration-fast ease-out',
                'hover:bg-subtle hover:text-foreground',
                'focus-visible:bg-subtle focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
                'data-[disabled]:pointer-events-none data-[disabled]:text-muted-foreground',
                'data-[state=open]:bg-subtle data-[state=open]:text-foreground',
              )
            "
          >
            {{ item.label }}
          </NavigationMenuTrigger>

          <!-- Simple link items wrapped in NavigationMenuLink for roving focus. -->
          <RekaNavigationMenuLink
            v-else
            v-bind="optional({ asChild: true, active: item.active })"
            :class="
              cn(
                'min-h-6 rounded-sm px-2 py-1 text-sm text-muted-foreground transition-colors duration-fast ease-out',
                'hover:bg-subtle hover:text-foreground',
                'focus-visible:bg-subtle focus-visible:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
                item.active && 'bg-primary-muted text-primary-text',
                item.disabled && 'pointer-events-none text-muted-foreground',
              )
            "
          >
            <a
              :href="item.href"
              :aria-current="item.active ? 'page' : undefined"
              :aria-disabled="item.disabled || undefined"
              :tabindex="item.disabled ? -1 : undefined"
            >
              {{ item.label }}
            </a>
          </RekaNavigationMenuLink>

          <NavigationMenuContent
            v-if="item.children && item.children.length > 0"
            :class="
              cn(
                'z-overlay min-w-[16rem] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none',
                'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out',
              )
            "
            style="transform-origin: var(--reka-popper-transform-origin)"
          >
            <div class="flex flex-col gap-1 p-1">
              <a
                v-for="(link, i) in item.children"
                :key="link.href"
                :href="link.href"
                :aria-current="link.active ? 'page' : undefined"
                :aria-disabled="link.disabled || undefined"
                :tabindex="link.disabled ? -1 : undefined"
                :style="{ animationDelay: listStaggerDelay(i) }"
                :class="
                  cn(
                    'block rounded-sm px-2 py-1.5 text-sm text-foreground no-underline outline-none',
                    'transition-colors duration-fast ease-out',
                    'hover:bg-subtle',
                    'focus-visible:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo',
                    link.active && 'bg-primary-muted text-primary-text',
                    link.disabled && 'pointer-events-none text-muted-foreground',
                    'animate-fade-rise',
                  )
                "
              >
                <div class="font-medium">{{ link.label }}</div>
                <div v-if="link.description" class="text-xs text-muted-foreground">
                  {{ link.description }}
                </div>
              </a>
            </div>
          </NavigationMenuContent>
        </RekaNavigationMenuItem>
      </NavigationMenuList>

      <!-- Animated indicator bar (horizontal mode only). -->
      <NavigationMenuIndicator
        v-if="orientation === 'horizontal'"
        :class="
          cn(
            'top-full z-10 h-0.5 bg-primary',
            'data-[state=hidden]:animate-fade-fall data-[state=visible]:animate-fade-rise',
          )
        "
      />

      <NavigationMenuViewport
        :class="cn('data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out')"
        style="transform-origin: var(--reka-navigation-menu-viewport-transform-origin)"
      />
    </NavigationMenuRoot>
  </nav>
</template>
