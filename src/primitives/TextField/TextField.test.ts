import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TextField from "./TextField.vue";

describe("TextField", () => {
  it("emits the raw string on input so v-model tracks each keystroke", async () => {
    const wrapper = mount(TextField, { props: { ariaLabel: "Name" } });
    const input = wrapper.get("input");
    await input.setValue("hello");
    expect(wrapper.emitted("update:modelValue")).toEqual([["hello"]]);
  });

  it("marks the input aria-invalid only while invalid, so screen readers announce the error state and not merely the styling", () => {
    const valid = mount(TextField, { props: { ariaLabel: "Email" } });
    expect(valid.get("input").attributes("aria-invalid")).toBeUndefined();

    const invalid = mount(TextField, { props: { ariaLabel: "Email", invalid: true } });
    expect(invalid.get("input").attributes("aria-invalid")).toBe("true");
  });

  it("disables the underlying input so the field is inert to typing, not merely dimmed", () => {
    const wrapper = mount(TextField, { props: { ariaLabel: "Name", disabled: true } });
    expect((wrapper.get("input").element as HTMLInputElement).disabled).toBe(true);
  });

  it("renders leading and trailing adornments inside the field frame", () => {
    const wrapper = mount(TextField, {
      props: { ariaLabel: "Search" },
      slots: { leading: "🔍", trailing: "⌫" },
    });
    expect(wrapper.text()).toContain("🔍");
    expect(wrapper.text()).toContain("⌫");
  });

  it("forwards aria-describedby onto the native input, completing the link to a Field-owned hint or error id", () => {
    // Field cannot reach into this component to set the attribute itself
    // (see Field.vue) — this is the other half of that contract: whatever
    // id a host passes through reaches the real input rather than the
    // wrapper div, which is where a screen reader looks for it.
    const wrapper = mount(TextField, {
      props: { ariaLabel: "Email" },
      attrs: { "aria-describedby": "email-description" },
    });
    expect(wrapper.get("input").attributes("aria-describedby")).toBe("email-description");
  });

  it("routes the fallthrough class onto the wrapper so a caller can size the whole field, not just the input", () => {
    const wrapper = mount(TextField, {
      props: { ariaLabel: "Name" },
      attrs: { class: "w-64" },
    });
    expect(wrapper.classes()).toContain("w-64");
    expect(wrapper.get("input").classes()).not.toContain("w-64");
  });
});
