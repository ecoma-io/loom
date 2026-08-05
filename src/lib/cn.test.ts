import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { cn } from "./cn";

// The input space cn() has to survive: every ClassValue clsx accepts — null,
// undefined, booleans, numbers, arbitrary strings (whitespace, unicode,
// Tailwind-adjacent garbage) and nested arrays. A component passes whatever a
// consumer handed it straight through, so "arbitrary" is the real case rather
// than the pathological one.
const classValue = fc.oneof(
  fc.constantFrom(null, undefined, false, true, 0),
  fc.string(),
  fc.array(fc.oneof(fc.string(), fc.constantFrom(null, undefined, false, true, 0))),
);

describe("cn class merging", () => {
  it("is total: arbitrary input never throws and always yields a string", () => {
    fc.assert(
      fc.property(fc.array(classValue), (inputs) => {
        expect(typeof cn(...inputs)).toBe("string");
      }),
    );
  });

  it("is idempotent: re-merging the merged result leaves it unchanged", () => {
    fc.assert(
      fc.property(fc.array(classValue), (inputs) => {
        const merged = cn(...inputs);
        expect(cn(merged)).toBe(merged);
      }),
    );
  });

  // Passthrough for tokens tailwind-merge does not recognise is load-bearing:
  // an arbitrary-property utility has no conflict group, and silently dropping
  // one would take a component's transition with it.
  it("keeps a lone space-free token untouched, whatever it looks like", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\S+$/), (token) => {
        expect(cn(token)).toBe(token);
      }),
    );
  });

  it("drops falsy inputs: an all-falsy call produces an empty string", () => {
    expect(cn()).toBe("");
    expect(cn(null, undefined, false, 0, "")).toBe("");
  });
});
