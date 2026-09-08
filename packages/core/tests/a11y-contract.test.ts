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
 *
 * The content pin is deliberately snapshot-shaped: editing a row of the matrix
 * is LAW-MAKING, not refactoring. The matrix is what every sidecar is judged
 * against, so shrinking a role's row silently relieves every component claiming
 * that role of an obligation — five buttons stop owing their name and not one
 * gate reddens. A row edit must therefore land as a deliberate change that
 * updates this pin AND the sidecars in the same PR, with the reason written
 * where the row is edited.
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
import { BROWSERLESS_RULES, BROWSER_REQUIRED_RULES } from "../src/a11y-scope";

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

  it("demands every defined requirement of at least one role", () => {
    // A definition no row reaches is dead law: it reads as an obligation while
    // exempting every component from it.
    const demanded = new Set(A11Y_EVIDENCE_MATRIX.flatMap((row) => row.requirements));
    const orphaned = A11Y_EVIDENCE_REQUIREMENTS.filter((r) => !demanded.has(r.id));
    expect(
      orphaned.map((r) => r.id),
      "requirements no matrix row demands — dead law that reads as an obligation",
    ).toEqual([]);
  });

  it("the matrix is the law it says it is — content pinned, whole", () => {
    // Snapshot-shaped on purpose: any edit here is law-making (see the
    // docblock). This literal IS the current law; a row edit that does not
    // update it fails this test, and a pin update that does not update the
    // sidecars fails the gate — the two halves of a deliberate change.
    const expected: [string, string[]][] = [
      ["visual-only", ["semantic-aria"]],
      ["none", ["semantic-aria", "name", "contrast"]],
      ["img", ["semantic-aria", "name", "contrast"]],
      ["separator", ["semantic-aria", "contrast"]],
      ["alert", ["semantic-aria", "name", "contrast"]],
      ["status", ["semantic-aria", "name", "contrast"]],
      ["meter", ["semantic-aria", "name", "contrast"]],
      ["progressbar", ["semantic-aria", "name", "contrast"]],
      ["tooltip", ["semantic-aria", "name", "contrast"]],
      ["list", ["semantic-aria", "name", "structure", "contrast"]],
      [
        "tree",
        [
          "semantic-aria",
          "name",
          "structure",
          "contrast",
          "keyboard",
          "target-size",
          "focus-not-obscured",
        ],
      ],
      [
        "table",
        [
          "semantic-aria",
          "name",
          "structure",
          "contrast",
          "keyboard",
          "target-size",
          "focus-not-obscured",
        ],
      ],
      [
        "grid",
        [
          "semantic-aria",
          "name",
          "structure",
          "contrast",
          "keyboard",
          "target-size",
          "focus-not-obscured",
        ],
      ],
      [
        "region",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      ["navigation", ["semantic-aria", "name", "contrast", "target-size", "focus-not-obscured"]],
      [
        "button",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      ["link", ["semantic-aria", "name", "contrast", "target-size", "focus-not-obscured"]],
      [
        "checkbox",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "switch",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "radiogroup",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "slider",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "spinbutton",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "textbox",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "combobox",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "searchbox",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "menu",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "menubar",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "toolbar",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "tablist",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "dialog",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "alertdialog",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
      [
        "group",
        ["semantic-aria", "name", "contrast", "keyboard", "target-size", "focus-not-obscured"],
      ],
    ];
    expect(A11Y_EVIDENCE_MATRIX.map((row) => [row.role, [...row.requirements]])).toEqual(expected);
  });

  it("the families name only rules the scope partition holds, and name the whole remainder", () => {
    // An answer that is neither a runtime-tier rule nor a named bespoke suite
    // would be a rule no gate ever runs. The remainder is the other half of
    // the same pin: a scope rule named by NO family must be a deliberate
    // absence recorded here, not a rule a rename dropped unnoticed.
    const scope = new Set<string>([...BROWSERLESS_RULES, ...BROWSER_REQUIRED_RULES]);
    // string[], not the answers' literal union: membership is what this pin
    // judges, and a `Set<string>.has(literal-union)` reads fine while the
    // reverse direction (`answers.includes(scopeString)`) does not typecheck.
    const answers: string[] = A11Y_EVIDENCE_REQUIREMENTS.flatMap((r) => [...r.answers]);
    const bespoke = answers.filter((answer) => answer.startsWith("e2e/"));
    const unknown = answers.filter((answer) => !scope.has(answer) && !bespoke.includes(answer));
    expect(unknown, `family members that are no gate's rule: ${unknown.join(", ")}`).toEqual([]);

    // The deliberately-uncovered remainder — mirrored in the contract's
    // docblock, which names each group's reason. A rule that moves in or out
    // of a family has to edit both, which is the point.
    const uncovered = [...scope].filter((rule) => !answers.includes(rule));
    expect(uncovered.sort()).toEqual(
      [
        // Host-document facts a consumer's page answers, not a component.
        "aria-hidden-body",
        "bypass",
        "document-title",
        "html-has-lang",
        "html-lang-valid",
        "html-xml-lang-mismatch",
        "meta-refresh",
        "meta-viewport",
        "valid-lang",
        // Elements no Loom component ships.
        "blink",
        "frame-focusable-content",
        "frame-title",
        "frame-title-unique",
        "input-button-name",
        "marquee",
        "no-autoplay-audio",
        "object-alt",
        "server-side-image-map",
        "summary-name",
        "video-caption",
        // Attributes whose truth belongs to the host, not the component.
        "aria-braille-equivalent",
        "autocomplete-valid",
        // Consumer styling, not component markup.
        "avoid-inline-spacing",
        // Conservative-partial table geometry: the sweep runs them site-wide,
        // but no role's row owes them per-component yet.
        "table-fake-caption",
        "td-has-header",
        "td-headers-attr",
        "th-has-data-cells",
      ].sort(),
    );
  });
});
