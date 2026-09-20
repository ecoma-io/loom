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
    // 80px of the 600px container is the end-panel floor: ceiling is 520.
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
});
