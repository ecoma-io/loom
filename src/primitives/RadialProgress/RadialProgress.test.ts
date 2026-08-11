import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RadialProgress from "./RadialProgress.vue";

/** The ring's own geometry, recomputed here rather than copied off the component. */
function circumferenceOf(radius: number): number {
  return 2 * Math.PI * radius;
}

describe("RadialProgress", () => {
  describe("RadialProgress ARIA contract", () => {
    it("announces the value through the progressbar role rather than the SVG it paints", () => {
      const wrapper = mount(RadialProgress, {
        props: { modelValue: 40, max: 100, ariaLabel: "Storage used" },
      });
      const bar = wrapper.get('[role="progressbar"]');
      expect(bar.attributes("aria-valuenow")).toBe("40");
      expect(bar.attributes("aria-valuemin")).toBe("0");
      expect(bar.attributes("aria-valuemax")).toBe("100");
      // The drawing duplicates what the role already says; announced as well,
      // the same percentage is read out twice per ring.
      expect(wrapper.get("svg").attributes("aria-hidden")).toBe("true");
    });

    it("omits aria-valuenow while indeterminate — nothing to announce yet, not a false zero", () => {
      const wrapper = mount(RadialProgress, { props: { ariaLabel: "Syncing" } });
      expect(wrapper.get('[role="progressbar"]').attributes("aria-valuenow")).toBeUndefined();
    });

    it("carries the name a host supplies onto the ring itself, by value or by reference", () => {
      const named = mount(RadialProgress, { props: { modelValue: 40, ariaLabel: "Quota" } });
      expect(named.get('[role="progressbar"]').attributes("aria-label")).toBe("Quota");

      const referenced = mount(RadialProgress, {
        props: { modelValue: 40, ariaLabelledby: "quota-heading" },
      });
      const bar = referenced.get('[role="progressbar"]');
      expect(bar.attributes("aria-labelledby")).toBe("quota-heading");
      expect(bar.attributes("aria-label")).toBeUndefined();
    });

    // Progress clamps for this exact reason and the two have to agree: a ring
    // announcing "150" against an aria-valuemax of 100 contradicts its own
    // declared range while painting a full circle.
    it("clamps a modelValue above max in both the painted arc and the announced value", () => {
      const wrapper = mount(RadialProgress, {
        props: { modelValue: 150, max: 100, ariaLabel: "Quota" },
      });
      expect((wrapper.vm as unknown as { pct: number | null }).pct).toBe(100);
      expect(wrapper.get('[role="progressbar"]').attributes("aria-valuenow")).toBe("100");
      expect(Number(wrapper.get("circle + circle").attributes("stroke-dashoffset"))).toBe(0);
    });

    it("clamps a negative modelValue to zero in both the painted arc and the announced value", () => {
      const wrapper = mount(RadialProgress, {
        props: { modelValue: -20, max: 100, ariaLabel: "Quota" },
      });
      expect((wrapper.vm as unknown as { pct: number | null }).pct).toBe(0);
      expect(wrapper.get('[role="progressbar"]').attributes("aria-valuenow")).toBe("0");

      const arc = wrapper.get("circle + circle");
      const radius = Number(arc.attributes("r"));
      expect(Number(arc.attributes("stroke-dashoffset"))).toBeCloseTo(circumferenceOf(radius), 6);
    });
  });

  describe("RadialProgress geometry", () => {
    // The stroke is centred on the path, so a radius of 50 in a 100-unit box
    // paints half the stroke outside it and the browser clips the result — the
    // flat top that makes a radial progress look broken.
    it("insets the radius by half the stroke width, at every thickness", () => {
      const cases = [
        { thickness: "thin", strokeWidth: 6 },
        { thickness: "regular", strokeWidth: 10 },
        { thickness: "thick", strokeWidth: 14 },
      ] as const;

      for (const { thickness, strokeWidth } of cases) {
        const wrapper = mount(RadialProgress, {
          props: { modelValue: 50, thickness, ariaLabel: "Quota" },
        });
        const arc = wrapper.get("circle + circle");
        expect(Number(arc.attributes("stroke-width"))).toBe(strokeWidth);
        expect(Number(arc.attributes("r"))).toBe(50 - strokeWidth / 2);
        // Half the stroke sits outside the radius; the two together must not
        // cross the edge of the 100-unit box.
        expect(Number(arc.attributes("r")) + strokeWidth / 2).toBeLessThanOrEqual(50);
      }
    });

    // A circumference hard-coded for one radius mis-fills every other
    // thickness — the arc would simply stop short of, or overshoot, the value.
    it("derives the dash pattern from the rendered radius rather than a fixed circumference", () => {
      for (const thickness of ["thin", "regular", "thick"] as const) {
        const wrapper = mount(RadialProgress, {
          props: { modelValue: 100, thickness, ariaLabel: "Quota" },
        });
        const arc = wrapper.get("circle + circle");
        expect(Number(arc.attributes("stroke-dasharray"))).toBeCloseTo(
          circumferenceOf(Number(arc.attributes("r"))),
          6,
        );
      }
    });

    it("offsets the dash by the fraction still to do, so half done paints half a ring", () => {
      const wrapper = mount(RadialProgress, {
        props: { modelValue: 50, max: 100, ariaLabel: "Quota" },
      });
      const arc = wrapper.get("circle + circle");
      const circumference = circumferenceOf(Number(arc.attributes("r")));
      expect(Number(arc.attributes("stroke-dashoffset"))).toBeCloseTo(circumference / 2, 6);
    });

    it("reads the percentage off modelValue/max, not off modelValue alone", () => {
      const wrapper = mount(RadialProgress, {
        props: { modelValue: 1, max: 4, ariaLabel: "Steps" },
      });
      const arc = wrapper.get("circle + circle");
      const circumference = circumferenceOf(Number(arc.attributes("r")));
      expect(Number(arc.attributes("stroke-dashoffset"))).toBeCloseTo(circumference * 0.75, 6);
      expect(wrapper.text()).toBe("25%");
    });

    // An unrotated SVG circle starts at three o'clock. A gauge that fills from
    // there reads as a quarter turn ahead of itself at every value.
    it("starts the arc at twelve o'clock, in viewBox units so it survives any rendered size", () => {
      const wrapper = mount(RadialProgress, { props: { modelValue: 25, ariaLabel: "Quota" } });
      expect(wrapper.get("circle + circle").attributes("transform")).toBe("rotate(-90 50 50)");
    });

    // A round cap on a zero-length dash still paints a dot at twelve o'clock,
    // which reads as a couple of percent done rather than as nothing.
    it("squares the cap at exactly zero so an empty ring paints nothing at all", () => {
      const empty = mount(RadialProgress, { props: { modelValue: 0, ariaLabel: "Quota" } });
      expect(empty.get("circle + circle").attributes("stroke-linecap")).toBe("butt");

      const started = mount(RadialProgress, { props: { modelValue: 1, ariaLabel: "Quota" } });
      expect(started.get("circle + circle").attributes("stroke-linecap")).toBe("round");
    });
  });

  describe("RadialProgress states", () => {
    it("turns the arc success only at 100% — a finished ring reads done, an in-flight one stays warp", async () => {
      const wrapper = mount(RadialProgress, { props: { modelValue: 99, ariaLabel: "Quota" } });
      const arc = wrapper.get("circle + circle");
      expect(arc.classes()).toContain("stroke-primary");
      expect(arc.classes()).not.toContain("stroke-success");

      await wrapper.setProps({ modelValue: 100 });
      expect(arc.classes()).toContain("stroke-success");
    });

    // Driven by a CSS animation and never by a JS ticker: the global
    // prefers-reduced-motion rule collapses the first and cannot see the
    // second.
    it("spins a fixed segment while indeterminate rather than painting a percentage", () => {
      const wrapper = mount(RadialProgress, { props: { ariaLabel: "Syncing" } });
      expect(wrapper.get("svg").classes()).toContain("animate-spin");

      const arc = wrapper.get("circle + circle");
      const circumference = circumferenceOf(Number(arc.attributes("r")));
      const [segment] = (arc.attributes("stroke-dasharray") ?? "").split(" ");
      expect(Number(segment)).toBeCloseTo(circumference * 0.25, 6);
      expect(Number(arc.attributes("stroke-dashoffset"))).toBe(0);
    });

    it("holds the arc still once a percentage is known", () => {
      const wrapper = mount(RadialProgress, { props: { modelValue: 40, ariaLabel: "Quota" } });
      expect(wrapper.get("svg").classes()).not.toContain("animate-spin");
    });
  });

  describe("RadialProgress readout", () => {
    it("prints the rounded percentage in the centre by default — an empty ring is a spinner", () => {
      const wrapper = mount(RadialProgress, {
        props: { modelValue: 33.7, ariaLabel: "Quota" },
      });
      expect(wrapper.text()).toBe("34%");
    });

    it("drops the readout entirely when the host prints the number itself", () => {
      const wrapper = mount(RadialProgress, {
        props: { modelValue: 40, showValue: false, ariaLabel: "Quota" },
      });
      expect(wrapper.text()).toBe("");
    });

    // aria-valuenow already carries this number. Left visible to assistive
    // tech it is met a second time as loose text beside the ring.
    it("hides the readout from assistive tech, which already hears aria-valuenow", () => {
      const wrapper = mount(RadialProgress, { props: { modelValue: 40, ariaLabel: "Quota" } });
      expect(wrapper.get("span").attributes("aria-hidden")).toBe("true");
    });

    // "We don't know yet" and "none of it is done" are different facts, and
    // printing 0% for the first is the component lying about the only number
    // it exists to report. Progress answers this the same way.
    it("prints an em dash while indeterminate rather than a percentage it does not have", () => {
      const wrapper = mount(RadialProgress, { props: { showValue: true, ariaLabel: "Syncing" } });
      expect(wrapper.text()).toBe("—");
      expect(wrapper.text()).not.toContain("%");
    });

    it("scales the readout with the ring, so the number cannot outgrow the hole it sits in", () => {
      const classesFor = (size: "sm" | "md" | "lg") =>
        mount(RadialProgress, { props: { modelValue: 100, size, ariaLabel: "Quota" } })
          .get("span")
          .classes();
      expect(classesFor("sm")).toContain("text-micro");
      expect(classesFor("md")).toContain("text-sm");
      expect(classesFor("lg")).toContain("text-lg");
    });
  });

  describe("RadialProgress attribute routing", () => {
    it("sizes the ring per the size prop, defaulting to md", () => {
      expect(mount(RadialProgress, { props: { modelValue: 40 } }).classes()).toEqual(
        expect.arrayContaining(["h-16", "w-16"]),
      );
      expect(mount(RadialProgress, { props: { modelValue: 40, size: "sm" } }).classes()).toEqual(
        expect.arrayContaining(["h-10", "w-10"]),
      );
      expect(mount(RadialProgress, { props: { modelValue: 40, size: "lg" } }).classes()).toEqual(
        expect.arrayContaining(["h-24", "w-24"]),
      );
    });

    it("lets a caller's own size beat the variant instead of racing it in the stylesheet", () => {
      const wrapper = mount(RadialProgress, {
        props: { modelValue: 40, size: "sm", ariaLabel: "Quota" },
        attrs: { class: "h-20 w-20" },
      });
      expect(wrapper.classes()).toEqual(expect.arrayContaining(["h-20", "w-20"]));
      expect(wrapper.classes()).not.toContain("h-10");
    });

    it("lands every other fallthrough attribute on the progressbar itself", () => {
      const wrapper = mount(RadialProgress, {
        props: { modelValue: 40, ariaLabel: "Quota" },
        attrs: { "aria-describedby": "quota-hint", "data-testid": "ring" },
      });
      const bar = wrapper.get('[role="progressbar"]');
      expect(bar.attributes("aria-describedby")).toBe("quota-hint");
      expect(bar.attributes("data-testid")).toBe("ring");
    });
  });
});
