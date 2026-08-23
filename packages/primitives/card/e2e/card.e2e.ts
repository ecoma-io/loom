import { test, expect } from "@playwright/test";

// Card's browser-only facts are the card-link's geometry and its keyboard
// ring: jsdom can see the anchor tag, but only a real browser proves it
// occupies the card's whole box and resolves the focus-visible outline.

test("the card-link is one anchor spanning the card and navigates from anywhere on it", async ({
  page,
}) => {
  await page.goto("/?component=card");
  await expect(page.getByRole("link", { name: /Open project/ })).toBeVisible();

  const link = page.getByRole("link", { name: /Open project/ });

  // The anchor's box reaches down past the description line — clicking low on
  // the card follows the same link as clicking its title.
  const titleBox = await link.getByText("Open project").boundingBox();
  const descriptionBox = await link.getByText("Last opened 2 hours ago.").boundingBox();
  const linkBox = await link.boundingBox();
  if (!titleBox || !descriptionBox || !linkBox) throw new Error("no layout in this browser");
  expect(linkBox.y).toBeLessThanOrEqual(titleBox.y);
  expect(linkBox.y + linkBox.height).toBeGreaterThanOrEqual(
    descriptionBox.y + descriptionBox.height,
  );

  await link.click();
  await expect(page).toHaveURL(/#card-link$/);
});

test("keyboard focus draws the canonical ring around the linked card", async ({ page }) => {
  await page.goto("/?component=card");

  // Real key events so :focus-visible applies — programmatic .focus() does
  // not, and a ring asserted through it would prove nothing about keyboard
  // use. Tab order on this demo: the first card's footer button, then the
  // card-link.
  const footerButton = page.getByRole("button", { name: "Manage plan" });
  await footerButton.focus();
  await page.keyboard.press("Tab");

  const link = page.getByRole("link", { name: /Open project/ });
  await expect(link).toBeFocused();

  // The canonical Loom treatment: 2px brand-ring outline, never removed
  // without something at least as visible replacing it.
  const outline = await link.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(outline.style).toBe("solid");
  expect(Number.parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
});
