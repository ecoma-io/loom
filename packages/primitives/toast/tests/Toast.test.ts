import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import Toast from "../src/Toast.vue";

// Unit tier: the internal collaborator is isolated. The stub keeps only the
// seam this file's own behavior is defined against — that `Toast` bundles a
// single provider/viewport pair and forwards its props to the card. What the
// card itself renders from those props (description, accent, action, close,
// auto-dismiss, region structure) is `ToastItem`'s own behavior, pinned
// against a real `ToastItem` in `Toast.integration.test.ts`.
//
// The stub's props and emits are read from the real component at mock time, so
// a rename of ToastItem's `description` prop or `action` emit changes the
// shape the stub declares.
vi.mock("../src/ToastItem.vue", async () => {
  const actual = await vi.importActual("../src/ToastItem.vue");
  const c = (actual as { default: { emits?: string[]; props?: Record<string, unknown> } }).default;
  return {
    // `ToastItem` is where the toast vocabulary is declared, and `Toast` reads
    // the defaults off it to name the provider and the viewport. Stubbing only
    // the component and letting the real bag through keeps that seam honest:
    // a key renamed in `ToastLabels` fails here rather than resolving to a
    // stub's invention.
    ...(actual as object),
    default: {
      name: "ToastItem",
      props: c.props ? Object.keys(c.props) : [],
      emits: c.emits ?? [],
      template: "<div />",
    },
  };
});

describe("Toast", () => {
  it("bundles exactly one provider/viewport so a lone toast works standalone", () => {
    const wrapper = mount(Toast, { props: { title: "Saved" } });
    // ToastProvider/ToastViewport are real Reka UI, not mocked — only the
    // card (ToastItem) is stubbed above.
    expect(wrapper.findAll("ol")).toHaveLength(1);
    expect(wrapper.findComponent({ name: "ToastItem" }).exists()).toBe(true);
  });

  it("forwards its props through to the item unchanged", () => {
    const wrapper = mount(Toast, {
      props: {
        title: "Saved",
        description: "Draft written to disk.",
        variant: "accent",
        duration: 2000,
        closable: false,
        actionLabel: "Undo",
      },
    });
    expect(wrapper.findComponent({ name: "ToastItem" }).props()).toMatchObject({
      title: "Saved",
      description: "Draft written to disk.",
      variant: "accent",
      duration: 2000,
      closable: false,
      actionLabel: "Undo",
    });
  });

  // The forwarding case above passes `open` implicitly by not passing it, and
  // that is the whole point: an `open` of `false` reaching the card means "the
  // host says closed", and Reka renders nothing at all. `<Toast title="…" />`
  // — the simplest call there is — would show an empty page. The mocked item
  // declares `open` as a prop, so an absent value arrives here as `undefined`
  // and a coerced one would arrive as `false`; the two are distinguishable.
  it("hands the item no open value when the host supplied none, leaving the card to manage its own visibility", () => {
    const wrapper = mount(Toast, { props: { title: "Saved" } });
    expect(wrapper.findComponent({ name: "ToastItem" }).props("open")).toBeUndefined();
  });
});
