import type { LabelOf } from "./labels";

/**
 * The five counter keys shared by TextField and Textarea — the ones a host
 * worded for one can copy across unchanged to the other. The keys match by
 * name and by argument shape; the slots are separate in `LoomLabels` only
 * because `textField` also carries `reveal`.
 *
 * The four counting keys take the **numbers**, never a formatted string, for
 * the reason `./labels.ts` gives at length: `${count}/${max}` is a punctuation
 * choice made in one language, and "3 characters left" has one plural form in
 * Vietnamese, two in English and six in Arabic. A host handed the integers
 * reaches `Intl.PluralRules` for the category and `Intl.NumberFormat` for the
 * digits; a host handed "3/20" can do neither.
 *
 * There are three visible counter strings rather than one with a conditional
 * inside it, because the three say different things: a running total against
 * no limit, a total against a limit, and a limit already passed. The last is
 * the one that must not read as merely a redder version of the second — see
 * `countOverMax`.
 */
export interface CountLabels {
  /** The counter when the field has no maximum: a running total, nothing more. */
  readonly count: LabelOf<{ count: number }>;
  /** The counter when the field has a maximum and is within it. */
  readonly countOfMax: LabelOf<{ count: number; max: number }>;
  /**
   * The counter once the value is past the maximum.
   *
   * Loom's English adds words rather than only digits, and that is the
   * accessibility requirement rather than a flourish: over-limit is painted
   * `text-destructive`, and a state carried by colour alone fails WCAG 1.4.1.
   * An override that returns the same shape as `countOfMax` puts that failure
   * back.
   */
  readonly countOverMax: LabelOf<{ count: number; max: number; over: number }>;
  /**
   * Announced **once**, as the value crosses into the last stretch of its
   * allowance — not on every keystroke after it. The numbers are true at the
   * moment it is spoken; the visible counter is what carries them afterwards.
   */
  readonly approachingLimit: LabelOf<{ remaining: number; max: number }>;
  /** Announced once, as the value crosses the maximum. */
  readonly limitExceeded: LabelOf<{ over: number; max: number }>;
}

/**
 * Loom's English defaults for the counter vocabulary, co-located here so the
 * two components that share it tree-shake together and an importing host can
 * build a partial vocabulary against the real thing rather than a transcription.
 */
export const COUNT_LABELS: CountLabels = {
  count: ({ count }) => String(count),
  countOfMax: ({ count, max }) => `${String(count)}/${String(max)}`,
  countOverMax: ({ count, max }) => `${String(count)}/${String(max)} over limit`,
  approachingLimit: ({ remaining }) =>
    `${String(remaining)} ${remaining === 1 ? "character" : "characters"} left`,
  limitExceeded: ({ over, max }) =>
    `${String(over)} ${over === 1 ? "character" : "characters"} over the limit of ${String(max)}`,
};

/**
 * How close to the maximum the warning fires: the last quarter of a short
 * allowance, or the last ten characters of a long one, whichever is smaller.
 *
 * Ten is about a word, and a warning is only worth anything while there is
 * still room to act on it — a fixed tenth would give a 280-character field
 * twenty-eight characters of notice and a twenty-character field two, which is
 * either too early to mean anything or too late to be a warning.
 */
export function warningWindow(max: number): number {
  return Math.min(10, Math.ceil(max / 4));
}

/** Where the value sits against its maximum, and the only thing the announcement watches. */
export type CountBand = "under" | "near" | "over";
