import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { provideLoomLabels } from "@ecoma-io/loom-labels";
import CopyButton, { COPY_BUTTON_LABELS, COPY_REVERT_MS } from "../src/CopyButton.vue";

// The announcement seam is a project-internal collaborator and is stubbed:
// what CopyButton owes it is a call with the right string at the right
// moment, which a spy pins. The seam's own region machinery is LiveRegion's
// contract, tested there.
const { announce } = vi.hoisted(() => ({ announce: vi.fn() }));
vi.mock("@ecoma-io/loom-live-region", () => ({ useAnnounce: () => announce }));

/** jsdom ships no clipboard; each test installs exactly the clipboard it argues about. */
function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
    writable: true,
  });
}

function mountCopyButton(props: Record<string, unknown> = {}) {
  return mount(CopyButton, { props });
}

/** The wrapper every host-vocabulary mount sits under, mirroring a real application root. */
function withHostVocabulary(vocabulary: Record<string, unknown>) {
  return defineComponent({
    setup(_props, { slots }) {
      provideLoomLabels(() => vocabulary);
      return () => h("div", slots.default?.());
    },
  });
}

beforeEach(() => {
  announce.mockClear();
  stubClipboard(vi.fn().mockResolvedValue(undefined));
});

afterEach(() => {
  // configurable, so the stub can be removed rather than leaking between tests
  Reflect.deleteProperty(navigator, "clipboard");
  vi.useRealTimers();
});

describe("CopyButton", () => {
  it("renders a button whose accessible name is the default copy label", () => {
    const wrapper = mountCopyButton();
    const button = wrapper.find("button");
    expect(button.exists()).toBe(true);
    expect(button.attributes("aria-label")).toBe(COPY_BUTTON_LABELS.copy);
  });

  it("carries the resting copy glyph, hidden from the accessibility tree", () => {
    const wrapper = mountCopyButton();
    const glyph = wrapper.find("svg.lucide-copy");
    expect(glyph.exists()).toBe(true);
    expect(glyph.attributes("aria-hidden")).toBe("true");
  });

  it("overrides the accessible name through the labels prop", () => {
    const wrapper = mountCopyButton({ labels: { copy: "Linkadresse kopieren" } });
    expect(wrapper.find("button").attributes("aria-label")).toBe("Linkadresse kopieren");
  });

  it("resolves the name through the host vocabulary above it", () => {
    const wrapper = mount(withHostVocabulary({ copyButton: { copy: "Befehl kopieren" } }), {
      slots: { default: () => h(CopyButton) },
    });
    expect(wrapper.find("button").attributes("aria-label")).toBe("Befehl kopieren");
  });

  it("lets per-instance labels outrank the host vocabulary", () => {
    const wrapper = mount(withHostVocabulary({ copyButton: { copy: "Befehl kopieren" } }), {
      slots: { default: () => h(CopyButton, { labels: { copy: "Snippet kopieren" } }) },
    });
    expect(wrapper.find("button").attributes("aria-label")).toBe("Snippet kopieren");
  });

  it("copies the value prop through the async Clipboard API", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const wrapper = mountCopyButton({ value: "pnpm add @ecoma-io/loom" });
    await wrapper.find("button").trigger("click");
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("pnpm add @ecoma-io/loom");
  });

  it("resolves getText at click time, including the asynchronous kind", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const getText = vi.fn().mockResolvedValue("computed-later");
    const wrapper = mountCopyButton({ getText });
    await wrapper.find("button").trigger("click");
    expect(getText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("computed-later");
  });

  it("announces the copied outcome to assistive technology", async () => {
    const wrapper = mountCopyButton({ value: "token" });
    await wrapper.find("button").trigger("click");
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(COPY_BUTTON_LABELS.copied);
  });

  it("swaps the glyph to the check on success and back after the revert window", async () => {
    vi.useFakeTimers();
    const wrapper = mountCopyButton({ value: "token" });
    await wrapper.find("button").trigger("click");
    expect(wrapper.find("svg.lucide-check").exists()).toBe(true);
    expect(wrapper.find("svg.lucide-copy").exists()).toBe(false);
    vi.advanceTimersByTime(COPY_REVERT_MS);
    await flushPromises();
    expect(wrapper.find("svg.lucide-copy").exists()).toBe(true);
    expect(wrapper.find("svg.lucide-check").exists()).toBe(false);
  });

  it("announces the failed outcome when the clipboard refuses", async () => {
    stubClipboard(vi.fn().mockRejectedValue(new DOMException("denied", "NotAllowedError")));
    const wrapper = mountCopyButton({ value: "token" });
    await wrapper.find("button").trigger("click");
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(COPY_BUTTON_LABELS.failed);
    expect(wrapper.find("svg.lucide-x").exists()).toBe(true);
  });

  it("keeps the button operable after a failure, so the next click retries", async () => {
    const writeText = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new DOMException("denied", "NotAllowedError"))
      .mockResolvedValueOnce(undefined);
    stubClipboard(writeText);
    const wrapper = mountCopyButton({ value: "token" });
    await wrapper.find("button").trigger("click");
    expect(wrapper.find("button").attributes("disabled")).toBeUndefined();
    await wrapper.find("button").trigger("click");
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith(COPY_BUTTON_LABELS.copied);
  });

  it("treats a throwing getText like any other failure instead of crashing", async () => {
    stubClipboard(vi.fn());
    const wrapper = mountCopyButton({ getText: () => Promise.reject(new Error("source gone")) });
    await wrapper.find("button").trigger("click");
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(COPY_BUTTON_LABELS.failed);
  });

  it("does not reach the clipboard when disabled", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    const wrapper = mountCopyButton({ value: "token", disabled: true });
    await wrapper.find("button").trigger("click");
    expect(writeText).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
    expect(wrapper.find("button").attributes("disabled")).toBeDefined();
  });

  it("ignores a second click while an attempt is still in flight", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    stubClipboard(vi.fn().mockReturnValue(gate));
    const wrapper = mountCopyButton({ value: "token" });
    const first = wrapper.find("button").trigger("click");
    await wrapper.find("button").trigger("click");
    release();
    await first;
    const writeText = navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("clears the revert timer on unmount instead of writing into a dead component", async () => {
    vi.useFakeTimers();
    const wrapper = mountCopyButton({ value: "token" });
    await wrapper.find("button").trigger("click");
    expect(wrapper.find("svg.lucide-check").exists()).toBe(true);
    wrapper.unmount();
    expect(() => vi.advanceTimersByTime(COPY_REVERT_MS * 10)).not.toThrow();
  });

  it("passes the native button type through, never an accidental submit", () => {
    const wrapper = mountCopyButton({ type: "submit" });
    expect(wrapper.find("button").attributes("type")).toBe("submit");
  });

  it("defaults to type=button", () => {
    const wrapper = mountCopyButton();
    expect(wrapper.find("button").attributes("type")).toBe("button");
  });
});
