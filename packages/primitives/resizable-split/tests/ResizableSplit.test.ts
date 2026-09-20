import { describe, expect, it, vi } from "vitest";
import { mount, type DOMWrapper, type VueWrapper } from "@vue/test-utils";
import type { ComponentPublicInstance } from "vue";
import ResizableSplit from "../src/ResizableSplit.vue";

type SplitWrapper = VueWrapper<ComponentPublicInstance>;
type SeparatorWrapper = DOMWrapper<Element>;

/** Mount with a controlled width; slots name the two halves so the panel box
 *  is unambiguous. */
function mountSplit(width = 320, props: Record<string, unknown> = {}): SplitWrapper {
  return mount(ResizableSplit, {
    props: { modelValue: width, ...props },
    slots: {
      panel: '<div class="panel-box" />',
      content: '<div class="content-box" />',
    },
  });
}

/** A keydown plus the v-model round-trip a host performs: the emitted value is
 *  fed back as the new prop before the next key, mirroring `v-model`. */
async function press(wrapper: SplitWrapper, separator: SeparatorWrapper, key: string) {
  await separator.trigger("keydown", { key });
  const last = wrapper.emitted("update:modelValue")!.at(-1)![0] as number;
  await wrapper.setProps({ modelValue: last });
}

/** Real `PointerEvent`s, like the rest of the suite: test-utils' `trigger`
 *  re-assigns init keys onto a synthetic `MouseEvent` and trips over
 *  getter-only properties — `PointerEvent.button` is one — which the
 *  pointerdown handler branches on. */
function firePointer(separator: SeparatorWrapper, type: string, init: PointerEventInit = {}) {
  separator.element.dispatchEvent(
    new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, ...init }),
  );
}

/** A pointer gesture rendered credible: jsdom rects are zeros, so a drag's
 *  ceiling would collapse to `min`; give the root a real container once per
 *  drag test. */
function stubRect(wrapper: SplitWrapper, width = 1000, height = 600) {
  vi.spyOn(wrapper.element, "getBoundingClientRect").mockReturnValue({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

/** pointerdown → pointermove + round-trip → pointercancel, the shape of a
 *  flushed-then-cancelled drag. */
async function cancelDrag(wrapper: SplitWrapper, separator: SeparatorWrapper) {
  firePointer(separator, "pointerdown", { pointerId: 1, clientX: 100 });
  firePointer(separator, "pointermove", { pointerId: 1, clientX: 200 });
  await wrapper.setProps({
    modelValue: wrapper.emitted("update:modelValue")!.at(-1)![0] as number,
  });
  firePointer(separator, "pointercancel", { pointerId: 1 });
}

describe("ResizableSplit", () => {
  it("renders one separator with the separator role and slider-like values", () => {
    const wrapper = mountSplit(500);
    const separator = wrapper.find('[role="separator"]');
    expect(separator.exists()).toBe(true);
    expect(separator.attributes("aria-orientation")).toBe("vertical");
    expect(separator.attributes("aria-valuenow")).toBe("500");
    expect(separator.attributes("aria-valuemin")).toBe("160");
    expect(separator.attributes("aria-valuemax")).toBe("1080");
    expect(separator.attributes("tabindex")).toBe("0");
  });

  it("puts the resizable panel first for side=left and mirrors it for side=right", () => {
    const left = mountSplit();
    const leftPanels = left.findAll(".panel-box, .content-box");
    expect(leftPanels[0]!.classes()).toContain("panel-box");
    expect(leftPanels[1]!.classes()).toContain("content-box");

    const right = mountSplit(320, { side: "right" });
    const rightPanels = right.findAll(".panel-box, .content-box");
    expect(rightPanels[0]!.classes()).toContain("content-box");
    expect(rightPanels[1]!.classes()).toContain("panel-box");
  });

  it("clamps an out-of-range modelValue into the declared max on render", () => {
    const wrapper = mountSplit(2000);
    const separator = wrapper.find('[role="separator"]');
    expect(separator.attributes("aria-valuenow")).toBe("1080");
    const panel = wrapper.find(".panel-box").element.parentElement!;
    expect(panel.style.width).toBe("1080px");
  });

  it("moves by step on arrow keys and clamps at the bounds", async () => {
    const wrapper = mountSplit(320);
    const separator = wrapper.find('[role="separator"]');

    await press(wrapper, separator, "ArrowRight");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([330]);
    expect(wrapper.emitted("resize")!.at(-1)).toEqual([330]);

    await press(wrapper, separator, "ArrowLeft");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([320]);
  });

  it("Home and End jump to min and max, and the bounds hold", async () => {
    const wrapper = mountSplit(500);
    const separator = wrapper.find('[role="separator"]');

    await press(wrapper, separator, "Home");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([160]);

    // ArrowLeft at the floor and ArrowRight at the ceiling stay put.
    await press(wrapper, separator, "ArrowLeft");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([160]);

    await press(wrapper, separator, "End");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([1080]);
    await press(wrapper, separator, "ArrowRight");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([1080]);
  });

  it("double-click restores the default width", async () => {
    const wrapper = mountSplit(500);
    const separator = wrapper.find('[role="separator"]');
    await separator.trigger("dblclick");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([320]);
  });

  it("double-click honours a custom defaultWidth", async () => {
    const wrapper = mountSplit(500, { defaultWidth: 240 });
    const separator = wrapper.find('[role="separator"]');
    await separator.trigger("dblclick");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([240]);
  });

  it("side=right still widens the panel on ArrowRight — width is side-relative", async () => {
    const wrapper = mountSplit(320, { side: "right" });
    const separator = wrapper.find('[role="separator"]');
    await press(wrapper, separator, "ArrowRight");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([330]);
  });

  it("pointercancel aborts the drag: restores the pre-drag width and never commits resize", async () => {
    const wrapper = mountSplit(320);
    stubRect(wrapper);
    const separator = wrapper.find('[role="separator"]');

    await cancelDrag(wrapper, separator);

    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([320]);
    expect(wrapper.emitted("resize")).toBeUndefined();
  });

  it("a releasePointerCapture throw cannot swallow the cancel — the restore still fires and the drag still ends", async () => {
    const wrapper = mountSplit(320);
    stubRect(wrapper);
    const separator = wrapper.find('[role="separator"]');
    // jsdom ships no pointer capture at all, so the guard under test is pinned
    // by giving this one element a release that throws the way a browser does
    // for a pointer id its cancel already retired (DOMException NotFoundError).
    separator.element.releasePointerCapture = () => {
      throw new DOMException("no active pointer with the given id", "NotFoundError");
    };

    await cancelDrag(wrapper, separator);

    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([320]);
    expect(wrapper.emitted("resize")).toBeUndefined();
    expect(separator.attributes("data-dragging")).toBeUndefined();
  });

  it("a completed drag commits one resize carrying the final width on pointerup", async () => {
    const wrapper = mountSplit(320);
    stubRect(wrapper);
    const separator = wrapper.find('[role="separator"]');

    firePointer(separator, "pointerdown", { pointerId: 1, clientX: 100 });
    firePointer(separator, "pointermove", { pointerId: 1, clientX: 160 });
    await wrapper.setProps({
      modelValue: wrapper.emitted("update:modelValue")!.at(-1)![0] as number,
    });
    firePointer(separator, "pointerup", { pointerId: 1 });

    expect(wrapper.emitted("resize")).toEqual([[380]]);
    // The attribute patch runs on Vue's scheduler, a tick behind the event.
    await wrapper.vm.$nextTick();
    expect(separator.attributes("data-dragging")).toBeUndefined();
  });

  it("a drag in a wide container stops at the declared max, and the emit and the aria agree on it", async () => {
    const wrapper = mountSplit(320);
    // 2000px puts the container ceiling (1920) far above the declared max, so
    // this drag is bounded by `max` alone — the bound only a wide container
    // lets a drag reach.
    stubRect(wrapper, 2000);
    const separator = wrapper.find('[role="separator"]');

    firePointer(separator, "pointerdown", { pointerId: 1, clientX: 100 });
    firePointer(separator, "pointermove", { pointerId: 1, clientX: 3000 });
    const last = wrapper.emitted("update:modelValue")!.at(-1)![0] as number;
    await wrapper.setProps({ modelValue: last });

    expect(last).toBe(1080);
    expect(separator.attributes("aria-valuenow")).toBe("1080");
    const panel = wrapper.find(".panel-box").element.parentElement!;
    expect(panel.style.width).toBe("1080px");
  });

  it("side=right mirrors the drag: a rightward pointer move narrows the panel", () => {
    const wrapper = mountSplit(320, { side: "right" });
    stubRect(wrapper);
    const separator = wrapper.find('[role="separator"]');

    firePointer(separator, "pointerdown", { pointerId: 1, clientX: 100 });
    firePointer(separator, "pointermove", { pointerId: 1, clientX: 200 });

    // +100px to the right narrows a right-side panel: 320 − 100 = 220.
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([220]);
  });

  it("a container too small for the reservation clamps the drag at min, and the end panel keeps what remains", async () => {
    // 200px would cap the panel at 120 — below the 160 floor, an impossible
    // ceiling. The floor wins: the drag emits 160 and stops there.
    const wrapper = mountSplit(320);
    stubRect(wrapper, 200);
    const separator = wrapper.find('[role="separator"]');

    firePointer(separator, "pointerdown", { pointerId: 1, clientX: 150 });
    firePointer(separator, "pointermove", { pointerId: 1, clientX: 20 });
    const last = wrapper.emitted("update:modelValue")!.at(-1)![0] as number;
    await wrapper.setProps({ modelValue: last });

    expect(last).toBe(160);
    expect(separator.attributes("aria-valuenow")).toBe("160");
    const panel = wrapper.find(".panel-box").element.parentElement!;
    expect(panel.style.width).toBe("160px");
    // jsdom has no layout, so the end panel's 16px (200 − 160 − 24 separator)
    // is arithmetic, not a measurable: the panel at 160px in a 200px row is
    // what leaves it.
  });

  it("orientation=horizontal reports the axis, sizes by height and drives rows with the vertical arrows", async () => {
    const wrapper = mountSplit(320, { orientation: "horizontal" });
    const separator = wrapper.find('[role="separator"]');
    expect(separator.attributes("aria-orientation")).toBe("horizontal");
    expect(wrapper.classes()).toContain("flex-col");
    const panel = wrapper.find(".panel-box").element.parentElement!;
    expect(panel.style.height).toBe("320px");
    expect(panel.style.width).toBe("");

    await press(wrapper, separator, "ArrowDown");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([330]);
    await press(wrapper, separator, "ArrowUp");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([320]);
  });

  it("horizontal drags run on the y axis against the container-height ceiling", () => {
    const wrapper = mountSplit(320, { orientation: "horizontal" });
    stubRect(wrapper, 1000, 600);
    const separator = wrapper.find('[role="separator"]');

    firePointer(separator, "pointerdown", { pointerId: 1, clientX: 100, clientY: 100 });
    // The ceiling is container minus 80: 520. That leaves the end panel 80
    // minus the separator's 24px footprint — 56px — at the widest the drag
    // can push the panel.
    firePointer(separator, "pointermove", { pointerId: 1, clientX: 100, clientY: 400 });

    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([520]);
  });

  it("mirrors the drag delta under dir=rtl so the separator tracks the pointer", () => {
    const wrapper = mountSplit(320);
    stubRect(wrapper);
    const style = vi.spyOn(window, "getComputedStyle").mockReturnValue({
      direction: "rtl",
    } as CSSStyleDeclaration);
    const separator = wrapper.find('[role="separator"]');

    firePointer(separator, "pointerdown", { pointerId: 1, clientX: 500 });
    firePointer(separator, "pointermove", { pointerId: 1, clientX: 600 });

    // +100px in RTL narrows the left panel: 320 − 100 = 220.
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([220]);
    style.mockRestore();
  });

  it("refuses input inside a disabled fieldset and reports aria-disabled", async () => {
    const host = mount({
      components: { ResizableSplit },
      template: `
        <fieldset disabled>
          <resizable-split v-model="w" />
        </fieldset>`,
      data: () => ({ w: 320 }),
    });
    await host.vm.$nextTick();
    const separator = host.find('[role="separator"]');
    expect(separator.attributes("aria-disabled")).toBe("true");
    expect(separator.attributes("tabindex")).toBeUndefined();

    await separator.trigger("keydown", { key: "ArrowRight" });
    // The child's emit is swallowed by the v-model wiring; the separator's
    // own value is the observable the keyboard actually drives.
    expect(separator.attributes("aria-valuenow")).toBe("320");
  });

  it("an explicit disabled prop refuses pointer and keyboard input, emits nothing and reports aria-disabled", () => {
    const wrapper = mountSplit(320, { disabled: true });
    const separator = wrapper.find('[role="separator"]');
    expect(separator.attributes("aria-disabled")).toBe("true");
    expect(separator.attributes("tabindex")).toBeUndefined();

    stubRect(wrapper);
    firePointer(separator, "pointerdown", { pointerId: 1, clientX: 100 });
    firePointer(separator, "pointermove", { pointerId: 1, clientX: 400 });
    void separator.trigger("keydown", { key: "ArrowRight" });

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(wrapper.emitted("resize")).toBeUndefined();
  });

  it("dir=rtl leaves the keyboard map alone — the same keys widen, narrow and jump", async () => {
    const wrapper = mountSplit(500);
    stubRect(wrapper);
    // The same condition that flips the drag — a computed `dir` of rtl —
    // must not flip the keys: every value below is the LTR answer.
    const style = vi.spyOn(window, "getComputedStyle").mockReturnValue({
      direction: "rtl",
    } as CSSStyleDeclaration);
    const separator = wrapper.find('[role="separator"]');

    await press(wrapper, separator, "ArrowRight");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([510]);
    await press(wrapper, separator, "ArrowLeft");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([500]);
    await press(wrapper, separator, "Home");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([160]);
    await press(wrapper, separator, "End");
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([1080]);

    style.mockRestore();
  });

  it("a modifier chord is not a resize: Ctrl, Alt and Meta arrows are left unprevented and emit nothing", () => {
    const wrapper = mountSplit(320);
    const separator = wrapper.find('[role="separator"]');

    for (const modifier of ["ctrlKey", "altKey", "metaKey"] as const) {
      const chord = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        cancelable: true,
        [modifier]: true,
      });
      separator.element.dispatchEvent(chord);
      expect(chord.defaultPrevented, `${modifier} + ArrowRight must stay unprevented`).toBe(false);
    }
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();

    // The bare key still resizes, so what the guard keyed on is the modifier,
    // not the key.
    const bare = new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true });
    separator.element.dispatchEvent(bare);
    expect(bare.defaultPrevented).toBe(true);
    expect(wrapper.emitted("update:modelValue")!.at(-1)).toEqual([330]);
  });

  it("names the separator for assistive tech with the default and honours an explicit ariaLabel", () => {
    const defaults = mountSplit(320);
    expect(defaults.find('[role="separator"]').attributes("aria-label")).toBe("Resize panels");

    const named = mountSplit(320, { ariaLabel: "Resize the sidebar" });
    expect(named.find('[role="separator"]').attributes("aria-label")).toBe("Resize the sidebar");
  });

  it("a non-finite modelValue renders and announces defaultWidth instead of NaN, and development is told once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const wrapper = mountSplit(Number.NaN);
    const separator = wrapper.find('[role="separator"]');

    expect(separator.attributes("aria-valuenow")).toBe("320");
    const panel = wrapper.find(".panel-box").element.parentElement!;
    expect(panel.style.width).toBe("320px");
    expect(warn).toHaveBeenCalledTimes(1);

    // The value is read from several places (style, aria) but attributed once
    // per instance, so a re-render on the same bad input stays quiet.
    await wrapper.setProps({ modelValue: Number.NaN });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
