import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { Check } from "@lucide/vue";
import { applyLoomIconDefaults } from "./icon-defaults";

// A stock Lucide icon, rendered under a root that has installed Loom's
// defaults. Lucide is a third-party library rather than a project-internal
// collaborator, so it is exercised for real: stubbing it here would leave the
// test asserting that a function was called, which is not the behaviour that
// matters — what matters is the attribute that reaches the DOM.
const Host = defineComponent({
  setup() {
    applyLoomIconDefaults();
    return () => h(Check);
  },
});

const Bare = defineComponent({ setup: () => () => h(Check) });

describe("applyLoomIconDefaults", () => {
  it("renders icons at Loom's hairline weight rather than Lucide's own defaults", () => {
    const svg = mount(Host).get("svg");

    expect(svg.attributes("width")).toBe("16");
    expect(svg.attributes("height")).toBe("16");
    expect(svg.attributes("stroke-width")).toBe("1.5");
  });

  it("changes nothing for a tree that never installed it", () => {
    const svg = mount(Bare).get("svg");

    expect(svg.attributes("width")).toBe("24");
    expect(svg.attributes("stroke-width")).toBe("2");
  });

  it("leaves an icon free to diverge deliberately", () => {
    const Diverging = defineComponent({
      setup() {
        applyLoomIconDefaults();
        // The one standing divergence: at 12px and below, stroke 2.5 restores
        // the optical weight 1.5 loses as it scales down off the 24 grid.
        return () => h(Check, { size: 12, strokeWidth: 2.5 });
      },
    });
    const svg = mount(Diverging).get("svg");

    expect(svg.attributes("width")).toBe("12");
    expect(svg.attributes("stroke-width")).toBe("2.5");
  });
});
