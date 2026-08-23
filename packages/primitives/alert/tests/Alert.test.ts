import { enableAutoUnmount, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import Alert, { ALERT_LABELS } from "../src/Alert.vue";

enableAutoUnmount(afterEach);

function mountAlert(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(Alert, { props, slots });
}

describe("Alert", () => {
  it("announces itself as an alert, so an inserted message reaches assistive technology without focus", () => {
    const wrapper = mountAlert({ title: "Saved" });
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  // `<Transition>` swallows fallthrough attributes; this pin is what stops a
  // refactor from quietly reintroducing that — a caller's spacing class would
  // vanish with no error anywhere.
  it("lands the caller's class and listeners on the alert element itself, not on the transition wrapper", () => {
    const wrapper = mount(Alert, {
      props: { title: "T" },
      attrs: { class: "mb-4", id: "quota-note" },
    });
    const alert = wrapper.get('[role="alert"]');
    expect(alert.classes()).toContain("mb-4");
    expect(alert.attributes("id")).toBe("quota-note");
  });

  it("paints each tone in the same measured wash Badge uses, so one hue means one thing across components", () => {
    const washes: readonly [string, string][] = [
      ["info", "bg-info-muted"],
      ["success", "bg-success-muted"],
      ["warning", "bg-warning-muted"],
      ["destructive", "bg-destructive-muted"],
    ];
    for (const [variant, token] of washes) {
      const root = mountAlert({ variant, title: "T" }).get('[role="alert"]');
      expect(root.classes()).toContain(token);
    }
  });

  it("labels its text with the *-text rung — never a bare functional hue — because the muted washes hold contrast against that rung in both themes", () => {
    const classes = mountAlert({ variant: "warning", title: "Careful" })
      .get('[role="alert"]')
      .classes();
    expect(classes).toContain("text-warning-text");
    expect(classes).not.toContain("text-warning");
  });

  it("falls back to the neutral wash when no variant is given, so an unclassified note never borrows a status colour", () => {
    const classes = mountAlert({ title: "Note" }).get('[role="alert"]').classes();
    expect(classes).toContain("bg-subtle");
    expect(classes).not.toContain("bg-success-muted");
  });

  it("shows a default icon per tone and none for neutral, and marks every icon decorative so the words stay the only announcement", () => {
    const info = mountAlert({ variant: "info", title: "T" });
    expect(info.find("svg").exists()).toBe(true);
    expect(info.find("svg").attributes("aria-hidden")).toBe("true");

    const neutral = mountAlert({ title: "T" });
    expect(neutral.find('[role="alert"] svg').exists()).toBe(false);
  });

  it("lets the icon slot replace the tone default", () => {
    const wrapper = mountAlert(
      { variant: "success", title: "T" },
      { icon: '<span data-testid="custom">★</span>' },
    );
    expect(wrapper.find('[data-testid="custom"]').exists()).toBe(true);
    expect(wrapper.find('[role="alert"] svg').exists()).toBe(false);
  });

  it("renders no dismiss control by default and one named through the labels seam when dismissible", () => {
    const plain = mountAlert({ title: "T" });
    expect(plain.find("button").exists()).toBe(false);

    const dismissible = mountAlert({ title: "T", dismissible: true });
    const button = dismissible.get("button");
    expect(button.attributes("aria-label")).toBe(ALERT_LABELS.dismiss);
  });

  it("dismisses when uncontrolled — removing itself after the leave transition", async () => {
    const wrapper = mountAlert({ title: "T", dismissible: true });
    await wrapper.get("button").trigger("click");
    // jsdom computes zero animation duration, so Vue ends the leave phase
    // immediately; the assertion is the removal itself.
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("stays mounted under a controlling host and only reports the dismissal via update:open", async () => {
    const wrapper = mountAlert({ title: "T", dismissible: true, open: true });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("update:open")).toEqual([[false]]);
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });

  it("keeps long content inside itself — the body column is the flexible one, the icon and close control are not", () => {
    const wrapper = mountAlert(
      {
        title:
          "A very long title that must wrap rather than push the layout wider than its container",
        description:
          "An equally long description line, because alerts about real failures rarely arrive in tidy short sentences.",
      },
      { default: "<ul><li>one</li><li>two</li></ul>" },
    );
    const root = wrapper.get('[role="alert"]');
    expect(root.classes()).toContain("items-start");
    const body = root.findAll("div")[0]!;
    expect(body.classes()).toContain("min-w-0");
    expect(body.classes()).toContain("flex-1");
    expect(body.classes()).toContain("break-words");
    expect(body.find("ul").exists()).toBe(true);
  });
});
