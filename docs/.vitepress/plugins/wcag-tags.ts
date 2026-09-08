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
import { fileURLToPath } from "node:url";

const A11Y_SCOPE = fileURLToPath(
  new URL("../../../packages/core/src/a11y-scope.ts", import.meta.url),
);

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
      if (!MARKER.test(markdown)) return null;

      this.addWatchFile?.(A11Y_SCOPE);
      const source = await readFile(A11Y_SCOPE, "utf8");
      const match = DECLARATION.exec(source);
      if (match?.groups?.literal === undefined) {
        throw new Error(
          `${A11Y_SCOPE}: no "export const WCAG_TAGS = [...] as const" declaration found. ` +
            `The accessibility page renders its fence from that constant, so the page cannot be built.`,
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
            `accessibility page cannot render it. Keep the array plain JSON values.`,
        );
      }

      const fence =
        "```ts\n" +
        "// packages/core/src/a11y-scope.ts\n" +
        `export const WCAG_TAGS = ${match.groups.literal.trim()} as const;\n` +
        "```";

      return markdown.replace(MARKER, () => fence);
    },
  };
}
