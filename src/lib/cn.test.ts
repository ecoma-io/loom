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

  // Everything above holds for plain `clsx`, so none of it notices `twMerge`
  // going away — measured: replacing the body with `clsx(inputs)` left this
  // file green. Conflict resolution is the only reason the wrapper exists:
  // without it both utilities land, the cascade picks by stylesheet order
  // rather than by call order, and every consumer override silently stops
  // winning. That regression is visual-only and reaches every component.
  it("resolves a Tailwind conflict in favour of the last utility, which is what makes a consumer override win", () => {
    expect(cn("px-2", "px-8")).toBe("px-8");
    expect(cn("text-sm text-muted-foreground", "text-lg")).toBe("text-muted-foreground text-lg");
  });

  it("keeps utilities from different conflict groups side by side rather than collapsing them", () => {
    expect(cn("px-2", "py-8")).toBe("px-2 py-8");
  });

  it("lets a caller's class beat the component's own, in the order a component composes them", () => {
    expect(cn("rounded-md bg-primary", "bg-destructive")).toBe("rounded-md bg-destructive");
  });
});
