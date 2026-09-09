// What a spec RUNS, as text — the one reader the evidence gates share.
//
// Three coverage reads answer questions of the shape "does this file actually
// do X": the a11y gate reads its bespoke suite for the pages it loads, the
// responsive gate reads its sweep leg for the same fact, and the interaction
// gate reads a harness spec for a keyboard gesture. None of them can execute
// a browser, so all three read the file's own text — and a file's text answers
// that only after two kinds of inert text are removed, because both are places
// a coverage claim can be written without anything running:
//
//   - comments. The strip is line-aware (a trailing `// retired: …` is as
//     inert as a whole-line remark — the shape retired code actually takes)
//     and quote-aware (a URL's `//` can neither start nor swallow a comment),
//     the discipline check-responsive-evidence.ts already applies to its
//     viewport reads and 3D applies to its gesture read.
//   - the tests that never run. A `test.fixme(…)` or `test.skip(…)` call
//     suppresses its own test — Playwright reports it skipped and nothing
//     inside it executes — so a `page.goto` or a keypress inside one is a
//     fact about a spec that does not exist. The suppressed span is the call
//     and its balanced arguments: both the capability form
//     (`test.skip(cond, "reason")`, no body) and the body form
//     (`test.fixme("title", async ({ page }) => { … })`) end at the call's
//     closing paren, found at the same quote- and comment-aware depth. A
//     `test.skip(…)` stated INSIDE a live test blanks only the call, which is
//     the correct granularity there too — the body around it still runs.
//
// The scanner is a parser for files this repository owns, not a TypeScript
// front end, and its residuals fail toward "did nothing": a construct it
// misreads (a regex literal masquerading as a comment, an argument list that
// never closes) can only remove text it should have kept, never invent a
// gesture or a page. The honest failure direction is a coverage answer the
// gate reports as missing — never coverage nothing produced.
//
// Read calls outside this reader strip comments only or not at all, and keep
// their own approximations: the contracts are parsed out of docblocked
// TypeScript (whole-line strips there, the docblock is documentation), and
// the responsive viewport reads answer "does the file size a viewport",
// which a skipped test's resize text answers differently. The population and
// gesture reads are one reader because they assert one kind of fact.

/**
 * The source text with comments and never-running `test.fixme`/`test.skip`
 * spans removed. Newlines inside a removed span survive, so a residual
 * line-oriented read stays aligned with the file it came from.
 */
export function runnableSpecText(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === undefined) break;
    if (ch === '"' || ch === "'" || ch === "`") {
      // Quoted spans pass through byte for byte: a string is data, and a
      // `//` inside one can neither start nor swallow a comment.
      out += ch;
      i += 1;
      while (i < source.length) {
        const quoted = source[i];
        out += quoted ?? "";
        if (quoted === "\\") {
          out += source[i + 1] ?? "";
          i += 2;
          continue;
        }
        i += 1;
        if (quoted === ch) break;
      }
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += newlinesOnly(source.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      // The newline itself survives, so code on the following line is still
      // read on its own line.
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      i = stop;
      continue;
    }
    if (ch === "t" && suppressedCallAt(source, i)) {
      // The call never runs, so its text is inert to every coverage read:
      // blank it to the call's closing paren (or, for one that never closes,
      // to the end — a truncated call has no runtime to witness anything).
      const open = source.indexOf("(", i);
      const close = open === -1 ? source.length : closeOfCall(source, open);
      out += newlinesOnly(source.slice(i, close));
      i = close;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

/** The newlines of a span, the shape a blanked span leaves behind. */
function newlinesOnly(span: string): string {
  return span.replaceAll(/[^\n]/g, "");
}

/**
 * The never-running call, matched sticky so the scanner can ask at each
 * position; the leading `\b` keeps a `mytest.skip(` from reading as one.
 */
const SUPPRESSED_CALL = /\btest\.(?:fixme|skip)\s*\(/y;

/** Whether that call opens at `i`. */
function suppressedCallAt(source: string, i: number): boolean {
  SUPPRESSED_CALL.lastIndex = i;
  return SUPPRESSED_CALL.test(source);
}

/**
 * The index just past the paren that closes the one at `open`, quote- and
 * comment-aware; a call that never closes runs to the end of the file.
 */
function closeOfCall(source: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote !== null) {
      if (ch === "\\") {
        i += 1;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "/" && source[i + 1] === "/") {
      const end = source.indexOf("\n", i);
      if (end === -1) return source.length;
      i = end - 1;
      continue;
    }
    if (ch === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      if (end === -1) return source.length;
      i = end + 1;
      continue;
    }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return source.length;
}
