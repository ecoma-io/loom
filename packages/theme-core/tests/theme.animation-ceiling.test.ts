// @vitest-environment node
//
// Node rather than jsdom: this test parses the theme file; no DOM is involved.
//
// The harness accessibility gate settles each demo with a flat 400ms wait
// before axe reads it (`playwright/harness/accessibility.e2e.ts` — the #287
// empty-state phantom), because an entrance caught mid-flight reads a text
// colour the settled page does not have. That margin is sound only while the
// theme's own tokens keep every settling animation inside it: every finite
// `--animate-*` token runs over a `var(--duration-*)` step whose longest is
// `--duration-normal`, the 200ms "feedback ceiling" theme.css names, so 400ms
// is 2× over what any entrance can cost. This pin parses those tokens, makes
// each duration a checked number, and holds every animation that finishes at
// or under 250ms — the point past which the margin's safety factor erodes
// below 1.6×. A token that needs longer must revisit the settle margin in the
// same change; this test is what makes that impossible to forget.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const THEME = readFileSync(join(import.meta.dirname, "..", "src", "theme.css"), "utf8");

/** The longest entrance the harness gate's 400ms settle margin stays honest over. */
const SETTLE_CEILING_MS = 250;
/** The margin itself, restated here so the ceiling's ratio to it is checkable. */
const HARNESS_SETTLE_MS = 400;

/**
 * The capture groups of one matched theme line. `noUncheckedIndexedAccess`
 * types an array's members as possibly absent even where the regex that
 * matched guarantees them, so the narrowing happens once, here — and a line
 * that somehow matched without captures fails the parse rather than feeding
 * an `undefined` into a token name.
 */
function groupsOf(match: RegExpExecArray): [string, string] {
  const name = match[1];
  const value = match[2];
  if (name === undefined || value === undefined) {
    throw new Error(`a theme line matched without its captures: ${match[0]}`);
  }
  return [name, value];
}

/** `--duration-<step>: <value>` — the named steps an animate token may run over. */
const durationTokens = new Map(
  [...THEME.matchAll(/^ {2}--duration-([a-z-]+):\s*([^;]+);/gm)].map((match) => {
    const [name, value] = groupsOf(match);
    return [name, value.trim()] as const;
  }),
);

/** `--animate-<name>: <keyframes> <duration> ...` — everything a demo can mount with. */
const animateTokens = [...THEME.matchAll(/^ {2}--animate-([a-z-]+):\s*([^;]+);/gm)].map((match) => {
  const [name, value] = groupsOf(match);
  return { token: `--animate-${name}`, value: value.trim() };
});

function toMs(raw: string): number {
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) throw new Error(`not a time: ${raw}`);
  return raw.endsWith("ms") ? value : value * 1000;
}

/**
 * The duration clause of one animation value — a `var(--duration-*)` step or a
 * literal time, as the indeterminate progress carries. Throwing rather than
 * asserting: an unresolvable reference must fail the parse itself, whatever
 * test happens to be walking the token.
 */
function durationOf(token: string, value: string): number {
  const stepRef = /var\(--duration-([a-z-]+)\)/.exec(value);
  if (stepRef) {
    const step = durationTokens.get(String(stepRef[1]));
    if (step === undefined) {
      throw new Error(`${token} names a --duration step the theme does not declare`);
    }
    return toMs(step);
  }
  const literal = /[\d.]+m?s/.exec(value);
  if (!literal) {
    throw new Error(`${token} carries neither a var(--duration-*) reference nor a literal time`);
  }
  return toMs(literal[0]);
}

describe("the theme's animation tokens against the harness settle margin", () => {
  it("expose durations this parser can actually see", () => {
    // Fail closed on the parser itself: a selector drift that stopped matching
    // would let the ceiling below pass vacuously while tokens grew unchecked.
    expect(animateTokens.length).toBeGreaterThanOrEqual(12);
    expect(durationTokens.size).toBeGreaterThanOrEqual(4);
  });

  it("settle every finishing animation within the ceiling the margin depends on", () => {
    const finite = animateTokens.filter(({ value }) => !value.includes("infinite"));
    expect(finite.length).toBeGreaterThan(0);
    for (const { token, value } of finite) {
      const ms = durationOf(token, value);
      expect(
        ms,
        `${token} settles in ${String(ms)}ms — past the ${String(SETTLE_CEILING_MS)}ms ceiling; revisit the harness gate's ${String(HARNESS_SETTLE_MS)}ms settle margin in the same change`,
      ).toBeLessThanOrEqual(SETTLE_CEILING_MS);
    }
  });

  it("leave exactly the by-design loops outside the settle margin", () => {
    // An `infinite` animation never settles, so the 400ms wait does not bound
    // it and never needed to — its whole loop is the steady state, which is
    // why the ceiling above reads only the finite tokens. Today's exempt set
    // is exactly the two loop indicators: `--animate-shimmer` (a skeleton's
    // highlight sweep) and `--animate-progress-indeterminate` (the
    // never-finished progress bar). Pinning the set by name keeps a finite
    // entrance from quietly becoming a loop, which would walk it past the
    // ceiling untested, and keeps a new loop a deliberate edit here rather
    // than a silent addition.
    expect(
      animateTokens
        .filter(({ value }) => value.includes("infinite"))
        .map(({ token }) => token)
        .sort(),
    ).toEqual(["--animate-progress-indeterminate", "--animate-shimmer"]);
  });
});
