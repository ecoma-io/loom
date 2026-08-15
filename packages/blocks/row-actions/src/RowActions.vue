<script setup lang="ts">
/**
 * RowActions — the actions belonging to one row of a dense list, quiet at
 * rest and revealed on hover or keyboard focus.
 *
 * Why this is a component and not three utility classes copied per view: the
 * reveal carries an accessibility contract that is easy to get wrong in a way
 * nothing fails on.
 *
 * - **Revealed by `opacity`, never by `display`/`v-if`.** A row action hidden
 *   with `hidden` or unmounted until hover leaves the tab order, so a
 *   keyboard-only or screen-reader user simply cannot reach it — and no test
 *   notices, because the pointer path still works.
 * - **`group-focus-within`, not only `group-hover`.** Tabbing into the row
 *   must bring the actions up; otherwise focus lands on something invisible
 *   and the focus ring appears to come from nowhere.
 * - **The actions stay mounted and named.** Each child keeps its own
 *   `aria-label` — the reveal changes what is *seen*, never what exists.
 * - **`pointer-coarse` opts out of the reveal entirely.** A hover reveal has
 *   no trigger on a touch screen: there is no hover state to enter, and the
 *   `focus-within` fallback only fires after a tap has already landed on
 *   something invisible. So on a coarse pointer the actions are simply always
 *   visible — the reveal is a refinement for precise pointers, not a gate on
 *   reaching the actions at all.
 *
 * The reveal rides a 4px inward slide alongside the fade so it reads as the
 * actions arriving rather than a panel blinking on (motion carries cause and
 * effect); both are token-tier and `duration-fast`, and the global
 * reduced-motion rule flattens them together.
 *
 * Requires the row element to carry Tailwind's `group` class; the reveal is
 * scoped to that group so sibling rows stay quiet.
 */
</script>

<template>
  <div
    class="flex translate-x-1 items-center gap-1 opacity-0 transition duration-fast ease-out group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100 pointer-coarse:translate-x-0 pointer-coarse:opacity-100"
  >
    <slot />
  </div>
</template>
