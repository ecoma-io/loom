<script setup lang="ts">
/**
 * AppHeader — the web app's TOP BAR: the shell-level strip that stays on
 * screen above every surface, distinct from two components it is easy to
 * confuse with:
 *
 * - **`PageHeader`** — a surface's own pinned title band, sitting *inside*
 *   the content area this bar sits above.
 * - **`TitleBar`** — the desktop window's native chrome (drag region, window
 *   controls). This bar is browser content, not window furniture.
 *
 * Layout is three regions, so callers never hand-tune widths: brand (left) ·
 * optional search · a trailing cluster for a leading control, notifications, and
 * the user menu, pushed right by `ml-auto`. Every region is a named slot —
 * this block owns the strip's geometry and elevation, never its content or
 * behavior.
 *
 * The trailing cluster is pushed right by its own `ml-auto`, not by a spacer
 * element. A spacer works, but it is a second `flex-1` beside the search
 * field, so the two end up splitting the free space instead of the field
 * taking what is actually left; `ml-auto` costs no element and no width, and
 * keeps the cluster flush right even when no search is slotted at all.
 *
 * **Below `sm` the bar is two rows, and that is the point of this block's
 * responsive behavior.** A brand, a real search field, and a leading control +
 * notifications + account cluster do not fit across a 390px viewport: on
 * that width the search field is left about 60px and renders as a magnifier
 * glyph pressed against the org name — a control that is technically present
 * and practically unusable. So the search takes a full-width second row
 * (`basis-full` + `order-last`), the header height goes from fixed to
 * `min-h-14`, and from `sm` up it snaps back to the single `flex-nowrap` row.
 * Wrapping rather than hiding is deliberate: the host slotted a search
 * because its users need one, and a block does not get to decide they need
 * it less on a phone.
 *
 * The `order-last` is the one thing to keep in mind if this changes: it
 * moves the search visually below the cluster while leaving it before the
 * cluster in the DOM, so on a phone the tab order reaches search first. That
 * is the better of the two mismatches — search is the more-used control —
 * but it is a mismatch, so do not extend `order-*` to the other regions.
 *
 * **Pinned, and separated by a hairline — never a shadow.** It sits on
 * `bg-card` (the raised plane), one step above the content it sits over,
 * unlike `PageHeader` which shares the content's own `bg-background` plane.
 * Because content scrolls *under* it, the surface is translucent + blurred
 * so the motion beneath stays legible as depth — the opaque `bg-card` is
 * declared first and stays the fallback wherever `backdrop-filter` is
 * unsupported, so the bar is never a see-through smear.
 *
 * Widths step rather than hold one value: gutters open up from `sm` and
 * again on wide desktops (`3xl`, 1920px), where a 16px gutter beside a
 * 1920px canvas reads as an accident.
 *
 * Deliberately neutral: this is shell chrome shared by every user and every
 * action alike, so it never wears `--primary`/`--accent` — the bar stays
 * uncommitted until a specific action is happening on the surface below.
 */
defineProps<{
  /** Accessible name for the `<header>` landmark, for a page with more than one header-like region. */
  ariaLabel?: string;
}>();
</script>

<template>
  <!-- `data-loom-app-header` is the hook `global.css` uses to add the
       safe-area inset to the bar's top padding (the same vendor-rule pattern
       as `[data-loom-titlebar]`): a PWA under a notch or a title-bar overlay
       must not paint its first row into reserved space. -->
  <header
    data-loom-app-header=""
    :aria-label="ariaLabel"
    class="sticky top-0 z-30 flex min-h-14 flex-wrap items-center gap-x-2 gap-y-2 border-b border-border bg-card px-3 py-2 text-card-foreground backdrop-blur-md supports-[backdrop-filter]:bg-card/80 sm:h-14 sm:flex-nowrap sm:gap-x-3 sm:px-4 sm:py-0 lg:px-6 3xl:h-16 3xl:px-8"
  >
    <div v-if="$slots.brand" class="flex shrink-0 items-center gap-2">
      <!-- @slot The product mark and name, leftmost. -->
      <slot name="brand" />
    </div>

    <!-- Own full-width row below `sm` (see the doc header on `order-last`);
         from `sm` up it rejoins the row and takes a cap so it never stretches
         into a banner on a wide canvas. -->
    <div
      v-if="$slots.search"
      class="order-last min-w-0 basis-full sm:order-none sm:max-w-sm sm:flex-1 sm:basis-auto lg:max-w-md"
    >
      <!-- @slot The app's global search field. Exactly one control — a filter belongs to `PageHeader` or the content area, not here. -->
      <slot name="search" />
    </div>

    <div
      v-if="$slots.leading || $slots.notifications || $slots.userMenu"
      class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2"
    >
      <!-- @slot A leading control in the trailing cluster — workspace switcher, org selector, breadcrumb, etc. -->
      <slot name="leading" />
      <!-- @slot The notifications trigger, between the leading control and the account menu. -->
      <slot name="notifications" />
      <!-- @slot The account menu, trailing the cluster. -->
      <slot name="userMenu" />
    </div>
  </header>
</template>
