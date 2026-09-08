import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RowActions from "../src/RowActions.vue";

/**
 * What this tier can and cannot prove, stated up front so nobody reads more
 * into a green run than it earns.
 *
 * RowActions has no script and no primitive collaborators to mock — its
 * entire contract is which utilities are on the wrapper, so those class
 * names ARE the mechanism, not an implementation detail standing in for one.
 * jsdom does not evaluate media queries or `:hover`, so a test here cannot
 * watch the reveal happen; that is exercised against a real browser. What
 * these tests hold is the shape the browser then acts on — and every one of
 * them guards a failure that is invisible on the pointer path, which is
 * exactly the class of bug this component exists to prevent.
 */
const ACTIONS = {
  default: `
    <button aria-label="View details">eye</button>
    <button aria-label="Delete">trash</button>
  `,
};

/** The single element RowActions renders; its class list is the whole contract. */
function wrapperClasses() {
  return mount(RowActions, { slots: ACTIONS }).get("div").classes();
}

describe("RowActions", () => {
  it("keeps every action mounted and named while at rest, so a keyboard or screen-reader user can still reach one", () => {
    const buttons = mount(RowActions, { slots: ACTIONS }).findAll("button");

    // The bug this pins: hiding the group with `v-if` or `hidden` until hover.
    // Both work perfectly for a mouse and drop the actions out of the tab order
    // entirely, so nothing red ever appears.
    expect(buttons).toHaveLength(2);
    expect(buttons.map((b) => b.attributes("aria-label"))).toEqual(["View details", "Delete"]);
  });

  it("hides by opacity alone — never by a utility that removes the group from layout", () => {
    const classes = wrapperClasses();

    expect(classes).toContain("opacity-0");
    expect(classes).not.toContain("hidden");
    expect(classes).not.toContain("invisible");
  });

  it("reveals on keyboard focus landing anywhere in the row, not on pointer hover alone", () => {
    const classes = wrapperClasses();

    expect(classes).toContain("group-hover:opacity-100");
    // Without the focus-within half, tabbing into the row puts focus on
    // something still at opacity 0 — the ring appears to come from nowhere.
    expect(classes).toContain("group-focus-within:opacity-100");
  });

  it("drops the reveal outright for a coarse pointer, which has no hover state to enter in the first place", () => {
    const classes = wrapperClasses();

    // On touch there is no hover, and focus-within only fires after a tap has
    // already had to land on something invisible. So the refinement is
    // skipped rather than left as the only way in.
    expect(classes).toContain("pointer-coarse:opacity-100");
    expect(classes).toContain("pointer-coarse:translate-x-0");
  });
});
