import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { FOCUSABLE_SELECTOR } from "@ecoma-io/loom-core/testing";
import Frame from "../src/Frame.vue";

function frameOf(props: Record<string, unknown> = {}) {
  return mount(Frame, { props, slots: { default: "<img src='test.jpg' alt='test' />" } }).get(
    "div",
  );
}

describe("Frame", () => {
  it("applies the named ratio as a CSS aspect-ratio value", () => {
    expect(frameOf({ ratio: "16:9" }).attributes("style") ?? "").toContain("16 / 9");
    expect(frameOf({ ratio: "4:3" }).attributes("style") ?? "").toContain("4 / 3");
    expect(frameOf({ ratio: "1:1" }).attributes("style") ?? "").toContain("1 / 1");
    expect(frameOf({ ratio: "3:4" }).attributes("style") ?? "").toContain("3 / 4");
  });

  it("passes through a raw CSS aspect-ratio value unchanged", () => {
    expect(frameOf({ ratio: "21 / 9" }).attributes("style") ?? "").toContain("21 / 9");
  });

  it("defaults to 16:9", () => {
    expect(frameOf().attributes("style") ?? "").toContain("16 / 9");
  });

  it("hides overflow so content cannot distort the frame", () => {
    expect(frameOf().classes()).toContain("overflow-hidden");
  });

  it("takes full width so the aspect ratio determines the height", () => {
    expect(frameOf().classes()).toContain("w-full");
  });

  it("renders keyboard-inert: nothing inside takes focus or a key, and the root carries no tabindex", () => {
    // The slotted media is the host's inert stand-in — the frame's own surface
    // is the ratio wrapper it renders around it.
    const wrapper = mount(Frame, { slots: { default: "<img src='test.jpg' alt='test' />" } });
    // The sidecar claims visual-only — keyboard-inert is that class's whole
    // matrix row, and this is the pin of absence the row exists to carry.
    expect(wrapper.find(FOCUSABLE_SELECTOR).exists()).toBe(false);
    expect(wrapper.attributes("tabindex")).toBeUndefined();
  });
});
