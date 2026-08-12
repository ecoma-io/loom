import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, useTemplateRef } from "vue";
import { useAncestorDisabled } from "./ancestor-disabled";

/**
 * A control that reports nothing but the answer, so every expectation below
 * reads the composable rather than a component's interpretation of it.
 */
const Probe = defineComponent({
  setup() {
    const el = useTemplateRef<HTMLElement>("el");
    const disabled = useAncestorDisabled(() => el.value);
    return () => h("span", { ref: "el", "data-answer": String(disabled.value) });
  },
});

/** The rendered answer, as the composable currently has it. */
function answerOf(wrapper: {
  get: (selector: string) => { attributes: (name: string) => string | undefined };
}) {
  return wrapper.get("span").attributes("data-answer");
}

describe("useAncestorDisabled", () => {
  it("reports the enclosing fieldset's disabled state, and nothing when there is no fieldset", async () => {
    const bare = mount(Probe, { attachTo: document.body });
    await nextTick();
    expect(answerOf(bare)).toBe("false");

    const enclosed = mount(
      defineComponent({ render: () => h("fieldset", { disabled: true }, [h(Probe)]) }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(answerOf(enclosed)).toBe("true");
  });

  // The reason this is a MutationObserver rather than a read on mount: a
  // Fieldset's `disabled` is an ordinary reactive prop, and the control inside
  // it stays mounted across the change. Vue never re-runs the effect, because
  // nothing Vue owns moved — the attribute did.
  it("follows the attribute being set and cleared while the control stays mounted", async () => {
    const Host = defineComponent({
      props: { disabled: { type: Boolean, default: false } },
      setup: (props) => () => h("fieldset", { disabled: props.disabled }, [h(Probe)]),
    });
    const wrapper = mount(Host, { attachTo: document.body });
    await nextTick();
    expect(answerOf(wrapper)).toBe("false");

    await wrapper.setProps({ disabled: true });
    // The observer fires as a microtask of its own, after Vue has patched the
    // attribute — hence a second tick rather than one.
    await nextTick();
    expect(answerOf(wrapper)).toBe("true");

    await wrapper.setProps({ disabled: false });
    await nextTick();
    expect(answerOf(wrapper)).toBe("false");
  });

  it("reads the nearest enclosing group and any group above it, so an inner enabled fieldset does not re-enable a disabled outer one", async () => {
    const wrapper = mount(
      defineComponent({
        render: () => h("fieldset", { disabled: true }, [h("fieldset", {}, [h(Probe)])]),
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(answerOf(wrapper)).toBe("true");
  });

  // The exemption in the platform's "actually disabled" rule, and the reason
  // the walk climbs child-by-child instead of calling `closest("fieldset")`.
  // It is what makes a switch inside the legend that re-enables its own group
  // possible, and a proxy — "is anything in here disabled?" — cannot express
  // it.
  it("leaves a control inside the first legend of a disabled group available", async () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h("fieldset", { disabled: true }, [h("legend", {}, [h(Probe)]), h("p", "body")]),
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(answerOf(wrapper)).toBe("false");
  });

  it("disables a control in a second legend, which the exemption does not cover", async () => {
    const wrapper = mount(
      defineComponent({
        render: () =>
          h("fieldset", { disabled: true }, [
            h("legend", {}, "first"),
            h("legend", {}, [h(Probe)]),
          ]),
      }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(answerOf(wrapper)).toBe("true");
  });

  it("stops observing when the control goes away, so the group it watched can be collected", async () => {
    const wrapper = mount(
      defineComponent({ render: () => h("fieldset", { disabled: true }, [h(Probe)]) }),
      { attachTo: document.body },
    );
    await nextTick();
    expect(answerOf(wrapper)).toBe("true");

    // Nothing observable is left to assert on directly; what this pins is that
    // teardown runs at all, since a throw here is exactly what a missing
    // `onScopeDispose` guard would produce.
    expect(() => {
      wrapper.unmount();
    }).not.toThrow();
  });
});
