// @vitest-environment node
//
// Node rather than the project-wide jsdom, because this module reads the page
// tree off disk and resolves it from `import.meta.url` — which under jsdom is
// not a `file:` URL, so `fileURLToPath` refuses it. A component needs a DOM; a
// directory scan needs a filesystem, and asking for the wrong one is how a
// perfectly correct module fails its own test.
//
// These assertions are deliberately structural rather than a list of expected
// links. `pagesIn` reads the real page tree, so pinning "the components group
// is exactly these twenty-seven names" would make every added page a failing
// test — a test that has to be edited whenever the thing it watches changes
// stops being a check and becomes a chore. What is pinned instead is the
// ordering contract itself, which holds no matter which pages exist.
import { describe, expect, it } from "vitest";

import { pagesIn } from "./sidebar";

/** True when every entry is at or after its predecessor in English collation. */
function isAlphabetical(texts: readonly string[]): boolean {
  return texts.every((text, i) => i === 0 || (texts[i - 1] ?? "").localeCompare(text, "en") <= 0);
}

describe("pagesIn", () => {
  it("orders a directory alphabetically when no reading order is given, because a reader arriving at a component list is looking a name up rather than reading it through", () => {
    const texts = pagesIn("components").map((page) => page.text);

    expect(texts.length).toBeGreaterThan(1);
    expect(isAlphabetical(texts)).toBe(true);
  });

  // The regression this file exists for. Two unranked pages both scored
  // `Infinity`, and `Infinity - Infinity` is `NaN`; a comparator returning
  // `NaN` reads as "equal", so the sort silently kept whatever order the
  // directory was read in. Nothing threw, and a filesystem listing looks
  // sorted right up until the one entry that is not.
  it("still falls back to alphabetical for pages absent from a reading order, rather than leaving them in directory order", () => {
    const pages = pagesIn("components", ["button"]);
    const [first, ...rest] = pages.map((page) => page.text);

    expect(first).toBe("Button");
    expect(rest.length).toBeGreaterThan(1);
    expect(isAlphabetical(rest)).toBe(true);
  });

  it("honours an explicit reading order for the directories where alphabetical is the wrong answer", () => {
    const order = ["motion", "colour", "shape"];
    const texts = pagesIn("foundations", order).map((page) => page.text);

    expect(texts.slice(0, order.length)).toEqual(["Motion", "Colour", "Shape"]);
  });

  it("names a page by its own first heading, so the navigation cannot disagree with the page it points at", () => {
    const colour = pagesIn("foundations").find((page) => page.link === "/foundations/colour");

    expect(colour).toBeDefined();
    expect(colour?.text).toBe("Colour");
  });

  it("keeps a slug that no reading order mentions, so adding a page is never a silent omission from the navigation", () => {
    const all = pagesIn("foundations");
    const partial = pagesIn("foundations", ["motion"]);

    expect(partial).toHaveLength(all.length);
  });
});
