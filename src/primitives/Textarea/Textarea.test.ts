import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Textarea from "./Textarea.vue";

describe("Textarea", () => {
  it("emits the raw string on input so v-model tracks each keystroke", async () => {
    const wrapper = mount(Textarea, { props: { ariaLabel: "Description" } });
    const textarea = wrapper.get("textarea");
    await textarea.setValue("hello\nworld");
    expect(wrapper.emitted("update:modelValue")).toEqual([["hello\nworld"]]);
  });

  it("marks the textarea aria-invalid only while invalid, so screen readers announce the error state and not merely the styling", () => {
    const valid = mount(Textarea, { props: { ariaLabel: "Notes" } });
    expect(valid.get("textarea").attributes("aria-invalid")).toBeUndefined();

    const invalid = mount(Textarea, { props: { ariaLabel: "Notes", invalid: true } });
    expect(invalid.get("textarea").attributes("aria-invalid")).toBe("true");
  });

  it("disables the underlying textarea so the field is inert to typing, not merely dimmed", () => {
    const wrapper = mount(Textarea, { props: { ariaLabel: "Notes", disabled: true } });
    expect((wrapper.get("textarea").element as HTMLTextAreaElement).disabled).toBe(true);
  });

  it("locks the size with resize-none only when resize is set to none", () => {
    const vertical = mount(Textarea, { props: { ariaLabel: "Notes" } });
    expect(vertical.get("textarea").classes()).toContain("resize-y");

    const locked = mount(Textarea, { props: { ariaLabel: "Notes", resize: "none" } });
    expect(locked.get("textarea").classes()).toContain("resize-none");
  });

  it("forwards aria-describedby onto the textarea, completing the link to a Field-owned hint or error id", () => {
    const wrapper = mount(Textarea, {
      props: { ariaLabel: "Notes" },
      attrs: { "aria-describedby": "notes-description" },
    });
    expect(wrapper.get("textarea").attributes("aria-describedby")).toBe("notes-description");
  });
});
