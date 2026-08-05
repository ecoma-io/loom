import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Field from "./Field.vue";

// Integration tier, deliberately: only a real `InlineError` proves the error
// message actually reaches assistive tech as a live alert (`role="alert"`)
// and that the description id Field computes actually lands on that alert
// element — InlineError.vue's fallthrough-attrs behavior is what carries it
// there, and mocking InlineError would remove both the role and the
// fallthrough, leaving these assertions pinning nothing. `Field.test.ts`
// covers Field's own logic (label/id pairing, required asterisk, hint-vs-
// error swap, which id it computes) against a mocked `InlineError`.
describe("Field", () => {
  it("surfaces its error message to assistive tech as a live alert", () => {
    const wrapper = mount(Field, {
      props: { label: "Email", for: "email-input", error: "That address is not valid" },
    });
    expect(wrapper.get('[role="alert"]').text()).toContain("That address is not valid");
  });

  it("carries the description id through to the rendered alert, completing the aria-describedby link a consumer wires on their control", () => {
    const wrapper = mount(Field, {
      props: { label: "Email", for: "email-input", error: "That address is not valid" },
    });
    expect(wrapper.get('[role="alert"]').attributes("id")).toBe("email-input-description");
  });
});
