/**
 * The pure windowing geometry behind VirtualList: which row range a scroll
 * viewport must render. Imported by the component and read directly by the
 * unit tests — the scroll maths are the load-bearing fact here (a trace of
 * ten thousand rows is only cheap if the window is), and a pure function is
 * testable without stubbing a single DOM dimension.
 */

export interface VirtualWindow {
  /** First rendered row index, inclusive. */
  start: number;
  /** One past the last rendered row index, exclusive. */
  end: number;
}

/**
 * The rows whose top edge falls inside `[scrollTop, scrollTop + viewportHeight)`
 * plus `overscan` above and below — the overscan is what keeps a fast scroll
 * from painting empty space while the browser catches up.
 *
 * Degenerate inputs degrade to an empty window rather than a nonsense one:
 * no items, a non-finite, zero or negative item height, or a zero or
 * non-finite viewport (jsdom, a display:none parent) render nothing. A
 * viewport smaller than one row still renders exactly one row, and an
 * `overscan` at or above the item count simply covers the whole list. A
 * scroll position past the last row is clamped to it — the browser clamps
 * `scrollTop` itself, and jsdom does not. `overscan` is floored and clamped
 * non-negative; a non-finite `scrollTop` or `overscan` reads as 0.
 */
export function virtualWindow(
  scrollTop: number,
  viewportHeight: number,
  itemHeight: number,
  count: number,
  overscan: number,
): VirtualWindow {
  // The empty window is the honest answer to every unusable dimension: NaN
  // would otherwise flow into the indices below (`NaN <= 0` is false, so a
  // positivity-only guard misses it) and negative padding would invert the
  // window — `{start: 5, end: -4}` is almost the whole list after slice().
  if (
    count <= 0 ||
    itemHeight <= 0 ||
    !Number.isFinite(itemHeight) ||
    !Number.isFinite(viewportHeight) ||
    viewportHeight <= 0
  ) {
    return { start: 0, end: 0 };
  }
  // A browser never reports a non-finite scrollTop (jsdom starts at 0), but
  // NaN would poison first/start/end below — the top is the safe read.
  const top = Number.isFinite(scrollTop) ? Math.max(0, scrollTop) : 0;
  // Padding rounds down and never goes negative: a negative or fractional
  // overscan is a caller bug, not a licence to reorder rows.
  const pad = Number.isFinite(overscan) ? Math.max(0, Math.floor(overscan)) : 0;
  const first = Math.min(Math.max(0, Math.floor(top / itemHeight)), count - 1);
  const visible = Math.max(1, Math.ceil(viewportHeight / itemHeight));
  return {
    start: Math.max(0, first - pad),
    end: Math.min(count, first + visible + pad),
  };
}
