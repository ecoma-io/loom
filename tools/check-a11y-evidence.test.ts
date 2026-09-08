// @vitest-environment node
//
// Node rather than the project-wide jsdom, because these tests exercise the
// a11y evidence gate against fixture trees on the filesystem — the same
// reason check-manifest-privacy.test.ts opts out of jsdom.
//
// The gate is itself tested because a check that always passes is not a
// check, and doubly so here: the gate reads its law by PARSING a TypeScript
// file, so its fixtures must also prove the parse is fail-closed — a contract
// the parser cannot read must stop the gate, never empty it. Each case builds
// a minimal `packages/` tree with exactly the shape needed to trip one rule —
// a missing sidecar, a role outside the vocabulary, a dangling evidence path —
// and asserts the reported failure names the component. One case runs the
// opposite direction: a tree whose sidecars satisfy the law must report zero
// failures, so a future over-eager rule fails loudly rather than quietly
// blocking every component.
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  checkA11yEvidence,
  exceptionSummary,
  parseA11yContract,
  readA11yContract,
} from "./check-a11y-evidence.ts";

/**
 * A minimal but parseable contract. The same flat `as const` shape the real
 * one keeps — the parser judges shape, not content, and a smaller vocabulary
 * makes each fixture's failure readable.
 */
const CONTRACT = `
export const A11Y_EVIDENCE_TIERS = ["browserless", "harness", "sweep"] as const;
export const ARIA_ROLES = ["button", "img"] as const;
export const NON_ROLE_MEMBERS = ["none"] as const;
export const A11Y_ROLES = [...ARIA_ROLES, ...NON_ROLE_MEMBERS] as const;
export const A11Y_EVIDENCE_REQUIREMENTS = [
  { id: "semantic-aria", tier: "browserless", answers: ["aria-roles"] },
  { id: "name", tier: "browserless", answers: ["button-name"] },
  { id: "keyboard", tier: "harness", answers: ["aria-hidden-focus"] },
  { id: "contrast", tier: "sweep", answers: ["color-contrast"] },
  {
    id: "focus-not-obscured",
    tier: "sweep",
    answers: ["e2e/focus-not-obscured.e2e.ts (WCAG 2.4.11 — axe-core ships no rule for it)"],
  },
] as const;
export const A11Y_EVIDENCE_MATRIX = [
  { role: "none", requirements: ["semantic-aria", "name", "contrast"] },
  { role: "img", requirements: ["semantic-aria", "name", "contrast"] },
  {
    role: "button",
    requirements: ["semantic-aria", "name", "contrast", "keyboard", "focus-not-obscured"],
  },
] as const;
`;

/** Every evidence file a satisfying sidecar may cite, created as empty files. */
const EVIDENCE_FILES = [
  "docs/demos/ButtonDemo.vue",
  "docs/components/button.md",
  "packages/primitives/button/tests/Button.test.ts",
  "packages/primitives/button/e2e/button.e2e.ts",
];

const roots: string[] = [];
function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "loom-a11y-evidence-"));
  roots.push(root);
  return root;
}
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** A tree with the contract and one component's evidence files; no sidecar yet. */
function makeTree(): string {
  const root = makeRoot();
  mkdirSync(join(root, "packages", "core", "src"), { recursive: true });
  writeFileSync(join(root, "packages", "core", "src", "a11y-contract.ts"), CONTRACT);
  for (const rel of EVIDENCE_FILES) {
    mkdirSync(join(root, ...rel.split("/").slice(0, -1)), { recursive: true });
    writeFileSync(join(root, ...rel.split("/")), "");
  }
  return root;
}

function writeSidecar(root: string, sidecar: object): void {
  mkdirSync(join(root, "packages", "primitives", "button"), { recursive: true });
  writeFileSync(
    join(root, "packages", "primitives", "button", "a11y.json"),
    JSON.stringify(sidecar),
  );
}

/** The shape a fixture sidecar takes, so spreads stay type-safe. */
interface FixtureSidecar {
  role: string;
  basis: string;
  evidence: Record<string, unknown>;
  exceptions?: { requirement: string; because: string }[];
}

/** A button sidecar that satisfies every rule the gate asserts. */
function completeSidecar(): FixtureSidecar {
  return {
    role: "button",
    basis: "renders a native <button>",
    evidence: {
      browserless: ["docs/demos/ButtonDemo.vue", "packages/primitives/button/tests/Button.test.ts"],
      harness: ["packages/primitives/button/e2e/button.e2e.ts"],
      sweep: [
        {
          path: "docs/components/button.md",
          because: "e2e/focus-not-obscured.e2e.ts (WCAG 2.4.11) sweeps this page.",
        },
      ],
    },
  };
}

const contract = parseA11yContract(CONTRACT);

describe("checkA11yEvidence", () => {
  it("reports zero failures for a tree whose sidecars satisfy the law", () => {
    const root = makeTree();
    writeSidecar(root, completeSidecar());
    expect(checkA11yEvidence(root, contract)).toEqual([]);
  });

  it("names the component of a missing sidecar in the artifact gate's style", () => {
    const root = makeTree();
    expect(checkA11yEvidence(root, contract)).toEqual([
      "Button: missing packages/primitives/button/a11y.json",
    ]);
  });

  it("fails a role outside the closed vocabulary, and judges nothing else about that sidecar", () => {
    const root = makeTree();
    writeSidecar(root, { ...completeSidecar(), role: "wizard" });
    expect(checkA11yEvidence(root, contract)).toEqual([
      expect.stringContaining('Button: packages/primitives/button/a11y.json claims role "wizard"'),
    ]);
  });

  it("fails a matrix requirement with neither evidence nor exception", () => {
    const root = makeTree();
    writeSidecar(root, {
      role: "button",
      basis: "renders a native <button>",
      evidence: {
        browserless: ["docs/demos/ButtonDemo.vue"],
        harness: [],
        sweep: [
          {
            path: "docs/components/button.md",
            because: "e2e/focus-not-obscured.e2e.ts (WCAG 2.4.11) sweeps this page.",
          },
        ],
      },
    });
    expect(checkA11yEvidence(root, contract)).toEqual([
      "Button: role button requires keyboard (harness tier) — no evidence declared and no exception recorded",
    ]);
  });

  it("fails a focus-not-obscured row answered by a bare page citation", () => {
    // The suite-judged refinement: a page citation answers contrast on every
    // page, but not a bespoke suite whose population the page has not joined.
    const root = makeTree();
    writeSidecar(root, {
      ...completeSidecar(),
      evidence: {
        ...completeSidecar().evidence,
        sweep: ["docs/components/button.md"],
      },
    });
    expect(checkA11yEvidence(root, contract)).toEqual([
      "Button: role button requires focus-not-obscured (sweep tier) — no evidence declared and no exception recorded",
    ]);
  });

  it("fails an exception recorded for evidence that already answers the requirement", () => {
    const root = makeTree();
    writeSidecar(root, {
      ...completeSidecar(),
      exceptions: [{ requirement: "contrast", because: "already swept" }],
    });
    expect(checkA11yEvidence(root, contract)).toEqual([
      "Button: contrast is answered by evidence and excepted at once — drop one or the other",
    ]);
  });

  it("fails an exception for a requirement the role's row does not demand", () => {
    const root = makeTree();
    writeSidecar(root, {
      role: "none",
      basis: "renders a bare <div>",
      evidence: {
        browserless: ["docs/demos/ButtonDemo.vue"],
        sweep: ["docs/components/button.md"],
      },
      exceptions: [{ requirement: "keyboard", because: "not interactive" }],
    });
    expect(checkA11yEvidence(root, contract)).toEqual([
      "Button: role none owes no keyboard — an exception for a requirement the row does not demand is noise in the record",
    ]);
  });

  it("fails a dangling evidence path — declared-but-absent evidence is the fabricated kind", () => {
    const root = makeTree();
    writeSidecar(root, {
      ...completeSidecar(),
      evidence: {
        ...completeSidecar().evidence,
        harness: ["packages/primitives/button/e2e/never-written.e2e.ts"],
      },
    });
    expect(checkA11yEvidence(root, contract)).toEqual([
      'Button: evidence.harness entry "packages/primitives/button/e2e/never-written.e2e.ts" does not exist in the tree',
    ]);
  });

  it("rejects a path that escapes the repository root", () => {
    const root = makeTree();
    writeSidecar(root, {
      ...completeSidecar(),
      evidence: {
        ...completeSidecar().evidence,
        harness: ["../elsewhere/spec.e2e.ts"],
      },
    });
    expect(checkA11yEvidence(root, contract)).toEqual([
      'Button: evidence.harness entry "../elsewhere/spec.e2e.ts" must be repository-root-relative',
    ]);
  });

  it("demands a because for evidence in a tier the row does not demand", () => {
    const root = makeTree();
    writeSidecar(root, {
      role: "img",
      basis: "renders an <img alt>",
      evidence: {
        browserless: ["docs/demos/ButtonDemo.vue"],
        harness: ["packages/primitives/button/e2e/button.e2e.ts"],
        sweep: ["docs/components/button.md"],
      },
    });
    expect(checkA11yEvidence(root, contract)).toEqual([
      expect.stringContaining(
        'Button: evidence.harness entry "packages/primitives/button/e2e/button.e2e.ts" — role img owes nothing in the harness tier; record a because for surplus evidence',
      ),
    ]);
  });

  it("fails an unknown sidecar key instead of reading past it", () => {
    const root = makeTree();
    writeSidecar(root, { ...completeSidecar(), roles: "button" });
    expect(checkA11yEvidence(root, contract)).toEqual([
      'Button: packages/primitives/button/a11y.json carries unknown key "roles" — extend the contract and this gate together',
    ]);
  });

  it("fails evidence declared under a tier the contract does not name", () => {
    const root = makeTree();
    writeSidecar(root, {
      ...completeSidecar(),
      evidence: { ...completeSidecar().evidence, runtime: ["docs/demos/ButtonDemo.vue"] },
    });
    expect(checkA11yEvidence(root, contract)).toEqual([
      expect.stringContaining(
        'Button: packages/primitives/button/a11y.json declares evidence under "runtime"',
      ),
    ]);
  });

  it("fails malformed JSON and an exception whose because is missing", () => {
    const root = makeTree();
    mkdirSync(join(root, "packages", "primitives", "button"), { recursive: true });
    writeFileSync(join(root, "packages", "primitives", "button", "a11y.json"), "{ role: ");
    expect(checkA11yEvidence(root, contract)[0]).toEqual(
      expect.stringContaining("does not parse as JSON"),
    );
  });

  it("fails an exception whose because is empty", () => {
    const root = makeTree();
    writeSidecar(root, {
      ...completeSidecar(),
      exceptions: [{ requirement: "keyboard", because: "  " }],
    });
    expect(checkA11yEvidence(root, contract)).toEqual([
      expect.stringContaining("records an exception for keyboard with no because"),
    ]);
  });

  it("fails an exception for a requirement no definition supplies", () => {
    const root = makeTree();
    writeSidecar(root, {
      ...completeSidecar(),
      evidence: { ...completeSidecar().evidence, harness: [] },
      exceptions: [{ requirement: "vibes", because: "unjudged" }],
    });
    const failures = checkA11yEvidence(root, contract);
    expect(failures).toContain(
      'Button: packages/primitives/button/a11y.json records an exception for "vibes" — no such requirement',
    );
  });

  it("counts exceptions per component, skipping sidecars it cannot parse", () => {
    const root = makeTree();
    writeSidecar(root, {
      ...completeSidecar(),
      exceptions: [
        { requirement: "keyboard", because: "no spec yet" },
        { requirement: "focus-not-obscured", because: "page not yet in the suite" },
      ],
    });
    mkdirSync(join(root, "packages", "primitives", "icon-button"), { recursive: true });
    writeFileSync(join(root, "packages", "primitives", "icon-button", "a11y.json"), "{");
    mkdirSync(join(root, "packages", "primitives", "avatar"), { recursive: true });
    writeFileSync(
      join(root, "packages", "primitives", "avatar", "a11y.json"),
      JSON.stringify({ ...completeSidecar(), role: "img" }),
    );
    expect(exceptionSummary(root, contract)).toEqual({ count: 2, components: 1 });
  });
});

describe("parseA11yContract", () => {
  it("reads the repository's own contract", () => {
    const parsed = readA11yContract(join(import.meta.dirname, ".."));
    expect(parsed.tiers).toEqual(["browserless", "harness", "sweep"]);
    expect(parsed.roles.length).toBeGreaterThan(20);
  });

  it("is blind to comments — a docblock may mention brackets without becoming law", () => {
    const parsed = parseA11yContract(`${CONTRACT}
/**
 * The [link] row and the {role: "tooltip"} examples above are prose, not law:
 * none of it may turn up in the parsed vocabulary.
 */
`);
    expect(parsed.roles).toEqual(["button", "img", "none"]);
  });

  it("throws on every structural fault instead of returning a partial law", () => {
    const fault = (source: string) => () => parseA11yContract(source);
    expect(fault(CONTRACT.replace(/export const ARIA_ROLES[\s\S]*?as const;/, ""))).toThrow(
      /exports no `const ARIA_ROLES`/,
    );
    expect(fault(CONTRACT.replace('["button", "img"] as const', '["button", "img"'))).toThrow(
      /never closes/,
    );
    expect(fault(CONTRACT.replace('tier: "sweep"', 'tier: "browser"'))).toThrow(
      /demands tier "browser", which no tier names/,
    );
    expect(
      fault(
        CONTRACT.replace(
          '{ id: "semantic-aria", tier: "browserless", answers: ["aria-roles"] },',
          '{ id: "semantic-aria", tier: "browserless", answers: ["aria-roles"] },\n  { id: "semantic-aria", tier: "harness", answers: ["aria-roles"] },',
        ),
      ),
    ).toThrow(/repeats an id/);
    expect(fault(CONTRACT.replace('role: "img",', 'role: "wizard",'))).toThrow(
      /judges "wizard", which the vocabulary does not carry/,
    );
    expect(fault(CONTRACT.replace('"name", "contrast"', '"name", "vibes"'))).toThrow(
      /requires vibes, which no definition supplies/,
    );
    expect(
      fault(
        CONTRACT.replace(
          /export const A11Y_EVIDENCE_MATRIX[\s\S]*?as const;/,
          "export const A11Y_EVIDENCE_MATRIX = [] as const;",
        ),
      ),
    ).toThrow(/A11Y_EVIDENCE_MATRIX is empty/);
  });
});
