// @vitest-environment node
//
// Node rather than the project-wide jsdom, for the same reason
// wcag-tags.test.ts opts out: the expansion is a pure string transform over
// files read from disk, and the tests read the real contract and hold the
// rendered record to it against synthetic sidecars.
//
// The plugin's whole purpose is the record split: the intent authored once in
// frontmatter, the evidence rendered from the sidecar the gates enforce —
// never transcribed. That makes this plugin a gate, and the law for gates
// (docs/architecture/evolution-ledger.md: "every new enforcement rule ships
// with a negative/mutation test") applies to it too — so every failure path
// below is exercised, not only asserted from reading the code.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expandPatternRecord, readIntent, readTiers } from "./pattern-record.ts";

const CONTRACT = fileURLToPath(
  new URL("../../../packages/core/src/a11y-contract.ts", import.meta.url),
);
const CONFIG = fileURLToPath(new URL("../config.mts", import.meta.url));

const PAGE = "docs/patterns/metric-card.md";
const SIDECAR = "packages/patterns/metric-card/a11y.json";
const MARKER = "<!-- @pattern-record MetricCard -->";

const INTENT = '---\nintent: "One labelled value with its trend, sized to scan in a row."\n---\n';
const FRONTMATTER = `${INTENT}\n# MetricCard\n\n## Canonical record\n\n${MARKER}\n`;

const SIDECAR_SOURCE = JSON.stringify({
  role: "none",
  basis: "renders a plain div — no role asserted.",
  evidence: {
    browserless: ["docs/demos/MetricCardDemo.vue"],
    harness: [],
    sweep: [
      {
        path: "docs/patterns/metric-card.md",
        because: "the sweep witnesses the rendered card, not a state the demo does not show",
      },
    ],
  },
  exceptions: [],
});

function expand({
  markdown = FRONTMATTER,
  sidecarSource = SIDECAR_SOURCE,
  tiers = ["browserless", "harness", "sweep"],
}: {
  markdown?: string;
  sidecarSource?: string;
  tiers?: string[];
} = {}): string | null {
  return expandPatternRecord({
    markdown,
    id: PAGE,
    tiers,
    sidecarPath: SIDECAR,
    sidecarSource,
  });
}

describe("expandPatternRecord", () => {
  it("renders the intent and the evidence table from the real tier list", () => {
    const tiers = readTiers(readFileSync(CONTRACT, "utf8"));
    const result = expand({ tiers });
    expect(result).toContain(
      "**Intent.** One labelled value with its trend, sized to scan in a row.",
    );
    // One row per contract tier, in the contract's order, with the empty tier
    // rendered as an absence rather than dropped — the record must show what
    // a pattern does not carry as clearly as what it does.
    expect(result).toContain("| `browserless` | `docs/demos/MetricCardDemo.vue` |");
    expect(result).toContain("| `harness` | — |");
    expect(result).toContain("| `sweep` |");
    expect(result).not.toContain(MARKER);
  });

  it("renders a qualified entry's scope next to its path", () => {
    const result = expand();
    expect(result).toContain("`docs/patterns/metric-card.md` — _the sweep witnesses");
  });

  it("names the exception count and requirements the sidecar records", () => {
    const result = expand({
      sidecarSource: JSON.stringify({
        role: "region",
        basis: "basis",
        evidence: {},
        exceptions: [
          { requirement: "keyboard", because: "3D's floor" },
          { requirement: "focus-not-obscured", because: "suite population" },
        ],
      }),
    });
    expect(result).toContain("2 named exceptions (`keyboard`, `focus-not-obscured`)");
    expect(result).toContain(SIDECAR);
  });

  it("carries no exception line when the claim records none", () => {
    expect(expand()).not.toContain("named exception");
  });

  it("leaves pages without the marker untouched", () => {
    expect(expand({ markdown: INTENT + "\n# No marker here\n" })).toBeNull();
  });

  it("fails a page carrying more than one marker instead of rendering the record twice", () => {
    const twice = FRONTMATTER + `\n${MARKER}\n`;
    expect(() => expand({ markdown: twice })).toThrow(/2 @pattern-record markers/);
  });

  it("fails the build when the sidecar stops parsing", () => {
    expect(() => expand({ sidecarSource: "{ not json" })).toThrow(/does not parse as JSON/);
  });

  it("fails the build when the sidecar names a tier the contract does not", () => {
    // Rendering an unknown tier would publish a claim about evidence the
    // contract has no opinion on; the a11y-evidence gate fails the same tree,
    // and the page refuses to render rather than publish either way.
    expect(() =>
      expand({
        sidecarSource: JSON.stringify({
          role: "none",
          basis: "basis",
          evidence: { interaction: ["spec.ts"] },
          exceptions: [],
        }),
      }),
    ).toThrow(/no such tier/);
  });
});

describe("readIntent", () => {
  it("reads a quoted single-line intent and strips the quotes", () => {
    expect(readIntent(INTENT + "# MetricCard\n", PAGE)).toBe(
      "One labelled value with its trend, sized to scan in a row.",
    );
  });

  it("reads an unquoted single-line intent", () => {
    expect(readIntent("---\nintent: One labelled value and its trend\n---\n", PAGE)).toBe(
      "One labelled value and its trend",
    );
  });

  it("reads a quoted intent carrying a colon — quoting is what makes the value YAML", () => {
    // The real pages' intents are quoted sentences that name an arrangement
    // after a colon; the colon refusal below is for the unquoted form only.
    expect(
      readIntent('---\nintent: "The shape: icon, title, at most one action"\n---\n', PAGE),
    ).toBe("The shape: icon, title, at most one action");
  });

  it("fails a page with no frontmatter block", () => {
    expect(() => readIntent(`# MetricCard\n\n${MARKER}\n`, PAGE)).toThrow(/no frontmatter block/);
  });

  it("fails frontmatter with no intent key", () => {
    expect(() => readIntent("---\ntitle: x\n---\n", PAGE)).toThrow(/no `intent:`/);
  });

  it("fails frontmatter with two intent keys", () => {
    expect(() => readIntent('---\nintent: "a"\nintent: "b"\n---\n', PAGE)).toThrow(
      /2 `intent:` keys/,
    );
  });

  it("fails a block scalar instead of rendering it as a run-on paragraph", () => {
    expect(() => readIntent("---\nintent: |\n  one\n  two\n---\n", PAGE)).toThrow(/block scalar/);
  });

  it("fails an unquoted value carrying a YAML colon-space", () => {
    // That shape is not valid YAML: the site's frontmatter parse would fail
    // later with an error that no longer names the intent, so the renderer
    // refuses it here, where the page is still named.
    expect(() => readIntent("---\nintent: The shape: icon, title, action\n---\n", PAGE)).toThrow(
      /carrying a colon/,
    );
  });

  it("fails an empty intent", () => {
    expect(() => readIntent('---\nintent: ""\n---\n', PAGE)).toThrow(/intent is empty/);
  });
});

describe("readTiers", () => {
  it("reads the real contract's tier list", () => {
    // The vocabulary is shared across the repo's docs and gates; the plugin
    // derives its rows from it, so the pin is that the derivation reads the
    // real file, not that the file carries a frozen list.
    expect(readTiers(readFileSync(CONTRACT, "utf8"))).toEqual(["browserless", "harness", "sweep"]);
  });

  it("fails a source that no longer declares the tiers", () => {
    expect(() => readTiers("export const OTHER = 1;\n")).toThrow(
      /no "export const A11Y_EVIDENCE_TIERS/,
    );
  });

  it("fails a tier list that stops being valid JSON", () => {
    expect(() =>
      readTiers('export const A11Y_EVIDENCE_TIERS = ["browserless",] as const;\n'),
    ).toThrow(/no longer valid JSON/);
  });
});

describe("the record's wiring", () => {
  // The gate in pnpm lint holds the pages to the record's shape, but a plugin
  // nobody registers would leave every marker an inert comment — the record
  // present in source, rendered nowhere, and every build green. This is the
  // pin on that direction.
  it("registers the patternRecord plugin in the VitePress config", () => {
    expect(readFileSync(CONFIG, "utf8")).toMatch(/patternRecord\(\)/);
  });
});
