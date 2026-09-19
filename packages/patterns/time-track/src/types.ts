import type { ComputedRef, InjectionKey } from "vue";

/**
 * Shared time-track types. They live in a plain `.ts` module rather than an
 * SFC so the lint rule instance that parses `<script>` blocks (the core
 * `no-unused-vars`, which cannot read TypeScript type positions) never sees
 * their parameters — a function type declares its params inside a type
 * annotation, where "unused" is meaningless.
 */

/** What a TimeBar inside a track asks the window for. */
export interface TimeTrackContext {
  /** The visible window's start, in epoch milliseconds. */
  viewStart: number;
  /** The visible window's end, in epoch milliseconds. */
  viewEnd: number;
  /** Percent (0–100) of a timestamp's position inside the window. */
  left: (time: number) => number;
  /** Percent (0–100) width of a `[start, end]` span inside the window, clamped. */
  width: (start: number, end: number) => number;
}

/** Formats a duration in milliseconds into a human label. */
export type TimeFormatter = (ms: number) => string;

export const timeTrackContextKey: InjectionKey<ComputedRef<TimeTrackContext>> =
  Symbol("loom:time-track");
