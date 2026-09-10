// @vitest-environment node
//
// Node rather than the project-wide jsdom, for the same reason
// check-doc-claims.test.ts opts out: these are pure checks over page text,
// and the law for gates (docs/architecture/evolution-ledger.md: "every new
// enforcement rule ships with a negative/mutation test") means every failure
// path below is exercised, not only asserted from reading the code. The real
// tree is what `pnpm lint` runs the gate against.
import { describe, expect, it } from "vitest";

import { checkPatternRecords, intentFromFrontmatter } from "./check-pattern-records.ts";

const MARKER = (name: string): string => `<!-- @pattern-record ${name} -->`;

function page({
  intent = 'intent: "A region with nothing to show: icon, title, at most one action."',
  marker = MARKER("EmptyState"),
  body = "\n# EmptyState\n",
}: {
  intent?: string | null;
  marker?: string | null;
  body?: string;
} = {}): string {
  const frontmatter = intent === null ? "" : `---\n${intent}\n---\n`;
  const record = marker === null ? "" : `\n## Canonical record\n\n${marker}\n`;
  return `${frontmatter}${body}${record}`;
}

function inputs({
  patterns = ["empty-state"],
  pages = { "empty-state": page() },
  componentNames = ["EmptyState"],
}: {
  patterns?: string[];
  pages?: Record<string, string>;
  componentNames?: string[];
} = {}) {
  return {
    patterns,
    pages: new Map(Object.entries(pages)),
    componentNames: new Set(componentNames),
  };
}

describe("checkPatternRecords", () => {
  it("passes a page that carries the whole record", () => {
    expect(checkPatternRecords(inputs())).toEqual([]);
  });

  it("fails a pattern with no docs page at all", () => {
    const failures = checkPatternRecords(inputs({ pages: {} }));
    expect(failures).toEqual([
      "EmptyState: no docs/patterns/empty-state.md — nothing carries its canonical record",
    ]);
  });

  it("fails a page that lost the record marker", () => {
    const failures = checkPatternRecords(
      inputs({ pages: { "empty-state": page({ marker: null }) } }),
    );
    expect(failures[0]).toContain("has no <!-- @pattern-record EmptyState --> marker");
  });

  it("fails a page carrying the marker twice", () => {
    const doubled = page() + `\n${MARKER("EmptyState")}\n`;
    const failures = checkPatternRecords(inputs({ pages: { "empty-state": doubled } }));
    expect(failures[0]).toContain("2 @pattern-record markers");
  });

  it("fails a marker that names a different pattern than its page", () => {
    const failures = checkPatternRecords(
      inputs({ pages: { "empty-state": page({ marker: MARKER("ErrorState") }) } }),
    );
    expect(failures[0]).toContain("record marker names ErrorState");
  });

  it("fails a page whose frontmatter lost the intent", () => {
    for (const intent of [null, "title: x"]) {
      const failures = checkPatternRecords(inputs({ pages: { "empty-state": page({ intent }) } }));
      expect(failures[0]).toContain("no `intent:`");
    }
  });

  it("fails the intent shapes the docs renderer refuses, so lint never passes a page the build fails", () => {
    for (const intent of [
      'intent: ""',
      'intent: "a"\nintent: "b"',
      "intent: |\n  one\n  two",
      "intent: The shape: icon, title, action",
    ]) {
      const failures = checkPatternRecords(inputs({ pages: { "empty-state": page({ intent }) } }));
      expect(failures.length).toBeGreaterThan(0);
    }
  });

  it("fails a stale marker on a page that is not a shipped pattern's page", () => {
    // The worked-example pages share the directory; a record marker there
    // pairs with nothing the gate enumerated.
    const failures = checkPatternRecords(
      inputs({
        pages: { "empty-state": page(), "forms.md-residue": page() },
      }),
    );
    // "forms.md-residue" is not a shipped pattern; its marker names a real
    // component, so the failure is the pairing one.
    expect(failures[0]).toContain("packages/patterns/forms.md-residue does not exist");
  });

  it("fails a marker naming no component at all", () => {
    const failures = checkPatternRecords(
      inputs({ pages: { "empty-state": page(), forms: page({ marker: MARKER("NoSuchThing") }) } }),
    );
    expect(failures[0]).toContain("names no component under packages/");
  });

  it("reads the whole tiered tree for the mirror check, not just the patterns tier", () => {
    // A component renamed out of the patterns tier must stop satisfying a
    // stale marker — the mirror consults every tier the artifact gate pairs.
    const failures = checkPatternRecords(
      inputs({
        pages: { "empty-state": page(), forms: page({ marker: MARKER("DashboardGrid") }) },
        componentNames: ["EmptyState", "DashboardGrid"],
      }),
    );
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain("does not exist");
  });
});

describe("intentFromFrontmatter", () => {
  it("strips the quotes it accepts", () => {
    expect(
      intentFromFrontmatter('---\nintent: "One labelled value and its trend"\n---\n').value,
    ).toBe("One labelled value and its trend");
    expect(
      intentFromFrontmatter("---\nintent: One labelled value and its trend\n---\n").value,
    ).toBe("One labelled value and its trend");
  });

  it("accepts a quoted intent that carries a colon-space", () => {
    // Quoting is what makes the value YAML; the refusal above is for the
    // unquoted shape, whose frontmatter parse would fail the build later.
    expect(
      intentFromFrontmatter('---\nintent: "The shape: icon, title, at most one action"\n---\n')
        .failures,
    ).toEqual([]);
  });

  it("fails a page with no frontmatter block", () => {
    expect(intentFromFrontmatter("# EmptyState\n").failures[0]).toContain("no `intent:`");
  });
});
