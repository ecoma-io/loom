import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import ToastStack, { type ToastStackItem } from "../src/ToastStack.vue";

// Integration tier, deliberately: the subject here is N real `ToastItem`s
// teleporting into ONE shared provider/viewport, not any single item's own
// rendering (that belongs to Toast/ToastItem's own tests). Mocking
// `ToastItem` would remove the exact thing under test — the shared-viewport
// composition — and leave this file pinning nothing.

const items: ToastStackItem[] = [
  { id: 1, title: "Member added", description: "John", variant: "success" },
  { id: 2, title: "Workflow updated", variant: "info" },
];

let mounted: VueWrapper | undefined;
const dismissed: (string | number)[] = [];

/** Mount attached to the DOM (Reka teleports each toast into the shared viewport) and let the teleport settle. */
async function mountStack(visible: readonly ToastStackItem[]) {
  mounted = mount(ToastStack, {
    props: { items: visible, onDismiss: (id: string | number) => dismissed.push(id) },
    attachTo: document.body,
  });
  await nextTick();
  await nextTick();
}

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
  dismissed.length = 0;
  document.body.innerHTML = "";
});

describe("ToastStack", () => {
  it("renders every simultaneous queue entry into ONE shared viewport so toasts stack instead of overlapping", async () => {
    await mountStack(items);
    expect(document.querySelectorAll("ol")).toHaveLength(1);
    const viewport = document.querySelector("ol")!;
    expect(viewport.textContent).toContain("Member added");
    expect(viewport.textContent).toContain("Workflow updated");
  });

  it("renders nothing visible for an empty queue (the viewport alone carries no content)", async () => {
    await mountStack([]);
    expect(document.body.textContent).toBe("");
  });

  it("funnels a manual close through dismiss with the entry's id — the host queue stays the single source of truth", async () => {
    await mountStack(items);
    const closeButtons = document.querySelectorAll<HTMLButtonElement>("[aria-label='Close']");
    expect(closeButtons.length).toBe(2);
    closeButtons[0]!.click();
    await nextTick();
    expect(dismissed).toEqual([1]);
  });

  // Issue #91, pinned through the block composition: each card's announcement
  // politeness follows that entry's own severity inside the ONE shared
  // provider — the destructive report routes assertive and nothing else does,
  // in both directions. The hidden announce regions render two animation
  // frames after the cards (Reka's own delay), so flush before reading them.
  it("routes each entry's announcement by its own severity within the shared viewport", async () => {
    await mountStack([
      { id: 1, title: "Member added", description: "John", variant: "success" },
      { id: 2, title: "Render failed", description: "Missing codec.", variant: "destructive" },
    ]);
    for (let i = 0; i < 4; i++) {
      await nextTick();
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          resolve(null);
        });
      });
    }
    const regions = [...document.querySelectorAll<HTMLElement>('[role="alert"]')];
    expect(regions).toHaveLength(2);
    const assertive = regions.filter((r) => r.getAttribute("aria-live") === "assertive");
    const polite = regions.filter((r) => r.getAttribute("aria-live") === "polite");
    expect(assertive).toHaveLength(1);
    expect(polite).toHaveLength(1);
    // The assertive region carries the destructive report and only it…
    expect(assertive[0]!.textContent).toContain("Render failed");
    expect(assertive[0]!.textContent).not.toContain("Member added");
    // …and the polite region carries the success without absorbing the error.
    expect(polite[0]!.textContent).toContain("Member added");
    expect(polite[0]!.textContent).not.toContain("Render failed");
  });
});
