import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import Card from "../src/Card.vue";

enableAutoUnmount(afterEach);

function mountCard(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(Card, { props, slots });
}

describe("Card", () => {
  it("renders a plain composition when nothing interactive is asked of it — a div, no cursor, no press", () => {
    const wrapper = mountCard({ title: "T" }, { default: "<p>body</p>" });
    const root = wrapper.find("div");
    expect(root.exists()).toBe(true);
    // Surface's card styling, consumed as data: the box contract is shared.
    expect(root.classes()).toContain("bg-card");
    expect(root.classes()).toContain("rounded-lg");
    // And none of the interactive language.
    expect(root.classes()).not.toContain("cursor-pointer");
    expect(root.classes()).not.toContain("active:scale-press");
  });

  it("keeps its box in lockstep with Surface — same variant map, so radius, hairline and ground cannot drift apart", () => {
    const classes = mountCard({ title: "T" }).find("div").classes();
    // Both halves come from `surfaceVariants`; these three are the ones a
    // drift would show in first.
    expect(classes).toContain("border");
    expect(classes).toContain("border-border");
    expect(classes).toContain("text-card-foreground");
  });

  it("renders title and description with the section rhythm when only props are given", () => {
    const wrapper = mountCard(
      { title: "Usage", description: "Calls this month" },
      { default: "42" },
    );
    const paragraphs = wrapper.findAll("p");
    expect(paragraphs[0]!.text()).toBe("Usage");
    expect(paragraphs[1]!.text()).toBe("Calls this month");
    expect(wrapper.text()).toContain("42");
  });

  it("lets the header slot replace the title/description pair wholesale", () => {
    const wrapper = mountCard(
      { title: "Prop title that must not render" },
      { header: '<h3 data-testid="custom">Custom</h3>', default: "body" },
    );
    expect(wrapper.find('[data-testid="custom"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("Prop title that must not render");
  });

  it("recesses the footer under a hairline so it reads as chrome for the content above", () => {
    const footer = mountCard({ title: "T" }, { footer: "<button>Do</button>" })
      .findAll("div")
      .at(-1)!;
    expect(footer.classes()).toContain("border-t");
    expect(footer.classes()).toContain("bg-muted/40");
  });

  it("clips media to the card's corners instead of poking past the radius", () => {
    const wrapper = mountCard({ title: "T" }, { media: '<img src="x.png" alt="">', default: "b" });
    expect(wrapper.classes()).toContain("overflow-hidden");
  });

  it("becomes one real anchor with href — one tab stop carrying the content as its name", () => {
    const wrapper = mountCard({ title: "Open project", href: "/projects/1" }, { default: "b" });
    const anchor = wrapper.get("a");
    expect(anchor.attributes("href")).toBe("/projects/1");
    // The whole-card link languages: visible keyboard focus, press feedback.
    expect(anchor.classes()).toContain("focus-visible:outline-ring");
    expect(anchor.classes()).toContain("active:scale-press");
    expect(anchor.classes()).toContain("cursor-pointer");
  });

  it("applies the interactive language for host-owned clickables without inventing semantics for them", () => {
    const wrapper = mountCard({ title: "T", interactive: true }, { default: "b" });
    const root = wrapper.find("div");
    expect(root.classes()).toContain("cursor-pointer");
    expect(root.classes()).toContain("hover:bg-subtle/60");
    // Still a div: role/tabindex/handler are the host's to attach, exactly
    // as Surface.interactive documents.
    expect(root.element.tagName).toBe("DIV");
    expect(root.attributes("tabindex")).toBeUndefined();
  });

  it("never paints the interactive language on a resting card — hover is a promise about behaviour", () => {
    const classes = mountCard({ title: "T" }, { default: "b" }).find("div").classes();
    expect(classes).not.toContain("hover:bg-subtle/60");
    expect(classes).not.toContain("cursor-pointer");
  });
});
