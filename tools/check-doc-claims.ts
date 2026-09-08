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
//    committed tree (`git ls-tree HEAD`), not from the filesystem and not from
//    the index, because the ledger of record is the repository and not this
//    machine's working tree — an untracked residue directory on one checkout
//    must not change the verdict. That choice has a corollary the failure
//    message now states for you: a component staged but not yet committed is
//    invisible to this gate, so a mismatch under a directory carrying
//    uncommitted changes says to commit and re-run before editing a sentence
//    that may already be right. The recount is that one sentence: the
//    matrix's per-section inline counts and its command block's `wc -l` lines
//    stay outside it — the boundary issue #259 records.
// 2. Every top-level architecture document (docs/architecture/*.md — the
//    decisions/ ADRs below it are not walked) opens by linking the
//    documentation model, because the model is what decides which document
//    governs when two disagree. A new document without the link has skipped
//    that role assignment. README.md is the model the others link, so it
//    cannot carry the link itself.
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

// The list is captured up to the first period, so the sentence has to stay
// one sentence: a period inside the enumeration — an abbreviation, a decimal
// — truncates what the recount sees, and a count the gate never saw cannot
// fail. Parentheticals are removed before the capture (finding 8 of #269: a
// parenthesised aside as ordinary as `(e.g. Stack)` carries its own period
// and amputated the sentence mid-enumeration, failing kinds that were plainly
// present), so an aside is free to say what it likes; a period in bare prose
// still ends the capture, and both the omits and no-counts messages say so —
// a shape constraint the reader cannot see must be stated where the reader is
// told they failed. Widening the match to the whole block would re-couple the
// gate to the block's formatting instead; the constraint is stated here,
// where the shape is chosen.
/** The enumeration the matrix puts on the line after "not recalled:". */
const COUNT_SENTENCE = /not recalled:\s*\n(?<list>[^.]*)\./;

/** Prose asides may say anything, including "e.g."; they are not the enumeration. */
function stripParentheticals(text: string): string {
  return text.replace(/\([^)]*\)/g, "");
}

/**
 * The caller's environment minus the variables that pin git to one specific
 * repository. A pre-push hook runs with `GIT_DIR` exported, and every git this
 * gate spawned inherited the pin: with `GIT_DIR` set and no `GIT_WORK_TREE`,
 * git treats its own cwd as that repository's work tree, so a probe from a
 * fixture tmpdir answered for the worktree's index — hundreds of files
 * "deleted" — and the advisory hint fired on a directory no repository can
 * see. Every verdict these two helpers produce is defined relative to `cwd`
 * ("tracked at HEAD", "carries uncommitted changes"), and discovery from cwd
 * is the only way to get it; the variables must be gone, not overridden.
 */
function gitEnvironment(): Record<string, string | undefined> {
  const pinned = [
    "GIT_DIR",
    "GIT_WORK_TREE",
    "GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY",
    "GIT_COMMON_DIR",
    "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  ];
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !pinned.includes(key)));
}

/** Tracked child directories of `dir`, counted from the committed tree — see the header. */
function countTrackedDirs(root: string, dir: string): number {
  const listing = execFileSync("git", ["ls-tree", "HEAD", "--", `${dir}/`], {
    cwd: root,
    encoding: "utf8",
    env: gitEnvironment(),
  });
  return listing.split("\n").filter((line) => line.startsWith("040000 tree")).length;
}

/**
 * Whether `dir` carries staged or unstaged changes relative to HEAD — the
 * difference between "your sentence is wrong" and "your sentence is right but
 * this gate cannot see your newest directory yet". Deaf (false) when git
 * itself is unavailable, and silenced while being deaf: git's own "not a
 * repository" output went straight to the gate's stderr when the predicate
 * ran outside a repository — a fixture run, a sandboxed CI step — and an
 * advisory hint has no business printing a fatal. The verdict still comes
 * from `ls-tree HEAD`; a git failure must neither mask it nor narrate itself.
 * Exported because the deafness is behaviour a test pins, not an accident to
 * refactor away.
 */
export function hasUncommittedChanges(root: string, dir: string): boolean {
  try {
    return (
      execFileSync("git", ["status", "--porcelain", "--", dir], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        env: gitEnvironment(),
      }).length > 0
    );
  } catch {
    return false;
  }
}

export function checkDocClaims(
  root: string,
  countDirs: (root: string, dir: string) => number = countTrackedDirs,
  countDirty: (root: string, dir: string) => boolean = hasUncommittedChanges,
): string[] {
  const failures: string[] = [];

  // Claim 1 — the count sentence against the tracked tree.
  const matrix = readFileSync(join(root, MATRIX), "utf8");
  const sentence = COUNT_SENTENCE.exec(stripParentheticals(matrix));
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
        // The remedy depends on state the count itself cannot show: a dirty
        // directory means HEAD is behind the tree, so the sentence may be
        // right and the commit is the missing step (#269 finding 7 — the
        // pre-commit flow used to be told to correct a sentence it had just
        // corrected).
        failures.push(
          `doc-claims: ${MATRIX} claims ${count} ${kind}, but ${dir}/ holds ${String(actual)} tracked directories at HEAD — the committed tree is the evidence, correct the sentence` +
            (countDirty(root, dir)
              ? ` (${dir}/ carries uncommitted changes, so HEAD is behind the working tree — commit and re-run before editing the sentence)`
              : ""),
        );
      }
    }
    if (claims === 0) {
      failures.push(
        `doc-claims: ${MATRIX} carries the count sentence with no counts in it — the recount reads up to the sentence's first period (parentheticals are stripped first), so the enumeration must stay one sentence`,
      );
    }
    // A kind dropped from the sentence would pass the recount above while
    // underclaiming, so the sentence must also carry every kind the gate knows.
    for (const kind of Object.keys(KIND_DIRS)) {
      if (!new RegExp(`\\d+\\s+${kind}\\b`).test(list)) {
        failures.push(
          `doc-claims: ${MATRIX} omits ${kind} from the count sentence — every artifact kind the gate maps must be counted, or the omission hides a drift (the recount reads up to the sentence's first period, so keep the enumeration to one sentence; parentheticals are exempt)`,
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
        `doc-claims: ${DOCS_DIR}/${entry.name} opens without linking the documentation model — every top-level architecture document names its role through ./README.md`,
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
  console.log(
    "doc claims match the tracked tree; every top-level architecture document names its role.",
  );
}
