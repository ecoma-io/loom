import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import SkipLink, { SKIP_LINK_LABELS } from "../src/SkipLink.vue";
import { provideLoomLabels } from "@ecoma-io/loom-labels";

describe("SkipLink", () => {
  it("renders an anchor to the default main-content destination", () => {
    const wrapper = mount(SkipLink);

    expect((wrapper.element as HTMLElement).tagName).toBe("A");
    expect(wrapper.attributes("href")).toBe("#main");
  });

  it("points at the destination the consumer names", () => {
    const wrapper = mount(SkipLink, { props: { href: "#content" } });

    expect(wrapper.attributes("href")).toBe("#content");
  });

  it("is visually hidden while unfocused — out of flow, one pixel, clipped", () => {
    const classes = mount(SkipLink).classes();

    expect(classes).toContain("absolute");
    expect(classes).toContain("h-px");
    expect(classes).toContain("overflow-hidden");
    expect(classes).toContain("[clip:rect(0,0,0,0)]");
  });

  it("reveals on :focus — any focus, never only :focus-visible", () => {
    const classes = mount(SkipLink).classes();

    // The reveal is keyed on the `focus:` variant: programmatic handoff and
    // assistive-technology focus are real focus, and a link hidden for them
    // is a trap.
    expect(classes).toContain("focus:fixed");
    expect(classes).toContain("focus:bg-primary");
    expect(classes).toContain("focus:shadow-halo");
    expect(classes).toContain("focus:outline-ring");
    expect(classes.join(" ")).not.toContain("focus-visible:");
  });

  it("speaks Loom's English by default", () => {
    expect(mount(SkipLink).text()).toBe("Skip to main content");
  });

  it("exports its English defaults as buildable vocabulary", () => {
    expect(SKIP_LINK_LABELS).toEqual({ label: "Skip to main content" });
  });

  it("renames the link through the labels prop", () => {
    const wrapper = mount(SkipLink, {
      props: { labels: { label: "Zum Hauptinhalt springen" } },
    });

    expect(wrapper.text()).toBe("Zum Hauptinhalt springen");
  });

  // Primitives sit above the labels package in the layer direction, so a
  // host localising every Loom component through one `provideLoomLabels`
  // bag reaches this link too. Pinning it here is what keeps the seam from
  // ever quietly growing a second shape.
  it("renames the link through the host vocabulary provided above it", () => {
    const Host = defineComponent({
      setup(_props, { slots }) {
        provideLoomLabels(() => ({ skipLink: { label: "Aller au contenu principal" } }));
        return () => h("div", slots.default?.());
      },
    });
    const wrapper = mount(Host, { slots: { default: () => h(SkipLink) } });

    expect(wrapper.get("a").text()).toBe("Aller au contenu principal");
  });

  it("merges an extra class onto the rendered element", () => {
    const wrapper = mount(SkipLink, { attrs: { class: "my-override" } });

    expect(wrapper.classes()).toContain("my-override");
    expect(wrapper.classes()).toContain("absolute");
  });
});
