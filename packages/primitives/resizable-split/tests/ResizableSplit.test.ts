import { describe, expect, it } from "vitest";
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
});
