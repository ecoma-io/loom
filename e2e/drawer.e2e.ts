import { test, expect, type Locator, type Page } from "@playwright/test";

// The swipe is the exit `dismissible` is there to govern, and it used to be
// the one it did not: Reka wires `useSwipeDismiss` inside `DrawerContentImpl`
// with `enabled: open` and exposes no prop to turn it off, so a drag on the
// panel body toward the anchored edge closed a `dismissible: false` drawer —
// defeating the prop on touch, where the reader is least likely to have meant
// it — which is exactly the case #31 names.
//
// The fix lives in pointer handling, so the evidence has to be a real gesture
// in a real browser: a synthetic `pointermove` dispatched from a test proves
// less than it looks, because the behaviour that matters is the one the
// browser itself produces from a drag. Both directions of the claim are
// driven here — the dismissible drawer must close on a drag toward its edge
// (otherwise the decline below proves nothing at all), and the
// non-dismissible sheet must not.
//
// The drag is a mouse gesture rather than a finger: Playwright can only
// synthesize touch through a Chromium-specific CDP tunnel, which would narrow
// the suite to one engine — against the rule that makes WebKit's project
// worth keeping. The pointer path is Reka's desktop half of the same gesture;
// the touch half shares its veto listener, and both must hold for the pair of
// tests below to stay green.
//
// The drawer the drag starts on matters: Reka ignores drags that begin on an
// interactive element, so the gesture below starts on the panel body — the
// demo content is a plain paragraph, which is also the case the issue names
// ("a drawer with a paragraph of text in it").

/**
 * The panel slides in on `duration-slow` (500ms). `toBeVisible` cannot wait
 * for that: a translated element has a bounding box the moment it mounts, so
 * "visible" is true while the panel is still fully off-screen and a drag
 * measured there starts on an empty scrim. The entry is a transition of the
 * `translate` property, so the gesture may begin the moment that settles to
 * `none` — which `prefers-reduced-motion` also collapses to instantly.
 */
async function settledPanel(panel: Locator) {
  await expect(panel).toHaveAttribute("data-state", "open");
  await expect.poll(() => panel.evaluate((el) => getComputedStyle(el).translate)).toBe("none");
}

/** Drags from the panel's middle toward its anchored edge, the way a dismiss travels. */
async function dragTowardEdge(page: Page, panel: Locator, edge: "right" | "bottom") {
  await settledPanel(panel);
  const box = (await panel.boundingBox())!;
  const viewport = page.viewportSize()!;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  // Well past Reka's 40px threshold, and a straight line, so the release reads
  // as a decisive flick. The travel is capped so the whole gesture stays inside
  // the viewport: the panel is anchored to its edge, so a "dismiss" drag that
  // travelled the raw 60% of the panel would end past the window, where the
  // final pointerup is delivered to no one and the swipe is left hung mid-air.
  const room = edge === "right" ? viewport.width - startX : viewport.height - startY;
  const travel = Math.min(room - 4, 0.6 * (edge === "right" ? box.width : box.height));
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(
    edge === "right" ? startX + travel : startX,
    edge === "right" ? startY : startY + travel,
    {
      steps: 12,
    },
  );
  await page.mouse.up();
}

test("a drag on the panel body toward the anchored edge dismisses a drawer", async ({ page }) => {
  await page.goto("components/drawer");
  await page.getByRole("button", { name: "Open detail" }).click();

  const panel = page.locator('[role="dialog"]');
  await expect(panel).toBeVisible();

  await dragTowardEdge(page, panel, "right");

  // The gesture really is the exit: the drawer must be gone, not merely
  // reported as leaving. `toBeHidden` also passes once the closing transition
  // unmounts the panel entirely.
  await expect(panel).toBeHidden();
});

test("a non-dismissible drawer declines the same drag — dismissible=false covers the swipe", async ({
  page,
}) => {
  await page.goto("components/drawer");
  await page.getByRole("button", { name: "Edit caption (bottom sheet)" }).click();

  const panel = page.locator('[role="dialog"]');
  await expect(panel).toBeVisible();

  await dragTowardEdge(page, panel, "bottom");

  // The panel must still be there, and still open — a drag that merely
  // stopped short of closing would pass this assertion while leaving the
  // drawer visibly half-swiped.
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("data-state", "open");
});
