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
