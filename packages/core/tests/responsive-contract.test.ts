/**
 * Pin test for the behavioural viewport contract — the same doctrine as
 * a11y-contract.test.ts: the law's internal consistency is proven on every
 * run, not left to the gate that consumes it.
 *
 * What this pins is the LAW's shape (responsive-contract.ts), not any
 * component's claim — sidecars are the gate's object
 * (tools/check-responsive-evidence.ts and its own fixtures). If one of these
 * assertions reddens, a vocabulary edit has drifted out of the bands or a
 * band has moved under code that implements it, and every sidecar keyed to
 * the old word or pixel value would be judging against nothing.
 *
 * The content pins are deliberately snapshot-shaped: adding a behaviour word
 * or moving a band is LAW-MAKING, not refactoring. A behaviour word is what
 * every sidecar's claim is spelled in and what the gate's summary counts, so
 * renaming one silently empties every claim that used it. A vocabulary or
 * band edit must therefore land as a deliberate change that updates this pin,
 * the composition adapters and the sidecars in the same PR, with the reason
 * written where the law is edited.
 */
import { describe, it, expect } from "vitest";
import {
  RESPONSIVE_BEHAVIOURS,
  RESPONSIVE_EVIDENCE_TIERS,
  RESPONSIVE_VIEWPORT_BANDS,
} from "../src/responsive-contract";

describe("responsive contract", () => {
  it("the behaviour vocabulary is exactly these words, each naming a mechanism the sources show", () => {
    expect([...RESPONSIVE_BEHAVIOURS]).toEqual([
      "intrinsic-collapse",
      "bound",
      "band-scale",
      "wrap-threshold",
      "reflow-grid",
      "overflow-reel",
      "device-media",
    ]);
    // Closed means no duplicates: a repeated word would make one spelling of
    // a behaviour pass a check its other spelling fails.
    expect(new Set(RESPONSIVE_BEHAVIOURS).size).toBe(RESPONSIVE_BEHAVIOURS.length);
  });

  it("none is a contract value, not a behaviour", () => {
    // A component that declares no viewport behaviour must say so through
    // `contract: "none"` — if the word ever leaked into the vocabulary it
    // would read as a behaviour with evidence owed, which nothing can
    // witness for a component that genuinely has none.
    expect(
      RESPONSIVE_BEHAVIOURS.includes("none" as (typeof RESPONSIVE_BEHAVIOURS)[number]),
      "none must not be a behaviour word",
    ).toBe(false);
  });

  it("jsdom cannot witness a viewport behaviour, so browserless is no evidence tier", () => {
    // A tier with no viewport could never answer a claim, and the a11y
    // contract's browserless tier staying absent here is what forces the
    // harness spec set to exist at all.
    expect([...RESPONSIVE_EVIDENCE_TIERS]).toEqual(["harness", "sweep"]);
    expect(RESPONSIVE_EVIDENCE_TIERS.includes("browserless" as "harness")).toBe(false);
  });

  it("the canonical bands are exactly these five, ascending and unique", () => {
    // The law does not invent widths, and this literal is the pin that says
    // so: `sm` is Tailwind's own breakpoint (the gap/gutter steps and every
    // layout's sm: switch sit on it), `wide` is the theme's
    // --breakpoint-3xl (the last gutter step), and narrow/mid/ultrawide are
    // the conformance route's three sample widths. The composition adapters
    // import RESPONSIVE_VIEWPORT_BANDS rather than restating a number, so a
    // renumber that updates this pin must also update the code that acts on
    // it — and the gate reads this same record for its viewport rule, which
    // holds the evidence side to these five numbers.
    expect(RESPONSIVE_VIEWPORT_BANDS).toEqual({
      narrow: 360,
      sm: 640,
      mid: 800,
      wide: 1920,
      ultrawide: 2000,
    });
    const widths = Object.values(RESPONSIVE_VIEWPORT_BANDS);
    expect(new Set(widths).size, "two bands at one width are one band").toBe(widths.length);
    expect([...widths].sort((a, b) => a - b)).toEqual(widths);
  });
});
