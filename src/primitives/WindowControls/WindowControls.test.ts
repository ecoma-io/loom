import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import WindowControls from "./WindowControls.vue";

describe("WindowControls", () => {
  it("emits the window intent for each button instead of touching the platform — the host owns the bridge", async () => {
    const wrapper = mount(WindowControls);
    await wrapper.get('[data-testid="win-minimize"]').trigger("click");
    await wrapper.get('[data-testid="win-maximize"]').trigger("click");
    await wrapper.get('[data-testid="win-close"]').trigger("click");
    expect(wrapper.emitted("minimize")).toHaveLength(1);
    expect(wrapper.emitted("maximize")).toHaveLength(1);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("names each icon-only button so the cluster is operable by screen reader, not just by sight", () => {
    const wrapper = mount(WindowControls);
    expect(wrapper.get('[data-testid="win-minimize"]').attributes("aria-label")).toBe("Minimize");
    expect(wrapper.get('[data-testid="win-maximize"]').attributes("aria-label")).toBe("Maximize");
    expect(wrapper.get('[data-testid="win-close"]').attributes("aria-label")).toBe("Close");
    expect(wrapper.findAll("svg").every((s) => s.attributes("aria-hidden") === "true")).toBe(true);
  });

  it("relabels the middle button to Restore while maximized, and swaps its glyph — one button, two states", async () => {
    const wrapper = mount(WindowControls, { props: { isMaximized: false } });
    const restoreGlyph = () => wrapper.get('[data-testid="win-maximize"]').findAll("path");
    expect(restoreGlyph()).toHaveLength(0);

    await wrapper.setProps({ isMaximized: true });
    expect(wrapper.get('[data-testid="win-maximize"]').attributes("aria-label")).toBe("Restore");
    expect(restoreGlyph()).toHaveLength(1); // the overlapping-frames glyph
  });

  it("takes host-supplied labels so the chrome can be localised without forking the primitive", () => {
    const wrapper = mount(WindowControls, {
      props: {
        isMaximized: true,
        labels: {
          minimize: "Réduire",
          maximize: "Agrandir",
          restore: "Restaurer",
          close: "Fermer",
        },
      },
    });
    expect(wrapper.get('[data-testid="win-minimize"]').attributes("aria-label")).toBe("Réduire");
    expect(wrapper.get('[data-testid="win-maximize"]').attributes("aria-label")).toBe("Restaurer");
    expect(wrapper.get('[data-testid="win-close"]').attributes("aria-label")).toBe("Fermer");
  });

  it("marks every control type=button so a control cluster inside a form never submits it", () => {
    const wrapper = mount(WindowControls);
    expect(wrapper.findAll("button").map((b) => b.attributes("type"))).toEqual([
      "button",
      "button",
      "button",
    ]);
  });

  it("reserves the destructive paint for close alone — the one OS affordance allowed without a confirm", () => {
    const wrapper = mount(WindowControls);
    expect(wrapper.get('[data-testid="win-close"]').classes()).toContain("hover:bg-destructive");
    expect(wrapper.get('[data-testid="win-minimize"]').classes()).not.toContain(
      "hover:bg-destructive",
    );
    expect(wrapper.get('[data-testid="win-maximize"]').classes()).not.toContain(
      "hover:bg-destructive",
    );
  });
});
