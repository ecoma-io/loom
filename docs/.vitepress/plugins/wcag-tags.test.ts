// @vitest-environment node
//
// Node rather than the project-wide jsdom, for the same reason
// tools/check-architecture.test.ts opts out: the expansion is a pure string
// transform over files read from disk, and the tests read the real constant
// and the real page to hold the two together.
//
// The plugin's whole purpose is the M8 pin: the page's published WCAG scope
// must be the array the gates import, never a transcription of it. That makes
// this plugin a gate, and the law for gates (docs/architecture/evolution-
// ledger.md: "every new enforcement rule ships with a negative/mutation
// test") applies to it too — so every failure path below is exercised
// against a synthetic source, not only asserted from reading the code.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expandWcagTags } from "./wcag-tags.ts";

const A11Y_SCOPE = fileURLToPath(
  new URL("../../../packages/core/src/a11y-scope.ts", import.meta.url),
);
const ACCESSIBILITY_PAGE = fileURLToPath(
  new URL("../../../docs/foundations/accessibility.md", import.meta.url),
);

const PAGE = "docs/foundations/accessibility.md";
const MARKER = "<!-- @wcag-tags -->";

function expand(source: string, markdown = `# Accessibility\n\n${MARKER}\n`): string | null {
  return expandWcagTags({ markdown, id: PAGE, source });
}

/** The real declaration line, as the constant's own file carries it. */
function realDeclaration(source: string): string {
  // Anchored to the statement's own line so a docblock example cannot be
  // mistaken for it — the same distinction the plugin itself now draws.
  const match = /^export const WCAG_TAGS = .*$/m.exec(source);
  if (!match) throw new Error("the real a11y-scope.ts no longer declares WCAG_TAGS");
  return match[0];
}

describe("expandWcagTags", () => {
  it("renders the fence from the real constant's file", () => {
    const source = readFileSync(A11Y_SCOPE, "utf8");
    const result = expand(source);
    // The fence must carry the array the gates import — which is why the
    // expectation is derived from the file, not written beside it.
    expect(result).toContain("```ts");
    expect(result).toContain("// packages/core/src/a11y-scope.ts");
    expect(result).toContain(realDeclaration(source));
    expect(result).not.toContain(MARKER);
  });

  it("does not let a docblock @example publish itself as the scope", () => {
    const source = readFileSync(A11Y_SCOPE, "utf8");
    // The house docblock style quotes whole statements in @example blocks;
    // this one quotes a narrowed array, so a lookalike that won would render
    // a scope narrower than the gates enforce — the fail-open this pins.
    const example =
      "/**\n * @example\n * ```ts\n" +
      ' * export const WCAG_TAGS = ["wcag2a", "wcag2aa"] as const;\n' +
      " * ```\n */\n";
    const withExample = source.replace(
      /^export const WCAG_TAGS/m,
      `${example}export const WCAG_TAGS`,
    );
    const result = expand(withExample);
    expect(result).toContain(realDeclaration(source));
    expect(result).not.toContain('["wcag2a", "wcag2aa"]');
  });

  it("fails the build when only a comment lookalike remains", () => {
    const lookalikeOnly =
      "/**\n * The scope.\n *\n * @example\n" +
      ' * export const WCAG_TAGS = ["wcag2a", "wcag2aa"] as const;\n */\n';
    expect(() => expand(lookalikeOnly)).toThrow(/no "export const WCAG_TAGS/);
  });

  it("names the failing page when the declaration is missing", () => {
    expect(() => expand("export const OTHER = 1;\n")).toThrow(new RegExp(PAGE));
  });

  it("fails the build when the literal stops being valid JSON", () => {
    expect(() => expand('export const WCAG_TAGS = ["wcag2a",] as const;\n')).toThrow(
      /no longer valid JSON/,
    );
    // Single quotes are valid TypeScript and invalid JSON — the fence is
    // JSON-parsed on purpose, so this shape must fail here rather than
    // publish a fence the page's prose calls JSON.
    expect(() => expand("export const WCAG_TAGS = ['wcag2a'] as const;\n")).toThrow(
      /no longer valid JSON/,
    );
  });

  it("leaves pages without the marker untouched", () => {
    const source = readFileSync(A11Y_SCOPE, "utf8");
    expect(expand(source, "# No marker here\n")).toBeNull();
  });
});

describe("the published scope claim", () => {
  // The expansion fails loud on a constant the page misquotes, but a page
  // that drops the marker entirely builds clean with no claim at all — the
  // plugin has nothing to expand. This is the pin on the other direction:
  // the marker's disappearance must fail a test, not pass silently.
  it("still carries the @wcag-tags marker", () => {
    expect(readFileSync(ACCESSIBILITY_PAGE, "utf8")).toMatch(/<!--\s*@wcag-tags\s*-->/);
  });
});
