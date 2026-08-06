import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EmptyState from "./EmptyState.vue";

// No primitive collaborators to mock: EmptyState takes an icon slot and an
// action slot rather than importing a glyph or a Button, so its own logic —
// what it hides from assistive tech, how it sizes the medallion, whether it
// reserves space for a slot nobody filled, and the stagger timing — is
// everything there is to isolate.
const SLOTS = {
  icon: "<svg data-testid='glyph' />",
  action: '<button type="button">Create workflow</button>',
};

describe("EmptyState", () => {
  it("hides the icon from assistive tech, since the title already carries the meaning", () => {
    const wrapper = mount(EmptyState, { props: { title: "No workflows yet" }, slots: SLOTS });
    const medallion = wrapper.get("[data-testid='glyph']").element.parentElement!;

    expect(medallion.getAttribute("aria-hidden")).toBe("true");
  });

  it("sizes the glyph at the emphasis step of the icon scale rather than blowing it up to fill the empty region", () => {
    const wrapper = mount(EmptyState, { props: { title: "No workflows yet" }, slots: SLOTS });
    const medallion = wrapper.get("[data-testid='glyph']").element.parentElement!;

    // 20px is the emphasis step for an empty-state icon. The hairline
    // medallion is what gives a 20px stroke something to sit against —
    // without it a lone glyph in a large blank region reads as a stray mark,
    // which is what invites oversizing it.
    expect(medallion.className).toContain("[&_svg]:h-5");
    expect(medallion.className).toContain("rounded-full");
    expect(medallion.className).toContain("border-border");
  });

  it("renders no icon or action region at all when the host slots neither, so the block never reserves empty space", () => {
    const wrapper = mount(EmptyState, { props: { title: "No workflows yet" } });

    expect(wrapper.find("svg").exists()).toBe(false);
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.text()).toBe("No workflows yet");
  });

  it("staggers the entrance so the parts arrive in reading order instead of appearing at once", () => {
    const wrapper = mount(EmptyState, {
      props: { title: "No workflows yet", description: "Create your first workflow." },
      slots: SLOTS,
    });

    // Icon → title → description → CTA, 60ms apart. This is content
    // appearing, not feedback for an action, so it budgets like a panel
    // rather than against the interaction-feedback ceiling.
    const delays = wrapper
      .findAll(".animate-fade-rise")
      .map((el) => (el.element as HTMLElement).style.animationDelay);
    expect(delays).toEqual(["", "60ms", "120ms", "180ms"]);
  });
});
