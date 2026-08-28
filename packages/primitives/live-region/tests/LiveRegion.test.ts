import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, nextTick } from "vue";
import LiveRegion from "../src/LiveRegion.vue";
import { useAnnounce } from "../src";
import type { Announce, LiveRegionPoliteness } from "../src";

/**
 * jsdom cannot hear a screen reader, so these tests pin the DOM contract the
 * contract relies on: the region's attributes, the clip hiding, the
 * writer routing, and the clear-then-re-add cycle that makes a repeated
 * message a real content change. What only a person with assistive tech can
 * confirm (that the announcement actually plays) is out of reach here by
 * construction.
 */

// jsdom runs requestAnimationFrame on its own clock, so the re-add scheduled
// for the next frame is drained by awaiting a frame — no timers.
async function nextFrame(): Promise<void> {
  await nextTick();
  await flushPromises();
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => {
      resolve();
    }),
  );
}

// Tracked so every mounted wrapper unmounts in afterEach — a leaked region
// would keep its writer registered and poison later tests' routing.
const wrappers: { unmount(): void }[] = [];

function mountRegion(politeness: LiveRegionPoliteness = "polite") {
  const wrapper = mount(LiveRegion, { attachTo: document.body, props: { politeness } });
  wrappers.push(wrapper);
  return wrapper;
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
});

// The consumer shape the seam exists for: any component asks for the
// announcer once and pushes messages through it.
let captured: Announce | null = null;

const Announcer = defineComponent({
  setup() {
    captured = useAnnounce();
    return () => null;
  },
});

function announce(message: string, politeness?: LiveRegionPoliteness): void {
  if (!captured) throw new Error("announcer host not mounted");
  captured(message, politeness);
}

function regionOf(wrapper: ReturnType<typeof mountRegion>): HTMLElement {
  return wrapper.get("[aria-live]").element as HTMLElement;
}

function standaloneRegion(politeness: LiveRegionPoliteness): HTMLElement {
  return document.querySelector(`[data-loom-live-region] [aria-live="${politeness}"]`)!;
}

describe("LiveRegion semantics", () => {
  it("renders one clipped, permanently mounted region, polite by default", () => {
    const wrapper = mountRegion();
    const region = regionOf(wrapper);
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.getAttribute("aria-relevant")).toBe("additions text");
    expect(region.getAttribute("aria-atomic")).toBe("true");
    // No role rides on top: the politeness is the whole semantic contract.
    expect(region.getAttribute("role")).toBeNull();
  });

  it("hides with the clip technique, never display:none", () => {
    const wrapper = mountRegion();
    // The clip wrapper is the region's parent — the VisuallyHidden root.
    const classes = regionOf(wrapper).parentElement!.className;
    expect(classes).toContain("[clip:rect(0,0,0,0)]");
    expect(classes).toContain("[clip-path:inset(50%)]");
    expect(classes.split(" ")).not.toContain("hidden");
  });

  it("maps the politeness prop onto aria-live verbatim", () => {
    const wrapper = mountRegion("assertive");
    expect(regionOf(wrapper).getAttribute("aria-live")).toBe("assertive");
  });

  it("keeps the same region element across announcements", async () => {
    const wrapper = mountRegion();
    mountAnnouncerHost();
    const before = regionOf(wrapper);
    announce("Saved");
    await nextFrame();
    expect(regionOf(wrapper)).toBe(before);
  });
});

function mountAnnouncerHost(): void {
  const wrapper = mount(Announcer, { attachTo: document.body });
  wrappers.push(wrapper);
}

describe("Announcements", () => {
  it("writes a message announced through the seam into the mounted region", async () => {
    const wrapper = mountRegion();
    mountAnnouncerHost();
    announce("Saved");
    await nextFrame();
    expect(regionOf(wrapper).textContent).toBe("Saved");
  });

  it("re-announces an identical message by clearing and re-adding across a frame", async () => {
    const wrapper = mountRegion();
    mountAnnouncerHost();
    announce("Saved");
    await nextFrame();
    expect(regionOf(wrapper).textContent).toBe("Saved");
    // The identical repeat must clear immediately — the visible proof that
    // the re-add (not a no-op rewrite) is what lands after the frame.
    announce("Saved");
    expect(regionOf(wrapper).textContent).toBe("");
    await nextFrame();
    expect(regionOf(wrapper).textContent).toBe("Saved");
  });

  it("routes by politeness when both regions are mounted", async () => {
    const polite = mountRegion("polite");
    const assertive = mountRegion("assertive");
    mountAnnouncerHost();
    announce("Draft saved");
    await nextFrame();
    expect(regionOf(polite).textContent).toBe("Draft saved");
    expect(regionOf(assertive).textContent).toBe("");
    announce("Upload failed", "assertive");
    await nextFrame();
    expect(regionOf(assertive).textContent).toBe("Upload failed");
    expect(regionOf(polite).textContent).toBe("Draft saved");
  });

  it("follows a politeness change by re-registering the region", async () => {
    const wrapper = mountRegion("polite");
    mountAnnouncerHost();
    await wrapper.setProps({ politeness: "assertive" });
    announce("Draft saved");
    await nextFrame();
    // The polite channel no longer has an in-tree owner, so the message
    // falls through to the standalone pair; the re-registered region takes
    // the assertive one.
    expect(regionOf(wrapper).textContent).toBe("");
    expect(standaloneRegion("polite").textContent).toBe("Draft saved");
  });
});

describe("Standalone fallback", () => {
  it("mounts the polite and assertive pair when the seam is asked for with no region", () => {
    mountAnnouncerHost();
    expect(standaloneRegion("polite").getAttribute("aria-relevant")).toBe("additions text");
    expect(standaloneRegion("assertive").getAttribute("aria-relevant")).toBe("additions text");
  });

  it("announces into the standalone pair when no region is mounted", async () => {
    mountAnnouncerHost();
    announce("3 results found");
    await nextFrame();
    expect(standaloneRegion("polite").textContent).toBe("3 results found");
    expect(standaloneRegion("assertive").textContent).toBe("");
  });

  it("hands the channel back to the standalone pair when a region unmounts", async () => {
    const wrapper = mountRegion();
    mountAnnouncerHost();
    wrapper.unmount();
    announce("Saved");
    await nextFrame();
    expect(standaloneRegion("polite").textContent).toBe("Saved");
  });
});
