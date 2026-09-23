import { expect, test, type Locator, type Page } from "@playwright/test";

// Fieldset operates nothing either: it is a real `<fieldset>` around grouped
// rows, and the native element is the whole keyboard story. What a browser
// alone can witness is what the element does with real focus: the walk seats
// the grouped controls in document order, the group's own message line is the
// one its `aria-describedby` names, the read-only group keeps every stop, and
// — the half no jsdom run can prove — the disabled group's three controls are
// dropped from the tab order entirely, because disabling is the native
// attribute's act and reaches controls the component never rendered.
//
// The demo mounts four groups in order: shipping (editable), billing (the
// group-level error), filed return (read-only), and email notifications
// (disabled). That order is the walk: four stops in the first pair, two
// read-only stops, then straight out of the demo.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=fieldset");
  await expect(
    page.getByRole("group", { name: "Shipping address" }).getByLabel("Street"),
  ).toBeVisible({
    timeout: 20_000,
  });
});

/** One group, addressed the way a reader reaches it: by its legend. */
function group(page: Page, named: string): Locator {
  return page.getByRole("group", { name: named });
}

test("Tab seats the grouped controls in document order and typing lands in them", async ({
  page,
}) => {
  const shipping = group(page, "Shipping address");

  // First press: the group's first control is the demo's first stop, and
  // getByLabel resolving inside the group pins that the seated control is
  // the one the row's label names.
  await page.keyboard.press("Tab");
  await expect(shipping.getByLabel("Street")).toBeFocused();
  // Select-all then type: the caret's landing spot after a Tab focus differs
  // per engine, and the contract under test is that typing reaches the bound
  // control inside the group, not where a specific engine puts the caret.
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("12B Oak Lane");
  await expect(shipping.getByLabel("Street")).toHaveValue("12B Oak Lane");

  await page.keyboard.press("Tab");
  await expect(shipping.getByLabel("City")).toBeFocused();

  // The group error belongs to the group, not to any control in it: the
  // fieldset carries the wire, and neither field inside is painted invalid.
  const billing = group(page, "Billing address");
  await page.keyboard.press("Tab");
  await expect(billing.getByLabel("Street")).toBeFocused();
  await expect(billing).toHaveAttribute("aria-describedby", "fieldset-demo-billing-description");
  await expect(billing.getByLabel("Street")).not.toHaveAttribute("aria-invalid");
  await page.keyboard.press("Tab");
  await expect(billing.getByLabel("City")).toBeFocused();
});

test("the read-only group keeps its stops and refuses the edit", async ({ page }) => {
  const filed = group(page, "Filed return");
  const reference = filed.getByLabel("Reference");

  // Seated by script: the gesture under test is the refusal, not the seat —
  // the seat is the walk's own, proven in the test above.
  await reference.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("LM-2024-0118");
  await expect(reference).toHaveValue("LM-2024-0117");

  // The walk crosses the read-only pair: both stay stops, in order, because
  // read-only is a value on show, not an unavailable control. Seated on the
  // billing group's last field by script — the walk's own shape is the first
  // test's subject — and the pair follows it in document order.
  await group(page, "Billing address").getByLabel("City").focus();
  await page.keyboard.press("Tab");
  await expect(filed.getByLabel("Reference")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(filed.getByLabel("Filed by")).toBeFocused();
});

test("the disabled group's controls take no stop — the native attribute reaches them", async ({
  page,
}) => {
  // The group renders a checkbox, a second checkbox and an email field; all
  // three are form controls inside a `<fieldset disabled>`, disabled by the
  // element and not by any prop this component passed them.
  const notifications = group(page, "Email notifications");
  await expect(notifications.getByRole("checkbox", { name: "Weekly digest" })).toBeDisabled();
  await expect(
    notifications.getByRole("checkbox", { name: "When someone mentions me" }),
  ).toBeDisabled();
  await expect(notifications.getByLabel("Send to")).toBeDisabled();

  // The walk proves the same fact from the focus side: from the last stop
  // before the group, one press leaves the demo — nothing inside the group
  // caught it.
  await group(page, "Filed return").getByLabel("Filed by").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator("#harness-sentinel")).toBeFocused();
});
