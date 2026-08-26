import { test, expect, type Page } from "@playwright/test";

// Collapse's browser-only fact is the height animation and where concealment
// actually lives. The trigger's aria-controls names the inner content node,
// which stays rendered inside Reka's collapsible box — it is THAT outer box
// ([data-loom-collapse]) which carries data-state, the closed `hidden`
// attribute and the animated height. jsdom can assert none of the geometry.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=collapse");
  await expect(page.getByRole("button").first()).toBeVisible();
});

/** The outer Reka box behind the demo's first disclosure ("What ships…"). */
function firstRegion(page: Page) {
  return page.locator("[data-loom-collapse]").filter({ hasText: "documentation." });
}

test("opening grows the region; closing conceals it under hidden at zero height", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: /What ships in the box/ });
  const region = firstRegion(page);

  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(region).toHaveAttribute("data-state", "open", { timeout: 5_000 });
  // data-state flips when the height film starts, not when it settles, so a
  // single boundingBox() read races the transition — a merge-queue batch on
  // 2026-08-26 caught 0px and 6.4px across two retries of this same assertion.
  // Poll until the film has actually grown the box, the way the closing half
  // below already polls for the shrink.
  await expect
    .poll(async () => (await region.boundingBox())?.height ?? -1, { timeout: 5_000 })
    .toBeGreaterThan(20);

  await trigger.click();
  // Concealment contract, cross-engine: Reka writes hidden="until-found" on
  // the closed box and the height film leaves it at zero. (Chromium renders
  // until-found via content-visibility; engines without it fall back to the
  // plain [hidden] rule — either way the box is gone.)
  await expect(region).toHaveAttribute("data-state", "closed", { timeout: 5_000 });
  await expect(region).toHaveAttribute("hidden", /until-found|^$/, { timeout: 5_000 });
  await expect
    .poll(async () => (await region.boundingBox())?.height ?? 0, { timeout: 5_000 })
    .toBeLessThan(1);
});

test("rapid toggling settles with trigger and region agreeing", async ({ page }) => {
  const trigger = page.getByRole("button", { name: /What ships in the box/ });
  const region = firstRegion(page);

  for (const _ of [1, 2, 3, 4, 5]) {
    await trigger.click(); // no waiting: each press interrupts the running film
  }

  // Five presses from closed land on OPEN (odd count). Whatever the
  // animation was doing mid-flight, the settled DOM must agree with the
  // trigger rather than stranding a half-film state.
  await expect(trigger).toHaveAttribute("aria-expanded", "true", { timeout: 5_000 });
  await expect(region).toHaveAttribute("data-state", "open", { timeout: 5_000 });
});
