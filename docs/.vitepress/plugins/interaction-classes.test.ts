// @vitest-environment node
//
// Node rather than the project-wide jsdom, for the same reason
// wcag-tags.test.ts opts out: the expansion is a pure string transform over
// files read from disk, and the tests read the real contract and the real
// page to hold the two together.
//
// The plugin's whole purpose is the pin: the page's published class→duty
// mapping must be the law `tools/check-interaction-evidence.ts` judges the
// sidecars against, never a transcription of it. That makes this plugin a
// gate, and the law for gates applies to it too — so every failure path
// below is exercised against a synthetic source, not only asserted from
// reading the code.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expandInteractionClasses } from "./interaction-classes.ts";

const CONTRACT = fileURLToPath(
  new URL("../../../packages/core/src/a11y-contract.ts", import.meta.url),
);
const ACCESSIBILITY_PAGE = fileURLToPath(
  new URL("../../../docs/foundations/accessibility.md", import.meta.url),
);

const PAGE = "docs/foundations/accessibility.md";
const MARKER = "<!-- @interaction-classes -->";

function expand(source: string, markdown = `# Accessibility\n\n${MARKER}\n`): string | null {
  return expandInteractionClasses({ markdown, id: PAGE, source });
}

const REAL_SOURCE = () => readFileSync(CONTRACT, "utf8");

describe("expandInteractionClasses", () => {
  it("renders the table from the real contract's file", () => {
    const result = expand(REAL_SOURCE());
    expect(result).toContain("<table");
    expect(result).not.toContain(MARKER);
    // The published mapping is the matrix and duties the gate imports —
    // every class row and every duty id, straight from the file.
    expect(result).toContain("<code>keyboard-operate</code>");
    expect(result).toContain("<code>state-report</code>");
    expect(result).toContain("<code>keyboard-inert</code>");
    expect(result).toContain("interactive, composite");
    expect(result).toContain("visual-only");
    expect(result).toContain("<code>harness</code>");
    expect(result).toContain("<code>browserless</code>");
  });

  it("emits tabindex on the table — a generated table bypasses VitePress's renderers", () => {
    // VitePress writes tabindex="0" onto every table it renders from
    // markdown; raw HTML passes through as an html_block and gets nothing.
    // A table on this site is a scroll container, so dropping the attribute
    // here would ship a site-wide scrollable-region-focusable failure the
    // day this table grew wide.
    expect(expand(REAL_SOURCE())).toContain('<table tabindex="0">');
  });

  it("escapes the law's prose into attribute-safe cells", () => {
    // The answers quote obligations in prose; a future edit that names a
    // generic or an arrow must land as text, not as markup.
    const result = expand(
      'export const INTERACTION_CLASSES = ["interactive"] as const;\n' +
        "export const INTERACTION_REQUIREMENTS = [\n" +
        '  { id: "a<b", tier: "browserless", answers: ["renders <em>no</em> markup & no <script>"] },\n' +
        "] as const;\n" +
        'export const INTERACTION_MATRIX = [{ class: "interactive", requirements: ["a<b"] }] as const;\n',
    );
    expect(result).toContain("&lt;em&gt;");
    expect(result).toContain("&amp;");
    expect(result).toContain("<code>a&lt;b</code>");
    expect(result).not.toContain("<em>");
    expect(result).not.toContain("<script>");
  });

  it("does not let a docblock @example publish itself as the mapping", () => {
    const source = REAL_SOURCE();
    // The house docblock style quotes whole statements in @example blocks;
    // this one quotes a narrowed matrix, so a lookalike that won would
    // publish a mapping narrower than the gate enforces — the fail-open this
    // pins.
    const example =
      "/**\n * @example\n * ```ts\n" +
      ' * export const INTERACTION_MATRIX = [{ class: "interactive", requirements: ["keyboard-operate"] }] as const;\n' +
      " * ```\n */\n";
    const withExample = source.replace(
      /^export const INTERACTION_MATRIX/m,
      `${example}export const INTERACTION_MATRIX`,
    );
    const result = expand(withExample);
    expect(result).toContain("interactive, composite");
    expect(result).not.toContain("requirements: [");
  });

  it("fails the build when only a comment lookalike remains", () => {
    // Real CLASSES and REQUIREMENTS declarations, so the fault this case
    // hunts — a matrix that exists only inside a docblock — is the one that
    // throws, not an earlier missing declaration.
    const lookalikeOnly =
      'export const INTERACTION_CLASSES = ["interactive"] as const;\n' +
      "export const INTERACTION_REQUIREMENTS = [\n" +
      '  { id: "keyboard-operate", tier: "harness", answers: ["x"] },\n' +
      "] as const;\n" +
      "/**\n * The mapping.\n *\n * @example\n" +
      ' * export const INTERACTION_MATRIX = [{ class: "interactive", requirements: ["keyboard-operate"] }] as const;\n */\n';
    expect(() => expand(lookalikeOnly)).toThrow(/no "export const INTERACTION_MATRIX/);
  });

  it("names the failing page when a declaration is missing", () => {
    expect(() =>
      expand(
        'export const INTERACTION_CLASSES = ["interactive"] as const;\n' +
          "export const INTERACTION_MATRIX = [] as const;\n",
      ),
    ).toThrow(new RegExp(PAGE));
  });

  it("fails the build when the literals stop being parseable", () => {
    // Single quotes are valid TypeScript and invalid JSON — the table is
    // JSON-parsed on purpose, so this shape must fail here rather than
    // publish a table the page's prose calls generated.
    expect(() =>
      expand(
        'export const INTERACTION_CLASSES = ["interactive"] as const;\n' +
          "export const INTERACTION_REQUIREMENTS = [\n" +
          "  { id: 'keyboard-operate', tier: 'harness', answers: ['x'] },\n" +
          "] as const;\n" +
          "export const INTERACTION_MATRIX = [] as const;\n",
      ),
    ).toThrow(/no longer plain arrays/);
    // An unquoted identifier: valid TypeScript, no JSON value. Prettier's
    // trailing commas are tolerated; only that tolerance is.
    expect(() =>
      expand(
        'export const INTERACTION_CLASSES = ["interactive"] as const;\n' +
          "export const INTERACTION_REQUIREMENTS = [\n" +
          '  { id: keyboard-operate, tier: "harness", answers: ["x"] },\n' +
          "] as const;\n" +
          "export const INTERACTION_MATRIX = [] as const;\n",
      ),
    ).toThrow(/no longer plain arrays/);
  });

  it("tolerates the trailing commas prettier owns the file with", () => {
    const result = expand(
      'export const INTERACTION_CLASSES = ["interactive"] as const;\n' +
        "export const INTERACTION_REQUIREMENTS = [\n" +
        '  { id: "keyboard-operate", tier: "harness", answers: ["x"] },\n' +
        "] as const;\n" +
        "export const INTERACTION_MATRIX = [\n" +
        '  { class: "interactive", requirements: ["keyboard-operate"] },\n' +
        "] as const;\n",
    );
    expect(result).toContain("<code>keyboard-operate</code>");
  });

  it("fails a matrix row naming a class the vocabulary does not define", () => {
    expect(() =>
      expand(
        'export const INTERACTION_CLASSES = ["interactive"] as const;\n' +
          "export const INTERACTION_REQUIREMENTS = [\n" +
          '  { id: "keyboard-operate", tier: "harness", answers: ["x"] },\n' +
          "] as const;\n" +
          'export const INTERACTION_MATRIX = [{ class: "operable", requirements: ["keyboard-operate"] }] as const;\n',
      ),
    ).toThrow(/which INTERACTION_CLASSES does not define/);
  });

  it("fails a duty no matrix row demands — dead law is not publishable", () => {
    expect(() =>
      expand(
        'export const INTERACTION_CLASSES = ["interactive"] as const;\n' +
          "export const INTERACTION_REQUIREMENTS = [\n" +
          '  { id: "vibes", tier: "harness", answers: ["x"] },\n' +
          "] as const;\n" +
          'export const INTERACTION_MATRIX = [{ class: "interactive", requirements: ["keyboard-operate"] }] as const;\n',
      ),
    ).toThrow(/no INTERACTION_MATRIX row demands it/);
  });

  it("fails the build when an array literal is never closed", () => {
    expect(() =>
      expand(
        'export const INTERACTION_CLASSES = ["interactive", "composite" as const;\n' +
          "export const INTERACTION_REQUIREMENTS = [] as const;\n" +
          "export const INTERACTION_MATRIX = [] as const;\n",
      ),
    ).toThrow(/never closed/);
  });

  it("keeps a string literal's slashes — the comment rule cannot eat the code beside it", () => {
    // A quoted lookalike inside a string survives the strip verbatim (the
    // real-file pin bounds that), and in exchange a URL's `//` can never cut
    // a declaration that shares its line. The duty rendering proves the
    // REQUIREMENTS declaration after the URL literal was still found.
    const result = expand(
      'const ORIGIN = "https://example.com"; export const INTERACTION_CLASSES = ["interactive"] as const;\n' +
        'export const INTERACTION_REQUIREMENTS = [{ id: "keyboard-operate", tier: "harness", answers: ["x"] }] as const;\n' +
        'export const INTERACTION_MATRIX = [{ class: "interactive", requirements: ["keyboard-operate"] }] as const;\n',
    );
    expect(result).toContain("<code>keyboard-operate</code>");
  });

  it("fails a page carrying more than one marker instead of rendering the table twice", () => {
    // String.replace with a global pattern renders the claim at every marker;
    // the mapping is one claim, so a second marker is a mistake to refuse,
    // not a wish to fulfil.
    const twice = `# A\n\n${MARKER}\n\n# B\n\n${MARKER}\n`;
    expect(() =>
      expandInteractionClasses({ markdown: twice, id: PAGE, source: REAL_SOURCE() }),
    ).toThrow(/2 @interaction-classes markers/);
  });

  it("leaves pages without the marker untouched", () => {
    expect(expand(REAL_SOURCE(), "# No marker here\n")).toBeNull();
  });
});

describe("the published interaction claim", () => {
  // The expansion fails loud on a law the page misquotes, but a page that
  // drops the marker entirely builds clean with no claim at all — this is
  // the pin on the other direction: the marker's disappearance must fail a
  // test, not pass silently.
  it("still carries the @interaction-classes marker", () => {
    expect(readFileSync(ACCESSIBILITY_PAGE, "utf8")).toMatch(/<!--\s*@interaction-classes\s*-->/);
  });
});
