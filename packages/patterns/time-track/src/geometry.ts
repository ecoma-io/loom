/**
 * Pure time-window geometry — the math the TimeTrack/TimeRuler/TimeBar trio
 * is built from, kept dependency-free so the browserless tier can pin it
 * without mounting anything.
 *
 * All positions are percentages of the visible window. A bar straddling a
 * window edge is clamped into view — its left pinned to the edge, its width
 * measured over the visible portion only — so a partially visible span still
 * renders as a bar reaching the window's edge rather than a thin sliver the
 * consumer has to reason about. A fully contained bar's `left + width` is its
 * right edge, which reaches 100 only for a bar coincident with the window
 * itself.
 *
 * Degenerate windows are floored, never guarded away: an unordered
 * (`viewStart > viewEnd`) or zero-length window divides by a 1ms floor, which
 * keeps every value finite and one-signed — bars right of the pan measure
 * 0-width, the ruler renders no ticks, and `leftWithin` stays raw-signed so a
 * caller still sees the true position. Non-finite inputs join that same empty
 * path: every helper returns a finite degenerate value, never NaN, because a
 * NaN percent reaches CSS as `left: NaN%` and the browser drops it silently —
 * a bar that quietly stops being positioned.
 */

/** Clamp a value into `[min, max]`, normalizing a reversed pair. */
export function clamp(value: number, min: number, max: number): number {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.min(Math.max(value, lo), hi);
}

/**
 * The window length used for division, floored at 1ms. An unordered or
 * zero-length window would divide by zero — or by a negative span, which
 * mirrors every percent — so the floor keeps the division finite and
 * one-signed; a non-finite span joins the floor rather than poisoning every
 * result with NaN.
 */
function divisionSpan(viewStart: number, viewEnd: number): number {
  const span = viewEnd - viewStart;
  return Number.isFinite(span) ? Math.max(span, 1) : 1;
}

/**
 * The raw signed percent of `time`'s position inside the `[viewStart,
 * viewEnd]` window — deliberately unclamped, so a timestamp outside the
 * window is < 0 or > 100. TimeBar clamps its own copy before touching CSS; a
 * host composing its own geometry from the context gets the true position,
 * not the clamp.
 */
export function leftWithin(viewStart: number, viewEnd: number, time: number): number {
  // A non-finite edge or timestamp has no position; 0 is the degenerate
  // path's left — finite, so no caller can emit a NaN percent from here.
  if (!Number.isFinite(viewStart) || !Number.isFinite(viewEnd) || !Number.isFinite(time)) {
    return 0;
  }
  return ((time - viewStart) / divisionSpan(viewStart, viewEnd)) * 100;
}

/**
 * The percent width of a `[start, end]` span's visible portion inside the
 * window, clamped to `[0, 100]`.
 */
export function widthWithin(
  viewStart: number,
  viewEnd: number,
  start: number,
  end: number,
): number {
  // Only the visible portion counts: clamp both edges into the window and
  // measure what is left, so a bar straddling an edge reads as its on-screen
  // width and a bar fully outside the window measures 0.
  if (
    !Number.isFinite(viewStart) ||
    !Number.isFinite(viewEnd) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return 0;
  }
  const span = divisionSpan(viewStart, viewEnd);
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
  // raw lies in [power, 10·power) by construction, so one of 1/2/5 always
  // clears it; the 10× return is what remains when only the top of that
  // range does, not a fallback — no input reaches past the loop unreturned.
  for (const m of [1, 2, 5]) {
    if (raw <= m * power) return m * power;
  }
  return 10 * power;
}

/**
 * Tick timestamps across `[viewStart, viewEnd]`, aligned to `niceStep` so the
 * labels stay on round values as the window pans. The first tick is at or
 * before the window's start, so panning by less than a step does not retick.
 * `targetCount` is the label count aimed for, counting both window edges, so
 * the step targets `targetCount - 1` intervals.
 *
 * No zero-step guard: `niceStep` returns `m · 10^n` with `n >= 0`, so the
 * step is at least 1 and `t += step` always advances toward `viewEnd`. A
 * non-finite window edge returns `[]` instead — an infinite step would never
 * terminate the loop (`Infinity <= Infinity` holds), and a NaN one would
 * strand `t` outside it, which is the empty path either way.
 */
export function tickValues(viewStart: number, viewEnd: number, targetCount = 6): number[] {
  if (!Number.isFinite(viewStart) || !Number.isFinite(viewEnd)) return [];
  const step = niceStep(viewEnd - viewStart, targetCount - 1);
  const ticks: number[] = [];
  for (let t = Math.floor(viewStart / step) * step; t <= viewEnd; t += step) {
    ticks.push(t);
  }
  return ticks;
}

/** Trim a value to one decimal, dropping a trailing `.0` ("2" not "2.0"). */
function trim(value: number): string {
  return String(Math.round(value * 10) / 10);
}

/**
 * A compact human duration — "400ms", "1.5s", "12m", "2h" — adaptive to the
 * magnitude, so a ruler stays readable from millisecond to hour scales
 * without the consumer writing a formatter.
 */
export function formatDuration(ms: number): string {
  // A non-finite duration joins zero: NaN would reach the ruler's and the
  // group's aria-labels as "NaNs window" — an announcement no listener can
  // use, in the one string every reader of the track is handed.
  const value = Number.isFinite(ms) ? Math.max(ms, 0) : 0;
  if (value < 1000) return `${String(Math.round(value))}ms`;
  if (value < 60_000) return `${trim(value / 1000)}s`;
  if (value < 3_600_000) return `${trim(value / 60_000)}m`;
  return `${trim(value / 3_600_000)}h`;
}
