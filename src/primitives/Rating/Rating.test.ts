import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import Rating from "./Rating.vue";
import { provideFieldContext } from "../../lib/field-context";

// A stand-in for the Field wrapping this control. Field's own behaviour is
// pinned in `Field.test.ts`; what matters here is that the rating reads a row
// it is inside at all.
//
// It renders a real `<form>` because that is the only place Reka mints the
// hidden input carrying `name`: outside one, a resolved name has nowhere
// observable to land, and a test that could not see it would pass with the key
// dropped.
const ProbeRow = defineComponent({
  props: {
    controlId: { type: String, default: undefined },
    describedBy: { type: String, default: undefined },
    name: { type: String, default: undefined },
    required: { type: Boolean, default: undefined },
    invalid: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: undefined },
    readonly: { type: Boolean, default: undefined },
  },
  setup(props, { slots }) {
    provideFieldContext({
      controlId: () => props.controlId,
      describedBy: () => props.describedBy,
      name: () => props.name,
      required: () => props.required,
      invalid: () => props.invalid,
      disabled: () => props.disabled,
      readonly: () => props.readonly,
    });
    return () => h("form", slots.default?.());
  },
});

// Reka's roving-focus machinery schedules its own follow-up work on real
// timers — the focus listener that arms on the *next* arrow keypress, and the
// click it queues a tick after focus moves — so a keyboard assertion has to
// let both a microtask flush and a timer tick settle before reading the
// result, or it reads state mid-flight. Same helper, same reason, as
// RadioGroup's suite: this component is a RadioGroup underneath.
async function settle(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}

function press(element: Element, key: string): void {
  element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("Rating", () => {
  it("renders one star per `length`, each radio named with the score it sets and the maximum", () => {
    const wrapper = mount(Rating, { props: { modelValue: 3, length: 4 } });
    expect(
      wrapper.findAll('[role="radio"]').map((radio) => radio.attributes("aria-label")),
    ).toEqual(["1 of 4 stars", "2 of 4 stars", "3 of 4 stars", "4 of 4 stars"]);
  });

  it("marks the chosen star's radio checked and leaves every other one unchecked", () => {
    const wrapper = mount(Rating, { props: { modelValue: 2 } });
    expect(
      wrapper.findAll('[role="radio"]').map((radio) => radio.attributes("aria-checked")),
    ).toEqual(["false", "true", "false", "false", "false"]);
  });

  it("emits the score of the star that was clicked", async () => {
    const wrapper = mount(Rating, { props: { modelValue: 2 } });
    await wrapper.findAll('[role="radio"]')[3]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[4]]);
  });

  it("tracks its own score when no `modelValue` is supplied, rather than sticking at zero", async () => {
    // `optional()` is what makes this work: forwarding an absent modelValue as
    // an explicit `undefined` would leave Reka controlled by a value that never
    // moves, so the rating would emit and never repaint.
    const wrapper = mount(Rating);
    await wrapper.findAll('[role="radio"]')[2]!.trigger("click");
    await settle();
    expect(
      wrapper.findAll('[role="radio"]').map((radio) => radio.attributes("aria-checked")),
    ).toEqual(["false", "false", "true", "false", "false"]);
  });

  it("splits each star into two radios at `step` 0.5, the half labelled as a half", () => {
    const wrapper = mount(Rating, { props: { modelValue: 1.5, length: 2, step: 0.5 } });
    const radios = wrapper.findAll('[role="radio"]');
    expect(radios.map((radio) => radio.attributes("aria-label"))).toEqual([
      "0.5 of 2 stars",
      "1 of 2 stars",
      "1.5 of 2 stars",
      "2 of 2 stars",
    ]);
    expect(radios[2]!.attributes("aria-checked")).toBe("true");
  });

  it("emits a half score when the half of a star is clicked", async () => {
    const wrapper = mount(Rating, { props: { modelValue: 1, length: 3, step: 0.5 } });
    await wrapper.findAll('[role="radio"]')[4]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[2.5]]);
  });

  it("clips the half star to half the star's box rather than shrinking the glyph", () => {
    const wrapper = mount(Rating, { props: { modelValue: 0.5, length: 1, step: 0.5 } });
    const [half, whole] = wrapper.findAll('[role="radio"]');
    // The clip window is a fraction of the star box, so the glyph inside keeps
    // a whole star's width — and the half sits above the whole so the pointer
    // can still reach it.
    expect(half!.attributes("style")).toContain("--reka-rating-item-step-width: 50%");
    expect(whole!.attributes("style")).toContain("--reka-rating-item-step-width: 100%");
    expect(half!.attributes("style")).toContain("width: var(--reka-rating-item-step-width)");
    expect(half!.classes()).toContain("overflow-hidden");
    expect(half!.find("svg").classes()).toEqual(expect.arrayContaining(["h-5", "w-5"]));
  });

  it("marks every star at or below the score active, and the rest not", () => {
    const wrapper = mount(Rating, { props: { modelValue: 3 } });
    expect(
      wrapper.findAll('[role="radio"]').map((radio) => radio.attributes("data-state")),
    ).toEqual(["active", "active", "active", undefined, undefined]);
  });

  it("previews the score under the pointer when hoverable", async () => {
    const wrapper = mount(Rating, { props: { modelValue: 1, hoverable: true } });
    await wrapper.findAll('[role="radio"]')[3]!.trigger("mouseenter");
    expect(
      wrapper.findAll('[role="radio"]').map((radio) => radio.attributes("data-state")),
    ).toEqual(["active", "active", "active", "active", undefined]);
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("leaves the stars alone on hover when not hoverable", async () => {
    const wrapper = mount(Rating, { props: { modelValue: 1 } });
    await wrapper.findAll('[role="radio"]')[3]!.trigger("mouseenter");
    expect(
      wrapper.findAll('[role="radio"]').map((radio) => radio.attributes("data-state")),
    ).toEqual(["active", undefined, undefined, undefined, undefined]);
  });

  it("emits 0 when a clearable rating's own score is chosen again", async () => {
    const wrapper = mount(Rating, { props: { modelValue: 3, clearable: true } });
    await wrapper.findAll('[role="radio"]')[2]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[0]]);
  });

  it("keeps the score when a rating that is not clearable has its own score chosen again", async () => {
    const wrapper = mount(Rating, { props: { modelValue: 3 } });
    await wrapper.findAll('[role="radio"]')[2]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([3]);
  });

  it("is one Tab stop with roving focus, not one per star", async () => {
    const wrapper = mount(Rating, { props: { modelValue: 2 }, attachTo: document.body });
    await settle();

    expect(wrapper.get('[role="radiogroup"]').attributes("tabindex")).toBe("0");
    const radios = wrapper.findAll('[role="radio"]');
    (radios[1]!.element as HTMLButtonElement).focus();
    await settle();

    expect(wrapper.findAll('[role="radio"]').map((radio) => radio.attributes("tabindex"))).toEqual([
      "-1",
      "0",
      "-1",
      "-1",
      "-1",
    ]);
    wrapper.unmount();
  });

  it("steps the score by one star on ArrowRight", async () => {
    const wrapper = mount(Rating, { props: { modelValue: 2 }, attachTo: document.body });
    const radios = wrapper.findAll('[role="radio"]');
    (radios[1]!.element as HTMLButtonElement).focus();
    await settle();

    press(radios[1]!.element, "ArrowRight");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([3]);
    wrapper.unmount();
  });

  it("steps the score by half a star on ArrowRight when `step` is 0.5", async () => {
    const wrapper = mount(Rating, {
      props: { modelValue: 2, step: 0.5 },
      attachTo: document.body,
    });
    const radios = wrapper.findAll('[role="radio"]');
    // Index 3 is the whole-star radio for 2 — the halves interleave.
    const two = radios.find((radio) => radio.attributes("aria-label") === "2 of 5 stars")!;
    (two.element as HTMLButtonElement).focus();
    await settle();

    press(two.element, "ArrowRight");
    await settle();

    expect(wrapper.emitted("update:modelValue")?.at(-1)).toEqual([2.5]);
    wrapper.unmount();
  });

  it("moves focus to the ends on Home and End without choosing anything there", async () => {
    // Verified against Reka rather than assumed: its roving focus maps
    // Home/End to first/last, but only an *arrow* key re-clicks the item it
    // lands on. So the ends are reachable and the score does not follow —
    // Space commits it once the reader is there.
    const wrapper = mount(Rating, { props: { modelValue: 3 }, attachTo: document.body });
    const radios = wrapper.findAll('[role="radio"]');
    (radios[2]!.element as HTMLButtonElement).focus();
    await settle();

    press(radios[2]!.element, "End");
    await settle();
    expect(document.activeElement).toBe(radios[4]!.element);

    press(radios[4]!.element, "Home");
    await settle();
    expect(document.activeElement).toBe(radios[0]!.element);

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    wrapper.unmount();
  });

  it("refuses the pointer and dims when disabled, while staying a radio group", async () => {
    const wrapper = mount(Rating, { props: { modelValue: 2, disabled: true } });
    const radios = wrapper.findAll('[role="radio"]');
    for (const radio of radios) {
      expect((radio.element as HTMLButtonElement).disabled).toBe(true);
    }
    await radios[4]!.trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    const root = wrapper.get('[role="radiogroup"]');
    expect(root.attributes("data-disabled")).toBe("");
    expect(root.classes()).toContain("data-[disabled]:opacity-50");
  });

  it("renders a read-only score as one labelled image, with nothing inside it to focus", () => {
    const wrapper = mount(Rating, { props: { modelValue: 3.5, readonly: true } });
    const root = wrapper.get('[role="img"]');
    expect(root.attributes("aria-label")).toBe("3.5 of 5 stars");
    expect(wrapper.find('[role="radiogroup"]').exists()).toBe(false);
    expect(wrapper.findAll("button")).toHaveLength(0);
    expect(root.attributes("tabindex")).toBeUndefined();
  });

  it("does not dim a read-only score, because nothing about it is unavailable", () => {
    const readonly = mount(Rating, { props: { modelValue: 3, readonly: true } });
    expect(readonly.get('[role="img"]').classes()).not.toContain("data-[disabled]:opacity-50");
  });

  it("paints and announces a read-only score exactly, ignoring `step`", () => {
    // `step` is about what a reader can aim at, and a picture of a number is
    // not aimed at — so an average of 4.2 is not rounded to the nearest half.
    const wrapper = mount(Rating, { props: { modelValue: 4.2, readonly: true, step: 0.5 } });
    expect(wrapper.get('[role="img"]').attributes("aria-label")).toBe("4.2 of 5 stars");
    const widths = wrapper
      .findAll('[role="img"] > span > span')
      .map((clip) => clip.attributes("style"));
    expect(widths).toEqual([
      "width: 100%;",
      "width: 100%;",
      "width: 100%;",
      "width: 100%;",
      "width: 20%;",
    ]);
  });

  it("clamps a score outside the scale, so the picture and the announcement agree", () => {
    const over = mount(Rating, { props: { modelValue: 9, length: 5, readonly: true } });
    expect(over.get('[role="img"]').attributes("aria-label")).toBe("5 of 5 stars");

    const under = mount(Rating, { props: { modelValue: -2, readonly: true } });
    expect(under.get('[role="img"]').attributes("aria-label")).toBe("0 of 5 stars");
    expect(
      under.findAll('[role="img"] > span > span').map((clip) => clip.attributes("style")),
    ).toEqual(["width: 0%;", "width: 0%;", "width: 0%;", "width: 0%;", "width: 0%;"]);
  });

  it("sizes the star box, the empty glyph and the filled glyph together", () => {
    for (const [size, box] of [
      ["sm", "h-4"],
      ["md", "h-5"],
      ["lg", "h-6"],
    ] as const) {
      const wrapper = mount(Rating, { props: { modelValue: 1, length: 1, size } });
      const item = wrapper.get('[role="radiogroup"] > span');
      expect(item.classes()).toContain(box);
      for (const glyph of wrapper.findAll("svg")) {
        expect(glyph.classes()).toContain(box);
      }
    }
  });

  it("routes the group's name and a caller's class onto the radiogroup itself", () => {
    const wrapper = mount(Rating, {
      props: { modelValue: 3 },
      attrs: { "aria-label": "Overall quality", "data-testid": "quality" },
    });
    const root = wrapper.get('[role="radiogroup"]');
    expect(root.attributes("aria-label")).toBe("Overall quality");
    expect(root.attributes("data-testid")).toBe("quality");
  });

  it("merges a caller's class rather than letting it fight the row's own", () => {
    const wrapper = mount(Rating, { props: { modelValue: 3 }, attrs: { class: "gap-4" } });
    const classes = wrapper.get('[role="radiogroup"]').classes();
    // cn() resolves the conflict, so exactly one gap utility survives.
    expect(classes).toContain("gap-4");
    expect(classes).not.toContain("gap-1");
  });

  it("names a read-only score with the score itself, whatever the caller passes", () => {
    // A picture of a number that does not say the number is a picture of
    // nothing, so this one label is not the caller's to overwrite.
    const wrapper = mount(Rating, {
      props: { modelValue: 4, readonly: true },
      attrs: { "aria-label": "Average" },
    });
    expect(wrapper.get('[role="img"]').attributes("aria-label")).toBe("4 of 5 stars");
  });
});

describe("Rating inside a Field", () => {
  it("takes its id, description, name, required and invalid state from the row it sits in", () => {
    const row = mount(ProbeRow, {
      props: {
        controlId: "quality",
        describedBy: "quality-description",
        name: "quality",
        required: true,
        invalid: true,
      },
      slots: { default: h(Rating, { modelValue: 3 }) },
    });
    const group = row.get('[role="radiogroup"]');
    expect(group.attributes("id")).toBe("quality");
    expect(group.attributes("aria-describedby")).toBe("quality-description");
    expect(group.attributes("aria-required")).toBe("true");
    expect(group.attributes("aria-invalid")).toBe("true");
    expect((row.get('input[name="quality"]').element as HTMLInputElement).value).toBe("3");
  });

  it("lets an explicit disabled overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { disabled: true },
      slots: { default: h(Rating, { modelValue: 3, disabled: false }) },
    });
    expect(optedOut.get('[role="radiogroup"]').attributes("data-disabled")).toBeUndefined();

    const optedIn = mount(ProbeRow, {
      slots: { default: h(Rating, { modelValue: 3, disabled: true }) },
    });
    expect(optedIn.get('[role="radiogroup"]').attributes("data-disabled")).toBeDefined();
  });

  it("adds the row's description to one the caller already set rather than replacing it", () => {
    const row = mount(ProbeRow, {
      props: { describedBy: "quality-description" },
      slots: { default: h(Rating, { modelValue: 3, "aria-describedby": "quality-caveat" }) },
    });
    expect(row.get('[role="radiogroup"]').attributes("aria-describedby")).toBe(
      "quality-caveat quality-description",
    );
  });

  // The row's read-only is this control's own read-only, not a second dial
  // beside it: the score becomes a picture, and a picture is not dimmed.
  it("renders the picture, not a dimmed input, for a read-only row", () => {
    const row = mount(ProbeRow, {
      props: { readonly: true, controlId: "score", describedBy: "score-description" },
      slots: { default: h(Rating, { modelValue: 4.2 }) },
    });
    const picture = row.get('[role="img"]');
    expect(picture.attributes("aria-label")).toBe("4.2 of 5 stars");
    expect(picture.classes()).not.toContain("opacity-50");
    expect(row.find('[role="radiogroup"]').exists()).toBe(false);
    expect(row.find('[role="radio"]').exists()).toBe(false);

    // The two keys a picture may carry, and the two it may not: ARIA allows
    // neither `aria-required` nor a form name on `role="img"`, and axe's
    // `aria-allowed-attr` fails a page that ships one.
    expect(picture.attributes("id")).toBe("score");
    expect(picture.attributes("aria-describedby")).toBe("score-description");
    expect(picture.attributes("aria-required")).toBeUndefined();
    expect(picture.attributes("name")).toBeUndefined();
  });

  it("lets an explicit readonly overrule the row in both directions", () => {
    const optedOut = mount(ProbeRow, {
      props: { readonly: true },
      slots: { default: h(Rating, { modelValue: 3, readonly: false, "aria-label": "Quality" }) },
    });
    expect(optedOut.find('[role="radiogroup"]').exists()).toBe(true);

    const optedIn = mount(ProbeRow, {
      slots: { default: h(Rating, { modelValue: 3, readonly: true }) },
    });
    expect(optedIn.find('[role="img"]').exists()).toBe(true);
  });

  // Every key that resolved to nothing is dropped from the bag, so a rating
  // with no row above it renders exactly what it rendered before the context
  // existed.
  it("outside any Field adds nothing of its own", () => {
    const wrapper = mount(Rating, { props: { modelValue: 3 }, attrs: { "aria-label": "Quality" } });
    const group = wrapper.get('[role="radiogroup"]');
    for (const attribute of ["id", "name", "aria-describedby", "aria-invalid"]) {
      expect(group.attributes(attribute)).toBeUndefined();
    }
    // Reka has always written this one from its own `required` prop, and an
    // unwrapped rating resolves that prop to `false` exactly as it did before.
    expect(group.attributes("aria-required")).toBe("false");
    expect(wrapper.find("input").exists()).toBe(false);
  });
});
