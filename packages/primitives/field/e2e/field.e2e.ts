import { expect, test, type Locator } from "@playwright/test";

// Field operates nothing: it is the label/description wiring around a control
// slotted into it. What a browser alone can witness is that the wiring holds
// under real use — Tab seats the control the label names, what is typed lands
// in that control, the message line's id is the one the seated control
// describes itself by, and the row's state (required, invalid, readonly)
// rides on the control the walk is sitting on. jsdom pins the attributes; it
// cannot prove the seated element and the labelled one are the same element.
//
// The demo mounts six rows in order: name, email, bio, the read-only
// workspace, the individually-fine postcode, and the bare legacy input wired
// by `for`. That order is the walk.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=field");
  await expect(page.getByLabel("Full name")).toBeVisible({ timeout: 20_000 });
});

/**
 * The message line one seated control describes itself by, resolved through
 * the id the control actually carries — a dead or wrong reference fails here
 * instead of silently reading as an association.
 */
async function describedBy(control: Locator): Promise<Locator> {
  // aria-describedby may list several ids; the first is the message line
  // Field renders. The throw fires on a control that names no description at
  // all, so a dead wire fails loudly instead of resolving to nothing.
  const message = (await control.getAttribute("aria-describedby"))?.split(" ")[0];
  if (!message) throw new Error("the seated control carries no aria-describedby");
  return control.page().locator(`[id="${message}"]`);
}

test("Tab seats the control the label names, and typing lands in it", async ({ page }) => {
  // First press of the walk: the name row's control is the demo's first stop,
  // so the seat itself witnesses that the wiring points at a real, reachable
  // control — and getByLabel resolves through the same `for` the row
  // published, so a focused element that is NOT the labelled one fails here.
  await page.keyboard.press("Tab");
  const name = page.getByLabel("Full name");
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute("aria-required", "true");

  // Select-all then type: the caret's landing spot after a Tab focus differs
  // per engine, and the contract under test is that typing reaches the bound
  // control at all, not where a specific engine puts the caret.
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Grace Hopper");
  await expect(name).toHaveValue("Grace Hopper");

  // The description wire: the id the seated control names is the rendered
  // hint line, not a dead reference.
  await expect(await describedBy(name)).toHaveText("Shown publicly");
});

test("the walk seats every wired control in document order, and each row's state rides along", async ({
  page,
}) => {
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Full name")).toBeFocused();

  // The error row: seated control is invalid, and its message line is the
  // rendered alert — the row's one message, wired to the control it is about.
  await page.keyboard.press("Tab");
  const email = page.getByLabel("Email");
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(await describedBy(email)).toHaveText("That address is not valid");

  // The textarea row: the slot carries a Loom control the eslint rule cannot
  // see through, but the runtime wiring does not care how the tag parses.
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Bio")).toBeFocused();

  // Read-only keeps its stop; the refusal half is the next test's subject.
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Workspace")).toBeFocused();

  // The explicit prop beats the row in both directions: a row showing an
  // error around a control that declared itself fine must not paint that
  // control invalid.
  await page.keyboard.press("Tab");
  const postcode = page.getByLabel("Postcode");
  await expect(postcode).toBeFocused();
  await expect(postcode).not.toHaveAttribute("aria-invalid");

  // The `for` path: a bare input Field cannot reach through provide/inject.
  // The label points at the id the caller chose, and the row's message line
  // publishes the `${for}-description` id that input already describes
  // itself by.
  await page.keyboard.press("Tab");
  const legacy = page.getByLabel("Account number");
  await expect(legacy).toBeFocused();
  await expect(await describedBy(legacy)).toHaveText("From your last invoice");

  // Nothing the wrapper renders is itself a stop — the walk leaves the demo
  // directly after the last wired control.
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});

test("read-only keeps the stop and refuses the edit", async ({ page }) => {
  const workspace = page.getByLabel("Workspace");
  await workspace.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("Loom Playground");
  await expect(workspace).toHaveValue("Loom Studio");
});
