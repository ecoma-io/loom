// Every shipped Layout carries its four obligations on its documentation
// page: the regions its own template declares, the responsive behaviour and
// accessibility duties rendered from its `a11y.json`, and the composition
// model authored in the page's frontmatter. This gate holds the pages to
// that shape.
//
// It is ledger row 5B's verification made standing — "each layout's contract
// page states its four obligations" — in the same failure style
// tools/check-component-artifacts.ts established for the five paired
// artifacts and tools/check-pattern-records.ts carried to the Pattern tier:
// a page that loses its composition claim, or its obligations marker, or
// that picks up a marker naming no shipped layout, fails here by name. The
// obligations' content is the docs plugin's to render and the a11y,
// responsive and interaction gates' to enforce; repeating those checks here
// would let one gate's edit drift from the other's.
//
// The composition parser is this file's own twin of the docs plugin's
// readComposition — the same narrow shape, refused the same ways. The two
// could import one implementation only by crossing the tooling/docs boundary
// one of the architecture readers judges, and a checker that imports the
// thing it checks could not report on a tree that will not load; the pairing
// is asserted by this comment instead.
//
// Run: `node --experimental-strip-types tools/check-layout-obligations.ts`
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { TIERS } from "./architecture/graph.ts";

/** The obligations marker. Kept in step with the docs plugin's by the comment above. */
const MARKER = /^[ \t]*<!--[ \t]*@layout-obligations[ \t]+([A-Za-z][A-Za-z0-9]*)[ \t]*-->[ \t]*$/gm;

/** The frontmatter key the composition model is authored under. */
const COMPOSITION_KEY = /^composition:[ \t]*(.*)$/gm;

export interface LayoutObligationInputs {
  /** Kebab names under `packages/layouts/`, the shipped membership from the tree. */
  layouts: string[];
  /** `docs/layouts/` page sources by slug — the pages that exist. */
  pages: Map<string, string>;
  /** Every tiered component's Pascal name, so a stale marker names its defect. */
  componentNames: Set<string>;
}

/** `app-shell` → `AppShell`, the component and message name. */
function toPascal(name: string): string {
  return name.replace(/(^|[-_])([a-z])/g, (_match, _sep: string, char: string) =>
    char.toUpperCase(),
  );
}

/** The page's frontmatter `composition` if it carries exactly one well-formed value, else the failures. */
export function compositionFromFrontmatter(pageSource: string): {
  value?: string;
  failures: string[];
} {
  const failures: string[] = [];
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(pageSource);
  if (!frontmatter) {
    failures.push("frontmatter carries no `composition:` — the obligations' one authored claim");
    return { failures };
  }
  const matches = [...(frontmatter[1] ?? "").matchAll(COMPOSITION_KEY)];
  if (matches.length === 0) {
    failures.push("frontmatter carries no `composition:` — the obligations' one authored claim");
    return { failures };
  }
  if (matches.length > 1) {
    failures.push(
      "frontmatter carries more than one `composition:` key — the composition model is one claim",
    );
    return { failures };
  }
  let value = (matches[0]?.[1] ?? "").trim();
  const quoted = /^(["'])([\s\S]*)\1$/.exec(value);
  // The refusals below are about the UNQUOTED form only: quoting is what
  // makes a value YAML, so a quoted claim may carry any character a sentence
  // needs — colons included — while in an unquoted scalar a leading `|` or
  // `>` declares a block the docs renderer will not interpret, and a colon
  // followed by whitespace is the sequence that makes the site's frontmatter
  // parse fail at build time. The gate reads the same shape the renderer
  // reads (docs/.vitepress/plugins/layout-obligations.ts), so it can never
  // pass a page whose build then fails.
  const isQuoted = quoted !== null;
  if (quoted) value = (quoted[2] ?? "").trim();
  if (value.length === 0) {
    failures.push("the composition claim is empty — it is the obligations' authored claim");
    return { failures };
  }
  if (!isQuoted && (/^[|>&*[{]/.test(value) || /:(?:\s|$)/.test(value))) {
    failures.push(
      "the composition claim is a block scalar, a flow collection, or an unquoted value carrying " +
        "a colon — write one single-line (optionally quoted) sentence naming what the layout accepts",
    );
    return { failures };
  }
  return { value, failures };
}

/** Every obligations violation the rules found, one human-readable string each. */
export function checkLayoutObligations(inputs: LayoutObligationInputs): string[] {
  const failures: string[] = [];

  for (const kebab of inputs.layouts) {
    const pascal = toPascal(kebab);
    const pagePath = `docs/layouts/${kebab}.md`;
    const source = inputs.pages.get(kebab);
    if (source === undefined) {
      failures.push(`${pascal}: no ${pagePath} — nothing carries its four obligations`);
      continue;
    }

    // The composition model must sit in frontmatter, where the docs plugin
    // reads it; a second copy in the body is the drift the obligations exist
    // to prevent. Whether the sentence names what the layout accepts is the
    // reviewer's judgement — this gate holds the shape, the page holds the law.
    const { failures: compositionFailures } = compositionFromFrontmatter(source);
    for (const failure of compositionFailures) failures.push(`${pascal}: ${failure}`);

    MARKER.lastIndex = 0;
    const markerCount = source.match(MARKER)?.length ?? 0;
    if (markerCount === 0) {
      failures.push(
        `${pascal}: ${pagePath} has no <!-- @layout-obligations ${pascal} --> marker — the four obligations are never rendered`,
      );
    } else if (markerCount > 1) {
      failures.push(
        `${pascal}: ${pagePath} carries ${String(markerCount)} @layout-obligations markers — the obligations are one claim`,
      );
    }
    MARKER.lastIndex = 0;
    for (const match of source.matchAll(MARKER)) {
      const name = match[1];
      if (name !== undefined && name !== pascal) {
        failures.push(
          `${pascal}: ${pagePath}'s obligations marker names ${name} — a page's obligations are about its own layout`,
        );
      }
    }
  }

  // The mirror direction: a marker on any other page of the directory names
  // obligations that pair with nothing, and would render (or fail the build)
  // where no law asked them to.
  for (const [slug, source] of inputs.pages) {
    if (inputs.layouts.includes(slug)) continue;
    MARKER.lastIndex = 0;
    for (const match of source.matchAll(MARKER)) {
      const name = match[1] ?? "";
      if (inputs.componentNames.has(name)) {
        failures.push(
          `${slug}: carries a @layout-obligations marker for ${name}, but packages/layouts/${slug} does not exist — the obligations pair with a shipped layout's own page`,
        );
      } else {
        failures.push(
          `${slug}: <!-- @layout-obligations ${name} --> names no component under packages/`,
        );
      }
    }
  }

  return failures;
}

/** The tree read the way the gate sees it. */
function readTree(root: string): LayoutObligationInputs {
  const layoutsDir = join(root, "packages", "layouts");
  const layouts = existsSync(layoutsDir)
    ? readdirSync(layoutsDir).filter((name) => statSync(join(layoutsDir, name)).isDirectory())
    : [];
  const pages = new Map<string, string>();
  const docsDir = join(root, "docs", "layouts");
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
  return { layouts, pages, componentNames };
}

// CLI entry — run against the real repository and exit non-zero on violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const ROOT = join(import.meta.dirname, "..");
  const tree = readTree(ROOT);
  const failures = checkLayoutObligations(tree);
  if (failures.length > 0) {
    console.error(`Layout obligations incomplete (${String(failures.length)}):`);
    for (const failure of failures) console.error(`  • ${failure}`);
    console.error(
      `\nEvery layout's docs page needs a \`composition:\` in its frontmatter — what the layout ` +
        `accepts — and one <!-- @layout-obligations <Name> --> marker for the four obligations ` +
        `the docs plugin renders. The regions, responsive behaviour and accessibility duties ` +
        `are rendered from the tree; only the composition model is authored.`,
    );
    process.exit(1);
  }
  console.log(
    `Layout obligations complete for ${String(tree.layouts.length)} layout(s); ` +
      `the census is the artifact model's tier count.`,
  );
}
