import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Chip, { type ChipVariant } from "./Chip.vue";

describe("Chip", () => {
  // The defect this component exists to avoid. A dismiss button rendered
  // inside the toggle button is invalid HTML: the parser reparents it, and
  // assistive technology then disagrees about which control focus is on and
  // what activating it means. The two controls are siblings, and this is the
  // test that says so.
  it("renders the toggle and the dismiss control as siblings, with neither nested inside the other", () => {
    const wrapper = mount(Chip, {
      props: { selected: false, removable: true },
      slots: { default: "Overdue" },
    });

    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(2);

    const [toggle, remove] = buttons.map((button) => button.element);
    expect(toggle?.querySelector("button")).toBeNull();
    expect(remove?.querySelector("button")).toBeNull();
    expect(toggle?.parentElement).toBe(remove?.parentElement);
    expect(toggle?.parentElement?.tagName).toBe("SPAN");
  });

  it("carries aria-pressed on the toggle so the on state is announced, not only painted", async () => {
    const wrapper = mount(Chip, { props: { selected: false }, slots: { default: "Overdue" } });
    expect(wrapper.get("button").attributes("aria-pressed")).toBe("false");

    await wrapper.setProps({ selected: true });
    expect(wrapper.get("button").attributes("aria-pressed")).toBe("true");
  });

  it("shows a check glyph alongside the deepened fill, so selection never rides on colour alone", async () => {
    const wrapper = mount(Chip, { props: { selected: true }, slots: { default: "Overdue" } });
    expect(wrapper.find("svg").exists()).toBe(true);
    expect(wrapper.attributes("data-selected")).toBe("true");

    await wrapper.setProps({ selected: false });
    expect(wrapper.attributes("data-selected")).toBeUndefined();
  });

  it("emits the flipped selection instead of updating itself — the chip stands for a query the host owns", async () => {
    const wrapper = mount(Chip, { props: { selected: false }, slots: { default: "Overdue" } });
    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("update:selected")).toEqual([[true]]);
    expect(wrapper.get("button").attributes("aria-pressed")).toBe("false"); // not self-updated
  });

  it("emits false when switching a selected chip off", async () => {
    const wrapper = mount(Chip, { props: { selected: true }, slots: { default: "Overdue" } });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("update:selected")).toEqual([[false]]);
  });

  // Vue casts an absent Boolean prop to `false` unless a default says
  // otherwise, and `false` here would mean "a toggle that is off": a
  // dismiss-only chip would grow a second Tab stop that announces itself as
  // pressable and does nothing when pressed.
  it("leaves the label inert when selected is unbound, rather than making every chip a toggle", () => {
    const wrapper = mount(Chip, { props: { removable: true }, slots: { default: "ana@ecoma.io" } });

    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.attributes("aria-label")).toBe("Remove");
    expect(wrapper.find("[aria-pressed]").exists()).toBe(false);
    expect(wrapper.text()).toContain("ana@ecoma.io");
  });

  it("emits remove from the dismiss control without also toggling the selection", async () => {
    const wrapper = mount(Chip, {
      props: { selected: true, removable: true },
      slots: { default: "Ana Duarte" },
    });
    await wrapper.get('[aria-label="Remove"]').trigger("click");

    expect(wrapper.emitted("remove")).toHaveLength(1);
    expect(wrapper.emitted("update:selected")).toBeUndefined();
  });

  it("names the dismiss control Remove by default and takes an override, so a list of them is not eight identical buttons", () => {
    const fallback = mount(Chip, { props: { removable: true }, slots: { default: "Ana" } });
    expect(fallback.get("button").attributes("aria-label")).toBe("Remove");

    const named = mount(Chip, {
      props: { removable: true, removeLabel: "Remove Ana Duarte" },
      slots: { default: "Ana" },
    });
    expect(named.get("button").attributes("aria-label")).toBe("Remove Ana Duarte");
  });

  it("renders both controls as native type=button, so a chip inside a form activates on Space and Enter without submitting it", () => {
    const wrapper = mount(Chip, {
      props: { selected: false, removable: true },
      slots: { default: "Overdue" },
    });

    for (const button of wrapper.findAll("button")) {
      const element = button.element;
      expect(element.tagName).toBe("BUTTON");
      expect(element.type).toBe("button");

      // Nothing in the component intercepts the platform's own activation
      // keys; if it ever did, the chip would stop being keyboard-operable.
      const space = new KeyboardEvent("keydown", { key: " ", code: "Space", cancelable: true });
      element.dispatchEvent(space);
      expect(space.defaultPrevented).toBe(false);
    }
  });

  it("disabled makes both controls inert rather than merely dimmed", async () => {
    const wrapper = mount(Chip, {
      props: { selected: false, removable: true, disabled: true },
      slots: { default: "Overdue" },
    });

    for (const button of wrapper.findAll("button")) {
      expect(button.element.disabled).toBe(true);
      await button.trigger("click");
    }

    expect(wrapper.emitted("update:selected")).toBeUndefined();
    expect(wrapper.emitted("remove")).toBeUndefined();
    expect(wrapper.attributes("data-disabled")).toBe("true");
  });

  // The defect this pins. `data-[disabled]:opacity-50` faded the pill and its
  // label as one, and the label is what cannot afford it: 5.01:1 became
  // 2.78:1 against the chip's own fill, which the axe gate caught as a WCAG
  // 1.4.3 failure. Halving the alpha more than halves the contrast, so the
  // state is painted in measured colours instead — a drained fill, a visible
  // hairline, and a label colour each control declares for itself rather than
  // inheriting from a pill that may still be carrying a selected wash.
  it("says a chip is unavailable with colour rather than opacity, leaving its label readable", () => {
    const wrapper = mount(Chip, {
      props: { removable: true, disabled: true },
      slots: { default: "Overdue" },
    });

    expect(wrapper.html()).not.toContain("opacity-50");
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["bg-muted", "border-border-strong"]));

    // On the label itself, never on the pill: a colour on the container is only
    // inherited here, and a selected chip's container outranks it.
    expect(wrapper.get(".truncate").classes()).toContain(
      "group-data-[disabled]:text-muted-foreground",
    );

    const available = mount(Chip, { props: { removable: true }, slots: { default: "Overdue" } });
    expect(available.classes()).not.toContain("bg-muted");
  });

  it("paints each variant in the same semantic token Badge uses, so a chip and a badge never disagree", () => {
    const tokens: readonly (readonly [ChipVariant, string])[] = [
      ["neutral", "bg-subtle"],
      ["primary", "bg-primary/12"],
      ["success", "bg-success/12"],
      ["warning", "bg-warning/12"],
      ["info", "bg-info/12"],
      ["destructive", "bg-destructive/12"],
      ["ai", "bg-agent-muted"],
    ];
    for (const [variant, token] of tokens) {
      const wrapper = mount(Chip, { props: { variant }, slots: { default: "token" } });
      expect(wrapper.classes()).toContain(token);
    }
  });

  it("takes its two heights from the shared control scale, so a row of chips lines up with the field above it", () => {
    expect(mount(Chip, { props: { size: "sm" }, slots: { default: "x" } }).classes()).toContain(
      "h-8",
    );
    expect(mount(Chip, { props: { size: "md" }, slots: { default: "x" } }).classes()).toContain(
      "h-9",
    );
    expect(mount(Chip, { slots: { default: "x" } }).classes()).toContain("h-9");
  });

  it("merges a caller's class through cn so an override wins outright instead of being concatenated", () => {
    const wrapper = mount(Chip, {
      props: { size: "md" },
      attrs: { class: "h-8", "data-testid": "filter-chip" },
      slots: { default: "Overdue" },
    });

    expect(wrapper.classes()).toContain("h-8");
    expect(wrapper.classes()).not.toContain("h-9");
    // Fallthrough attributes land on the container, which is the node a host
    // addresses; the controls inside are named by their own content.
    expect(wrapper.attributes("data-testid")).toBe("filter-chip");
  });
});
