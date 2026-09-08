// Two claims the architecture docs make in prose are checkable as text, and
// this gate is what keeps them from being transcriptions.
//
// 1. The artifact matrix's count sentence ("Counts were generated, not
//    recalled: …") names an exact number per artifact kind, and every kind it
//    names is one tracked directory holding one artifact per entry — so the
//    sentence is recountable. It was also wrong: 2C's reclassification moved
//    DashboardGrid and DesktopAppShell and renamed the Blocks family, and the
//    sentence kept saying 8 compositions, 15 blocks and 8 layouts against a
//    tree holding 9, 13 and 9, with nothing to notice. It is counted from the
//    git index (`git ls-tree`), not from the filesystem, because the ledger of
//    record is the repository and not this machine's working tree — an
//    untracked residue directory on one checkout must not change the verdict.
// 2. Every architecture document opens by linking the documentation model,
//    because the model is what decides which document governs when two
//    disagree. A new document without the link has skipped that role
//    assignment. README.md is the model the others link, so it cannot carry
//    the link itself.
//
// The ESLint class of tools cannot hold either claim — they are statements
// about markdown, not code — which is why this is a bespoke tool beside the
// other architecture gates in `pnpm lint` and CI.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MATRIX = "docs/architecture/artifact-matrix.md";
const DOCS_DIR = "docs/architecture";

/** Every kind the count sentence may name maps to the directory that owns one artifact per entry. */
const KIND_DIRS: Record<string, string> = {
  primitives: "packages/primitives",
  compositions: "packages/composition",
  patterns: "packages/patterns",
  layouts: "packages/layouts",
  templates: "templates",
};

/** The enumeration the matrix puts on the line after "not recalled:". */
const COUNT_SENTENCE = /not recalled:\s*\n(?<list>[^.]*)\./;

/** Tracked child directories of `dir`, counted from the index — see the header. */
function countTrackedDirs(root: string, dir: string): number {
  const listing = execFileSync("git", ["ls-tree", "HEAD", "--", `${dir}/`], {
    cwd: root,
    encoding: "utf8",
  });
  return listing.split("\n").filter((line) => line.startsWith("040000 tree")).length;
}

export function checkDocClaims(
  root: string,
  countDirs: (root: string, dir: string) => number = countTrackedDirs,
): string[] {
  const failures: string[] = [];

  // Claim 1 — the count sentence against the tracked tree.
  const matrix = readFileSync(join(root, MATRIX), "utf8");
  const sentence = COUNT_SENTENCE.exec(matrix);
  // The groups index is `string | undefined` under noUncheckedIndexedAccess,
  // so the guard reaches the captured list itself.
  if (!sentence?.groups?.list) {
    failures.push(
      `doc-claims: ${MATRIX} no longer carries the "generated, not recalled" count sentence — restore it, or teach this gate the sentence's new shape`,
    );
  } else {
    const list = sentence.groups.list;
    // Built per call: a shared /g regex keeps lastIndex across calls when a
    // failure throws mid-loop.
    const counted = /(\d+)\s+([a-z]+)/g;
    let claims = 0;
    for (let claim = counted.exec(list); claim; claim = counted.exec(list)) {
      const count = claim[1];
      const kind = claim[2];
      if (!count || !kind) continue;
      claims += 1;
      const dir = KIND_DIRS[kind];
      if (!dir) {
        failures.push(
          `doc-claims: ${MATRIX} counts ${count} ${kind}, but this gate maps no directory to that kind — add it to KIND_DIRS with the directory holding one artifact per entry, or retire the kind`,
        );
        continue;
      }
      const actual = countDirs(root, dir);
      if (String(actual) !== count) {
        failures.push(
          `doc-claims: ${MATRIX} claims ${count} ${kind}, but ${dir}/ holds ${String(actual)} tracked directories — the tree is the evidence, correct the sentence`,
        );
      }
    }
    if (claims === 0) {
      failures.push(`doc-claims: ${MATRIX} carries the count sentence with no counts in it`);
    }
    // A kind dropped from the sentence would pass the recount above while
    // underclaiming, so the sentence must also carry every kind the gate knows.
    for (const kind of Object.keys(KIND_DIRS)) {
      if (!new RegExp(`\\d+\\s+${kind}\\b`).test(list)) {
        failures.push(
          `doc-claims: ${MATRIX} omits ${kind} from the count sentence — every artifact kind the gate maps must be counted, or the omission hides a drift`,
        );
      }
    }
  }

  // Claim 2 — every architecture document names its role through the model.
  const docsDir = join(root, DOCS_DIR);
  for (const entry of readdirSync(docsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    if (entry.name === "README.md") continue;
    // The preamble is the first paragraph; five lines is where every existing
    // document carries the link, and a document long enough to bury the role
    // statement deeper than that has lost it.
    const head = readFileSync(join(docsDir, entry.name), "utf8").split("\n", 5).join("\n");
    if (!head.includes("[documentation model](./README.md)")) {
      failures.push(
        `doc-claims: ${DOCS_DIR}/${entry.name} opens without linking the documentation model — every architecture document names its role through ./README.md`,
      );
    }
  }

  return failures;
}

// CLI entry — run against the real repository and exit non-zero on violations.
if (import.meta.url === `file://${process.argv[1] ?? ""}`) {
  const ROOT = join(import.meta.dirname, "..");
  const failures = checkDocClaims(ROOT);
  if (failures.length) {
    for (const f of failures) console.error(f);
    console.error(`\n${String(failures.length)} stale doc claim(s). Fix before pushing.`);
    process.exit(1);
  }
  console.log("doc claims match the tracked tree; every architecture document names its role.");
}
