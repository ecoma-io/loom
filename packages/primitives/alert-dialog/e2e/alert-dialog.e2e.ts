import { test, expect } from "@playwright/test";

// AlertDialog is the ARIA "alertdialog" pattern: a modal that announces its
// description with its name, and whose only exits are the two buttons. jsdom
// runs none of the machinery that makes that real — no focus management, no
// Escape-key dispatch, no accessibility tree — so every claim here needs a
// browser. The initial focus landing on Cancel is Reka's, and the component's
// own docblock names it the single behaviour this component exists to
// guarantee.

test("the alert opens as role=alertdialog named by its title, and focuses its Cancel button", async ({
  page,
}) => {
  await page.goto("/?component=alert-dialog");

  const trigger = page.getByRole("button", { name: "Delete workflow" });
  await trigger.click();

  const alert = page.getByRole("alertdialog");
  await expect(alert).toBeVisible();

  // The accessible name comes from the title via aria-labelledby — the real
  // browser joins the referenced element's text, which is what a screen reader
  // announces for the dialog as a whole.
  const labelRef = await alert.getAttribute("aria-labelledby");
  expect(labelRef).not.toBeNull();
  await expect(page.locator(`#${labelRef ?? ""}`)).toHaveText("Delete workflow?");

  // Focus moves into the dialog on open, and onto Cancel — a destructive
  // confirm that autofocused "Delete" would turn a reflexive Enter into a
  // deletion.
  const cancel = alert.getByRole("button", { name: "Keep it" });
  await expect(cancel).toBeFocused();

  // The destructive action exists, named by the verb that carries the meaning.
  await expect(alert.getByRole("button", { name: "Delete permanently" })).toBeVisible();
});

test("Escape closes the alert and restores focus to the trigger", async ({ page }) => {
  await page.goto("/?component=alert-dialog");

  const trigger = page.getByRole("button", { name: "Delete workflow" });
  await trigger.click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "Keep it" })).toBeFocused();

  await page.keyboard.press("Escape");

  // Escape is the one non-button exit, and focus restoration is the browser
  // behaviour that makes a modal not a dead end — jsdom neither dispatches the
  // key nor remembers the trigger.
  await expect(page.getByRole("alertdialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});
