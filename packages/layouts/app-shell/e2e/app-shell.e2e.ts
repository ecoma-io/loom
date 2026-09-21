import { test, expect } from "@playwright/test";

// The sidebar width prop maps to named steps that become a flex-basis, and the
// content area fills the remaining space. A unit test can read the prop's type
// but never the geometry — the widths only exist after the browser lays the
// flex row out, so the width contract is a computed-style assertion.

test("sidebar-width steps change the sidebar's real width, and content still renders beside it", async ({
  page,
}) => {
  await page.goto("/?component=app-shell");

  // The demo renders one shell per width step, in order: sm, md, lg.
  const sidebars = page.locator("aside");
  await expect(sidebars).toHaveCount(3);

  const widthOf = (aside: ReturnType<typeof sidebars.nth>) =>
    aside.evaluate((el) => getComputedStyle(el).width);

  const sm = await widthOf(sidebars.nth(0));
  const lg = await widthOf(sidebars.nth(2));
  expect(sm).toBe("192px"); // 12rem at the default 16px root.
  expect(lg).toBe("320px"); // 20rem.
  expect(lg).not.toBe(sm);

  // Each shell still shows its content area beside the sidebar — the contract
  // the step is for, at the harness viewport (no wrap; panels side by side).
  // Exact text keeps the demo's own prose ("the content area fills the
  // remaining space") out of the count.
  await expect(page.getByText("Content area", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Sidebar nav")).toHaveCount(3);
});

test("Tab enters the shell at the sidebar's links and crosses into the content area", async ({
  page,
}) => {
  // The shell is a container: it operates nothing itself, so its
  // keyboard-operate duty is passage through the surface it puts around the
  // page's landmarks — focus must walk the sm instance's hosted links in DOM
  // order (the <aside>'s navigation first, then the content area's link) and
  // leave the shell without a trap. Seated by script at the walk's first stop
  // because the gesture under test is the Tab chain; asserted per stop by
  // identity, so a stop the shell swallowed fails at the stop it happens.
  await page.goto("/?component=app-shell");
  await page.setViewportSize({ width: 800, height: 900 });

  const overview = page.getByRole("link", { name: "Overview", exact: true });
  await overview.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Projects", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Release notes", exact: true })).toBeFocused();
  // Out of the shell entirely: the harness's trailing tab stop follows the
  // demo, so reaching it proves the shell released focus rather than looping
  // between its sidebar and content panes.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});
