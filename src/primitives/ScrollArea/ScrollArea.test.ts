import { mount, type VueWrapper } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ScrollArea from "./ScrollArea.vue";
import type { ScrollAreaOrientation } from "./ScrollArea.vue";

// Type-safe accessor for a mounted component's $attrs. Vue's wrapper
// types from findAllComponents carry `any`, which triggers unsafe-argument
// when passed to a function expecting a concrete type. Accepting `any`
// here is deliberate: we only read `$attrs`, which always exists on a vm.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function attrsOf(wrapper: VueWrapper<any, any>): Record<string, unknown> {
  return (wrapper.vm as { $attrs: Record<string, unknown> }).$attrs;
}

// jsdom has no ResizeObserver — Reka's ScrollArea primitives need one to
// measure the viewport and position the scrollbar thumb, so stub it before
// every test to avoid a ReferenceError.
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
});

function mountScrollArea(orientation: ScrollAreaOrientation = "vertical") {
  return mount(ScrollArea, {
    props: { orientation },
    slots: {
      default: '<div style="height: 500px">Tall content</div>',
    },
  });
}

describe("ScrollArea rendering", () => {
  it("renders a scroll area container", () => {
    const wrapper = mountScrollArea();
    // The root clips overflow and positions the viewport; the `relative` class
    // is ours, while Reka adds inline `position:relative` for the scrollbar
    // positioning context.
    expect((wrapper.element as HTMLElement).style.position).toBe("relative");
  });

  it("renders the viewport with slot content", () => {
    const wrapper = mountScrollArea();
    const viewport = wrapper.find("[data-reka-scroll-area-viewport]");
    expect(viewport.exists()).toBe(true);
    expect(viewport.text()).toContain("Tall content");
  });
});

describe("ScrollArea scrollbar visibility by orientation", () => {
  it("shows a vertical scrollbar when orientation is vertical", () => {
    const wrapper = mountScrollArea("vertical");
    const scrollbars = wrapper.findAllComponents({ name: "ScrollAreaScrollbar" });
    const vertical = scrollbars.find((s) => s.props("orientation") === "vertical");
    expect(vertical).toBeDefined();
  });

  it("shows a horizontal scrollbar when orientation is horizontal", () => {
    const wrapper = mountScrollArea("horizontal");
    const scrollbars = wrapper.findAllComponents({ name: "ScrollAreaScrollbar" });
    const horizontal = scrollbars.find((s) => s.props("orientation") === "horizontal");
    expect(horizontal).toBeDefined();
  });

  it("shows both scrollbars when orientation is both", () => {
    const wrapper = mountScrollArea("both");
    const scrollbars = wrapper.findAllComponents({ name: "ScrollAreaScrollbar" });
    expect(scrollbars).toHaveLength(2);
  });

  it("shows the corner element when orientation is both", () => {
    const wrapper = mountScrollArea("both");
    // The corner sits where the two scrollbars meet and is only present when
    // both axes have a scrollbar.
    expect(wrapper.findComponent({ name: "ScrollAreaCorner" }).exists()).toBe(true);
  });

  it("does not show a vertical scrollbar for horizontal orientation", () => {
    const wrapper = mountScrollArea("horizontal");
    const scrollbars = wrapper.findAllComponents({ name: "ScrollAreaScrollbar" });
    const vertical = scrollbars.find((s) => s.props("orientation") === "vertical");
    expect(vertical).toBeUndefined();
  });

  it("does not show a horizontal scrollbar for vertical orientation", () => {
    const wrapper = mountScrollArea("vertical");
    const scrollbars = wrapper.findAllComponents({ name: "ScrollAreaScrollbar" });
    const horizontal = scrollbars.find((s) => s.props("orientation") === "horizontal");
    expect(horizontal).toBeUndefined();
  });
});

describe("ScrollArea styling", () => {
  it("applies a custom scrollbar class", () => {
    const wrapper = mount(ScrollArea, {
      props: { orientation: "vertical", scrollbarClass: "custom-class" },
      slots: { default: '<div style="height: 500px">Tall content</div>' },
    });
    // Reka's ScrollAreaScrollbar uses inheritAttrs: false and forwards $attrs
    // to the inner element, so the class sits in $attrs rather than on the
    // component's root DOM node.
    const scrollbar = wrapper.findAllComponents({ name: "ScrollAreaScrollbar" })[0]!;
    expect((attrsOf(scrollbar) as { class?: string }).class).toContain("custom-class");
  });

  it("applies hover expansion class to the scrollbar", () => {
    const wrapper = mountScrollArea("vertical");
    const scrollbar = wrapper.findAllComponents({ name: "ScrollAreaScrollbar" })[0]!;
    expect((attrsOf(scrollbar) as { class?: string }).class).toContain("hover:w-3");
  });
});
