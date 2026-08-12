import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { provideLoomLabels, type LoomLabelOverrides } from "../../lib/labels";
import Stepper, { type StepperStep } from "./Stepper.vue";

/** A host declaring an application-wide vocabulary above the spine. */
function hostWith(vocabulary: () => LoomLabelOverrides) {
  return defineComponent({
    setup(_props, { slots }) {
      provideLoomLabels(vocabulary);
      return () => h("div", slots.default?.());
    },
  });
}

// The focus assertions mount into the real document — `document.activeElement`
// is only meaningful for a node that is actually in it — so every wrapper has
// to come back out again.
enableAutoUnmount(afterEach);

const STEPS: StepperStep[] = [
  { title: "Cart", description: "Two items" },
  { title: "Shipping" },
  { title: "Payment" },
  { title: "Review" },
];

function mountStepper(props: Partial<InstanceType<typeof Stepper>["$props"]> = {}) {
  return mount(Stepper, {
    attachTo: document.body,
    props: { steps: STEPS, ...props },
    attrs: { "aria-label": "Checkout" },
  });
}

function triggers(wrapper: ReturnType<typeof mountStepper>) {
  return wrapper.findAll("button");
}

describe("Stepper ARIA contract", () => {
  it("names each trigger with its own step's title", () => {
    const wrapper = mountStepper({ modelValue: 1 });

    const names = triggers(wrapper).map((trigger) => {
      const labelId = trigger.attributes("aria-labelledby");
      return document.getElementById(labelId ?? "")?.textContent.trim();
    });

    expect(names).toEqual(["Cart", "Shipping", "Payment", "Review"]);
  });

  it("marks the current step with aria-current=step on the trigger, not on the wrapper a reader never reaches", () => {
    const wrapper = mountStepper({ modelValue: 2 });

    expect(triggers(wrapper).map((t) => t.attributes("aria-current"))).toEqual([
      undefined,
      "step",
      undefined,
      undefined,
    ]);
    // Reka's own `aria-current="true"` sits on the item wrapper — a div with no
    // role, which focus never lands on and a screen reader never announces.
    expect(wrapper.find("[aria-current]").element.tagName).toBe("BUTTON");
  });

  it("announces the position through a polite live region as the flow advances", async () => {
    const wrapper = mountStepper({ modelValue: 2 });
    const status = wrapper.get('[role="status"]');

    // Each trigger registers itself as it mounts, so the total the live region
    // reports is only complete once that first round of registrations has been
    // rendered back out.
    await nextTick();

    expect(status.attributes("aria-live")).toBe("polite");
    // Loom's, not Reka's: the CSS rule that hides Reka's keys off this marker.
    expect(status.attributes("data-loom-live")).toBeDefined();
    expect(status.text()).toContain("Step 2 of 4");

    await wrapper.setProps({ modelValue: 3 });
    expect(status.text()).toContain("Step 3 of 4");
  });

  it("points aria-describedby only at a description that is actually rendered", () => {
    const wrapper = mountStepper({ modelValue: 1 });
    const [withDescription, without] = triggers(wrapper);

    const id = withDescription!.attributes("aria-describedby");
    expect(document.getElementById(id!)?.textContent).toContain("Two items");
    expect(without!.attributes("aria-describedby")).toBeUndefined();
  });
});

describe("Stepper step states", () => {
  it("distinguishes the three states by shape and text, never by colour alone", () => {
    const wrapper = mountStepper({ modelValue: 3 });
    const [completed, , current, upcoming] = triggers(wrapper);

    // Completed: a check glyph in place of the number, plus a word joining the
    // trigger's accessible name, since nothing in ARIA says "done".
    expect(completed!.find("svg").exists()).toBe(true);
    expect(completed!.text()).not.toContain("1");
    expect(
      document.getElementById(completed!.attributes("aria-labelledby")!)?.textContent,
    ).toContain("(completed)");

    // Current: its number, and aria-current.
    expect(current!.find("svg").exists()).toBe(false);
    expect(current!.text()).toBe("3");
    expect(current!.attributes("aria-current")).toBe("step");

    // Upcoming: its number, and nothing else claimed.
    expect(upcoming!.text()).toBe("4");
    expect(upcoming!.attributes("aria-current")).toBeUndefined();
  });

  it("fills the connector behind every completed step and leaves the ones ahead empty", () => {
    const wrapper = mountStepper({ modelValue: 3 });
    // Three connectors for four steps; the last step ends the spine.
    const fills = wrapper.findAll('[role="none"] > span');
    expect(fills).toHaveLength(3);

    expect(fills.map((fill) => fill.classes().includes("scale-x-100"))).toEqual([
      true,
      true,
      false,
    ]);
  });
});

describe("Stepper roving focus", () => {
  it("keeps the whole spine a single Tab stop, parked on the current step", () => {
    const wrapper = mountStepper({ modelValue: 2 });

    expect(triggers(wrapper).map((t) => t.attributes("tabindex"))).toEqual(["-1", "0", "-1", "-1"]);
  });

  it("moves the single Tab stop to whichever step last held focus", async () => {
    const wrapper = mountStepper({ modelValue: 2 });

    await triggers(wrapper)[3]!.trigger("focus");
    expect(triggers(wrapper).map((t) => t.attributes("tabindex"))).toEqual(["-1", "-1", "-1", "0"]);
  });

  it("returns the Tab stop to the current step when a linear flow puts the remembered one out of reach", async () => {
    const wrapper = mountStepper({ modelValue: 3, linear: true });

    await triggers(wrapper)[3]!.trigger("focus");
    expect(triggers(wrapper).map((t) => t.attributes("tabindex"))).toEqual(["-1", "-1", "-1", "0"]);

    // Step 4 stops being focusable the moment the flow moves back to step 1.
    // Without the fallback the spine would have no tabbable trigger at all.
    await wrapper.setProps({ modelValue: 1 });
    expect(triggers(wrapper).map((t) => t.attributes("tabindex"))).toEqual(["0", "-1", "-1", "-1"]);
  });

  it("still leaves one trigger tabbable when the current step is itself disabled", () => {
    const steps: StepperStep[] = [
      { title: "Cart" },
      { title: "Shipping", disabled: true },
      { title: "Payment" },
    ];
    const wrapper = mountStepper({ steps, modelValue: 2 });

    expect(triggers(wrapper).map((t) => t.attributes("tabindex"))).toEqual(["0", "-1", "-1"]);
  });

  it("moves focus between steps with the arrow keys along the spine's own axis", async () => {
    const wrapper = mountStepper({ modelValue: 1 });
    const [first, second] = triggers(wrapper);

    first!.element.focus();
    await first!.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(second!.element);

    // A horizontal spine ignores the vertical axis, so a page scrolled with
    // the down arrow is not hijacked by the stepper it happens to contain.
    await second!.trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(second!.element);
  });

  it("does not select the step the arrow keys move onto, so browsing is not committing", async () => {
    const wrapper = mountStepper({ modelValue: 1 });
    const first = triggers(wrapper)[0];

    first!.element.focus();
    await first!.trigger("keydown", { key: "ArrowRight" });

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("selects the focused step on Enter", async () => {
    const wrapper = mountStepper({ modelValue: 1 });

    await triggers(wrapper)[2]!.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")).toEqual([[3]]);
  });
});

describe("Stepper selection", () => {
  it("emits the 1-based number of the step that was chosen", async () => {
    const wrapper = mountStepper({ modelValue: 1 });

    await triggers(wrapper)[2]!.trigger("mousedown", { button: 0 });
    expect(wrapper.emitted("update:modelValue")).toEqual([[3]]);
  });

  it("owns its own position when no modelValue is supplied, rather than sticking at step one", async () => {
    // The uncontrolled path: `optional()` omits an absent `modelValue`
    // entirely, which is what leaves Reka managing it. Coerced to a number it
    // would render a permanently controlled stepper the host never updates.
    const wrapper = mount(Stepper, {
      props: { steps: STEPS },
      attrs: { "aria-label": "Checkout" },
    });

    await wrapper.findAll("button")[2]!.trigger("mousedown", { button: 0 });

    expect(wrapper.findAll("button")[2]!.attributes("aria-current")).toBe("step");
    expect(wrapper.emitted("update:modelValue")).toEqual([[3]]);
  });

  it("refuses a step that is disabled, by pointer and by keyboard alike", async () => {
    const steps: StepperStep[] = [{ title: "Cart" }, { title: "Shipping", disabled: true }];
    const wrapper = mountStepper({ steps, modelValue: 1 });
    const blocked = triggers(wrapper)[1];

    await blocked!.trigger("mousedown", { button: 0 });
    await blocked!.trigger("keydown", { key: "Enter" });

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(blocked!.attributes("disabled")).toBeDefined();
  });

  // The defect this pins: `opacity-50` on the item faded the indicator, the
  // title and the description together, and the description is the one part
  // that cannot afford it — `--color-muted-foreground` is 5.76:1 on the card
  // and 2.11:1 once composited at half alpha, which the axe gate caught as a
  // WCAG 1.4.3 failure. Unavailability is a colour on the indicator now, and
  // the text either stays where it was or moves to another measured value.
  it("says a step is unavailable with colour rather than opacity, leaving its title and description readable", () => {
    const steps: StepperStep[] = [
      { title: "Cart", description: "Two items" },
      { title: "Approval", description: "Owner permission required", disabled: true },
    ];
    const wrapper = mountStepper({ steps, modelValue: 1 });

    expect(wrapper.html()).not.toContain("opacity-50");

    // The indicator carries the state: a grey-filled disc where an available
    // upcoming step has a white one.
    const [open, blocked] = triggers(wrapper);
    expect(blocked!.classes()).toEqual(
      expect.arrayContaining(["bg-muted", "border-border-strong"]),
    );
    expect(open!.classes()).not.toContain("bg-muted");

    type Trigger = ReturnType<typeof triggers>[number];
    const labelled = (trigger: Trigger | undefined) =>
      document.getElementById(trigger!.attributes("aria-labelledby") ?? "")!;
    const described = (trigger: Trigger | undefined) =>
      document.getElementById(trigger!.attributes("aria-describedby") ?? "")!;

    expect(labelled(open).className).toContain("text-foreground");
    expect(labelled(blocked).className).toContain("text-muted-foreground");
    expect(described(blocked).className).toContain("text-muted-foreground");
  });

  it("refuses a jump past the next step while linear, and allows the next one", async () => {
    const wrapper = mountStepper({ modelValue: 1, linear: true });

    await triggers(wrapper)[3]!.trigger("mousedown", { button: 0 });
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    await triggers(wrapper)[1]!.trigger("mousedown", { button: 0 });
    expect(wrapper.emitted("update:modelValue")).toEqual([[2]]);
  });

  it("allows a jump to any step when it is not linear, which is the default", async () => {
    const wrapper = mountStepper({ modelValue: 1 });

    await triggers(wrapper)[3]!.trigger("mousedown", { button: 0 });
    expect(wrapper.emitted("update:modelValue")).toEqual([[4]]);
  });
});

describe("Stepper orientation", () => {
  it("runs the spine down the page when vertical, and moves between steps with the vertical arrows", async () => {
    const wrapper = mountStepper({ modelValue: 1, orientation: "vertical" });
    const [first, second] = triggers(wrapper);

    expect(wrapper.get('[role="group"]').attributes("data-orientation")).toBe("vertical");

    first!.element.focus();
    await first!.trigger("keydown", { key: "ArrowRight" });
    expect(document.activeElement).toBe(first!.element);

    await first!.trigger("keydown", { key: "ArrowDown" });
    expect(document.activeElement).toBe(second!.element);
  });
});

describe("Stepper attribute routing", () => {
  it("merges a caller's class onto the group root instead of appending it", () => {
    const wrapper = mount(Stepper, {
      props: { steps: STEPS, modelValue: 1 },
      attrs: { "aria-label": "Checkout", class: "gap-8" },
    });
    const root = wrapper.get('[role="group"]');

    expect(root.classes()).toContain("gap-8");
    expect(root.classes()).toContain("flex");
  });

  it("lets a caller's aria-label name the flow, beating both Loom's default and Reka's", () => {
    const wrapper = mountStepper({ modelValue: 1 });

    expect(wrapper.get('[role="group"]').attributes("aria-label")).toBe("Checkout");
  });
});

describe("Stepper labels", () => {
  it("names the group itself rather than leaving Reka's lowercase 'progress' on it", () => {
    const wrapper = mount(Stepper, { props: { steps: STEPS, modelValue: 1 } });
    // The capital is the assertion. Reka writes `aria-label="progress"` into
    // its own vnode props, so a matching default would prove nothing about
    // whose string reached the DOM.
    expect(wrapper.get('[role="group"]').attributes("aria-label")).toBe("Progress");
  });

  it("renders one live region of its own and leaves Reka's for the stylesheet to take out", () => {
    const wrapper = mount(Stepper, { props: { steps: STEPS, modelValue: 2 } });
    const regions = wrapper.findAll('[role="status"]');

    // Two in the DOM, one in the accessibility tree. The rule in `global.css`
    // is what removes the other, and `e2e/stepper.e2e.ts` is what proves the
    // removal actually happened in a browser — jsdom applies no stylesheet.
    expect(regions).toHaveLength(2);
    expect(wrapper.findAll("[data-loom-live]")).toHaveLength(1);
    expect(wrapper.get("[data-loom-live]").text()).toBe("Step 2 of 4");
  });

  it("counts the steps off its own prop, so the first render already announces the total", () => {
    // Reka's own region reads a registry that fills in as each trigger mounts,
    // so it says "Step 2 of 0" on the render a screen reader arrives at.
    const wrapper = mount(Stepper, { props: { steps: STEPS, modelValue: 2 } });
    expect(wrapper.get("[data-loom-live]").text()).toBe("Step 2 of 4");
  });

  it("hands the position its numbers raw, so a host orders the sentence and shapes the digits", () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: STEPS,
        modelValue: 3,
        labels: {
          position: ({ step, stepCount }: { step: number; stepCount: number }) =>
            `${new Intl.NumberFormat("vi-VN").format(step)}/${String(stepCount)} bước`,
        },
      },
    });
    expect(wrapper.get("[data-loom-live]").text()).toBe("3/4 bước");
  });

  it("builds a finished step's whole name from its title, rather than appending a qualifier to it", () => {
    const wrapper = mount(Stepper, {
      props: {
        steps: STEPS,
        modelValue: 3,
        // A language that puts the qualifier first cannot reorder markup Loom
        // emits, which is why this receives the title instead of trailing it.
        labels: { completed: ({ title }: { title: string }) => `Xong: ${title}` },
      },
      attachTo: document.body,
    });

    const completed = wrapper.findAll("button")[0]!;
    const name = document.getElementById(completed.attributes("aria-labelledby")!)!;

    // The name computation in miniature: an `aria-hidden` subtree contributes
    // nothing to it, so what a screen reader reads is the one node left.
    const announced = [...name.children].filter((el) => el.getAttribute("aria-hidden") !== "true");
    expect(announced.map((el) => el.textContent.trim())).toEqual(["Xong: Cart"]);
    // The visible title is still rendered, and still the visible one.
    expect(name.querySelector("[aria-hidden='true']")?.textContent).toBe("Cart");
  });

  it("takes its names from a host's vocabulary, and lets one instance correct a single key", async () => {
    const wrapper = mount(
      hostWith(() => ({
        stepper: {
          group: "Tiến trình",
          position: ({ step, stepCount }: { step: number; stepCount: number }) =>
            `Bước ${String(step)}/${String(stepCount)}`,
        },
      })),
      {
        attachTo: document.body,
        slots: {
          default: () => [
            h(Stepper, { steps: STEPS, modelValue: 2 }),
            h(Stepper, { steps: STEPS, modelValue: 2, labels: { group: "Thanh toán" } }),
          ],
        },
      },
    );
    await nextTick();

    const groups = wrapper.findAll('[role="group"]');
    // Two flows on one page must be distinguishable, and an application-wide
    // vocabulary alone cannot make them so.
    expect(groups.map((g) => g.attributes("aria-label"))).toEqual(["Tiến trình", "Thanh toán"]);
    // The vocabulary still reaches the key neither instance touched.
    expect(wrapper.findAll("[data-loom-live]").map((r) => r.text())).toEqual([
      "Bước 2/4",
      "Bước 2/4",
    ]);
  });

  it("repaints its names when the host switches language under it", async () => {
    const locale = ref("en");
    const wrapper = mount(
      hostWith(() => (locale.value === "en" ? {} : { stepper: { group: "Tiến trình" } })),
      {
        attachTo: document.body,
        slots: { default: () => h(Stepper, { steps: STEPS, modelValue: 1 }) },
      },
    );
    expect(wrapper.get('[role="group"]').attributes("aria-label")).toBe("Progress");

    // The assertion that fails the moment a label is resolved once in `setup`
    // rather than inside the render effect: every other test here still passes
    // and every language switch silently stops working.
    locale.value = "vi";
    await nextTick();
    expect(wrapper.get('[role="group"]').attributes("aria-label")).toBe("Tiến trình");
  });
});
