import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { ToastProvider, ToastViewport } from "reka-ui";
import ToastItem, { TOAST_LABELS } from "../src/ToastItem.vue";

// Unit tier: the subject is `ToastItem` alone — its one collaborator of
// Loom's own is nothing, so nothing is stubbed. Reka UI is third-party and
// stays real, because the behaviour under test here IS the attribute Reka
// renders on the announce region: which politeness a variant's severity
// routes to (`Toast.vue` bundles this same pair for the standalone case, and
// `Toast.integration.test.ts` pins it through that composition).
//
// The politeness decision itself lives in ToastItem (it reads the variant),
// which is why this file exists beside the integration tiers rather than
// inside them: no other tier reaches ToastItem without a wrapper around it.

let mounted: VueWrapper | undefined;

async function mountItem(variant?: string) {
  mounted = mount(
    {
      components: { ToastProvider, ToastViewport, ToastItem },
      template: `
        <ToastProvider :label="label">
          <ToastItem title="Render failed" description="Missing codec." :variant="variant" />
          <ToastViewport class="fixed" />
        </ToastProvider>
      `,
      data: () => ({ variant, label: TOAST_LABELS.announce }),
    },
    { attachTo: document.body },
  );
  // The announce region renders two animation frames after the card (Reka's
  // own delay), so flush the same way Toast's integration tests do.
  for (let i = 0; i < 4; i++) {
    await nextTick();
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve(null);
      });
    });
  }
}

/** The hidden live region Reka reads each toast out through. */
const announcement = () => document.querySelector<HTMLElement>('[role="alert"]')!;

afterEach(() => {
  mounted?.unmount();
  mounted = undefined;
  document.body.innerHTML = "";
});

describe("ToastItem", () => {
  it("announces a destructive toast through an assertive live region", async () => {
    await mountItem("destructive");
    expect(announcement().getAttribute("aria-live")).toBe("assertive");
    expect(announcement().textContent).toContain("Render failed");
    expect(announcement().textContent).toContain("Missing codec.");
  });

  // Every other severity keeps a polite announcement — an ordinary
  // notification must never interrupt whatever the screen reader is saying.
  // Table-driven across the whole vocabulary so a variant added later fails
  // here until someone decides which side of the split it lands on.
  it.each(["info", "success", "warning", "accent"] as const)(
    "announces a %s toast politely",
    async (variant) => {
      await mountItem(variant);
      expect(announcement().getAttribute("aria-live")).toBe("polite");
      expect(announcement().textContent).toContain("Render failed");
    },
  );

  it("defaults to polite when the host passes no variant at all", async () => {
    await mountItem(undefined);
    expect(announcement().getAttribute("aria-live")).toBe("polite");
  });
});
