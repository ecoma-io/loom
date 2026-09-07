import { test, expect } from "@playwright/test";

// The clipboard is the one collaborator jsdom cannot play: `navigator.clipboard`
// does not exist there, so both what a click writes and what a refusal looks
// like are browser-only facts, and this is the evidence that says so.

// The real-clipboard write is evidenced in Chromium alone: Firefox and WebKit
// reject the `clipboard-read` permission grant at context creation (observed
// in CI on the first infra run after this spec landed), and a write cannot be
// verified without a read of the real clipboard. The skip is keyed to the
// engine capability, not to the test — the moment Playwright grants the
// permission in another engine, the line is removed and this test proves the
// write there too.
test.describe("copy-button real-clipboard write", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "clipboard-read is grantable in Chromium only in this Playwright version; Firefox and WebKit reject it",
  );

  test("CopyButton writes the value to the real clipboard and announces the copied outcome", async ({
    page,
  }) => {
    await page.goto("/?component=copy-button");

    const copy = page.getByRole("button", { name: "Copy to clipboard", exact: true });
    await copy.click();

    // The write itself: not a spy, the actual clipboard.
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe("pnpm add @ecoma-io/loom");

    // The announcement reaches the seam's standalone polite region, which
    // mounts on document.body ahead of any message — the same pair a
    // screen reader listens to.
    await expect(page.locator('[aria-live="polite"]')).toContainText("Copied to clipboard");
  });
});

// Outside the permission-bearing describe on purpose: this test stubs the
// clipboard and touches no permission, so it must run in every engine the
// harness carries — the failure path is exactly where multi-engine evidence
// is the honest claim.
test("a refused write announces the failure and leaves the button operable for a retry", async ({
  page,
}) => {
  // The real browser refuses a clipboard write only under focus races that
  // cannot be staged deterministically; the override stands in for the
  // permission denial, which is the same code path in the component.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new DOMException("denied", "NotAllowedError")),
        readText: () => Promise.resolve(""),
      },
    });
  });
  await page.goto("/?component=copy-button");

  const copy = page.getByRole("button", { name: "Copy to clipboard", exact: true });
  await copy.click();

  await expect(page.locator('[aria-live="polite"]')).toContainText("Could not copy to clipboard");

  // Operable, not latched: the failure is a message, not a dead end.
  await expect(copy).toBeEnabled();
});
