import { test, expect, type Page } from "@playwright/test";

// The drop is the FileUpload's browser-only fact. A synthetic `drop` event is
// only honest if it carries a real `DataTransfer` holding real `File` objects
// — the component reads `event.dataTransfer.files`, and a hand-rolled object
// with a `files` array would prove only that the handler reads a property.
// The `DataTransfer` constructor is what varies by engine, so every test here
// probes for it and skips loudly rather than pretending: no engine silently
// drops out of this suite.
//
// The drag *highlight* is the second half: enter/leave counting on the zone
// exists because a child's `dragenter` lands before the parent's `dragleave`
// as the pointer crosses onto the medallion or the copy — without the counter
// the zone flickers off at exactly the moment it must say "let go here". The
// sequence below replays that crossing in the order the browser delivers it.

interface DropFile {
  name: string;
  type: string;
  body: string;
}

/** Skips the test unless this engine can construct the real thing. */
async function requireDataTransfer(page: Page) {
  const supported = await page.evaluate(() => {
    try {
      new DataTransfer();
      return true;
    } catch {
      return false;
    }
  });
  test.skip(
    !supported,
    "this engine cannot construct a DataTransfer, so no honest synthetic drop can be built; Playwright cannot drive an OS-level drag either",
  );
}

function dataTransferWith(page: Page, files: DropFile[]) {
  return page.evaluateHandle((specs) => {
    const transfer = new DataTransfer();
    for (const spec of specs) {
      transfer.items.add(new File([spec.body], spec.name, { type: spec.type }));
    }
    return transfer;
  }, files);
}

/** A drop zone of the demo, scoped by its own copy — which is also its name. */
function zone(page: Page, label: string) {
  return page.locator("label").filter({ hasText: label });
}

test("a drop adds the file, and a second drop appends rather than replaces", async ({ page }) => {
  await page.goto("/?component=file-upload");
  await requireDataTransfer(page);
  const attachments = zone(page, "Choose attachments or drag them here");

  await attachments.dispatchEvent("drop", {
    dataTransfer: await dataTransferWith(page, [
      { name: "agenda.md", type: "text/markdown", body: "# agenda" },
    ]),
  });
  await expect(page.locator("li").filter({ hasText: "agenda.md" })).toBeVisible();
  // The demo prints the model length beside the controls — one file crossed
  // the v-model boundary as a real File.
  await expect(page.locator("p").filter({ hasText: "attachment(s)" })).toContainText("1");

  // Multiple appends: the second drop joins the list, exactly as the control
  // promises and exactly as the native input would not.
  await attachments.dispatchEvent("drop", {
    dataTransfer: await dataTransferWith(page, [
      { name: "budget.csv", type: "text/csv", body: "a,b,c" },
    ]),
  });
  await expect(page.locator("li").filter({ hasText: "budget.csv" })).toBeVisible();
  await expect(page.locator("p").filter({ hasText: "attachment(s)" })).toContainText("2");
});

test("a drop on a child of the zone still lands, and crossing children does not flicker the highlight", async ({
  page,
}) => {
  await page.goto("/?component=file-upload");
  await requireDataTransfer(page);
  const attachments = zone(page, "Choose attachments or drag them here");

  // Entering from outside, then crossing onto the medallion glyph: the browser
  // delivers enter(child) before leave(parent), so after the third dispatch
  // the depth counter sits at 1 and the zone must still read as dragging.
  await attachments.dispatchEvent("dragenter", { dataTransfer: await dataTransferWith(page, []) });
  const medallion = attachments.locator("span[aria-hidden='true']").first();
  await medallion.dispatchEvent("dragenter", { dataTransfer: await dataTransferWith(page, []) });
  await expect(attachments).toHaveAttribute("data-dragging", "true");
  await attachments.dispatchEvent("dragleave", { dataTransfer: await dataTransferWith(page, []) });
  await expect(
    attachments,
    "crossing onto a child must not drop the highlight — this is the flicker the enter/leave counter exists to prevent",
  ).toHaveAttribute("data-dragging", "true");

  // Leaving for real drains the last entry.
  await medallion.dispatchEvent("dragleave", { dataTransfer: await dataTransferWith(page, []) });
  await expect(attachments).not.toHaveAttribute("data-dragging");

  // And a drop aimed at the medallion — not the zone itself — bubbles to the
  // zone's handler and lands the file.
  await medallion.dispatchEvent("drop", {
    dataTransfer: await dataTransferWith(page, [
      { name: "photo.png", type: "image/png", body: "png" },
    ]),
  });
  await expect(page.locator("li").filter({ hasText: "photo.png" })).toBeVisible();
  // The drop consumes the drag: the highlight is reset outright, not decremented.
  await expect(attachments).not.toHaveAttribute("data-dragging");
});

test("the accept list is enforced against a dropped file, and the refusal names it", async ({
  page,
}) => {
  await page.goto("/?component=file-upload");
  await requireDataTransfer(page);
  const csv = zone(page, "Choose a CSV export");

  // The browser enforces `accept` inside the file dialog and nowhere else, so
  // a drop is checked by the component itself. A text/plain file fails the
  // .csv/text/csv list and is refused with its name attached. The demo prints
  // what its own reject handler received: `name (reason)`.
  await csv.dispatchEvent("drop", {
    dataTransfer: await dataTransferWith(page, [
      { name: "notes.txt", type: "text/plain", body: "hello" },
    ]),
  });
  await expect(page.locator("p").filter({ hasText: "The host was told:" })).toContainText(
    "notes.txt (type)",
  );
  // Nothing entered the list — and the page's only other rows belong to the
  // disabled zone, so the CSV zone's own list is the thing to count.
  await expect(csv.locator("..").locator("li")).toHaveCount(0);

  // A well-formed CSV gets through the same path.
  await csv.dispatchEvent("drop", {
    dataTransfer: await dataTransferWith(page, [
      { name: "export.csv", type: "text/csv", body: "a,b\n1,2" },
    ]),
  });
  await expect(csv.locator("..").locator("li")).toHaveText([/export\.csv/]);
});

test("an unavailable zone ignores a drop", async ({ page }) => {
  await page.goto("/?component=file-upload");
  await requireDataTransfer(page);
  const locked = zone(page, "Choose a contract");

  // The disabled field already holds one file, so the list is the evidence:
  // a drop on the drained zone changes nothing about it.
  await locked.dispatchEvent("drop", {
    dataTransfer: await dataTransferWith(page, [
      { name: "amendment.pdf", type: "application/pdf", body: "pdf" },
    ]),
  });
  await expect(locked.locator("..").locator("li")).toHaveCount(1);
  await expect(page.locator("li").filter({ hasText: "contract-2026.pdf" })).toBeVisible();
});
