import { expect, test, type Locator, type Page } from "@playwright/test";

// Pagination renders buttons, never links, and Reka owns the arithmetic — so
// the keyboard facts a browser alone can witness are these: the row's Tab
// order is its DOM order with nothing skipped and nothing added; Enter moves
// the page through the browser's own button activation and `aria-current`
// moves with it; and the fence hand-off the source implements — a
// keyboard-activated edge control that turns disabled by the change it fired
// hands focus to the current page instead of dumping it on `<body>` — only
// exists in a real browser, because it is a real browser that blurs a button
// the instant it goes disabled.
//
// The demo mounts eight pagers. The first ("Invoices", full, 120 pages) opens
// at page 4 and shares its model with the compact twin further down; the
// walk test reads the expected stop sequence off the row's own DOM rather
// than pinning Reka's window arithmetic. The disabled pager ("Invoices,
// loading") and the one-page pager ("Attachments") stand between two live
// ones, which is what makes the skip provable.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=pagination");
  await expect(firstPageButton(page, "Invoices")).toBeVisible({ timeout: 20_000 });
});

/** One demo pager, by its nav label — exact, because several names overlap. */
function pager(page: Page, named: string): Locator {
  return page.getByRole("navigation", { name: named, exact: true });
}

/** Page 1's control in one pager — the first stop after the edge controls. */
function firstPageButton(page: Page, named: string): Locator {
  return pager(page, named).getByRole("button", { name: "Page 1", exact: true });
}

test("Tab walks the pager in DOM order — every control, in sequence, no stops added", async ({
  page,
}) => {
  const row = pager(page, "Invoices");
  const stops = await row.getByRole("button").all();
  expect(stops.length).toBeGreaterThan(4); // the four edges plus the numbered window

  // The pager is the demo's first tab stop, so the walk starts at its first
  // control and takes one press per control the row renders. Reading the
  // expected sequence from the DOM keeps the assertion honest about order
  // without pinning which pages Reka's window happens to show.
  for (const stop of stops) {
    await page.keyboard.press("Tab");
    await expect(stop).toBeFocused();
  }

  // The current page is marked, and it is among the stops just walked.
  await expect(row.getByRole("button", { name: "Page 4", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // One press past the last edge control is out of the pager entirely — no
  // trap, no stop the nav added of its own; the next live pager takes it.
  await page.keyboard.press("Tab");
  await expect(pager(page, "Search results").getByRole("button").nth(0)).toBeFocused();
});

test("Enter steps to the next page, aria-current moves, and the compact twin reads the same model", async ({
  page,
}) => {
  const next = pager(page, "Invoices").getByRole("button", { name: "Next page" });
  await next.focus();
  await page.keyboard.press("Enter");

  await expect(
    pager(page, "Invoices").getByRole("button", { name: "Page 5", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  // The full and compact pagers share one model; moving either moves both.
  await expect(pager(page, "Invoices, compact").locator('[role="status"]')).toHaveText(
    "Page 5 of 12",
  );

  // The control that fired it stayed enabled, so focus stays where it was —
  // the hand-off below is only for the control a change kills.
  await expect(next).toBeFocused();
});

test("at the fence, the control that fired the change hands focus to the current page", async ({
  page,
}) => {
  const prev = pager(page, "Invoices").getByRole("button", { name: "Previous page" });
  await prev.focus();

  // Two presses the control survives: 4 → 3 → 2, focus never moves.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(prev).toBeFocused();

  // The third press lands page 1, and Previous dies of it. A browser blurs a
  // button the instant it goes disabled — this is the moment the source's
  // hand-off exists for, and jsdom (which keeps the button focused) cannot
  // reach it.
  await page.keyboard.press("Enter");
  const landed = firstPageButton(page, "Invoices");
  await expect(landed).toBeFocused();
  await expect(landed).toHaveAttribute("aria-current", "page");
  await expect(prev).toBeDisabled();
});

test("the loading pager and the one-page pager refuse every press, and the walk skips them", async ({
  page,
}) => {
  // Genuinely disabled, not dimmed: every control of the loading pager,
  // edge and number alike.
  for (const control of await pager(page, "Invoices, loading").getByRole("button").all()) {
    await expect(control).toBeDisabled();
  }

  // Attachments is one real page: the numbered control is live, and the four
  // edges are dead at their bounds.
  await expect(firstPageButton(page, "Attachments")).toBeEnabled();
  await expect(
    pager(page, "Attachments").getByRole("button", { name: "Previous page" }),
  ).toBeDisabled();
  await expect(
    pager(page, "Attachments").getByRole("button", { name: "Next page" }),
  ).toBeDisabled();

  // From Attachments' one live control, a single press crosses both inert
  // pagers and lands in the next live one — six disabled buttons took no
  // stop between here and there.
  await firstPageButton(page, "Attachments").focus();
  await page.keyboard.press("Tab");
  await expect(
    pager(page, "Hoá đơn").getByRole("button", { name: "Trang đầu", exact: true }),
  ).toBeFocused();
});
