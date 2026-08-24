import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import ToastStack, { type ToastStackItem } from "../src/ToastStack.vue";

// Unit tier: the internal collaborator is isolated. The stub keeps only the
// seam this file's own behavior is defined against — how ToastStack maps a
// host queue onto items, since that mapping is the block's own logic
// (the `open` it always drives, the duration default, the id-correlated
// dismiss). What a card itself renders from those props is ToastItem's own
// behavior, and the shared-viewport composition is pinned against a real
// ToastItem in ToastStack.integration.test.ts — rendering the real item
// again here would test ToastItem a second time rather than ToastStack.
//
// The stub's props and emits are read from the real component at mock time, so
// a rename of ToastItem's `description` prop or `update:open` emit changes the
// shape the stub declares.
vi.mock("@ecoma-io/loom-toast", async () => {
  const actual = await vi.importActual("@ecoma-io/loom-toast");
  const c = (actual as { ToastItem: { emits?: string[]; props?: Record<string, unknown> } })
    .ToastItem;
  return {
    // The real module's other exports are kept and only the component is
    // stubbed: `TOAST_LABELS` lives in this module too, and `ToastStack` reads
    // it to name the shared provider and viewport. Stubbing the whole module
    // would take Loom's English away from the thing under test rather than
    // taking the child component away.
    ...(actual as object),
    ToastItem: {
      name: "ToastItem",
      props: c.props ? Object.keys(c.props) : [],
      emits: c.emits ?? [],
      template: "<div />",
    },
  };
});

// The mock above carries no TS-declared props/emits, and `ToastItem`'s own
// type does not resolve cleanly through this package's `.vue` imports from a
// plain `.ts` file two directories over (the same constraint documented in
// TitleBar.test.ts's `MockEmitter`). This names only the seam these tests
// drive: the three props ToastStack computes per item, and the one event a
// card can raise.
interface MockToastCard {
  props: (key: "title" | "open" | "duration" | "variant") => unknown;
  vm: { $emit: (event: "update:open", value: boolean) => void };
}

const items: ToastStackItem[] = [
  { id: 1, title: "Member added", description: "John", variant: "success" },
  { id: 2, title: "Workflow updated", variant: "info", duration: 9000 },
];

describe("ToastStack", () => {
  it("renders one item per queue entry, each keeping its own title rather than the entries bleeding into each other", () => {
    const wrapper = mount(ToastStack, { props: { items } });
    const cards = wrapper.findAllComponents({ name: "ToastItem" }) as unknown as MockToastCard[];
    expect(cards.map((card) => card.props("title"))).toEqual(["Member added", "Workflow updated"]);
  });

  it("drives open=true for every item unconditionally — visibility is deciding to include an entry in the queue, never a per-item open flag", () => {
    const wrapper = mount(ToastStack, { props: { items } });
    const cards = wrapper.findAllComponents({ name: "ToastItem" }) as unknown as MockToastCard[];
    // This is what keeps Vue's absent-Boolean-prop casting from ever reaching
    // ToastStack: `open` is always an explicit `true`, never left for a
    // per-item value to go missing.
    expect(cards.map((card) => card.props("open"))).toEqual([true, true]);
  });

  it("forwards each entry's variant through — severity reaches the card that decides announcement politeness", () => {
    const wrapper = mount(ToastStack, { props: { items } });
    const cards = wrapper.findAllComponents({ name: "ToastItem" }) as unknown as MockToastCard[];
    expect(cards.map((card) => card.props("variant"))).toEqual(["success", "info"]);
  });

  it("defaults an entry's duration to 4000ms — a stack turns over faster than a lone toast — while passing an explicit value through unchanged", () => {
    const wrapper = mount(ToastStack, { props: { items } });
    const cards = wrapper.findAllComponents({ name: "ToastItem" }) as unknown as MockToastCard[];
    expect(cards[0]?.props("duration")).toBe(4000);
    expect(cards[1]?.props("duration")).toBe(9000);
  });

  it("funnels a card's own close through dismiss with that entry's id, and never fires dismiss when a card reports itself open", async () => {
    const wrapper = mount(ToastStack, { props: { items } });
    const cards = wrapper.findAllComponents({ name: "ToastItem" }) as unknown as MockToastCard[];

    // `$emit` returns void, so it cannot be awaited to flush the render it
    // causes — the tick is awaited separately.
    cards[1]?.vm.$emit("update:open", false);
    await nextTick();
    expect(wrapper.emitted("dismiss")).toEqual([[2]]);

    // Reka can re-report `open: true` (e.g. on mount); that must never read
    // as a close for an entry the host never asked to remove.
    cards[0]?.vm.$emit("update:open", true);
    await nextTick();
    expect(wrapper.emitted("dismiss")).toEqual([[2]]);
  });
});
