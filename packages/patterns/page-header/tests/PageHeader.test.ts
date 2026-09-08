import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import PageHeader from "../src/PageHeader.vue";

// PageHeader imports no primitive of its own — the count, title and actions
// slot are plain markup — so there is no project-internal collaborator to
// mock here.
const ACTIONS = { actions: '<button type="button">Create workflow</button>' };

describe("PageHeader", () => {
  it("renders the count as tabular so a title beside a number that keeps changing never shifts", () => {
    const wrapper = mount(PageHeader, { props: { title: "Workflows", count: 12 } });
    const count = wrapper.get(".tabular");

    expect(count.text()).toBe("12");
    // `.tabular` is mono + tabular-nums. A proportional 8 is wider than a 1,
    // so a count ticking down as rows resolve would nudge the heading left
    // and right on every update.
    expect(count.classes()).toContain("shrink-0");
  });

  it("omits the count entirely when the host passes none, rather than falling back to a zero that reads as a broken fetch", () => {
    const wrapper = mount(PageHeader, { props: { title: "Workflows" } });
    expect(wrapper.find(".tabular").exists()).toBe(false);
  });

  it("right-aligns the actions from the cluster itself, so they stay right after wrapping to their own row", () => {
    const wrapper = mount(PageHeader, { props: { title: "Workflows" }, slots: ACTIONS });
    const cluster = wrapper.get("button").element.parentElement!;

    // The regression this guards: relying on the header's own distribution to
    // place the cluster. Once the actions wrap, they are alone on their line
    // and `justify-between` drops them flush LEFT under the title — which
    // looks deliberate enough that nobody questions it.
    expect(cluster.className).toContain("ml-auto");
    expect(wrapper.get("header").classes()).not.toContain("justify-between");
  });

  it("caps the description at a readable measure instead of tracking the viewport out to ultrawide", () => {
    const wrapper = mount(PageHeader, {
      props: {
        title: "Workflows",
        description: "Workflows you built — run, track and approve them.",
      },
    });
    const description = wrapper.get("p");

    expect(description.classes()).toContain("max-w-prose");
    // The title is deliberately uncapped: it truncates, so it can only ever
    // occupy one line no matter how wide the surface gets.
    expect(wrapper.get("h1").classes()).toContain("truncate");
  });
});
