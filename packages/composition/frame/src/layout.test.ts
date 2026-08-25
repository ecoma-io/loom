import { describe, expect, it } from "vitest";
import { FRAME_RATIOS, frameLayout } from "./layout";

// The mapping, the scale tables and the throw contract — see stack's
// layout.test.ts for how the tiers split. Frame's modeled surface is the
// ratio arithmetic; its overlay usage is CSS-only and stays that way.

const ctx = (viewportWidth: number, availableWidth = viewportWidth) => ({
  viewportWidth,
  availableWidth,
});

describe("frameLayout", () => {
  it("maps the four named ratios to width-over-height numbers", () => {
    expect(FRAME_RATIOS).toEqual({ "16:9": 16 / 9, "4:3": 4 / 3, "1:1": 1, "3:4": 3 / 4 });
    expect(frameLayout({ ratio: "16:9" }, ctx(800), []).style.aspectRatio).toBe(16 / 9);
    expect(frameLayout({ ratio: "3:4" }, ctx(800), []).style.aspectRatio).toBe(3 / 4);
  });

  it("defaults to 16:9 and drives the box from the offered width", () => {
    expect(frameLayout({}, ctx(800, 640), []).style).toEqual({
      axis: "column",
      width: 640,
      aspectRatio: 16 / 9,
    });
  });

  it('parses free-form "a / b" ratios the way Frame.vue passes CSS values through', () => {
    expect(frameLayout({ ratio: "21 / 9" }, ctx(800), []).style.aspectRatio).toBeCloseTo(
      21 / 9,
      10,
    );
    expect(frameLayout({ ratio: "1.618 / 1" }, ctx(800), []).style.aspectRatio).toBeCloseTo(
      1.618,
      10,
    );
  });

  it("throws on anything it cannot divide into a ratio", () => {
    for (const bad of ["golden", "16:9 4:3", "0 / 4", "4 / 0", ""]) {
      expect(() => frameLayout({ ratio: bad }, ctx(800), [])).toThrow(/is not modeled/);
    }
  });

  it("carries the fixture children as non-shrinking fixed boxes", () => {
    const tree = frameLayout({}, ctx(800), [{ w: 100, h: 50 }]);
    expect(tree.id).toBe("root");
    expect(tree.children).toEqual([
      { style: { axis: "row", width: 100, height: 50, flexShrink: 0 } },
    ]);
  });
});
