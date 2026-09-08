// The accessibility page publishes the `WCAG_TAGS` array as the scope Loom
// holds itself to. Quoting it by hand would be the same second-copy drift the
// `@tokens` and `@api` markers exist to prevent — worse, here, because the
// array is the single source the axe gates read: a stale quote would be the
// published claim disagreeing with the gates that enforce it. So the fence is
// expanded from the constant's own file at build time, and the page carries
// no literal of its own.
//
// Usage, in any markdown page:
//
//     <!-- @wcag-tags -->
//
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

const A11Y_SCOPE = fileURLToPath(
  new URL("../../../packages/core/src/a11y-scope.ts", import.meta.url),
);

// The fence's label comment is derived from the resolved path rather than
// written beside it: the source path above is already the one edit a
// relocation costs, and a second, hardcoded copy of it would publish the old
// location the day the constant moves.
const FENCE_LABEL = `// ${relative(REPO_ROOT, A11Y_SCOPE)}`;

const MARKER = /^[ \t]*<!--[ \t]*@wcag-tags[ \t]*-->[ \t]*$/gm;

const DECLARATION = /export const WCAG_TAGS = (?<literal>\[[^\]]*\]) as const;/;

/**
 * Expands `<!-- @wcag-tags -->` markers in markdown pages before VitePress
 * renders them, reading `a11y-scope.ts` fresh each run so the page can never
 * disagree with the constant the gates import.
 */
export function wcagTags() {
  return {
    name: "loom:wcag-tags",
    enforce: "pre" as const,
    async transform(this: { addWatchFile?: (id: string) => void }, markdown: string, id: string) {
      if (!id.endsWith(".md")) return null;
      MARKER.lastIndex = 0;
      // Checked here so a page without the marker costs no file read; the
      // expansion re-tests it because it owns the marker-to-fence decision.
      if (!MARKER.test(markdown)) return null;

      this.addWatchFile?.(A11Y_SCOPE);
      const source = await readFile(A11Y_SCOPE, "utf8");
      return expandWcagTags({ markdown, id, source });
    },
  };
}

/**
 * Replace the `@wcag-tags` marker in one page with the fence rendered from
 * `source`, or return `null` when the page carries no marker. Two sources
 * throw, naming the failing page: one carrying more than one marker — the
 * scope is a single published claim, and `String.replace` with a global
 * pattern would otherwise render the fence at every marker, doubling a claim
 * that the accessibility page is supposed to state exactly once — and one
 * whose declaration is missing or unparseable. A published scope claim that
 * only looks like the constant is worse than a build that refuses to publish
 * one.
 *
 * Split from the plugin hook so the tests can hold the expansion to its own
 * contract against synthetic sources instead of only the tree's current file.
 */
export function expandWcagTags({
  markdown,
  id,
  source,
}: {
  markdown: string;
  id: string;
  source: string;
}): string | null {
  MARKER.lastIndex = 0;
  // match, not test: a global pattern's lastIndex advances across both calls,
  // and the count is what the duplicate-marker decision below needs anyway.
  const markerCount = markdown.match(MARKER)?.length ?? 0;
  if (markerCount === 0) return null;
  if (markerCount > 1) {
    throw new Error(
      `${id}: carries ${String(markerCount)} @wcag-tags markers. The scope is one ` +
        `claim; render it once and point the second reader at this page.`,
    );
  }

  // Comments are documentation, not declarations. This repo's own docblock
  // style quotes whole statements in `@example` blocks, and the raw-file
  // `exec` below let such a quoted `export const WCAG_TAGS = …` line win the
  // first-match race and publish itself as the scope. Stripping comments
  // before matching is the idiom tools/check-architecture.ts uses for its
  // import readers — replicated rather than imported, so the docs build does
  // not carry the architecture checker's Moon-graph registry to reuse eight
  // lines — and it is approximate for the same documented reason: a regex
  // literal's content can masquerade as a comment or a quote, and template
  // interpolation is read as template text. Both residuals fail toward the
  // throw (the declaration comes out missing or mangled), never toward
  // publishing a lookalike — and the pin test renders the real file and holds
  // the fence to the real array. The review of #269 sharpened why this cannot
  // stay a line-opening regex: `const LEGACY = true; // superseded: export
  // const WCAG_TAGS = ["wcag2a"] as const;` published the commented-out
  // lookalike, and with no real declaration it published nothing and still
  // passed — both because the strip never reached a trailing `//`.
  const match = DECLARATION.exec(stripComments(source));
  if (match?.groups?.literal === undefined) {
    throw new Error(
      `${A11Y_SCOPE}: no "export const WCAG_TAGS = [...] as const" declaration found. ` +
        `The accessibility page renders its fence from that constant, so the page cannot be built. ` +
        `Failing page: ${id}.`,
    );
  }
  // Parsed, not emitted blind: a literal that has stopped being valid JSON
  // (a comment inside the array, a trailing comma) must fail the build
  // here rather than publish a fence that only looks like the constant.
  try {
    JSON.parse(match.groups.literal);
  } catch {
    throw new Error(
      `${A11Y_SCOPE}: the WCAG_TAGS literal is no longer valid JSON, so the ` +
        `accessibility page cannot render it. Keep the array plain JSON values. ` +
        `Failing page: ${id}.`,
    );
  }

  const fence =
    "```ts\n" +
    `${FENCE_LABEL}\n` +
    `export const WCAG_TAGS = ${match.groups.literal.trim()} as const;\n` +
    "```";

  return markdown.replace(MARKER, () => fence);
}

/**
 * Remove `//` line comments (wherever they sit on the line) and `/* … *&#47;`
 * block comments, copying string literals through verbatim. A scanner rather
 * than two regexes, because the line-opening regex this used to be let the
 * trailing-comment shape through — the very shape a lookalike hides best in —
 * and its block-comment pass reached into strings to find a terminator. The
 * scanner's trade: a quote opens only outside comments, a comment opens only
 * outside quotes, and the residuals named in expandWcagTags (regex literals,
 * template interpolation) fail toward the throw rather than toward a wrong
 * publish. String contents are copied byte for byte, backslash escapes
 * included, so a `"https://…"` literal can neither start nor swallow a
 * comment.
 */
function stripComments(text: string): string {
  let out = "";
  let quote: string | null = null;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    // Unreachable in practice — the loop condition bounds i — but noUnchecked-
    // IndexedAccess types the index read as possibly absent, and the config
    // forbids both the non-null assertion and the equivalent type assertion.
    if (ch === undefined) break;
    if (quote !== null) {
      out += ch;
      // An escaped quote is data, not the end of the literal.
      if (ch === "\\") {
        out += text[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      // The newline itself survives, so a declaration on the following line
      // is still matched on its own line.
      const end = text.indexOf("\n", i);
      i = end === -1 ? text.length : end;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}
