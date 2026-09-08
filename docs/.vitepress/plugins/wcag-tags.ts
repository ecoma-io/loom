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
 * `source`, or return `null` when the page carries no marker. A source whose
 * declaration is missing or unparseable throws, naming the failing page — a
 * published scope claim that only looks like the constant is worse than a
 * build that refuses to publish one.
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
  if (!MARKER.test(markdown)) return null;

  // Comments are documentation, not declarations. This repo's own docblock
  // style quotes whole statements in `@example` blocks, and the raw-file
  // `exec` below let such a quoted `export const WCAG_TAGS = …` line win the
  // first-match race and publish itself as the scope. Stripping comments
  // before matching is the idiom tools/check-architecture.ts uses for its
  // import readers — replicated rather than imported, so the docs build does
  // not carry the architecture checker's Moon-graph registry to reuse eight
  // lines — and it is approximate for the same documented reason: a string
  // literal containing `/*`, or a full lookalike written after code on the
  // same line, survives the strip. The residual risk is bounded by the pin
  // test, which renders the real file and holds the fence to the real array.
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
 * Remove `//` whole-line comments and `/* … *&#47;` block comments. The same
 * idiom and the same limitation as tools/check-architecture.ts's
 * stripComments: a heuristic to keep documentation from being read as code,
 * not a parser — string literals containing `//` or `/*` are left intact,
 * and only comments opening a line are stripped, not trailing ones.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
