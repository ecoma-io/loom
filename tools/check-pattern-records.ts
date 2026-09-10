// Every shipped Pattern carries a canonical record on its documentation page:
// the interface intent it standardises, authored in the page's frontmatter,
// and the evidence tier it carries, rendered at build time from the
// component's own `a11y.json`. This gate holds the pages to that shape.
//
// It is the intake rule of docs/patterns/contract.md made standing: a pattern
// page that loses its intent, or its record marker, or that picks up a marker
// naming no shipped component, fails here by name — the same failure style
// tools/check-component-artifacts.ts established for the five paired
// artifacts. The evidence itself is the docs plugin's to render and
// tools/check-a11y-evidence.ts's to enforce; repeating those checks here
// would let one gate's edit drift from the other's.
//
// The intent parser is this file's own twin of the docs plugin's
// readIntent — the same narrow shape, refused the same ways. The two could
// import one implementation only by crossing the tooling/docs boundary one
// of the architecture readers judges, and a checker that imports the thing
// it checks could not report on a tree that will not load; the pairing is
// asserted by this comment instead.
//
// Run: `node --experimental-strip-types tools/check-pattern-records.ts`
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { TIERS } from "./architecture/graph.ts";

/** The record marker. Kept in step with the docs plugin's by the comment above. */
const MARKER = /^[ \t]*<!--[ \t]*@pattern-record[ \t]+([A-Za-z][A-Za-z0-9]*)[ \t]*-->[ \t]*$/gm;

/** The frontmatter key the intent is authored under. */
const INTENT_KEY = /^intent:[ \t]*(.*)$/gm;

export interface PatternRecordInputs {
  /** Kebab names under `packages/patterns/`, the shipped membership from the tree. */
  patterns: string[];
  /** `docs/patterns/` page sources by slug — the pages that exist. */
  pages: Map<string, string>;
  /** Every tiered component's Pascal name, so a stale marker names its defect. */
  componentNames: Set<string>;
}

/** `metric-card` → `MetricCard`, the component and message name. */
function toPascal(name: string): string {
  return name.replace(/(^|[-_])([a-z])/g, (_match, _sep: string, char: string) =>
    char.toUpperCase(),
  );
}

/** The page's frontmatter `intent` if it carries exactly one well-formed value, else the failures. */
export function intentFromFrontmatter(pageSource: string): { value?: string; failures: string[] } {
  const failures: string[] = [];
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(pageSource);
  if (!frontmatter) {
    failures.push("frontmatter carries no `intent:` — the record's authored claim");
    return { failures };
  }
  const matches = [...(frontmatter[1] ?? "").matchAll(INTENT_KEY)];
  if (matches.length === 0) {
    failures.push("frontmatter carries no `intent:` — the record's authored claim");
    return { failures };
  }
  if (matches.length > 1) {
    failures.push(
      `frontmatter carries ${String(matches.length)} \`intent:\` keys — the record is one claim`,
    );
    return { failures };
  }
  let value = (matches[0]?.[1] ?? "").trim();
  const quoted = /^(["'])([\s\S]*)\1$/.exec(value);
  // The refusals below are about the UNQUOTED form only: quoting is what
  // makes a value YAML, so a quoted intent may carry any character a sentence
  // needs — colons included — while in an unquoted scalar a leading `|` or
  // `>` declares a block the docs renderer will not interpret, and a colon
  // followed by whitespace is the sequence that makes the site's frontmatter
  // parse fail at build time. The gate reads the same shape the renderer
  // reads (docs/.vitepress/plugins/pattern-record.ts), so it can never pass a
  // page whose build then fails.
  const isQuoted = quoted !== null;
  if (quoted) value = (quoted[2] ?? "").trim();
  if (value.length === 0) {
    failures.push("the intent is empty — the intent is the record's authored claim");
    return { failures };
  }
  if (!isQuoted && (/^[|>&*[{]/.test(value) || /:(?:\s|$)/.test(value))) {
    failures.push(
      "the intent is a block scalar, a flow collection, or an unquoted value carrying a " +
        "colon — write one single-line (optionally quoted) sentence naming the arrangement",
    );
    return { failures };
  }
  return { value, failures };
}

/** Every record violation the rules found, one human-readable string each. */
export function checkPatternRecords(inputs: PatternRecordInputs): string[] {
  const failures: string[] = [];

  for (const kebab of inputs.patterns) {
    const pascal = toPascal(kebab);
    const pagePath = `docs/patterns/${kebab}.md`;
    const source = inputs.pages.get(kebab);
    if (source === undefined) {
      failures.push(`${pascal}: no ${pagePath} — nothing carries its canonical record`);
      continue;
    }

    // The intent must sit in frontmatter, where the docs plugin reads it; a
    // second copy in the body is the drift the record exists to prevent, and
    // an intent anywhere else is invisible to both readers. Whether the
    // sentence names an arrangement is the intake rule's judgement, applied
    // in review — this gate holds the shape, the contract page holds the law.
    const { failures: intentFailures } = intentFromFrontmatter(source);
    for (const failure of intentFailures) failures.push(`${pascal}: ${failure}`);

    MARKER.lastIndex = 0;
    const markerCount = source.match(MARKER)?.length ?? 0;
    if (markerCount === 0) {
      failures.push(
        `${pascal}: ${pagePath} has no <!-- @pattern-record ${pascal} --> marker — the record is never rendered`,
      );
    } else if (markerCount > 1) {
      failures.push(
        `${pascal}: ${pagePath} carries ${String(markerCount)} @pattern-record markers — the record is one claim`,
      );
    }
    MARKER.lastIndex = 0;
    for (const match of source.matchAll(MARKER)) {
      const name = match[1];
      if (name !== undefined && name !== pascal) {
        failures.push(
          `${pascal}: ${pagePath}'s record marker names ${name} — a page's record is about its own pattern`,
        );
      }
    }
  }

  // The mirror direction: a marker on any other page of the directory — a
  // worked example, a renamed pattern's residue — names a record that pairs
  // with nothing, and would render (or fail the build) where no law asked it to.
  for (const [slug, source] of inputs.pages) {
    if (inputs.patterns.includes(slug)) continue;
    MARKER.lastIndex = 0;
    for (const match of source.matchAll(MARKER)) {
      const name = match[1] ?? "";
      if (inputs.componentNames.has(name)) {
        failures.push(
          `${slug}: carries a @pattern-record marker for ${name}, but packages/patterns/${slug} does not exist — the record pairs with a shipped pattern's own page`,
        );
      } else {
        failures.push(
          `${slug}: <!-- @pattern-record ${name} --> names no component under packages/`,
        );
      }
    }
  }

  return failures;
}

/** The tree read the way the gate sees it. */
function readTree(root: string): PatternRecordInputs {
  const patternsDir = join(root, "packages", "patterns");
  const patterns = existsSync(patternsDir)
    ? readdirSync(patternsDir).filter((name) => statSync(join(patternsDir, name)).isDirectory())
    : [];
  const pages = new Map<string, string>();
  const docsDir = join(root, "docs", "patterns");
  if (existsSync(docsDir)) {
    for (const file of readdirSync(docsDir)) {
      if (file.endsWith(".md")) {
        pages.set(file.slice(0, -".md".length), readFileSync(join(docsDir, file), "utf8"));
      }
    }
  }
  const componentNames = new Set<string>();
  for (const tier of TIERS) {
    const tierDir = join(root, "packages", tier);
    if (!existsSync(tierDir)) continue;
    for (const name of readdirSync(tierDir)) {
      if (statSync(join(tierDir, name)).isDirectory()) componentNames.add(toPascal(name));
    }
  }
  return { patterns, pages, componentNames };
}

// CLI entry — run against the real repository and exit non-zero on violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const ROOT = join(import.meta.dirname, "..");
  const tree = readTree(ROOT);
  const failures = checkPatternRecords(tree);
  if (failures.length > 0) {
    console.error(`Pattern records incomplete (${String(failures.length)}):`);
    for (const failure of failures) console.error(`  • ${failure}`);
    console.error(
      `\nEvery pattern's docs page needs an \`intent:\` in its frontmatter — the arrangement ` +
        `the pattern standardises — and one <!-- @pattern-record <Name> --> marker for the ` +
        `record the docs plugin renders. The intake rule is docs/patterns/contract.md.`,
    );
    process.exit(1);
  }
  console.log(
    `Pattern records complete for ${String(tree.patterns.length)} pattern(s); ` +
      `the intake rule lives at docs/patterns/contract.md.`,
  );
}
