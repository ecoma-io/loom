import { test, expect, type Locator } from "@playwright/test";

// TreeView's browser-only facts: the single roving tab stop, arrow traversal,
// expand/collapse and selection keys on real DOM, a lazy branch that fetches
// into existence, and a host-owned `expandedKeys` that renders exactly what
// the host allows — the interaction contract of the a11y.json sidecar.
//
// The ARIA grammar (role=treeitem, aria-expanded, aria-selected) sits on the
// `<li>`; the roving tab stop and focus live on the row `<div data-tree-value>`
// inside it. Focus assertions and key dispatch therefore target the div, and
// grammar assertions the li.

test.beforeEach(async ({ page }) => {
  await page.goto("/?component=tree-view");
  await expect(page.getByRole("tree", { name: "Project files" })).toBeVisible();
});

/** The focusable row div inside a treeitem, reached by node value. */
function row(tree: Locator, value: string): Locator {
  return tree.locator(`[data-tree-value="${value}"]`);
}

/** The li[role=treeitem] carrying the ARIA grammar for a node value. */
function li(tree: Locator, value: string): Locator {
  return tree.getByRole("treeitem", { name: value });
}

test("one Tab stop, arrows rove, ArrowRight and ArrowLeft expand and collapse", async ({
  page,
}) => {
  const tree = page.getByRole("tree", { name: "Project files" });

  // The tree is one Tab stop: Tab lands on the first — and only tabbable —
  // row, which is the row div's roving tabindex.
  await page.keyboard.press("Tab");
  await expect(row(tree, "src")).toBeFocused();

  // The tree starts closed; ArrowRight opens a branch and its children enter
  // the DOM, ArrowLeft closes it and they leave.
  await expect(li(tree, "components")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(li(tree, "src")).toHaveAttribute("aria-expanded", "true");
  await expect(li(tree, "components")).toBeVisible();

  // ArrowRight on an open branch moves into it; ArrowLeft on a child walks
  // back up to the parent.
  await page.keyboard.press("ArrowRight");
  await expect(row(tree, "components")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(row(tree, "src")).toBeFocused();

  await page.keyboard.press("ArrowLeft");
  await expect(li(tree, "src")).toHaveAttribute("aria-expanded", "false");
  await expect(li(tree, "components")).toHaveCount(0);
});

test("Home and End jump the visible walk; Enter selects and the demo's model moves", async ({
  page,
}) => {
  const tree = page.getByRole("tree", { name: "Project files" });

  await page.keyboard.press("Tab");
  await page.keyboard.press("End");
  await expect(row(tree, "readme")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(row(tree, "src")).toBeFocused();

  // Enter chooses the focused row: the demo starts on `chosen = "src"`, so a
  // working v-model moves the aria-selected pair with the key.
  await page.keyboard.press("ArrowDown");
  await expect(row(tree, "tests")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(li(tree, "tests")).toHaveAttribute("aria-selected", "true");
  await expect(li(tree, "src")).toHaveAttribute("aria-selected", "false");
});

test("a lazy branch fetches into existence; an empty answer turns the row into a leaf", async ({
  page,
}) => {
  const archive = page.getByRole("tree", { name: "Archive" });

  // fetchBranch resolves after 700ms: the children exist only once the row's
  // first expansion has run, and the empty "Contributors" answer leaves the
  // row without an aria-expanded claim — it offers nothing to open.
  await row(archive, "releases").focus();
  await page.keyboard.press("ArrowRight");
  await expect(li(archive, "v0.1.0")).toBeVisible();
  await expect(li(archive, "releases")).toHaveAttribute("aria-expanded", "true");

  await expect(li(archive, "contributors")).toHaveAttribute("aria-expanded", "false");
  await row(archive, "contributors").focus();
  await page.keyboard.press("ArrowRight");
  await expect(li(archive, "contributors")).not.toHaveAttribute("aria-busy", "true");
  await expect(li(archive, "contributors")).not.toHaveAttribute("aria-expanded", /./);
});

test("a host-owned expandedKeys renders exactly what the host allows", async ({ page }) => {
  await page.goto("/?component=tree-view-expanded");
  const tree = page.getByRole("tree", { name: "Workspace sections" });
  const weekly = li(tree, "Weekly");

  // The host's list opens rows without any user gesture, and "Open:" is the
  // demo reflecting the same list the tree renders from.
  await expect(page.getByText("Open: reports")).toBeVisible();
  await expect(weekly).toBeVisible();

  // "Collapse all" empties the list; "Expand all" names both branches — in
  // each case the tree follows the prop, not its own memory of a gesture.
  await page.getByRole("button", { name: "Collapse all" }).click();
  await expect(weekly).toHaveCount(0);
  await expect(page.getByText("Open: none")).toBeVisible();

  await page.getByRole("button", { name: "Expand all" }).click();
  await expect(weekly).toBeVisible();
  await expect(li(tree, "Team")).toBeVisible();
  await expect(page.getByText("Open: reports, settings")).toBeVisible();
});
