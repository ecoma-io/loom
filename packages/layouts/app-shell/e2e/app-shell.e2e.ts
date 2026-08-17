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
  // the step is for, at the harness viewport (no wrap, no full-width collapse).
  // Exact text keeps the demo's own prose ("the content area fills the
  // remaining space") out of the count.
  await expect(page.getByText("Content area", { exact: true })).toHaveCount(3);
  await expect(page.getByText("Sidebar nav")).toHaveCount(3);
});
