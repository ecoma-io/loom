// @vitest-environment node
//
// Node rather than the project-wide jsdom, for the same reason
// check-architecture.test.ts opts out: these tests build fixture trees on the
// filesystem. The directory counter is injected because counting tracked
// directories needs a git repository — the fixtures prove the gate's
// arithmetic and its failure messages, and the real tree is what `pnpm lint`
// runs against.
import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { checkDocClaims } from "./check-doc-claims.ts";

/** The sentence as 2C left the tree: 9 compositions, 13 patterns, 9 layouts. */
const CORRECT =
  "decision the audit deliberately does not take. Counts were generated, not recalled:\n76 primitives, 9 compositions, 13 patterns, 9 layouts, 3 templates.";

/** The sentence the audit-era prose carried before this gate existed. */
const ROTTED =
  "decision the audit deliberately does not take. Counts were generated, not recalled:\n76 primitives, 8 compositions, 15 blocks, 8 layouts, 3 templates.";

const PREAMBLE =
  "_Empirical record — the [documentation model](./README.md) maps every document's role._\n";

function writeDocs(root: string, countSentence: string): void {
  const arch = join(root, "docs", "architecture");
  mkdirSync(arch, { recursive: true });
  // README.md is the model itself; it carries no link by construction.
  writeFileSync(join(arch, "README.md"), "# The Architecture Documentation Model\n");
  writeFileSync(
    join(arch, "artifact-matrix.md"),
    `# Artifact Matrix\n\n${PREAMBLE}\n${countSentence}\n`,
  );
  writeFileSync(join(arch, "contract.md"), `# Contract\n\n${PREAMBLE}\n`);
}

const COUNTS: Record<string, number> = {
  "packages/primitives": 76,
  "packages/composition": 9,
  "packages/patterns": 13,
  "packages/layouts": 9,
  templates: 3,
};
const countFixed = (_root: string, dir: string): number => COUNTS[dir] ?? 0;

function makeRoot(countSentence: string): string {
  const root = mkdtempSync(join(tmpdir(), "loom-doc-claims-"));
  writeDocs(root, countSentence);
  return root;
}

describe("checkDocClaims", () => {
  it("passes the corrected count sentence against the tracked counts", () => {
    const root = makeRoot(CORRECT);
    try {
      expect(checkDocClaims(root, countFixed)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails the audit-era sentence, naming each drift and the retired kind", () => {
    const root = makeRoot(ROTTED);
    try {
      const failures = checkDocClaims(root, countFixed);
      // 2C moved DashboardGrid and DesktopAppShell and renamed the Blocks
      // family; the rotted sentence drifts on two kinds, names a third this
      // gate maps no directory to, and silently drops the fourth.
      expect(failures.some((f) => f.includes("8 compositions") && f.includes("9"))).toBe(true);
      expect(failures.some((f) => f.includes("8 layouts") && f.includes("9"))).toBe(true);
      expect(failures.some((f) => f.includes("blocks") && f.includes("KIND_DIRS"))).toBe(true);
      expect(failures.some((f) => f.includes("omits patterns"))).toBe(true);
      expect(failures).toHaveLength(4);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a kind dropped from the sentence, not just a wrong count", () => {
    const root = makeRoot(CORRECT.replace("9 layouts, ", ""));
    try {
      const failures = checkDocClaims(root, countFixed);
      expect(failures.some((f) => f.includes("omits layouts"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("recounts through a parenthetical aside, period included (#269 finding 8)", () => {
    const root = makeRoot(CORRECT.replace("9 compositions", "9 compositions (e.g. Stack, v1.5)"));
    try {
      const failures = checkDocClaims(root, countFixed);
      // The aside's own periods ("e.g.", "1.5") used to truncate the capture
      // at the parenthesis and fail every kind after it. Asides are stripped
      // before the capture; the enumeration behind them is intact.
      expect(failures).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("states the one-sentence constraint when a period splits the enumeration", () => {
    const root = makeRoot(CORRECT.replace("13 patterns", "13 patterns. Also 9 layouts"));
    try {
      const failures = checkDocClaims(root, countFixed);
      // The capture ends at the first period, so everything after it is
      // invisible to the recount — the constraint the reader cannot see from
      // the failure alone, stated in the message since #269 finding 8.
      expect(failures.some((f) => f.includes("omits layouts"))).toBe(true);
      expect(failures.some((f) => f.includes("first period"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reads the committed tree and says so when the working tree is ahead", () => {
    const root = makeRoot(ROTTED);
    try {
      const dirty = checkDocClaims(root, countFixed, () => true);
      expect(dirty.some((f) => f.includes("holds 9 tracked directories at HEAD"))).toBe(true);
      expect(dirty.some((f) => f.includes("commit and re-run before editing the sentence"))).toBe(
        true,
      );
      const clean = checkDocClaims(root, countFixed, () => false);
      // Same verdict, no remedy that would send a clean tree chasing a commit.
      expect(clean.some((f) => f.includes("holds 9 tracked directories at HEAD"))).toBe(true);
      expect(clean.some((f) => f.includes("commit and re-run"))).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("fails a document that opens without naming the documentation model", () => {
    const root = makeRoot(CORRECT);
    try {
      writeFileSync(
        join(root, "docs", "architecture", "new-doc.md"),
        "# New Document\n\nNo role statement here.\n",
      );
      const failures = checkDocClaims(root, countFixed);
      expect(failures.some((f) => f.includes("docs/architecture/new-doc.md"))).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
