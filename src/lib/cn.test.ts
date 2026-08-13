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

// Loom's own type scale lives under Tailwind's `--text-*` namespace, so every
// name here is a font-size. tailwind-merge resolves from a table of Tailwind's
// built-in value names and read all six as colours instead, which meant a size
// and a colour in one call collapsed to the colour alone. These pin the
// registration in `cn.ts` — without it the first assertion in each pair drops
// its size, silently and library-wide.
describe("cn and Loom's named type scale", () => {
  it.each(["display", "heading", "title", "body", "small", "micro"])(
    "keeps text-%s alongside a text colour, which sets a different property entirely",
    (step) => {
      expect(cn(`text-${step}`, "text-muted-foreground")).toBe(
        `text-${step} text-muted-foreground`,
      );
    },
  );

  it("treats two steps of the scale as one conflict, so the later step wins", () => {
    expect(cn("text-display", "text-micro")).toBe("text-micro");
  });

  // One group with Tailwind's own sizes, not a parallel one: a component
  // styling with the named scale has to be overridable by a consumer reaching
  // for `text-xs`, and the reverse has to hold too or the registration would
  // only have moved the bug.
  it("merges against Tailwind's built-in sizes in both directions", () => {
    expect(cn("text-xs", "text-body")).toBe("text-body");
    expect(cn("text-body", "text-xs")).toBe("text-xs");
  });

  it("still merges two text colours, which the registration must not have broken", () => {
    expect(cn("text-primary", "text-destructive")).toBe("text-destructive");
  });
});

// The same defect, in the four other namespaces Loom names things under. Each
// of these returned *both* classes before the registration, which does not read
// as a bug — the element still gets a duration, an easing, an animation — but
// the one it gets is whichever Tailwind emitted last rather than the one the
// caller asked for. That makes a consumer override a coin toss, and it is why
// each new name in `theme.css` has to arrive with a line in `cn.ts`.
describe("cn and the rest of the named vocabulary", () => {
  it("resolves two named durations to the later one", () => {
    expect(cn("duration-fast", "duration-slow")).toBe("duration-slow");
  });

  // One group with Tailwind's numeric durations, so a consumer reaching past
  // the scale still wins, and a component using the scale still beats a stale
  // numeric value underneath it.
  it("merges a named duration against a numeric one in both directions", () => {
    expect(cn("duration-fast", "duration-200")).toBe("duration-200");
    expect(cn("duration-200", "duration-fast")).toBe("duration-fast");
  });

  it("resolves two named animations to the later one", () => {
    expect(cn("animate-fade", "animate-fade-rise")).toBe("animate-fade-rise");
  });

  // The entrance/exit pairs are the reason this matters now: an overlay binds
  // one of each under different `data-[state=…]` variants, and a merge that
  // kept both would leave a closing panel still playing its entrance.
  it("resolves an entrance against its answering exit", () => {
    expect(cn("animate-fade-rise", "animate-fade-fall")).toBe("animate-fade-fall");
    expect(cn("animate-scale-in", "animate-scale-out")).toBe("animate-scale-out");
  });

  it("merges Loom's spring against Tailwind's own easings in both directions", () => {
    expect(cn("ease-out", "ease-spring")).toBe("ease-spring");
    expect(cn("ease-spring", "ease-out")).toBe("ease-out");
  });
});
