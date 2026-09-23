import { expect, test, type Locator, type Page } from "@playwright/test";

// WindowControls is three native labelled buttons managed as one group — the
// traversal among them and the maximize/restore state are its contract. The
// buttons are native, so the browser is where the claim is proved: Tab seats
// each control of a cluster in order and crosses between the demo's two
// clusters; Enter fires each intent through the button's own activation; and
// the maximize button's flip to "Restore" is a state change a keyboard user
// can both cause and hear, because the name is what flips.
//
// The demo mounts two clusters — Loom's English, and one named through a
// host's partial French bag (its Close stays English, because the seam
// resolves key by key). The buttons are addressed by the component's own
// testids where the test's own action changes their label.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=window-controls");
  await expect(clusters(page)).toHaveCount(2, { timeout: 20_000 });
});

/** Both rendered clusters — the demo shows the English one and a host-named one. */
function clusters(page: Page): Locator {
  return page.getByRole("group", { name: "Window controls" });
}

test("Tab walks each cluster's three controls and crosses between the clusters", async ({
  page,
}) => {
  const english = clusters(page).nth(0);
  const french = clusters(page).nth(1);

  // Seated by script at the first stop: the walk below is the contract.
  await english.getByRole("button", { name: "Minimize" }).focus();
  await page.keyboard.press("Tab");
  await expect(english.getByRole("button", { name: "Maximize" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(english.getByRole("button", { name: "Close" })).toBeFocused();

  // Into the second cluster: the host's own names, one per control.
  await page.keyboard.press("Tab");
  await expect(french.getByRole("button", { name: "Réduire" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(french.getByRole("button", { name: "Agrandir" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(french.getByRole("button", { name: "Close" })).toBeFocused();

  // And out of the demo — the group holds nothing after its third control.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});

test("Enter fires each control's intent, and maximize flips to restore on the same key", async ({
  page,
}) => {
  // The demo's readouts: the last intent, and the maximized state beside it.
  const intent = page.locator("code.tabular").nth(0);
  const maximized = page.locator("code.tabular").nth(1);

  const minimize = page.getByTestId("win-minimize");
  await minimize.focus();
  await page.keyboard.press("Enter");
  await expect(intent).toHaveText("minimize");

  // Addressed by testid because this very activation flips its label.
  const maximize = page.getByTestId("win-maximize");
  await maximize.focus();
  await page.keyboard.press("Enter");
  await expect(maximize).toHaveAccessibleName("Restore");
  await expect(intent).toHaveText("maximize");
  await expect(maximized).toHaveText("true");

  // The same key is the way back: the flip is the state, not a one-way trip.
  await page.keyboard.press("Enter");
  await expect(maximize).toHaveAccessibleName("Maximize");
  await expect(maximized).toHaveText("false");

  await page.getByTestId("win-close").focus();
  await page.keyboard.press("Enter");
  await expect(intent).toHaveText("close");
});
