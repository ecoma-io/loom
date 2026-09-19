/**
 * Pure time-window geometry — the math the TimeTrack/TimeRuler/TimeBar trio
 * is built from, kept dependency-free so the browserless tier can pin it
 * without mounting anything.
 *
 * All positions are percentages of the visible window: a bar whose `[start,
 * end]` lies entirely inside the window gets `left + width = 100`; one that
 * straddles the edge is clamped into view, so a partially visible span still
 * renders as a bar reaching the window's edge rather than a thin sliver the
 * consumer has to reason about.
 */

/** Clamp a value into `[min, max]`, normalizing a reversed pair. */
export function clamp(value: number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.min(Math.max(value, lo), hi);
}

/** Percent (0–100) of `time`'s position inside the `[viewStart, viewEnd]` window. */
export function leftWithin(viewStart: number, viewEnd: number, time: number): number {
  const span = Math.max(viewEnd - viewStart, 1);
  return ((time - viewStart) / span) * 100;
}

/** Percent (0–100) of the `[start, end]` span's width inside the window, clamped. */
export function widthWithin(
  viewStart: number,
  viewEnd: number,
  start: number,
  end: number,
): number {
  // Only the visible portion counts: clamp both edges into the window and
  // measure what is left, so a bar straddling an edge reads as its on-screen
  // width and a bar fully outside the window measures 0.
  const span = Math.max(viewEnd - viewStart, 1);
  const visibleLeft = clamp(((start - viewStart) / span) * 100, 0, 100);
  const visibleRight = clamp(((end - viewStart) / span) * 100, 0, 100);
  return Math.max(visibleRight - visibleLeft, 0);
}
/**
 * The step that divides `span` into about `targetCount` intervals, rounded up
 * to a 1×10^n, 2×10^n or 5×10^n multiple — the "nice numbers" convention so
 * tick labels stay human (12, 20, 25, 50… rather than 13.47).
 */
export function niceStep(span: number, targetCount: number): number {
  const raw = span / Math.max(targetCount, 1);
  const power = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  for (const m of [1, 2, 5, 10]) {
    if (raw <= m * power) return m * power;
  }
  return 10 * power;
}

/**
 * Tick timestamps across `[viewStart, viewEnd]`, aligned to `niceStep` so the
 * labels stay on round values as the window pans. The first tick is at or
 * before the window's start, so panning by less than a step does not retick.
 */
export function tickValues(viewStart: number, viewEnd: number, targetCount = 6): number[] {
  const step = niceStep(viewEnd - viewStart, targetCount - 1);
  const ticks: number[] = [];
  for (let t = Math.floor(viewStart / step) * step; t <= viewEnd; t += step) {
    ticks.push(t);
    // A floating-point step can strand `t` just past `viewEnd` but still
    // within the last addition's error; the loop condition above handles the
    // common case, and this guards a pathological zero-width window.
    if (step <= 0) break;
  }
  return ticks;
}

/** Trim a value to one decimal, dropping a trailing `.0` ("2" not "2.0"). */
function trim(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

/**
 * A compact human duration — "400ms", "1.5s", "12m", "2h" — adaptive to the
 * magnitude, so a ruler stays readable from millisecond to hour scales
 * without the consumer writing a formatter.
 */
export function formatDuration(ms: number): string {
  const value = Math.max(ms, 0);
  if (value < 1000) return `${String(Math.round(value))}ms`;
  if (value < 60_000) return `${trim(value / 1000)}s`;
  if (value < 3_600_000) return `${trim(value / 60_000)}m`;
  return `${trim(value / 3_600_000)}h`;
}
