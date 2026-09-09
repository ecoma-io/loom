/**
 * The stagger vocabularies — one source for every sequence that reveals
 * element after element. The list family (DropdownMenu, Menubar, Select, the
 * Motion documentation page) steps quickly and caps, so a long list does not
 * tail off indefinitely; the empty-state family steps slower because it
 * stages three fixed regions — icon, title, description, action — rather than
 * an unbounded row set, and a cap would be dead weight over a sequence that
 * cannot grow.
 *
 * They live here rather than in each template because a stagger was written
 * into three of them independently once, which is how the three drifted —
 * and because the token gate holds every other duration to the theme's
 * vocabulary, so a duration family with one writer each would be exactly the
 * second home for a visual decision the law exists to prevent.
 */
export const LIST_STAGGER_STEP_MS = 24;
export const LIST_STAGGER_CAP = 5;
export const EMPTY_STATE_STAGGER_STEP_MS = 60;

/** The inline `animation-delay` for the i-th element of a `step`-staggered sequence. */
export function staggerDelay(i: number, step: number): string {
  return `${String(i * step)}ms`;
}

/** The inline `animation-delay` for the i-th revealed row. */
export function listStaggerDelay(i: number): string {
  return staggerDelay(Math.min(i, LIST_STAGGER_CAP), LIST_STAGGER_STEP_MS);
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
