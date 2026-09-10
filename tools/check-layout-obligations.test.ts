// @vitest-environment node
//
// Node rather than the project-wide jsdom, for the same reason
// check-pattern-records.test.ts opts out: the gate is a pure function over
// page sources and directory listings, and the tests drive it with synthetic
// trees so every failure path is exercised, not only asserted from reading
// the code. The gate's whole purpose is the census: a layout page that loses
// its obligations must fail by name here, never quietly.
import { describe, expect, it } from "vitest";

import {
  checkLayoutObligations,
  compositionFromFrontmatter,
  type LayoutObligationInputs,
} from "./check-layout-obligations.ts";

const MARKER = (name: string): string => `<!-- @layout-obligations ${name} -->`;

function page(markdown: string): string {
  return `---\ncomposition: "One shell owning a rail, a header band and a filling content area."\n---\n${markdown}`;
}

function inputs({
  layouts = ["app-shell"],
  pages = new Map([["app-shell", page(`# AppShell\n\n${MARKER("AppShell")}\n`)]]),
  componentNames = new Set(["AppShell"]),
}: Partial<LayoutObligationInputs> = {}): LayoutObligationInputs {
  return { layouts, pages, componentNames };
}

describe("checkLayoutObligations", () => {
  it("passes a complete page — claim in frontmatter, one marker naming its own layout", () => {
    expect(checkLayoutObligations(inputs())).toEqual([]);
  });

  it("fails a shipped layout with no page at all", () => {
    const failures = checkLayoutObligations(inputs({ pages: new Map() }));
    expect(failures).toEqual([
      "AppShell: no docs/layouts/app-shell.md — nothing carries its four obligations",
    ]);
  });

  it("fails a page whose frontmatter carries no composition claim", () => {
    const pages = new Map([["app-shell", `# AppShell\n\n${MARKER("AppShell")}\n`]]);
    const failures = checkLayoutObligations(inputs({ pages }));
    expect(failures[0]).toContain("AppShell: frontmatter carries no `composition:`");
  });

  it("fails a page with no marker — the obligations are never rendered", () => {
    const pages = new Map([["app-shell", page("# AppShell\n")]]);
    const failures = checkLayoutObligations(inputs({ pages }));
    expect(failures[0]).toContain(
      "AppShell: docs/layouts/app-shell.md has no <!-- @layout-obligations AppShell --> marker",
    );
  });

  it("fails a page carrying two markers — the obligations are one claim", () => {
    const pages = new Map([
      ["app-shell", page(`# AppShell\n\n${MARKER("AppShell")}\n${MARKER("AppShell")}\n`)],
    ]);
    const failures = checkLayoutObligations(inputs({ pages }));
    expect(failures[0]).toContain("carries 2 @layout-obligations markers");
  });

  it("fails a marker naming another layout — a page's obligations are its own", () => {
    const pages = new Map([["app-shell", page(`${MARKER("Dashboard")}\n`)]]);
    const failures = checkLayoutObligations(inputs({ pages }));
    expect(failures).toContainEqual(
      expect.stringContaining(
        "AppShell: docs/layouts/app-shell.md's obligations marker names Dashboard",
      ),
    );
  });

  it("fails a stray marker on a page that pairs with no shipped layout", () => {
    const pages = new Map([
      ["app-shell", page(`# AppShell\n\n${MARKER("AppShell")}\n`)],
      ["retired-shell", page(`${MARKER("RetiredShell")}\n`)],
    ]);
    const failures = checkLayoutObligations(
      inputs({ pages, componentNames: new Set(["AppShell", "RetiredShell"]) }),
    );
    expect(failures).toContainEqual(
      expect.stringContaining(
        "retired-shell: carries a @layout-obligations marker for RetiredShell, but packages/layouts/retired-shell does not exist",
      ),
    );
  });

  it("fails a marker naming no component under packages/", () => {
    const pages = new Map([
      ["app-shell", page(`# AppShell\n\n${MARKER("AppShell")}\n`)],
      ["not-a-layout", page(`${MARKER("NotAComponent")}\n`)],
    ]);
    const failures = checkLayoutObligations(inputs({ pages }));
    expect(failures).toContainEqual(
      expect.stringContaining(
        "not-a-layout: <!-- @layout-obligations NotAComponent --> names no component under packages/",
      ),
    );
  });

  it("keeps counting past the first defective layout — the census is the whole tier", () => {
    const pages = new Map([
      ["app-shell", page(`# AppShell\n\n${MARKER("AppShell")}\n`)],
      ["dashboard", "# Dashboard\n"],
    ]);
    const failures = checkLayoutObligations(inputs({ layouts: ["app-shell", "dashboard"], pages }));
    expect(failures.some((f) => f.startsWith("Dashboard: frontmatter"))).toBe(true);
    expect(failures.some((f) => f.startsWith("Dashboard: docs/layouts/dashboard.md has no"))).toBe(
      true,
    );
  });
});

describe("compositionFromFrontmatter", () => {
  it("reads a quoted single-line claim with any character a sentence needs", () => {
    const { value, failures } = compositionFromFrontmatter(
      '---\ncomposition: "A shell: rail, header, content."\n---\n# AppShell\n',
    );
    expect(failures).toEqual([]);
    expect(value).toBe("A shell: rail, header, content.");
  });

  it("refuses an unquoted claim that is not a plain scalar", () => {
    const { failures } = compositionFromFrontmatter(
      "---\ncomposition: |\n  a block\n---\n# AppShell\n",
    );
    expect(failures[0]).toContain("block scalar, a flow collection, or an unquoted value");
  });

  it("refuses an unquoted claim carrying a colon — the frontmatter parse would fail later", () => {
    const { failures } = compositionFromFrontmatter(
      "---\ncomposition: A shell: rail, header, content.\n---\n# AppShell\n",
    );
    expect(failures[0]).toContain("block scalar, a flow collection, or an unquoted value");
  });

  it("refuses an empty claim", () => {
    const { failures } = compositionFromFrontmatter('---\ncomposition: ""\n---\n');
    expect(failures[0]).toContain("the composition claim is empty");
  });

  it("refuses a page with no frontmatter at all", () => {
    const { failures } = compositionFromFrontmatter("# AppShell\n");
    expect(failures[0]).toContain("frontmatter carries no `composition:`");
  });
});
