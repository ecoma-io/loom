import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ErrorState from "../src/ErrorState.vue";

// No primitive collaborators to mock: ErrorState takes an icon slot and an
// action slot rather than importing a glyph or a Button, so its own logic —
// what it hides from assistive tech, whether it reserves space for a slot
// nobody filled, and the absence of stagger timing (errors demand attention
// immediately, not on a film schedule) — is everything there is to isolate.
const SLOTS = {
  icon: "<svg data-testid='glyph' />",
  action: '<button type="button">Try again</button>',
};

describe("ErrorState", () => {
  it("hides the icon from assistive tech, since the title already carries the meaning", () => {
    const wrapper = mount(ErrorState, { props: { title: "Failed to load data" }, slots: SLOTS });
    const medallion = wrapper.get("[data-testid='glyph']").element.parentElement!;

    expect(medallion.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the title", () => {
    const wrapper = mount(ErrorState, { props: { title: "Failed to load data" } });

    expect(wrapper.text()).toContain("Failed to load data");
  });

  it("renders the description when provided", () => {
    const wrapper = mount(ErrorState, {
      props: { title: "Failed to load data", description: "Check your connection and try again." },
    });

    expect(wrapper.text()).toContain("Check your connection and try again.");
  });

  it("omits the description element when no description is given", () => {
    const wrapper = mount(ErrorState, { props: { title: "Failed to load data" } });

    // The second <p> is the description; only the title <p> should exist.
    expect(wrapper.findAll("p")).toHaveLength(1);
  });

  it("renders the action slot", () => {
    const wrapper = mount(ErrorState, { props: { title: "Failed to load data" }, slots: SLOTS });

    expect(wrapper.find("button").text()).toBe("Try again");
  });

  it("renders no icon or action region at all when the host slots neither, so the block never reserves empty space", () => {
    const wrapper = mount(ErrorState, { props: { title: "Failed to load data" } });

    expect(wrapper.find("svg").exists()).toBe(false);
    expect(wrapper.find("button").exists()).toBe(false);
    expect(wrapper.text()).toBe("Failed to load data");
  });

  it("tints the medallion with destructive colours rather than the neutral ones EmptyState uses", () => {
    const wrapper = mount(ErrorState, { props: { title: "Failed to load data" }, slots: SLOTS });
    const medallion = wrapper.get("[data-testid='glyph']").element.parentElement!;

    expect(medallion.className).toContain("bg-destructive/10");
    expect(medallion.className).toContain("border-destructive/30");
    expect(medallion.className).toContain("text-destructive-text");
  });

  it("does not stagger the entrance — errors demand attention immediately", () => {
    const wrapper = mount(ErrorState, {
      props: { title: "Failed to load data", description: "Check your connection." },
      slots: SLOTS,
    });

    // No animate-fade-rise classes, no animation-delay — unlike EmptyState,
    // which staggers icon → title → description → action at 60ms intervals.
    expect(wrapper.findAll(".animate-fade-rise")).toHaveLength(0);
    expect(wrapper.findAll("[style*='animationDelay']")).toHaveLength(0);
  });
});
