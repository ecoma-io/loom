// @vitest-environment node
//
// Node rather than the project-wide jsdom, because these tests exercise the
// interaction evidence gate against fixture trees on the filesystem — the
// same reason check-a11y-evidence.test.ts opts out of jsdom.
//
// The gate is itself tested because a check that always passes is not a
// check, and doubly so here: the gate reads its law by PARSING a TypeScript
// file, so its fixtures must also prove the parse is fail-closed — a contract
// the parser cannot read must stop the gate, never empty it. Each case builds
// a minimal `packages/` tree with exactly the shape needed to trip one rule —
// a missing claim, a class outside the vocabulary, a spec that clicks but
// never presses a key — and asserts the reported failure names the component.
// The keyboard-witness cases are the axis's own mechanic: the same tier, the
// same unqualified citation, and the duty answers or does not purely on the
// tree fact of whether the file performs a gesture.
import { afterAll, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  checkInteractionEvidence,
  interactionExceptionSummary,
  namesAKeyboardGesture,
  parseInteractionContract,
  readInteractionContract,
} from "./check-interaction-evidence.ts";

/**
 * A minimal but parseable interaction law. The same flat `as const` shape the
 * real one keeps — the parser judges shape, not content, and a smaller
 * vocabulary makes each fixture's failure readable.
 */
const CONTRACT = `
export const INTERACTION_CLASSES = ["interactive", "container", "visual-only"] as const;
export const INTERACTION_EVIDENCE_TIERS = ["browserless", "harness"] as const;
export const INTERACTION_REQUIREMENTS = [
  { id: "keyboard-operate", tier: "harness", answers: ["activation gestures"] },
  { id: "state-report", tier: "browserless", answers: ["disabled and readonly states"] },
  { id: "keyboard-inert", tier: "browserless", answers: ["no focusable part"] },
] as const;
export const INTERACTION_MATRIX = [
  { class: "interactive", requirements: ["keyboard-operate", "state-report"] },
  { class: "container", requirements: ["keyboard-operate"] },
  { class: "visual-only", requirements: ["keyboard-inert"] },
] as const;
`;

const KEYBOARD_SPEC_PATH = "packages/primitives/button/e2e/button-keyboard.e2e.ts";
const CLICK_SPEC_PATH = "packages/primitives/button/e2e/button-click.e2e.ts";
const UNIT_TEST_PATH = "packages/primitives/button/tests/Button.test.ts";

const KEYBOARD_SPEC = [
  'import { test, expect } from "@playwright/test";',
  "",
  'test("Enter activates", async ({ page }) => {',
  '  await page.goto("/?component=button");',
  '  await page.keyboard.press("Enter");',
  '  await expect(page.getByRole("button")).toBeFocused();',
  "});",
].join("\n");

/** Same runtime, same shape, and the exact difference the witness rule reads. */
const CLICK_SPEC = [
  'import { test, expect } from "@playwright/test";',
  "",
  'test("click activates", async ({ page }) => {',
  '  await page.goto("/?component=button");',
  '  await page.locator("button").click();',
  '  await expect(page.locator("button")).toBeDisabled();',
  "});",
].join("\n");

/** A remarked keypress is not one the spec performs — the witness is comment-blind. */
const CLICK_SPEC_WITH_REMARKED_KEYBOARD = [
  ...CLICK_SPEC.split("\n").slice(0, -1),
  '  // await page.keyboard.press("Enter"); — retired; the keyboard story is a harness spec away',
  "});",
].join("\n");

/** The same lie in the shape retired code actually takes: a trailing comment. */
const CLICK_SPEC_WITH_TRAILING_RETIRED_KEYBOARD = [
  ...CLICK_SPEC.split("\n").slice(0, -1),
  '  await page.locator("button").click(); // retired: await page.keyboard.press("Enter")',
  "});",
].join("\n");

/**
 * The keyboard lie the placement rule exists for: a browserless unit test
 * carrying the gesture's WORDS — as a string literal, where no scanner's
 * comment strip can reach — under the one tier whose directory the harness
 * would never run it from.
 */
const UNIT_TEST_WITH_KEYBOARD_LITERAL = [
  'test("renders disabled", () => {',
  '  expect("page.keyboard.press is a harness fact").toBe("page.keyboard.press is a harness fact");',
  "});",
].join("\n");

/** Every evidence file a satisfying sidecar may cite, created as files. */
const EVIDENCE_FILES: [string, string][] = [
  [KEYBOARD_SPEC_PATH, KEYBOARD_SPEC],
  [CLICK_SPEC_PATH, CLICK_SPEC],
  [UNIT_TEST_PATH, 'test("renders disabled", () => { expect(true).toBe(true); });'],
];

const roots: string[] = [];
function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "loom-interaction-evidence-"));
  roots.push(root);
  return root;
}
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

/** A tree with the contract and one component's evidence; no sidecar yet. */
function makeTree(): string {
  const root = makeRoot();
  mkdirSync(join(root, "packages", "core", "src"), { recursive: true });
  writeFileSync(join(root, "packages", "core", "src", "a11y-contract.ts"), CONTRACT);
  for (const [rel, content] of EVIDENCE_FILES) {
    mkdirSync(join(root, ...rel.split("/").slice(0, -1)), { recursive: true });
    writeFileSync(join(root, ...rel.split("/")), content);
  }
  return root;
}

function writeSidecar(root: string, sidecar: object, name = "button"): void {
  mkdirSync(join(root, "packages", "primitives", name), { recursive: true });
  writeFileSync(join(root, "packages", "primitives", name, "a11y.json"), JSON.stringify(sidecar));
}

/** The shape a fixture sidecar takes, so spreads stay type-safe. `exceptions`
 * stays unknown on purpose: the malformed-shape cases below deliberately write
 * values the law rejects, and typing them as law-abiding would hide the fault. */
interface FixtureInteraction {
  class: string;
  basis: string;
  evidence?: Record<string, unknown>;
  exceptions?: unknown;
}
interface FixtureSidecar {
  interaction: FixtureInteraction;
}

/** An interactive sidecar that satisfies every rule the gate asserts. */
function completeSidecar(): FixtureSidecar {
  return {
    interaction: {
      class: "interactive",
      basis: "one native activation target",
      evidence: {
        browserless: [UNIT_TEST_PATH],
        harness: [KEYBOARD_SPEC_PATH],
      },
    },
  };
}

const contract = parseInteractionContract(CONTRACT);

describe("checkInteractionEvidence", () => {
  it("reports zero failures for a tree whose sidecars satisfy the law", () => {
    const root = makeTree();
    writeSidecar(root, completeSidecar());
    expect(checkInteractionEvidence(root, contract)).toEqual([]);
  });

  it("names the component of a missing sidecar in the artifact gate's style", () => {
    const root = makeTree();
    expect(checkInteractionEvidence(root, contract)).toEqual([
      "Button: missing packages/primitives/button/a11y.json",
    ]);
  });

  it("fails a sidecar that carries no interaction claim — the deliberate absence is a claim too", () => {
    const root = makeTree();
    writeSidecar(root, { role: "button", basis: "renders a native <button>" });
    expect(checkInteractionEvidence(root, contract)).toEqual([
      "Button: packages/primitives/button/a11y.json carries no interaction claim — every component declares the class of interaction it owns, or owns its absence",
    ]);
  });

  it("fails a class outside the closed vocabulary, and judges nothing else about that claim", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: { ...completeSidecar().interaction, class: "operable" },
    });
    expect(checkInteractionEvidence(root, contract)).toEqual([
      expect.stringContaining('Button: interaction claim asserts class "operable"'),
    ]);
  });

  it("fails a duty with neither evidence nor exception", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        class: "interactive",
        basis: "one native activation target",
        evidence: { browserless: [UNIT_TEST_PATH] },
      },
    });
    expect(checkInteractionEvidence(root, contract)).toEqual([
      "Button: class interactive requires keyboard-operate (harness tier) — no evidence declared and no exception recorded",
    ]);
  });

  it("answers keyboard-operate by the tree fact — a spec must perform a gesture, not merely cite one", () => {
    // The click-only spec is real harness evidence in the demanded tier, and
    // it answers nothing: operability is witnessed by a keypress, and the
    // file's own text is what says whether one happens.
    const clicking = makeTree();
    writeSidecar(clicking, {
      interaction: {
        ...completeSidecar().interaction,
        evidence: { browserless: [UNIT_TEST_PATH], harness: [CLICK_SPEC_PATH] },
      },
    });
    expect(checkInteractionEvidence(clicking, contract)).toEqual([
      "Button: class interactive requires keyboard-operate (harness tier) — no evidence declared and no exception recorded",
    ]);
    // With the exception recorded the same tree passes: an obligation the
    // spec does not witness lives in the record, not in wording.
    const excepted = makeTree();
    writeSidecar(excepted, {
      interaction: {
        ...completeSidecar().interaction,
        evidence: { browserless: [UNIT_TEST_PATH], harness: [CLICK_SPEC_PATH] },
        exceptions: [
          {
            requirement: "keyboard-operate",
            because: "button-click.e2e.ts exercises the pointer only",
          },
        ],
      },
    });
    expect(checkInteractionEvidence(excepted, contract)).toEqual([]);
  });

  it("is blind to remarks — a commented-out keypress witnesses no operability", () => {
    for (const spec of [
      CLICK_SPEC_WITH_REMARKED_KEYBOARD,
      CLICK_SPEC_WITH_TRAILING_RETIRED_KEYBOARD,
    ]) {
      // Both comment shapes, whole-line and trailing: the trailing one is
      // where retired code actually lives, and the strip used to be
      // line-anchored enough to count it as a gesture.
      const root = makeTree();
      writeFileSync(join(root, ...CLICK_SPEC_PATH.split("/")), spec);
      writeSidecar(root, {
        interaction: {
          ...completeSidecar().interaction,
          evidence: { browserless: [UNIT_TEST_PATH], harness: [CLICK_SPEC_PATH] },
        },
      });
      expect(checkInteractionEvidence(root, contract)).toEqual([
        "Button: class interactive requires keyboard-operate (harness tier) — no evidence declared and no exception recorded",
      ]);
    }
  });

  it("confines harness evidence to the component's own e2e/ — the tier is the JSON key, never the file location", () => {
    const root = makeTree();
    writeFileSync(join(root, ...UNIT_TEST_PATH.split("/")), UNIT_TEST_WITH_KEYBOARD_LITERAL);
    writeSidecar(root, {
      interaction: {
        ...completeSidecar().interaction,
        evidence: { harness: [UNIT_TEST_PATH] },
      },
    });
    // Two failures, and the duty is the load-bearing one: the placement fault
    // is why the gesture words in the unit test's string literal bought
    // nothing — a file the harness never runs cannot witness operability,
    // whatever its text says.
    expect(checkInteractionEvidence(root, contract)).toEqual([
      `Button: interaction evidence.harness entry "${UNIT_TEST_PATH}" must live under packages/primitives/button/e2e/ — the evidence tier is the JSON key, never the file location`,
      "Button: class interactive requires keyboard-operate (harness tier) — no evidence declared and no exception recorded",
      // No browserless evidence is declared at all, so state-report is owed
      // and unanswered on its own — listed because toEqual demands the whole
      // verdict, not because placement caused it.
      "Button: class interactive requires state-report (browserless tier) — no evidence declared and no exception recorded",
    ]);
  });

  it("confines browserless evidence to the component's own tests/", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        ...completeSidecar().interaction,
        evidence: { harness: [KEYBOARD_SPEC_PATH], browserless: [KEYBOARD_SPEC_PATH] },
      },
    });
    expect(checkInteractionEvidence(root, contract)).toEqual([
      `Button: interaction evidence.browserless entry "${KEYBOARD_SPEC_PATH}" must live under packages/primitives/button/tests/ — the evidence tier is the JSON key, never the file location`,
      "Button: class interactive requires state-report (browserless tier) — no evidence declared and no exception recorded",
    ]);
  });

  it("fails an unknown key inside an evidence entry instead of reading past it", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        ...completeSidecar().interaction,
        evidence: {
          browserless: [UNIT_TEST_PATH],
          harness: [{ path: KEYBOARD_SPEC_PATH, becaus: "a typo, not a reason" }],
        },
      },
    });
    // The entry stays unqualified — the duty still answers — and the typo is
    // named, the same rule one level up applied to the same surface there.
    expect(checkInteractionEvidence(root, contract)).toEqual([
      'Button: interaction evidence.harness entry "packages/primitives/button/e2e/button-keyboard.e2e.ts" carries unknown key "becaus" — extend the contract and this gate together',
    ]);
  });

  it("takes an unqualified browserless test at its word, but a because-qualified one answers nothing", () => {
    const qualified = {
      ...completeSidecar().interaction,
      evidence: {
        browserless: [{ path: UNIT_TEST_PATH, because: "pins the demo mount only" }],
        harness: [KEYBOARD_SPEC_PATH],
      },
    };
    const silent = makeTree();
    writeSidecar(silent, { interaction: qualified });
    expect(checkInteractionEvidence(silent, contract)).toEqual([
      "Button: class interactive requires state-report (browserless tier) — no evidence declared and no exception recorded",
    ]);
    const excepted = makeTree();
    writeSidecar(excepted, {
      interaction: {
        ...qualified,
        exceptions: [{ requirement: "state-report", because: "no unit-tier state pin yet" }],
      },
    });
    expect(checkInteractionEvidence(excepted, contract)).toEqual([]);
  });

  it("fails an exception recorded for evidence that already answers the duty", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        ...completeSidecar().interaction,
        exceptions: [{ requirement: "state-report", because: "already pinned" }],
      },
    });
    expect(checkInteractionEvidence(root, contract)).toEqual([
      "Button: state-report is answered by evidence and excepted at once — drop one or the other",
    ]);
  });

  it("fails an exception for a duty the class's row does not demand", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        class: "visual-only",
        basis: "an aria-hidden placeholder",
        evidence: { browserless: [UNIT_TEST_PATH] },
        exceptions: [{ requirement: "keyboard-operate", because: "nothing operates" }],
      },
    });
    expect(checkInteractionEvidence(root, contract)).toEqual([
      "Button: class visual-only owes no keyboard-operate — an exception for a duty the row does not demand is noise in the record",
    ]);
  });

  it("fails a repeated exception row — one duty, one exception", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        class: "interactive",
        basis: "one native activation target",
        evidence: { browserless: [UNIT_TEST_PATH] },
        exceptions: [
          { requirement: "keyboard-operate", because: "no harness spec yet" },
          { requirement: "keyboard-operate", because: "still no harness spec" },
        ],
      },
    });
    expect(checkInteractionEvidence(root, contract)).toContain(
      "Button: interaction exceptions name keyboard-operate twice — one duty, one exception row",
    );
  });

  it("fails a dangling evidence path — declared-but-absent evidence is the fabricated kind", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        ...completeSidecar().interaction,
        evidence: {
          browserless: [UNIT_TEST_PATH],
          harness: ["packages/primitives/button/e2e/never-written.e2e.ts"],
        },
      },
    });
    expect(checkInteractionEvidence(root, contract)).toEqual([
      'Button: interaction evidence.harness entry "packages/primitives/button/e2e/never-written.e2e.ts" does not exist in the tree',
      "Button: class interactive requires keyboard-operate (harness tier) — no evidence declared and no exception recorded",
    ]);
  });

  it("rejects a path that escapes the repository root, and an absolute one", () => {
    for (const escape of ["../elsewhere/spec.e2e.ts", "/elsewhere/spec.e2e.ts"]) {
      const root = makeTree();
      writeSidecar(root, {
        interaction: {
          ...completeSidecar().interaction,
          evidence: { ...completeSidecar().interaction.evidence, harness: [escape] },
        },
      });
      expect(checkInteractionEvidence(root, contract), escape).toEqual([
        `Button: interaction evidence.harness entry "${escape}" must be repository-root-relative`,
        "Button: class interactive requires keyboard-operate (harness tier) — no evidence declared and no exception recorded",
      ]);
    }
  });

  it("refuses a directory standing in for a file — a directory evidences nothing", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        ...completeSidecar().interaction,
        evidence: { ...completeSidecar().interaction.evidence, harness: ["packages/primitives"] },
      },
    });
    expect(checkInteractionEvidence(root, contract)).toEqual([
      'Button: interaction evidence.harness entry "packages/primitives" is not a file',
      "Button: class interactive requires keyboard-operate (harness tier) — no evidence declared and no exception recorded",
    ]);
  });

  it("demands a because for evidence in a tier the row does not demand", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        class: "container",
        basis: "a surface around slotted controls",
        evidence: {
          harness: [KEYBOARD_SPEC_PATH],
          browserless: [UNIT_TEST_PATH],
        },
      },
    });
    expect(checkInteractionEvidence(root, contract)).toEqual([
      `Button: interaction evidence.browserless entry "${UNIT_TEST_PATH}" — class container owes nothing in the browserless tier; record a because for surplus evidence`,
    ]);
  });

  it("fails each malformed claim shape instead of reading past it", () => {
    const cases: { name: string; sidecar: object; fragment: string }[] = [
      {
        name: "a blank basis",
        sidecar: {
          interaction: { ...completeSidecar().interaction, basis: "   " },
        },
        fragment: "Button: interaction claim carries no basis",
      },
      {
        name: "an interaction claim that is not an object",
        sidecar: { interaction: ["interactive"] },
        fragment: "Button: packages/primitives/button/a11y.json carries no interaction claim",
      },
      {
        name: "an evidence bag that is not an object",
        sidecar: {
          interaction: { ...completeSidecar().interaction, evidence: ["harness"] },
        },
        fragment: "Button: interaction evidence must be an object keyed by tier",
      },
      {
        name: "a tier whose value is not an array",
        sidecar: {
          interaction: {
            ...completeSidecar().interaction,
            evidence: { ...completeSidecar().interaction.evidence, harness: KEYBOARD_SPEC_PATH },
          },
        },
        fragment: "Button: interaction evidence.harness must be an array",
      },
      {
        name: "an entry of the wrong shape",
        sidecar: {
          interaction: {
            ...completeSidecar().interaction,
            evidence: { ...completeSidecar().interaction.evidence, harness: [42] },
          },
        },
        fragment:
          "Button: interaction evidence.harness carries an entry that is neither a path nor { path, because }",
      },
      {
        name: "a because that is not a non-empty string",
        sidecar: {
          interaction: {
            ...completeSidecar().interaction,
            evidence: {
              ...completeSidecar().interaction.evidence,
              harness: [{ path: KEYBOARD_SPEC_PATH, because: "  " }],
            },
          },
        },
        fragment: "carries a because that is not a non-empty string",
      },
      {
        name: "exceptions that are not an array",
        sidecar: {
          interaction: { ...completeSidecar().interaction, exceptions: "none" },
        },
        fragment: "Button: interaction exceptions must be an array",
      },
      {
        name: "an exception entry that is not an object",
        sidecar: {
          interaction: {
            ...completeSidecar().interaction,
            evidence: { ...completeSidecar().interaction.evidence, harness: [] },
            exceptions: [42],
          },
        },
        fragment: "Button: interaction claim records an exception for null",
      },
      {
        name: "an exception whose because is empty",
        sidecar: {
          interaction: {
            ...completeSidecar().interaction,
            evidence: { ...completeSidecar().interaction.evidence, harness: [] },
            exceptions: [{ requirement: "keyboard-operate", because: "  " }],
          },
        },
        fragment: "interaction exception for keyboard-operate carries no because",
      },
    ];
    for (const testCase of cases) {
      const root = makeTree();
      writeSidecar(root, testCase.sidecar);
      // First failure, not the whole list: a malformed shape can also leave a
      // duty unanswered, and the shape fault is what this case is for.
      expect(checkInteractionEvidence(root, contract)[0], testCase.name).toContain(
        testCase.fragment,
      );
    }
  });

  it("fails an unknown claim key instead of reading past it", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: { ...completeSidecar().interaction, klass: "interactive" },
    });
    expect(checkInteractionEvidence(root, contract)).toEqual([
      'Button: interaction claim carries unknown key "klass" — extend the contract and this gate together',
    ]);
  });

  it("fails evidence declared under a tier the law does not name", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        ...completeSidecar().interaction,
        evidence: {
          ...completeSidecar().interaction.evidence,
          sweep: ["docs/components/button.md"],
        },
      },
    });
    expect(checkInteractionEvidence(root, contract)).toEqual([
      expect.stringContaining('Button: interaction evidence under "sweep" — no such tier'),
    ]);
  });

  it("fails an exception for a duty no definition supplies", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        ...completeSidecar().interaction,
        evidence: { ...completeSidecar().interaction.evidence, harness: [] },
        exceptions: [{ requirement: "vibes", because: "unjudged" }],
      },
    });
    expect(checkInteractionEvidence(root, contract)).toContain(
      'Button: interaction claim records an exception for "vibes" — no such duty',
    );
  });

  it("counts exceptions per duty, skipping sidecars it cannot parse", () => {
    const root = makeTree();
    writeSidecar(root, {
      interaction: {
        ...completeSidecar().interaction,
        evidence: { ...completeSidecar().interaction.evidence, harness: [] },
        exceptions: [{ requirement: "keyboard-operate", because: "no spec yet" }],
      },
    });
    mkdirSync(join(root, "packages", "primitives", "icon-button"), { recursive: true });
    writeFileSync(join(root, "packages", "primitives", "icon-button", "a11y.json"), "{");
    mkdirSync(join(root, "packages", "primitives", "avatar"), { recursive: true });
    writeFileSync(
      join(root, "packages", "primitives", "avatar", "a11y.json"),
      JSON.stringify({
        interaction: {
          class: "visual-only",
          basis: "an announced image",
          evidence: {},
          exceptions: [
            { requirement: "keyboard-inert", because: "no inertness pin yet" },
            { requirement: "keyboard-inert", because: "duplicated and never counted" },
          ],
        },
      }),
    );
    // The duplicate row is the verdict's failure, not the summary's count:
    // the number of record must agree with the verdict, so it is tallied once.
    expect(interactionExceptionSummary(root)).toEqual({
      count: 2,
      components: 2,
      byDuty: { "keyboard-operate": 1, "keyboard-inert": 1 },
    });
  });
});

describe("parseInteractionContract", () => {
  it("reads the repository's own contract", () => {
    const parsed = readInteractionContract(join(import.meta.dirname, ".."));
    expect(parsed.classes).toEqual(["interactive", "composite", "container", "visual-only"]);
    expect(parsed.tiers).toEqual(["browserless", "harness"]);
    expect(parsed.matrix.map((row) => row.class)).toEqual(parsed.classes);
  });

  it("fails closed against a tree with no law to read — the end of the path the CLI exits 1 on", () => {
    // The CLI wraps this read in its fail-closed catch and exits 1; the unit
    // surface of that contract is the throw itself.
    expect(() => readInteractionContract(makeRoot())).toThrow(/ENOENT/);
  });

  it("is blind to comments — a docblock may mention brackets without becoming law", () => {
    const parsed = parseInteractionContract(`${CONTRACT}
/**
 * The [container] row and the {class: "visual-only"} examples above are
 * prose, not law: none of it may turn up in the parsed vocabulary.
 */
`);
    expect(parsed.classes).toEqual(["interactive", "container", "visual-only"]);
  });

  it("throws on every structural fault instead of returning a partial law", () => {
    const fault = (source: string) => () => parseInteractionContract(source);
    expect(
      fault(CONTRACT.replace(/export const INTERACTION_CLASSES[\s\S]*?as const;/, "")),
    ).toThrow(/exports no `const INTERACTION_CLASSES`/);
    expect(fault(CONTRACT.replace('tier: "harness"', 'tier: "browser"'))).toThrow(
      /demands tier "browser", which no tier names/,
    );
    expect(
      fault(
        CONTRACT.replace(
          '{ id: "keyboard-operate", tier: "harness", answers: ["activation gestures"] },',
          '{ id: "keyboard-operate", tier: "harness", answers: ["activation gestures"] },\n  { id: "keyboard-operate", tier: "browserless", answers: ["activation gestures"] },',
        ),
      ),
    ).toThrow(/INTERACTION_REQUIREMENTS repeats an id/);
    expect(fault(CONTRACT.replace('class: "container",', 'class: "operable",'))).toThrow(
      /judges "operable", which the vocabulary does not carry/,
    );
    expect(
      fault(CONTRACT.replace('"keyboard-operate", "state-report"', '"keyboard-operate", "vibes"')),
    ).toThrow(/requires vibes, which no definition supplies/);
    expect(
      fault(
        CONTRACT.replace(
          '{ class: "container", requirements: ["keyboard-operate"] }',
          '{ class: "container", requirements: [] }',
        ),
      ),
    ).toThrow(/row is empty/);
    expect(fault(CONTRACT.replace('answers: ["no focusable part"]', "answers: []"))).toThrow(
      /answers nothing/,
    );
    expect(
      fault(CONTRACT.replace('["browserless", "harness"]', '["browserless", "sweep"]')),
    ).toThrow(/sweep cannot be an interaction tier/);
    expect(
      fault(
        CONTRACT.replace(
          /export const INTERACTION_CLASSES[\s\S]*?as const;/,
          "export const INTERACTION_CLASSES = [] as const;",
        ),
      ),
    ).toThrow(/INTERACTION_CLASSES is empty/);
    expect(
      fault(
        CONTRACT.replace(
          '["interactive", "container", "visual-only"]',
          '["interactive", "interactive", "container", "visual-only"]',
        ),
      ),
    ).toThrow(/vocabulary repeats a member/);
    expect(
      fault(CONTRACT.replace('["browserless", "harness"]', '["browserless", "browserless"]')),
    ).toThrow(/tiers repeat a member/);
  });

  it("holds the matrix to parity with the vocabulary, both directions, before any sidecar is read", () => {
    const fault = (source: string) => () => parseInteractionContract(source);
    // A vocabulary member without a row would pass every gate while owing
    // nothing — the class that quietly exited the law.
    expect(
      fault(
        CONTRACT.replace('  { class: "container", requirements: ["keyboard-operate"] },\n', ""),
      ),
    ).toThrow(/with no matrix row/);
    expect(
      fault(
        CONTRACT.replace(
          /export const INTERACTION_MATRIX[\s\S]*?as const;/,
          "export const INTERACTION_MATRIX = [] as const;",
        ),
      ),
    ).toThrow(/INTERACTION_MATRIX is empty/);
  });
});

describe("namesAKeyboardGesture", () => {
  it("reads every keyboard spelling the harness specs use", () => {
    for (const gesture of [
      'await page.keyboard.press("Enter");',
      "await page.keyboard.down('Shift');",
      'await page.keyboard.up("Shift");',
      "await page.keyboard.type('loom');",
      'await page.keyboard.insertText("loom");',
      'await locator.press("ArrowRight");',
    ]) {
      expect(namesAKeyboardGesture(gesture), gesture).toBe(true);
    }
  });

  it("reads pointer and focus work as the non-evidence they are", () => {
    for (const notAGesture of [
      "await locator.click();",
      "await expect(locator).toBeFocused();",
      "await page.pause();",
      // The trailing shape retired code actually takes — the strip is
      // line-aware, so the comment half of the line is as inert as a
      // whole-line one.
      'await locator.click(); // retired: await page.keyboard.press("Enter")',
    ]) {
      expect(namesAKeyboardGesture(notAGesture), notAGesture).toBe(false);
    }
  });
});
