// @vitest-environment node
//
// Node rather than the project-wide jsdom, for the same reason
// check-architecture.test.ts opts out: these read the repository's own files.
//
// A gate that cannot fail is not a gate, and this one guards directories that
// every coding agent reads before it does anything else — so each way the
// skill trees can stop matching what they claim to be is exercised here in the
// failing direction. `evaluate` is pure, so all but the last two cases are
// plain data with no filesystem behind them.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { evaluate, readFacts, type Facts, type Manifest } from "./check-skills.ts";
import { OWNED, TREES } from "./sync-skills.ts";

const ROOT = join(import.meta.dirname, "..");

/** A tree that satisfies every rule: one vendored skill, mirrored, plus one owned. */
function healthy(): Facts {
  const manifest: Manifest = {
    vendor: {
      package: "@ecoma-io/archkeep",
      version: "0.21.0",
      ref: "v0.21.0",
      source: "ecoma-io/archkeep@v0.21.0",
      skills: ["arch-check"],
    },
    owned: ["add-component"],
    writes: [
      ".claude/skills/arch-check/SKILL.md",
      ".agents/skills/arch-check/SKILL.md",
      ".agents/skills/add-component/SKILL.md",
    ],
    hashes: {
      ".claude/skills/arch-check/SKILL.md": "aaa",
      ".agents/skills/arch-check/SKILL.md": "aaa",
    },
  };
  return {
    manifest,
    manifestError: null,
    pin: "0.21.0",
    present: {
      ".claude/skills/arch-check/SKILL.md": "aaa",
      ".agents/skills/arch-check/SKILL.md": "aaa",
      ".claude/skills/add-component/SKILL.md": "bbb",
      ".agents/skills/add-component/SKILL.md": "bbb",
    },
    trees: [".claude/skills", ".agents/skills"],
  };
}

const says = (problems: string[], fragment: string): boolean =>
  problems.some((problem) => problem.includes(fragment));

describe("check-skills", () => {
  it("reports nothing on a tree that matches its manifest", () => {
    expect(evaluate(healthy())).toEqual([]);
  });

  it("rejects a vendored file that was edited by hand", () => {
    const facts = healthy();
    facts.present[".claude/skills/arch-check/SKILL.md"] = "edited";
    const problems = evaluate(facts);
    expect(says(problems, "was edited by hand")).toBe(true);
  });

  it("rejects the two trees drifting apart", () => {
    const facts = healthy();
    // Only the mirror moves, and only for the *owned* skill — the population
    // the manifest deliberately does not hash. Nothing but tree parity can see
    // this, which is why parity is a rule of its own.
    facts.present[".agents/skills/add-component/SKILL.md"] = "stale";
    expect(says(evaluate(facts), "have drifted apart")).toBe(true);
  });

  it("rejects a dependency bump that was never re-synced", () => {
    // The direction with no diff of its own: both copies stay perfectly
    // consistent with each other and with the manifest while both go stale.
    const facts = healthy();
    facts.pin = "0.15.0";
    const problems = evaluate(facts);
    expect(says(problems, "vendored from 0.21.0")).toBe(true);
    expect(says(problems, "leaves no diff")).toBe(true);
  });

  it("rejects a version range where an exact pin is required", () => {
    const facts = healthy();
    facts.pin = "^0.21.0";
    const problems = evaluate(facts);
    expect(says(problems, "which is a range")).toBe(true);
    // And it must not also claim a stale vendor: the range is the finding.
    expect(says(problems, "leaves no diff")).toBe(false);
  });

  it("rejects an empty manifest rather than reading it as a clean scan", () => {
    const facts = healthy();
    const manifest = facts.manifest;
    if (manifest === null) throw new Error("healthy() must supply a manifest");
    facts.manifest = { ...manifest, hashes: {}, vendor: { ...manifest.vendor, skills: [] } };
    facts.present = {};
    const problems = evaluate(facts);
    expect(says(problems, "records no hashed files")).toBe(true);
    expect(says(problems, "records no vendored skills")).toBe(true);
  });

  it("rejects a missing manifest", () => {
    const facts = healthy();
    facts.manifest = null;
    facts.manifestError = "ENOENT";
    expect(says(evaluate(facts), "missing or unreadable")).toBe(true);
  });

  it("rejects a file under a managed tree that nothing records", () => {
    const facts = healthy();
    facts.present[".claude/skills/stowaway/SKILL.md"] = "ccc";
    facts.present[".agents/skills/stowaway/SKILL.md"] = "ccc";
    expect(says(evaluate(facts), "recorded nowhere")).toBe(true);
  });

  it("lets an owned skill be edited freely beside a vendored one", () => {
    // The trap this gate exists around: reeve's version wipes the tree and
    // hashes everything in it, which would delete `add-component` and then
    // reject it on restore. An owned skill changing its bytes — in both trees,
    // together — is not a finding.
    const facts = healthy();
    facts.present[".claude/skills/add-component/SKILL.md"] = "rewritten";
    facts.present[".agents/skills/add-component/SKILL.md"] = "rewritten";
    expect(evaluate(facts)).toEqual([]);
  });

  it("never records an owned skill's authoring copy as something sync may delete", () => {
    // `sync` deletes exactly the paths the previous run wrote. If an owned
    // skill's source copy were on that list, the first sync after a clone
    // would delete the only copy that exists.
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "tools", "skills.manifest.json"), "utf8"),
    ) as Manifest;
    for (const skill of OWNED) {
      const authored = `${TREES[0]}/${skill}/`;
      expect(manifest.writes.filter((path) => path.startsWith(authored))).toEqual([]);
      expect(Object.keys(manifest.hashes).filter((path) => path.startsWith(authored))).toEqual([]);
    }
  });

  it("passes against the trees this repository actually commits", () => {
    expect(evaluate(readFacts(TREES))).toEqual([]);
  });
});
