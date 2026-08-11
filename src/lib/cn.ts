import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Loom's named type scale, as tailwind-merge knows it.
 *
 * `theme.css` declares the scale under Tailwind's `--text-*` namespace, which
 * makes `text-body` a font-size utility exactly like `text-sm`. tailwind-merge
 * cannot see that: it resolves conflicts from a static table of Tailwind's own
 * value names, and every unrecognised `text-<x>` falls through to the colour
 * group. So `text-micro` and `text-primary-foreground` looked like two colours,
 * the later one won, and the size was dropped on the floor.
 *
 * The failure is silent and it is not hypothetical — Indicator's count pill was
 * shipping without its 11px size, and it was found by reading a diff rather
 * than by anything failing. It also reached further than any one component:
 * `cn()` is the documented way a consumer overrides a class from outside, so
 * `<PageHeader class="text-small">` had its size swallowed by the component's
 * own `text-foreground` and there was nothing to notice.
 *
 * Registering the six names restores the property they actually set. Both
 * directions then merge correctly against Tailwind's built-ins, because they
 * are one group rather than two: `text-xs text-body` keeps `text-body`, and
 * `text-body text-xs` keeps `text-xs`.
 */
const TYPE_SCALE = [
  "text-display",
  "text-heading",
  "text-title",
  "text-body",
  "text-small",
  "text-micro",
];

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": TYPE_SCALE } },
});

/**
 * Merge conditional class names, resolving Tailwind conflicts so the last
 * utility in a group wins. Every component routes its `class` through this,
 * which is what lets a consumer override any utility from the outside without
 * reaching for `!important`.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
