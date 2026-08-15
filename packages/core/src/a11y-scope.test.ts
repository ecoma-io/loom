import { describe, expect, it } from "vitest";
import { WCAG_TAGS } from "./a11y-scope";

// The scope is a commitment about what fails a build, so what it excludes is
// as load-bearing as what it includes. These assertions state the boundary in
// terms of the decision behind it, not by restating the array: a change that
// widens the gate to AAA, or narrows it below AA, has to argue with a named
// expectation rather than pass silently.
describe("the WCAG scope Loom holds itself to", () => {
  it("covers both conformance levels a component can be responsible for", () => {
    expect(WCAG_TAGS).toContain("wcag2a");
    expect(WCAG_TAGS).toContain("wcag2aa");
  });

  it("covers 2.1 as well as 2.0, so pointer and orientation rules are in scope", () => {
    expect(WCAG_TAGS).toContain("wcag21a");
    expect(WCAG_TAGS).toContain("wcag21aa");
  });

  it("stops at AA — a AAA-only finding is advice, not a build failure", () => {
    expect(WCAG_TAGS.some((tag) => tag.endsWith("aaa"))).toBe(false);
  });

  it("excludes axe's best-practice set, which judges the document rather than the component", () => {
    expect(WCAG_TAGS.every((tag) => tag.startsWith("wcag"))).toBe(true);
    expect(WCAG_TAGS).not.toContain("best-practice");
  });
});
