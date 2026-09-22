// @vitest-environment node
//
// Node rather than the project-wide jsdom, because these tests exercise the
// register gate against fixture trees on the filesystem — the same reason
// check-a11y-evidence.test.ts opts out of jsdom.
//
// The gate is itself tested because a check that always passes is not a
// check. The registers are pinned two-way by the table the gate reads, so
// the test's fixture cases drive the two failure directions the discipline
// needs — a register that grew without an owner, and a register that shrank
// without the receipt — plus the dead-pointer case that motivated the gate:
// register text citing an issue that is not a declared live tracker. The
// repository's own tree must pass, so a future register (or a future rule)
// that stops agreeing with the table fails here instead of passing
// everything.
import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  LIVE_ISSUE_TRACKERS,
  REGISTERS,
  checkExceptionRegisters,
  issueReferences,
  readRegisters,
  tokenBecauseStrings,
} from "./check-exception-registers.ts";

/** The repository this tool runs against, from the test's own location. */
const REPO_ROOT = join(import.meta.dirname, "..");

/** One sidecar on the filesystem: `packages/primitives/<name>/a11y.json`. */
function sidecarFixture(root: string, name: string, json: string): void {
  mkdirSync(join(root, "packages", "primitives", name), { recursive: true });
  writeFileSync(join(root, "packages", "primitives", name, "a11y.json"), json);
}

/** A fixture tree whose single sidecar carries the given exceptions. */
function fixtureTree(sidecars: { name: string; json: string }[]): string {
  const root = mkdtempSync(join(tmpdir(), "registers-"));
  mkdirSync(join(root, "packages", "core", "src"), { recursive: true });
  writeFileSync(
    join(root, "packages", "core", "src", "theme-contract.ts"),
    "export const TOKEN_EXCEPTIONS = [] as const;\n",
  );
  for (const { name, json } of sidecars) sidecarFixture(root, name, json);
  return root;
}

/**
 * The count-of-record table a fixture is measured against: the tree-derived
 * registers zeroed, except the composition-conformance rows — those are
 * imported, not read from the fixture, so they hold their real count in any
 * root this module runs against.
 */
const ZERO_REGISTERS = REGISTERS.map((register) => ({
  ...register,
  countOfRecord: register.id === "composition-conformance" ? register.countOfRecord : 0,
}));

describe("checkExceptionRegisters", () => {
  it("passes the repository's own tree — the table and the tree agree today", () => {
    expect(checkExceptionRegisters(REPO_ROOT)).toEqual([]);
  });

  it("fails a register that grew without its pin being raised", () => {
    const root = fixtureTree([
      {
        name: "widget",
        json: JSON.stringify({
          role: "none",
          basis: "a div",
          exceptions: [{ requirement: "keyboard", because: "no answer yet" }],
        }),
      },
    ]);
    const failures = checkExceptionRegisters(root, LIVE_ISSUE_TRACKERS, ZERO_REGISTERS);
    // The growth failure names the register, not the component — the table
    // counts rows, and the row that arrived is owned at the table, where the
    // pin lives.
    expect(
      failures.some((failure) => failure.includes("GREW") && failure.includes("role-a11y")),
    ).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });

  it("fails a register that shrank without its pin being lowered", () => {
    const root = fixtureTree([]);
    const failures = checkExceptionRegisters(root, LIVE_ISSUE_TRACKERS, REGISTERS);
    expect(
      failures.some((failure) => failure.includes("SHRANK") && failure.includes("role-a11y")),
    ).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });

  it("fails register text citing an issue that is not a live tracker", () => {
    const root = fixtureTree([
      {
        name: "widget",
        json: JSON.stringify({
          role: "none",
          basis: "a div",
          evidence: {
            harness: [
              {
                path: "packages/primitives/widget/a11y.json",
                because: "tracked in ecoma-io/loom#272",
              },
            ],
          },
        }),
      },
    ]);
    const failures = checkExceptionRegisters(root, LIVE_ISSUE_TRACKERS, ZERO_REGISTERS);
    expect(
      failures.some(
        (failure) =>
          failure.includes("#272") &&
          failure.includes("not a live tracker") &&
          failure.includes("packages/primitives/widget/a11y.json"),
      ),
    ).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });

  it("passes register text citing a declared live tracker", () => {
    const root = fixtureTree([
      {
        name: "widget",
        json: JSON.stringify({
          role: "none",
          basis: "a div",
          evidence: {
            harness: [
              {
                path: "packages/primitives/widget/a11y.json",
                because: "tracked in ecoma-io/loom#432",
              },
            ],
          },
        }),
      },
    ]);
    expect(checkExceptionRegisters(root, LIVE_ISSUE_TRACKERS, ZERO_REGISTERS)).toEqual([]);
    rmSync(root, { recursive: true, force: true });
  });

  it("fails a register the table does not name — an owner nobody named", () => {
    const root = fixtureTree([
      {
        name: "widget",
        json: JSON.stringify({
          role: "none",
          basis: "a div",
          exceptions: [{ requirement: "keyboard", because: "no answer yet" }],
        }),
      },
    ]);
    // a table of none: every live register is unowned by construction
    const failures = checkExceptionRegisters(root, LIVE_ISSUE_TRACKERS, []);
    expect(
      failures.some(
        (failure) => failure.includes("role-a11y") && failure.includes("owner nobody named"),
      ),
    ).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });

  it("fails a table row no reader produces — the tree no longer holds the register", () => {
    const root = fixtureTree([]);
    // A renamed reader key would drop its register out of the counts map
    // while the table keeps naming it: the row approves nothing and guards
    // nothing, which is worse than an unowned register because it reads as
    // green. This is the one failure direction the fixtures above do not
    // drive.
    const failures = checkExceptionRegisters(root, LIVE_ISSUE_TRACKERS, [
      { id: "phantom", lives: "nowhere", owner: "someone", countOfRecord: 0 },
    ]);
    expect(
      failures.some(
        (failure) => failure.includes("phantom") && failure.includes("no longer holds"),
      ),
    ).toBe(true);
    rmSync(root, { recursive: true, force: true });
  });
});

describe("issueReferences", () => {
  it("extracts every loom issue reference in a piece of register text", () => {
    expect(
      issueReferences("tracked in ecoma-io/loom#432, formerly #308 and ecoma-io/loom#272"),
    ).toEqual([432, 272]);
  });

  it("returns nothing for text that cites no issue", () => {
    expect(issueReferences("a self-contained reason with no tracker")).toEqual([]);
  });
});

describe("tokenBecauseStrings", () => {
  it("reads the real register's reasons — 27 of record today", () => {
    const source = readFileSync(
      join(REPO_ROOT, "packages", "core", "src", "theme-contract.ts"),
      "utf8",
    );
    expect(tokenBecauseStrings(source)).toHaveLength(27);
  });

  it("returns nothing for a contract with no TOKEN_EXCEPTIONS block", () => {
    expect(tokenBecauseStrings("export const OTHER = [] as const;\n")).toEqual([]);
  });

  it("returns nothing when the array never closes", () => {
    expect(tokenBecauseStrings("export const TOKEN_EXCEPTIONS = [\n")).toEqual([]);
  });
});

describe("readRegisters", () => {
  it("counts all three sidecar axes plus the two parsed registers", () => {
    const { counts } = readRegisters(REPO_ROOT);
    expect(counts.get("role-a11y")).toBe(70);
    expect(counts.get("interaction")).toBe(30);
    expect(counts.get("responsive")).toBe(4);
    expect(counts.get("token-allowlist")).toBe(27);
    expect(counts.get("composition-conformance")).toBe(1);
  });
});
