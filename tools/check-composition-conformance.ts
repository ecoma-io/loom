// Every composition owns an engine adapter plus conformance evidence, or a
// named exception that expires — this is the gate that holds that contract
// (Phase 3C, ecoma-io/loom#280).
//
// The evidence set is the four artifacts the conformance route rides on, and
// the compositions are enumerated from the tree through the single package
// registry in tools/architecture/graph.ts — the gate keeps no list of its
// own, so a fifth composition landing with the full set is discovered, not
// registered. For each composition directory the gate demands, all of:
//
//   1. `src/layout.ts` exporting at least one `export function` — the
//      adapter — plus the engine re-export spelled exactly
//      `export { layout }`: the judged edge the route reaches the engine
//      through;
//   2. `e2e/conformance.cases.ts` exporting the four-name module contract,
//      each name spelled exactly — `export const component`,
//      `export const adapter`, `export const cases` and
//      `export { layout }` — with at least one case in `cases`, unique case
//      names and at least one viewport per case. Uniqueness holds across
//      modules too, because the route locates a case by
//      `section[data-conformance-case=…]`, where first match silently wins;
//   3. `e2e/layout-conformance.e2e.ts` — the spec that compares engine to
//      browser;
//   4. `src/layout.test.ts` carrying the describe titled exactly
//      `"case coverage floor"` — the semantic floor stays in the vitest tier
//      that can read the typed scale tables; this gate only requires a
//      composition to carry one.
//
// or an exception row in tools/composition-conformance.exceptions.ts, whose
// reason, owner and removal milestone are mandatory and whose composition
// must still lack the evidence set — a row naming a now-complete composition
// is itself a failure, so exceptions shrink as the evidence lands instead of
// reading as a second, quieter law. A row excuses ABSENCES only: an artifact
// the composition owns that fails a rule above is charged even under a row.
//
// The gate is PARSE-ONLY, like its siblings: the tooling layer's boundary row
// forbids importing the library it checks, and a checker that executed its
// subject could not report on a tree that will not load. The parse of a cases
// module is the same approximation check-a11y-evidence.ts makes — a parser
// for files this repository owns, not a TypeScript front end — and every
// structural fault is a reported failure naming the file, never a skipped one.
//
// Run: `node --experimental-strip-types tools/check-composition-conformance.ts`
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { componentPackages, tierDir, type Tier } from "./architecture/graph.ts";
import { COMPOSITION_CONFORMANCE_EXCEPTIONS } from "./composition-conformance.exceptions.ts";
import type { CompositionConformanceException } from "./composition-conformance.exceptions.ts";

/** The one tier whose components the conformance contract governs. */
const TIER: Tier = "composition";

/** The layout adapter, and the engine re-export the route reaches it through. */
const ADAPTER_PATH = ["src", "layout.ts"] as const;
/** The cases module whose four exported names are the route's whole intake. */
const CASES_PATH = ["e2e", "conformance.cases.ts"] as const;
/** The live-oracle spec that holds adapter equal to rendered CSS. */
const SPEC_PATH = ["e2e", "layout-conformance.e2e.ts"] as const;
/** The coverage floor, kept in the vitest tier that reads the scale tables. */
const FLOOR_PATH = ["src", "layout.test.ts"] as const;

/** The describe block title the coverage floor carries — the file's law, not its name. */
const FLOOR_TITLE = "case coverage floor";
const FLOOR_DESCRIBE = `describe("${FLOOR_TITLE}"`;

/**
 * The one failure shape an exception row excuses: an artifact that is not
 * there (`<composition>: missing <path>`). A present artifact that fails a
 * rule never matches it, so a row cannot vouch for evidence it contradicts —
 * the split the excusal below is drawn along.
 */
const ABSENCE = /^[^:]+: missing /;

/** The case's name field, inside one flat record. */
const NAME_FIELD = /\bname\s*:\s*"((?:[^"\\]|\\.)*)"/;
/** The case's viewport list, inside one flat record. */
const VIEWPORT_FIELD = /\bviewports\s*:\s*\[([^\]]*)\]/;

/** Remove comments before parsing. See check-a11y-evidence.ts for why. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** The `[ ... ]` block opened at `open`, tracked by bracket depth. */
function bracketBlock(source: string, open: number): string | null {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const char = source[i];
    if (char === "[") depth++;
    else if (char === "]") {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

/** Each flat `{ ... }` record inside one array block, in order. */
function records(block: string): string[] {
  const found: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < block.length; i++) {
    const char = block[i];
    if (char === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        found.push(block.slice(start + 1, i));
        start = -1;
      }
    }
  }
  return found;
}

/** What the gate could read out of one cases module. */
export interface ParsedCaseModule {
  /** The declared case names, in declaration order. */
  names: string[];
}

/**
 * Parse one cases module against the four-name contract. Every structural
 * fault is a pushed failure naming the composition and the file — a module
 * the gate cannot read must fail loudly, never read as an empty one.
 */
export function parseCaseModule(
  composition: string,
  relPath: string,
  source: string,
  failures: string[],
): ParsedCaseModule | null {
  const text = stripComments(source);

  for (const name of ["component", "adapter", "cases"] as const) {
    if (!text.includes(`export const ${name}`)) {
      failures.push(
        `${composition}: ${relPath} exports no \`const ${name}\` — the route's module contract is component, adapter, layout and cases`,
      );
    }
  }
  if (!text.includes("export { layout }")) {
    failures.push(
      `${composition}: ${relPath} does not re-export \`layout\` — the engine is reached only through the package's own module, never past the e2e boundary`,
    );
  }

  const declared = text.indexOf("export const cases");
  const assign = declared === -1 ? -1 : text.indexOf("= [", declared);
  const block = assign === -1 ? null : bracketBlock(text, assign + 2);
  if (block === null) {
    failures.push(`${composition}: ${relPath} declares no parseable \`cases\` array`);
    return null;
  }

  const names: string[] = [];
  const duplicates: string[] = [];
  for (const record of records(block)) {
    const name = NAME_FIELD.exec(record)?.[1];
    if (name === undefined || name.length === 0) {
      failures.push(
        `${composition}: ${relPath} carries a case with no parseable name — the comparator locates cases by name`,
      );
      continue;
    }
    if (names.includes(name)) {
      duplicates.push(name);
      continue;
    }
    names.push(name);
    const viewports = VIEWPORT_FIELD.exec(record)?.[1];
    const widths = viewports === undefined ? [] : [...viewports.matchAll(/-?\d+(?:\.\d+)?/g)];
    if (widths.length === 0) {
      failures.push(
        `${composition}: ${relPath} case "${name}" declares no viewport — a case the spec never navigates to proves nothing`,
      );
    }
  }
  for (const name of new Set(duplicates)) {
    failures.push(
      `${composition}: ${relPath} repeats the case name "${name}" — the comparator locates a case by name and would compare the first section twice`,
    );
  }
  if (names.length === 0 && duplicates.length === 0) {
    failures.push(`${composition}: ${relPath} declares no case`);
  }
  return { names };
}

/** The fault classes an exception row can carry on its own face. */
function checkExceptionRow(
  row: CompositionConformanceException,
  compositionNames: Set<string>,
  failures: string[],
): void {
  if (!compositionNames.has(row.composition)) {
    failures.push(
      `the exception row names "${row.composition}", which no composition directory carries — an exception for a composition that does not exist is noise in the record`,
    );
    return;
  }
  for (const field of ["reason", "owner", "removal"] as const) {
    if (row[field].trim().length === 0) {
      failures.push(
        `the exception row for "${row.composition}" carries no ${field} — an unexplained exception is indistinguishable from a forgotten one`,
      );
    }
  }
}

/**
 * Every conformance-contract violation the rules found, one human-readable
 * string each — `Name: what is wrong`, with repository-relative paths, in
 * the artifact gates' failure style.
 */
export function checkCompositionConformance(
  root: string,
  exceptions: readonly CompositionConformanceException[],
): string[] {
  // Fail-closed, not empty: a tree without the tier is not a tree whose every
  // composition passed, and reading it as one is the stopped-checker result
  // this gate exists to prevent.
  const dir = tierDir(root, TIER);
  if (!existsSync(dir)) {
    throw new Error(
      `packages/${TIER} is missing — the gate will not read an absent family as an empty one`,
    );
  }

  const failures: string[] = [];

  // The registry derives the family from the filesystem; the sort fixes the
  // output's order, so the verdict is byte-identical run over run.
  const compositions = componentPackages(root, TIER)
    .map((pkg) => pkg.name)
    .sort();
  // The absent tier throws above; the emptied one fails here. A rename that
  // moved the family away is a structural fault, not a family whose every
  // member passed — "0 of 0 held" is the vacuous verdict this gate exists to
  // refuse.
  if (compositions.length === 0) {
    throw new Error(
      `packages/${TIER} enumerates no compositions — the gate will not read an empty family as a passing one`,
    );
  }
  const compositionNames = new Set(compositions);

  // The rows are resolved first, because what they excuse is the evidence
  // check itself. A row's own face faults are still failures below — but a
  // row that exists keeps naming an exception even while its reason is
  // blank, and the verdict must stay truthful about which of the two is
  // missing.
  const excepted = new Set<string>();
  for (const row of exceptions) {
    checkExceptionRow(row, compositionNames, failures);
    if (!compositionNames.has(row.composition)) continue;
    if (excepted.has(row.composition)) {
      failures.push(
        `a second exception row names "${row.composition}" — one row per composition, or the record disagrees with itself`,
      );
      continue;
    }
    excepted.add(row.composition);
  }

  // The evidence checks run for EVERY composition, excepted or not: an
  // excepted composition's absences are excused at reporting time, its rule
  // faults are not, and whether any miss exists is what the expiry rule
  // judges the row against.
  const evidenceFailures = new Map<string, string[]>();
  const namesByComposition = new Map<string, string[]>();
  for (const composition of compositions) {
    const own: string[] = [];
    evidenceFailures.set(composition, own);
    const rel = (parts: readonly string[]): string =>
      ["packages", TIER, composition, ...parts].join("/");

    // Each artifact is checked independently and every miss is reported, so
    // one pull request lands the whole set rather than whack-a-mole.
    const adapterRel = rel(ADAPTER_PATH);
    const adapterPath = join(dir, composition, ...ADAPTER_PATH);
    if (!existsSync(adapterPath)) {
      own.push(`${composition}: missing ${adapterRel}`);
    } else {
      const text = stripComments(readFileSync(adapterPath, "utf8"));
      if (!text.includes("export { layout }")) {
        own.push(
          `${composition}: ${adapterRel} does not re-export \`layout\` — the route reaches the engine only through this package's own module`,
        );
      }
      if (!/export\s+function\s+/.test(text)) {
        own.push(`${composition}: ${adapterRel} exports no adapter function`);
      }
    }

    const casesRel = rel(CASES_PATH);
    const casesPath = join(dir, composition, ...CASES_PATH);
    if (!existsSync(casesPath)) {
      own.push(`${composition}: missing ${casesRel}`);
    } else {
      const parsed = parseCaseModule(composition, casesRel, readFileSync(casesPath, "utf8"), own);
      namesByComposition.set(composition, parsed?.names ?? []);
    }

    const specRel = rel(SPEC_PATH);
    if (!existsSync(join(dir, composition, ...SPEC_PATH))) {
      own.push(`${composition}: missing ${specRel}`);
    }

    const floorRel = rel(FLOOR_PATH);
    const floorPath = join(dir, composition, ...FLOOR_PATH);
    if (!existsSync(floorPath)) {
      own.push(`${composition}: missing ${floorRel}`);
    } else if (!stripComments(readFileSync(floorPath, "utf8")).includes(FLOOR_DESCRIBE)) {
      // Comments are stripped before the title match, or a commented-out
      // floor — the describe deleted but its line left behind — would stand
      // in for the floor it once was.
      own.push(
        `${composition}: ${floorRel} carries no "${FLOOR_TITLE}" describe — the case matrix has no coverage floor`,
      );
    }
  }

  // Case names are global identity — the route publishes every module's names
  // into one registry — so uniqueness holds across compositions, not just
  // within one. First declarer wins the message; the second names the first.
  const caseOwners = new Map<string, string>();
  for (const composition of compositions) {
    for (const name of namesByComposition.get(composition) ?? []) {
      const owner = caseOwners.get(name);
      if (owner !== undefined) {
        evidenceFailures
          .get(composition)
          ?.push(
            `${composition}: case "${name}" is already declared by ${owner} — case names are global identity across the route's registry`,
          );
        continue;
      }
      caseOwners.set(name, composition);
    }
  }

  // The verdict, in tree order. The excusal is drawn along ABSENCE: a row
  // stands in for evidence that does not exist, never for evidence the
  // composition owns and that fails a rule — a repeated case name, a lost
  // re-export — which is charged even under a row. A composition with no
  // faults at all is complete, the state the expiry rule judges rows against.
  const complete = new Set<string>();
  for (const composition of compositions) {
    const own = evidenceFailures.get(composition) ?? [];
    if (own.length === 0) {
      complete.add(composition);
    } else if (excepted.has(composition)) {
      failures.push(...own.filter((failure) => !ABSENCE.test(failure)));
    } else {
      failures.push(...own);
    }
  }

  // The expiry rule: a row whose composition has since landed the full
  // evidence set is itself a failure, because the row now reads as an
  // allowance the evidence has already replaced.
  for (const row of exceptions) {
    if (excepted.has(row.composition) && complete.has(row.composition)) {
      failures.push(
        `${row.composition}: an exception row stands but the composition now owns the full evidence set — delete the row; exceptions expire when the evidence lands`,
      );
    }
  }

  // The M6 hole, closed last so the message can name both ways out.
  for (const composition of compositions) {
    if (complete.has(composition) || excepted.has(composition)) continue;
    failures.push(
      `${composition}: no adapter-and-cases evidence and no exception row — land the evidence set or record the exception with reason, owner and removal milestone`,
    );
  }

  return failures;
}

/**
 * How the family stands: who owns the full evidence set, who is excepted —
 * the number the 4A work list shrinks against. The completeness predicate
 * here is the file set alone; the CLI prints the summary only after a run
 * with zero failures, where the file set is exactly what the rules held.
 */
export function conformanceSummary(
  root: string,
  exceptions: readonly CompositionConformanceException[],
): { total: number; complete: number; excepted: number } {
  const dir = tierDir(root, TIER);
  const compositions = existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : [];
  const hasEvidenceSet = (composition: string): boolean =>
    [ADAPTER_PATH, CASES_PATH, SPEC_PATH, FLOOR_PATH].every((parts) =>
      existsSync(join(dir, composition, ...parts)),
    );
  return {
    total: compositions.length,
    complete: compositions.filter(hasEvidenceSet).length,
    excepted: exceptions.length,
  };
}

/** The exception rows this repository runs on, read once. */
export function readExceptions(): readonly CompositionConformanceException[] {
  return COMPOSITION_CONFORMANCE_EXCEPTIONS;
}

// CLI entry — run against the real repository and exit non-zero on violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const ROOT = join(import.meta.dirname, "..");
  let failures: string[];
  try {
    failures = checkCompositionConformance(ROOT, readExceptions());
  } catch (error) {
    console.error(`composition-conformance: ${(error as Error).message}`);
    process.exit(1);
  }
  if (failures.length > 0) {
    console.error(`Composition conformance contract unmet (${String(failures.length)}):`);
    for (const failure of failures) console.error(`  • ${failure}`);
    console.error(
      `\nEvery composition needs src/layout.ts (adapter + engine re-export), ` +
        `e2e/conformance.cases.ts (the four-name module contract), ` +
        `e2e/layout-conformance.e2e.ts, a case-coverage floor in src/layout.test.ts ` +
        `— or a recorded exception with reason, owner and removal milestone.`,
    );
    process.exit(1);
  }
  const summary = conformanceSummary(ROOT, readExceptions());
  console.log(
    `Composition conformance contract held: ${String(summary.complete)} of ` +
      `${String(summary.total)} compositions own the full evidence set; ` +
      `${String(summary.excepted)} named exception(s) expire as Phase 4A lands the twins.`,
  );
}
