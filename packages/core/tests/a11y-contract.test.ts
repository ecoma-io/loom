/**
 * Pin test for the role-aware evidence contract — the same doctrine as
 * a11y-scope.test.ts: the law's internal consistency is proven on every run,
 * not left to the gate that consumes it, because a contract that quietly
 * stopped covering a role would read as a satisfied one.
 *
 * What this pins is the LAW's shape (a11y-contract.ts), not any component's
 * claim — sidecars are the gate's object (tools/check-a11y-evidence.ts and its
 * own fixtures). If one of these assertions reddens, a matrix edit has drifted
 * out of the vocabulary or a requirement has lost its definition, and every
 * sidecar keyed to it would be judging against nothing.
 */
import { describe, it, expect } from "vitest";
import {
  A11Y_EVIDENCE_TIERS,
  A11Y_EVIDENCE_REQUIREMENTS,
  A11Y_EVIDENCE_MATRIX,
  ARIA_ROLES,
  NON_ROLE_MEMBERS,
  A11Y_ROLES,
} from "../src/a11y-contract";

describe("a11y evidence contract", () => {
  it("the closed vocabulary is exactly the ARIA roles plus the non-role members", () => {
    expect(A11Y_ROLES).toEqual([...ARIA_ROLES, ...NON_ROLE_MEMBERS]);
    // The non-role members are not roles: the two axes stay disjoint, so a
    // sidecar's `role` can never be read as asserting an ARIA role it does
    // not have.
    const overlap = NON_ROLE_MEMBERS.filter((m) => (ARIA_ROLES as readonly string[]).includes(m));
    expect(overlap, `non-role members that are also ARIA roles: ${overlap.join(", ")}`).toEqual([]);
    // Closed means no duplicates: a repeated member would make one spelling
    // of a role pass a check its other spelling fails.
    expect(new Set(A11Y_ROLES).size).toBe(A11Y_ROLES.length);
  });

  it("every requirement names a known tier", () => {
    for (const requirement of A11Y_EVIDENCE_REQUIREMENTS) {
      expect(
        A11Y_EVIDENCE_TIERS.includes(requirement.tier),
        `${requirement.id} demands evidence in "${requirement.tier}", which is no evidence tier`,
      ).toBe(true);
    }
  });

  it("every requirement id is unique and carries at least one answered rule", () => {
    expect(new Set(A11Y_EVIDENCE_REQUIREMENTS.map((r) => r.id)).size).toBe(
      A11Y_EVIDENCE_REQUIREMENTS.length,
    );
    for (const requirement of A11Y_EVIDENCE_REQUIREMENTS) {
      expect(
        requirement.answers.length,
        `${requirement.id} answers no rule — a requirement nothing names cannot be argued with`,
      ).toBeGreaterThan(0);
    }
  });

  it("every vocabulary member has exactly one matrix row, and no row exists for a role outside it", () => {
    const rows = new Map(A11Y_EVIDENCE_MATRIX.map((row) => [row.role, row.requirements]));
    const missing = A11Y_ROLES.filter((role) => !rows.has(role));
    expect(
      missing,
      `vocabulary members with no matrix row: ${missing.join(", ")} — a role a sidecar can claim but the matrix cannot judge`,
    ).toEqual([]);
    const extra = [...rows.keys()].filter(
      (role) => !(A11Y_ROLES as readonly string[]).includes(role),
    );
    expect(extra, `matrix rows for roles outside the vocabulary: ${extra.join(", ")}`).toEqual([]);
    expect(rows.size).toBe(A11Y_ROLES.length);
  });

  it("every matrix row names defined requirements, once each", () => {
    const ids = A11Y_EVIDENCE_REQUIREMENTS.map((r) => r.id);
    for (const row of A11Y_EVIDENCE_MATRIX) {
      const unknown = row.requirements.filter((id) => !ids.includes(id));
      expect(
        unknown,
        `${row.role} requires ${unknown.join(", ")}, which no definition supplies`,
      ).toEqual([]);
      expect(new Set(row.requirements).size, `${row.role} repeats a requirement`).toBe(
        row.requirements.length,
      );
    }
  });

  it("semantic-aria is the universal floor, and keyboard is always harness-tier", () => {
    // The floor: every role owes the semantic rules, visual-only included —
    // an aria-hidden element asserting a broken role is still a defect.
    for (const row of A11Y_EVIDENCE_MATRIX) {
      expect(
        row.requirements.includes("semantic-aria"),
        `${row.role} omits semantic-aria — the one requirement no role is above`,
      ).toBe(true);
    }
    // A key contract can only be witnessed in a browser: a keyboard
    // requirement answered browserlessly is the false-pass shape
    // a11y-scope.ts exists to prevent.
    const keyboard = A11Y_EVIDENCE_REQUIREMENTS.find((r) => r.id === "keyboard");
    expect(keyboard?.tier).toBe("harness");
  });
});
