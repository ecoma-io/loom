/**
 * The list-reveal stagger vocabulary — one source for every overlay that
 * reveals rows (DropdownMenu, Menubar, Select) and for the Motion
 * documentation page. Each revealed row is delayed one step after the
 * previous, capped so a long list does not tail off indefinitely.
 *
 * It lives here rather than in each template because it was written into
 * three of them independently once, which is how the three drifted.
 */
export const LIST_STAGGER_STEP_MS = 24;
export const LIST_STAGGER_CAP = 5;

/** The inline `animation-delay` for the i-th revealed row. */
export function listStaggerDelay(i: number): string {
  return `${String(Math.min(i, LIST_STAGGER_CAP) * LIST_STAGGER_STEP_MS)}ms`;
}

/**
 * The behaviour a scripted scroll should ask for, given the reader's motion
 * preference: `"smooth"` normally, `"auto"` under
 * `prefers-reduced-motion`.
 *
 * It has to exist because the stylesheet's kill-switch cannot reach this
 * path: an explicit `"smooth"` in a `scrollTo` dictionary *overrides* the
 * CSS `scroll-behavior` property — that is what the spec defines a
 * non-`"auto"` behaviour value to mean. Every component that scrolls by
 * script (ScrollReel, Carousel) asks this instead of deciding alone, which
 * is why it lives here and not in either of them.
 */
export function smoothScrollBehavior(): "auto" | "smooth" {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  } catch {
    // matchMedia may be unavailable; smooth is the behaviour being replaced.
    return "smooth";
  }
}
