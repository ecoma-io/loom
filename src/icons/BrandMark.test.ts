import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import BrandMark from "./BrandMark";

// The contract a custom icon has to keep is that a consumer cannot tell it
// from a stock Lucide one: same props, same colour inheritance, same grid. A
// glyph that hardcodes a fill or drops off the 24 grid looks right in
// isolation and wrong in every row it is placed in.
describe("BrandMark", () => {
  it("renders on the same 24-unit grid every Lucide icon uses", () => {
    const svg = mount(BrandMark).get("svg");

    expect(svg.attributes("viewBox")).toBe("0 0 24 24");
  });

  it("takes the size and stroke props a stock icon takes", () => {
    const svg = mount(BrandMark, { props: { size: 32, strokeWidth: 1.5 } }).get("svg");

    expect(svg.attributes("width")).toBe("32");
    expect(svg.attributes("height")).toBe("32");
    expect(svg.attributes("stroke-width")).toBe("1.5");
  });

  it("inherits its colour rather than carrying one, so it takes the tone it lands in", () => {
    const svg = mount(BrandMark).get("svg");

    expect(svg.attributes("stroke")).toBe("currentColor");
    // The two eyes are the only filled shapes, and they are filled with the
    // inherited colour too — never a literal.
    for (const filled of svg.findAll("[fill]")) {
      expect(filled.attributes("fill")).toBe("currentColor");
    }
  });

  it("draws both halves of the face: the human eye, the agent eye, the bridge", () => {
    const svg = mount(BrandMark).get("svg");

    expect(svg.findAll("circle")).toHaveLength(1);
    expect(svg.findAll("path")).toHaveLength(1);
    // The frame plus the agent's rectangular eye.
    expect(svg.findAll("rect")).toHaveLength(2);
  });
});
