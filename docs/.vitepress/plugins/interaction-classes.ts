// The accessibility page publishes the interaction classes — the second axis
// of every sidecar's claim — as the law's own words. Quoting them by hand
// would be the same second-copy drift the `@wcag-tags` marker exists to
// prevent, with a sharper edge: the class→duty mapping is what
// `tools/check-interaction-evidence.ts` judges every component against, so a
// stale quote would be the published claim disagreeing with the gate that
// enforces it. So the table is expanded from `a11y-contract.ts` at build
// time, and the page carries no literal of its own.
//
// The parser replicates the wcag-tags idiom rather than importing it: the
// docs build must not carry `tools/` to read eight lines, and the literal
// here is nested (an array of objects of arrays), so the bracket extraction
// is a depth-counting scan rather than the flat-array regex the older plugin
// could afford.
//
// Usage, in any markdown page:
//
//     <!-- @interaction-classes -->
//
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const CONTRACT = fileURLToPath(
  new URL("../../../packages/core/src/a11y-contract.ts", import.meta.url),
);

const MARKER = /^[ \t]*<!--[ \t]*@interaction-classes[ \t]*-->[ \t]*$/gm;

/**
 * Expands `<!-- @interaction-classes -->` markers in markdown pages before
 * VitePress renders them, reading `a11y-contract.ts` fresh each run so the
 * page can never disagree with the matrix the gate imports.
 */
export function interactionClasses() {
  return {
    name: "loom:interaction-classes",
    enforce: "pre" as const,
    async transform(this: { addWatchFile?: (id: string) => void }, markdown: string, id: string) {
      if (!id.endsWith(".md")) return null;
      MARKER.lastIndex = 0;
      // Checked here so a page without the marker costs no file read; the
      // expansion re-tests it because it owns the marker-to-table decision.
      if (!MARKER.test(markdown)) return null;

      this.addWatchFile?.(CONTRACT);
      const source = await readFile(CONTRACT, "utf8");
      return expandInteractionClasses({ markdown, id, source });
    },
  };
}

/**
 * Replace the `@interaction-classes` marker in one page with the table
 * rendered from `source`, or return `null` when the page carries no marker.
 * Same two throws, naming the failing page, as the wcag-tags expansion: one
 * carrying more than one marker — the mapping is a single published claim —
 * and one whose declarations are missing, malformed or no longer valid JSON.
 * A published mapping that only looks like the law is worse than a build
 * that refuses to publish one.
 *
 * Split from the plugin hook so the tests can hold the expansion to its own
 * contract against synthetic sources instead of only the tree's current file.
 */
export function expandInteractionClasses({
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
      `${id}: carries ${String(markerCount)} @interaction-classes markers. The ` +
        `class-to-duty mapping is one claim; render it once and point the ` +
        `second reader at this page.`,
    );
  }

  const classes = extractLiteral(source, "INTERACTION_CLASSES", id);
  const requirements = extractLiteral(source, "INTERACTION_REQUIREMENTS", id);
  const matrix = extractLiteral(source, "INTERACTION_MATRIX", id);
  // Parsed, not emitted blind: a literal that has stopped being valid JSON
  // must fail the build here rather than publish a table that only looks
  // like the law.
  let vocabulary: unknown;
  let duties: unknown;
  let rows: unknown;
  try {
    vocabulary = JSON.parse(toParseable(classes));
    duties = JSON.parse(toParseable(requirements));
    rows = JSON.parse(toParseable(matrix));
  } catch {
    throw new Error(
      `${CONTRACT}: the interaction literals are no longer plain arrays of ` +
        `plain objects, so the accessibility page cannot render them. ` +
        `Failing page: ${id}.`,
    );
  }
  if (!Array.isArray(vocabulary) || !Array.isArray(rows)) {
    throw new Error(
      `${CONTRACT}: INTERACTION_CLASSES and INTERACTION_MATRIX must be arrays for ` +
        `the table to render. Failing page: ${id}.`,
    );
  }

  // Duty rows come from the definitions; the classes each duty is owed by
  // come from the matrix, so the published mapping cannot say a duty is owed
  // by a class the matrix does not judge — or fall out of the vocabulary.
  const byDuty = new Map<string, string[]>();
  for (const row of rows) {
    if (!isRow(row)) throw malformed("INTERACTION_MATRIX", id);
    if (!vocabulary.includes(row.class)) {
      throw new Error(
        `${CONTRACT}: INTERACTION_MATRIX names the class "${row.class}", which ` +
          `INTERACTION_CLASSES does not define. Failing page: ${id}.`,
      );
    }
    for (const duty of row.requirements) {
      byDuty.set(duty, [...(byDuty.get(duty) ?? []), row.class]);
    }
  }
  if (!Array.isArray(duties)) throw malformed("INTERACTION_REQUIREMENTS", id);
  const body = duties.map((duty) => {
    if (!isDuty(duty)) throw malformed("INTERACTION_REQUIREMENTS", id);
    const owedBy = byDuty.get(duty.id);
    if (owedBy === undefined) {
      // A duty no matrix row demands is dead law — the gate's own parity
      // check fails the lint for it, and the page refuses to publish a row
      // nothing owes.
      throw new Error(
        `${CONTRACT}: the duty "${duty.id}" is defined but no INTERACTION_MATRIX ` +
          `row demands it. Failing page: ${id}.`,
      );
    }
    return [
      `<code>${escapeHtml(duty.id)}</code>`,
      escapeHtml(owedBy.join(", ")),
      `<code>${escapeHtml(duty.tier)}</code>`,
      escapeHtml(duty.answers.join(" ")),
    ];
  });

  // `tabindex="0"` because a generated table bypasses VitePress's table
  // renderers (markdown-it passes raw HTML through as an html_block), and a
  // table on this site is a scroll container whose focusability the
  // scrollable-region-focusable rule demands — the same hand-emitted
  // attribute design-tokens.ts carries for the same measured reason.
  const table =
    `<table tabindex="0">\n<thead><tr><th>Duty</th><th>Owed by</th><th>Evidence tier</th>` +
    `<th>What the evidence must show</th></tr></thead>\n` +
    `<tbody>\n${body.map((cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("\n")}\n</tbody>\n</table>`;

  return markdown.replace(MARKER, () => table);
}

function isDuty(value: unknown): value is { id: string; tier: string; answers: string[] } {
  if (typeof value !== "object" || value === null) return false;
  const duty = value as Record<string, unknown>;
  return (
    typeof duty.id === "string" &&
    typeof duty.tier === "string" &&
    Array.isArray(duty.answers) &&
    duty.answers.every((a) => typeof a === "string")
  );
}

function isRow(value: unknown): value is { class: string; requirements: string[] } {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.class === "string" &&
    Array.isArray(row.requirements) &&
    row.requirements.every((r) => typeof r === "string")
  );
}

function malformed(literal: string, id: string): Error {
  return new Error(
    `${CONTRACT}: the ${literal} entries no longer carry the fields the ` +
      `accessibility page renders, so the page cannot be built. Failing page: ${id}.`,
  );
}

/**
 * Extract the array literal one `export const NAME = [...]` declares, by a
 * depth-counting scan that skips quoted spans. Comments are stripped first —
 * documentation, not declarations, and this repo's docblock style quotes
 * whole statements in `@example` blocks, any of which would otherwise win
 * the first-match race and publish itself. The scanner's residuals (regex
 * literals, template interpolation) fail toward the throw, never toward
 * publishing a lookalike — the same doctrine the wcag-tags parser records.
 */
function extractLiteral(source: string, name: string, id: string): string {
  const haystack = stripComments(source);
  const declaration = `export const ${name} = `;
  const start = haystack.indexOf(declaration);
  if (start === -1) {
    throw new Error(
      `${CONTRACT}: no "${declaration}[...] as const" declaration found. The ` +
        `accessibility page renders its table from that constant, so the page ` +
        `cannot be built. Failing page: ${id}.`,
    );
  }
  const open = haystack.indexOf("[", start);
  if (open === -1) {
    throw new Error(
      `${CONTRACT}: the ${name} declaration carries no array literal. Failing page: ${id}.`,
    );
  }
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < haystack.length; i += 1) {
    // Unreachable in practice — the loop condition bounds i — but
    // noUncheckedIndexedAccess types the index read as possibly absent, and
    // the config forbids both the non-null assertion and its cast equivalent.
    const ch = haystack[i];
    if (ch === undefined) break;
    if (quote !== null) {
      // An escaped quote is data, not the end of the literal.
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) return haystack.slice(open, i + 1);
    }
  }
  throw new Error(
    `${CONTRACT}: the ${name} array literal is never closed, so the accessibility ` +
      `page cannot render it. Failing page: ${id}.`,
  );
}

/**
 * The same scanner wcag-tags.ts carries, replicated rather than imported so
 * the docs build carries no tool to reuse it: a quote opens only outside
 * comments, a comment opens only outside quotes, and string contents are
 * copied byte for byte so a `"https://…"` literal can neither start nor
 * swallow a comment.
 */
function stripComments(text: string): string {
  let out = "";
  let quote: string | null = null;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === undefined) break;
    if (quote !== null) {
      out += ch;
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

/**
 * Rewrite one extracted TypeScript literal into JSON the parser can read,
 * in a single quote-aware scan. The law is TypeScript, not JSON: its object
 * keys are bare identifiers and prettier owns the file's formatting with
 * trailing commas, so demanding JSON of it verbatim would either fight the
 * formatter on every edit or push the page into importing the module — the
 * drift the wcag-tags plugin exists to prevent. So the scan does the two
 * mechanical rewrites, and nothing else: an identifier sitting in key
 * position (after `{` or `,`, before `:`) is quoted, and a comma that only
 * closes its element is dropped. String literals — quoted or escaped — pass
 * through byte for byte, which is what keeps the rewrite from ever touching
 * the answers' prose. Everything else JSON rejects still throws.
 */
function toParseable(literal: string): string {
  let out = "";
  let i = 0;
  let quote: string | null = null;
  let expectKey = false;
  while (i < literal.length) {
    const ch = literal[i];
    if (ch === undefined) break;
    if (quote !== null) {
      out += ch;
      if (ch === "\\") {
        out += literal[i + 1] ?? "";
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
    if (ch === ":") {
      // A value follows: a bare `true` or number out here is data, not a key.
      expectKey = false;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "," || ch === "{") {
      // A comma that closes its element (prettier's trailing comma) writes
      // nothing; a separating comma opens key position like `{` does.
      if (!(ch === "," && /^\s*[\]}]/.test(literal.slice(i + 1)))) out += ch;
      expectKey = true;
      i += 1;
      continue;
    }
    if (expectKey && /[A-Za-z0-9_$]/.test(ch)) {
      let j = i;
      let ident = "";
      for (;;) {
        const c = literal[j];
        if (c === undefined || !/[A-Za-z0-9_$]/.test(c)) break;
        ident += c;
        j += 1;
      }
      out += `"${ident}"`;
      i = j;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
