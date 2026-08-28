import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorSummary from "../src/ErrorSummary.vue";

// Every case here drives real focus, and jsdom only moves focus for a tree
// that is actually in the document — so every mount attaches, and the sweep
// afterwards takes the tree back off it.
afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const twoErrors = [
  { id: "email", fieldLabel: "Email", message: "Enter an email address" },
  { id: "postcode", message: "Enter a postcode" },
];

/** The watcher's settle sequence: appearance render, focus, the re-render that drops the role. */
async function appear() {
  await nextTick();
  await nextTick();
}

/** Holds the container's focus back, so the role=alert render stays observable. */
function holdFocus() {
  return vi.spyOn(HTMLElement.prototype, "focus").mockReturnValue(undefined);
}

describe("ErrorSummary", () => {
  it("renders nothing while there is nothing to say", () => {
    const wrapper = mount(ErrorSummary, { props: { errors: [] }, attachTo: document.body });
    expect(wrapper.find("div[tabindex='-1']").exists()).toBe(false);
    expect(wrapper.text()).toBe("");
  });

  it("announces its appearance: role=alert renders and focus moves to the container", async () => {
    // Holding focus back splits the appearance into its two observable
    // halves; a real focus retires the role before any single tick can
    // observe it, which is the component working as intended.
    const focusSpy = holdFocus();
    const wrapper = mount(ErrorSummary, { props: { errors: twoErrors }, attachTo: document.body });
    await nextTick();

    const box = wrapper.find("div[tabindex='-1']");
    expect(box.attributes("role")).toBe("alert");
    expect(focusSpy).toHaveBeenCalled();
  });

  it("retires the announcement when focus lands — afterwards it is a plain focusable region", async () => {
    const wrapper = mount(ErrorSummary, { props: { errors: twoErrors }, attachTo: document.body });
    await appear();

    const box = wrapper.find("div[tabindex='-1']");
    expect(box.attributes("role")).toBeUndefined();
    expect(box.attributes("tabindex")).toBe("-1");
  });

  it("orients with list semantics and a count-stated heading that names the container", async () => {
    const wrapper = mount(ErrorSummary, { props: { errors: twoErrors }, attachTo: document.body });
    await appear();

    const box = wrapper.find("div[tabindex='-1']");
    expect(box.find("h2").text()).toBe("There is a problem (2 errors)");

    const headingId = box.attributes("aria-labelledby");
    expect(headingId).toBe(box.find("h2").attributes("id"));

    const links = box.findAll("a");
    expect(box.findAll("li").length).toBe(2);
    expect(links[0]!.attributes("href")).toBe("#email");
    expect(links[0]!.text()).toBe("Email: Enter an email address");
    expect(links[1]!.text()).toBe("Enter a postcode");
  });

  it("states a singular count for one error", async () => {
    const wrapper = mount(ErrorSummary, {
      props: { errors: [{ id: "email", message: "Enter an email address" }] },
      attachTo: document.body,
    });
    await appear();
    expect(wrapper.find("h2").text()).toBe("There is a problem (1 error)");
  });

  it("refocuses on later changes while invalid — and never re-announces them", async () => {
    const wrapper = mount(ErrorSummary, { props: { errors: twoErrors }, attachTo: document.body });
    await appear();
    const box = wrapper.find("div[tabindex='-1']");
    expect(box.attributes("role")).toBeUndefined();

    await wrapper.setProps({
      errors: [{ id: "name", fieldLabel: "Name", message: "Enter your name" }],
    });
    await appear();

    expect(document.activeElement).toBe(box.element);
    expect(box.attributes("role")).toBeUndefined();
    expect(box.find("h2").text()).toBe("There is a problem (1 error)");
  });

  it("announces a return: invalid → empty → invalid is a new appearance, not a continuation", async () => {
    const wrapper = mount(ErrorSummary, { props: { errors: [] }, attachTo: document.body });

    const focusSpy = holdFocus();
    await wrapper.setProps({ errors: twoErrors });
    await appear();
    const box = wrapper.find("div[tabindex='-1']");
    expect(box.attributes("role")).toBe("alert");
    expect(focusSpy).toHaveBeenCalled();

    focusSpy.mockRestore();
    box.element.dispatchEvent(new Event("focus"));
    await nextTick();
    expect(box.attributes("role")).toBeUndefined();

    await wrapper.setProps({ errors: [] });
    await nextTick();
    expect(wrapper.find("div[tabindex='-1']").exists()).toBe(false);
  });

  it("moves focus to the field when an entry is activated", async () => {
    const Host = defineComponent({
      setup() {
        return () =>
          h("div", [
            h(ErrorSummary, { errors: [{ id: "email", message: "Enter an email address" }] }),
            h("input", { id: "email", tabindex: "-1" }),
          ]);
      },
    });
    const host = mount(Host, { attachTo: document.body });
    await appear();

    expect(document.activeElement).toBe(host.find("div[tabindex='-1']").element);
    await host.find("a").trigger("click");
    expect(document.activeElement).toBe(host.find("input").element);
  });

  it("routes its own copy through the labels seam — heading takes the count, description appears when worded", async () => {
    const wrapper = mount(ErrorSummary, {
      props: {
        errors: twoErrors,
        labels: {
          heading: ({ count }: { count: number }) => `${String(count)} problems to fix`,
          description: () => "Check the highlighted fields before continuing.",
        },
      },
      attachTo: document.body,
    });
    await appear();

    const box = wrapper.find("div[tabindex='-1']");
    expect(box.find("h2").text()).toBe("2 problems to fix");
    expect(box.text()).toContain("Check the highlighted fields before continuing.");
  });
});
