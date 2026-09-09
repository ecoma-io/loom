/**
 * The role-aware accessibility evidence contract: what a component OWES, not
 * what the library asserts.
 *
 * `a11y-scope.ts` partitions the 70 WCAG-tagged rules into the tiers that can
 * judge them. That partition is library-wide — it says nothing about any one
 * component, and a purely visual span ends up with exactly the evidence
 * obligation of a focusable, labelled control. This file is the per-component
 * half: a closed role vocabulary, the evidence tiers a role must answer, and
 * the matrix binding each role to the requirements its claim has to satisfy.
 *
 * Three readers, one source:
 *
 * - `tools/check-a11y-evidence.ts` and `tools/check-interaction-evidence.ts`,
 *   the gates for the two axes, read this file AS DATA — parsed, never
 *   imported. The tooling layer's boundary row (layer-tooling) forbids
 *   importing the library it checks, and a checker that executed its subject
 *   could not report on a tree that will not load. Each parse is fail-closed:
 *   a contract a gate cannot read is a lint failure, not an empty verdict.
 * - `packages/loom/src/a11y.ts` re-exports the role vocabulary and the type,
 *   so a consumer or a docs page reads the same law the gate enforces. The
 *   interaction vocabulary is not re-exported from the public surface yet —
 *   its readers today are the gate, the pin test and the docs build, and an
 *   export nobody consumes is a public promise with no reader.
 * - `packages/core/tests/a11y-contract.test.ts` pins the law's internal
 *   consistency on both axes: no matrix row for a role or class outside its
 *   vocabulary, no requirement id without a definition, no requirement in an
 *   unknown tier.
 *
 * The component's own declaration lives beside it, in
 * `packages/<tier>/<name>/a11y.json` — one sidecar per component, the sixth
 * artifact `tools/check-a11y-evidence.ts` asserts. THE CLAIM IS DECLARED, NOT
 * DERIVED: Reka injects ARIA roles at runtime, so no reader can derive a
 * component's role from its source with confidence. The sidecar declares it,
 * cites the rendered evidence for the claim (`basis`), declares the evidence
 * files that exist today, and records an `exceptions` entry — requirement id
 * plus reason — for every matrix requirement nothing answers yet. The gate
 * counts and names those exceptions instead of failing the repository, so the
 * contract lands truthfully and the exception list shrinks as evidence grows.
 *
 * The sidecar now carries a SECOND axis beside the role claim: the
 * interaction class. Phase 3D reserved room here for exactly this — the same
 * sidecar, a second axis, not a second file — which is why `role` was held
 * orthogonal to evidence and exceptions rather than folded into them. The
 * interaction half is defined at the bottom of this file, and
 * `tools/check-interaction-evidence.ts` is its validator.
 *
 * Every collection below is a flat `as const` array of records — the shape the
 * gates' parsers and the pin test all rely on. Keep new fields string- or
 * array-valued and entry objects brace-free.
 */

/**
 * The three evidence tiers, using `a11y-scope.ts`'s own vocabulary for the
 * same three runtimes: the browserless jsdom demo sweep, the component
 * harness's browser specs, and the root sweep over the built site.
 */
export const A11Y_EVIDENCE_TIERS = ["browserless", "harness", "sweep"] as const;

/**
 * The closed ARIA role vocabulary a component may claim. Every member is a
 * real ARIA role — the one whose AT contract the component's own markup
 * asserts, native or injected: a native `<button>`, Reka's `role="dialog"`
 * content, an explicit `role="list"` wrapper. Composite widgets claim the
 * container role (tabs → tablist, select → combobox, tree-view → tree); the
 * `basis` field of each sidecar names the parts that make the claim true.
 */
export const ARIA_ROLES = [
  "alert",
  "alertdialog",
  "button",
  "checkbox",
  "combobox",
  "dialog",
  "grid",
  "group",
  "img",
  "link",
  "list",
  "menu",
  "menubar",
  "meter",
  "navigation",
  "progressbar",
  "radiogroup",
  "region",
  "searchbox",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "switch",
  "tablist",
  "table",
  "textbox",
  "toolbar",
  "tooltip",
  "tree",
] as const;

/**
 * The two non-role members. `none` — the component asserts no ARIA role of
 * its own: its semantics are native landmarks, flow content or slotted
 * children. `visual-only` — presentational by design, removed from the
 * accessibility tree or carrying nothing a reader should hear; its only
 * obligation is to not assert broken ARIA while hiding.
 */
export const NON_ROLE_MEMBERS = ["none", "visual-only"] as const;

/** The role vocabulary the sidecar's `role` field is held to. */
export const A11Y_ROLES = [...ARIA_ROLES, ...NON_ROLE_MEMBERS] as const;

/**
 * The evidence requirements — one row per family of WCAG-tagged rules, named
 * for the obligation rather than the implementation so the matrix reads as
 * law. `tier` is where the claim must be ANSWERED; `answers` names the axe
 * rules of `a11y-scope.ts` the family covers, or the bespoke suite where axe
 * ships no rule for the criterion (2.4.11 has none, which is why
 * `e2e/focus-not-obscured.e2e.ts` exists at all).
 *
 * The families deliberately do not cover the whole partition — 27 of the 68
 * runtime-tier rules are named by no family, and the absence is recorded
 * rather than hidden, the way TAGGED_BUT_DISABLED_RULES records its own two:
 *
 * - host-document facts a consumer's page answers, not a component:
 *   `aria-hidden-body`, `bypass`, `document-title`, `html-has-lang`,
 *   `html-lang-valid`, `html-xml-lang-mismatch`, `meta-refresh`,
 *   `meta-viewport`, `valid-lang`;
 * - elements no Loom component ships: `blink`, `frame-focusable-content`,
 *   `frame-title`, `frame-title-unique`, `input-button-name`, `marquee`,
 *   `no-autoplay-audio`, `object-alt`, `server-side-image-map`,
 *   `summary-name`, `video-caption`;
 * - attributes whose truth belongs to the host, not the component:
 *   `aria-braille-equivalent` (no Loom component emits a braille equivalent
 *   today) and `autocomplete-valid` (the token is forwarded unchanged by
 *   combobox, editable, tags-input, text-field and command — the rule judges
 *   whether the host chose the right token for its field, which no component
 *   can answer for);
 * - consumer styling, not component markup: `avoid-inline-spacing`;
 * - conservative-partial table geometry, run by the sweep site-wide but owed
 *   by no role's row per-component: `table-fake-caption`, `td-has-header`,
 *   `td-headers-attr`, `th-has-data-cells`.
 *
 * The sweep runs all 68 site-wide regardless, so an uncovered rule is still
 * exercised on every page — what no role owes is per-component accountability.
 * The coverage set is pinned by packages/core/tests/a11y-contract.test.ts: a
 * rule that moves into or out of a family must edit that pin and this list
 * together.
 */
export const A11Y_EVIDENCE_REQUIREMENTS = [
  {
    id: "semantic-aria",
    tier: "browserless",
    answers: [
      "aria-roles",
      "aria-required-attr",
      "aria-valid-attr",
      "aria-valid-attr-value",
      "aria-allowed-attr",
      "aria-conditional-attr",
      "aria-prohibited-attr",
      "aria-deprecated-role",
      "aria-roledescription",
      "aria-required-children",
      "aria-required-parent",
      "duplicate-id-aria",
      "nested-interactive",
    ],
  },
  {
    id: "name",
    tier: "browserless",
    answers: [
      "button-name",
      "link-name",
      "label",
      "form-field-multiple-labels",
      "aria-input-field-name",
      "aria-command-name",
      "aria-toggle-field-name",
      "aria-meter-name",
      "aria-progressbar-name",
      "aria-tab-name",
      "aria-tooltip-name",
      "select-name",
      "image-alt",
      "svg-img-alt",
      "role-img-alt",
      "input-image-alt",
      "area-alt",
    ],
  },
  {
    id: "structure",
    tier: "browserless",
    answers: ["list", "listitem", "definition-list", "dlitem"],
  },
  {
    id: "keyboard",
    tier: "harness",
    answers: ["aria-hidden-focus", "scrollable-region-focusable"],
  },
  {
    id: "contrast",
    tier: "sweep",
    answers: [
      "color-contrast",
      "link-in-text-block",
      "p-as-heading",
      "label-content-name-mismatch",
    ],
  },
  {
    id: "target-size",
    tier: "sweep",
    answers: ["target-size"],
  },
  {
    id: "focus-not-obscured",
    tier: "sweep",
    answers: ["e2e/focus-not-obscured.e2e.ts (WCAG 2.4.11 — axe-core ships no rule for it)"],
  },
] as const;

/**
 * The matrix: the role's row is the claim it must satisfy. Shared shapes are
 * spelled out once per role rather than DRYed into inheritance — the matrix is
 * law, and a law a reader cannot read whole is a law a reader cannot argue
 * with. `semantic-aria` is the universal floor: every role owes it, including
 * visual-only, because an aria-hidden skeleton asserting a broken role is
 * still a defect.
 */
export const A11Y_EVIDENCE_MATRIX = [
  // The universal floor, alone: nothing announced, nothing to name, nothing
  // to aim at.
  { role: "visual-only", requirements: ["semantic-aria"] },
  // Flow content, landmarks and slots: no role of its own, but its rendered
  // text and any controls it ships are judged like any other content.
  { role: "none", requirements: ["semantic-aria", "name", "contrast"] },
  { role: "img", requirements: ["semantic-aria", "name", "contrast"] },
  { role: "separator", requirements: ["semantic-aria", "contrast"] },
  // Announced-but-not-aimed-at: live and read-out roles.
  { role: "alert", requirements: ["semantic-aria", "name", "contrast"] },
  { role: "status", requirements: ["semantic-aria", "name", "contrast"] },
  { role: "meter", requirements: ["semantic-aria", "name", "contrast"] },
  { role: "progressbar", requirements: ["semantic-aria", "name", "contrast"] },
  { role: "tooltip", requirements: ["semantic-aria", "name", "contrast"] },
  // Structured content: the list/tree/table family owes its children's
  // semantics. The table rules whose `matches` reads border geometry are
  // browser-tier rules in a11y-scope.ts — the sweep answers them, so the row
  // asks for the family here and the sweep provides it.
  { role: "list", requirements: ["semantic-aria", "name", "structure", "contrast"] },
  {
    role: "tree",
    requirements: [
      "semantic-aria",
      "name",
      "structure",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "table",
    requirements: [
      "semantic-aria",
      "name",
      "structure",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "grid",
    requirements: [
      "semantic-aria",
      "name",
      "structure",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  // Named regions and navigation: labelled, aimed-at, traversable content.
  {
    role: "region",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "navigation",
    requirements: ["semantic-aria", "name", "contrast", "target-size", "focus-not-obscured"],
  },
  // Controls and composites: the full obligation. The keyboard contract lives
  // in the harness tier because that is where a keypress can be witnessed at
  // all; target-size and focus-not-obscured live in the sweep because they are
  // page facts about rendered geometry.
  {
    role: "button",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  // A link is traversal-passive: a native anchor neither roves nor contains
  // focus and creates no scroll region, so it cannot be the component that
  // fails the keyboard family's two rules — the failures happen around it,
  // created by the overlays that hide or scroll it, and those components'
  // rows (dialog, drawer, popover) carry the obligation themselves.
  {
    role: "link",
    requirements: ["semantic-aria", "name", "contrast", "target-size", "focus-not-obscured"],
  },
  {
    role: "checkbox",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "switch",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "radiogroup",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "slider",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "spinbutton",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "textbox",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "combobox",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "searchbox",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "menu",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "menubar",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "toolbar",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "tablist",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "dialog",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  {
    role: "alertdialog",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
  // Labelled groups of controls: the group's own contract is its label and
  // its children's traversal, which is why keyboard sits in the row.
  {
    role: "group",
    requirements: [
      "semantic-aria",
      "name",
      "contrast",
      "keyboard",
      "target-size",
      "focus-not-obscured",
    ],
  },
] as const;

/** A member of the closed role vocabulary. */
export type A11yRole = (typeof A11Y_ROLES)[number];

/** A pure ARIA role, as distinct from the non-role members. */
export type AriaRole = (typeof ARIA_ROLES)[number];

/** One evidence runtime: browserless jsdom, component harness, or the root sweep. */
export type A11yEvidenceTier = (typeof A11Y_EVIDENCE_TIERS)[number];

/** A requirement the matrix can demand. */
export type A11yRequirementId = (typeof A11Y_EVIDENCE_REQUIREMENTS)[number]["id"];

/**
 * One declared piece of evidence. A plain string is a repository-root-relative
 * path the gate verifies exists; an object is the same path plus the `because`
 * a tier the role's row does not demand must carry.
 */
export type A11yEvidenceEntry = string | { path: string; because?: string };

/**
 * The sidecar — the declared claim `packages/<tier>/<name>/a11y.json` must
 * satisfy. `basis` is the reviewer's handle on the role claim: the rendered
 * element or injected role that makes it true. `evidence` is keyed by tier,
 * because the tiers are what the sweep, harness and jsdom run over — a
 * requirement is answered by its tier's evidence, not by a per-rule file
 * list. `exceptions` carries the matrix requirements nothing answers yet,
 * each with the reason it is missing.
 */
export interface A11yContract {
  /** The claimed role, from {@link A11Y_ROLES}. */
  role: A11yRole;
  /** The rendered fact the role claim rests on — what a reviewer checks. */
  basis: string;
  /** Evidence that exists today, by tier. Paths are repository-root-relative. */
  evidence: Partial<Record<A11yEvidenceTier, readonly A11yEvidenceEntry[]>>;
  /** Matrix requirements this component does not answer yet, each with its reason. */
  exceptions?: readonly { requirement: A11yRequirementId; because: string }[];
}

/**
 * The closed interaction-class vocabulary — the second axis of the same
 * sidecar, kept in this file so the two claims cannot drift apart. Each word
 * names the interaction contract the component OWNS, which is a smaller thing
 * than the interaction it makes possible: a layout slots buttons into itself,
 * but it owns none of their contract.
 *
 * - `interactive` — ONE operable target of the component's own: activate,
 *   adjust, type into. A button, a checkbox, a text field, a link.
 * - `composite` — SEVERAL operable parts the component manages as one: the
 *   traversal among them, the focus routing, the open/close state. A
 *   combobox, a tablist, a menu, a dialog, a tree.
 * - `container` — operates nothing itself; its own contract is the surface it
 *   puts around operable content. Keyboard passage through it must not trap,
 *   and its own scroll, collapse or resize behaviour must answer the keyboard
 *   too. A card, a scroll area, an app shell, a fieldset.
 * - `visual-only` — presents and wraps; nothing in it operates, takes focus
 *   or reports an interactive state of its own, by design. A skeleton, a
 *   badge, a meter, a flex wrapper.
 *
 * The class is declared, not derived, for the reason the role claim is: the
 * class is a fact about the contract the component's source owns, and no
 * reader can reconstruct it with confidence. Each sidecar's interaction claim
 * carries a `basis` naming the fact that puts the component in its class —
 * the reviewer's handle, the same one the role claim keeps.
 */
export const INTERACTION_CLASSES = [
  "interactive",
  "composite",
  "container",
  "visual-only",
] as const;

/**
 * The two runtimes that can witness an interaction duty. Same tiers, same
 * vocabulary, as {@link A11Y_EVIDENCE_TIERS} — a keypress is a browser fact
 * and a rendered state is a jsdom fact, exactly as the role axis has it. The
 * sweep tier is absent on purpose: no duty below is a page-geometry fact, so
 * a sweep citation would be evidence by adjacency, which is the fabricated
 * kind.
 */
export const INTERACTION_EVIDENCE_TIERS = ["browserless", "harness"] as const;

/**
 * The interaction duties — one row per family of interaction obligations,
 * named for the obligation rather than the implementation. `tier` is where
 * the duty must be ANSWERED; `answers` is prose rather than a rule list,
 * because no axe rule judges an interaction contract — these duties are what
 * the component's own specs exist to witness.
 *
 * Three duties, and no reduced-motion row — a deliberate absence, recorded
 * rather than hidden. Animation is a per-component fact none of the four
 * class words carries, and the root reduced-motion suite reaches four pages
 * today (dialog, drawer, toast, skeleton), so a class row demanding it would
 * be a duty nothing in the vocabulary could answer honestly. A per-component
 * motion duty — a declared `animates` fact answered through that suite's
 * growing population — is the tranche work this axis opens; it lands as a row
 * edit plus suite growth in one PR, the way every other row change must.
 */
export const INTERACTION_REQUIREMENTS = [
  {
    id: "keyboard-operate",
    tier: "harness",
    answers: [
      "the component's keyboard contract — its own keys, or keyboard passage through its surface — witnessed as gestures in a browser by its own harness spec (WCAG 2.1.1)",
    ],
  },
  {
    id: "state-report",
    tier: "browserless",
    answers: [
      "the states a component renders — disabled, readonly, busy, expanded, selected — reaching the DOM where the unit tier can pin them (WCAG 4.1.2)",
    ],
  },
  {
    id: "keyboard-inert",
    tier: "browserless",
    answers: [
      "the absence of an interaction surface: nothing in a visual-only component takes focus or a key (WCAG 2.1.1 vacuously, 2.4.3 actually) — a pin of absence, worthless asserted in prose",
    ],
  },
] as const;

/**
 * The interaction matrix: the class's row is the claim it must satisfy, the
 * role matrix's discipline on the second axis. `keyboard-inert` is
 * visual-only's whole row because "nothing operates here" is itself a
 * contract — the one an aria-hidden placeholder that steals a tab stop breaks
 * — and an absence nobody pins is an absence nobody would notice breaking.
 */
export const INTERACTION_MATRIX = [
  { class: "interactive", requirements: ["keyboard-operate", "state-report"] },
  { class: "composite", requirements: ["keyboard-operate", "state-report"] },
  { class: "container", requirements: ["keyboard-operate"] },
  { class: "visual-only", requirements: ["keyboard-inert"] },
] as const;

/** A member of the closed interaction-class vocabulary. */
export type InteractionClass = (typeof INTERACTION_CLASSES)[number];

/** A runtime that can witness an interaction duty. */
export type InteractionEvidenceTier = (typeof INTERACTION_EVIDENCE_TIERS)[number];

/** A duty the interaction matrix can demand. */
export type InteractionRequirementId = (typeof INTERACTION_REQUIREMENTS)[number]["id"];

/**
 * One declared piece of interaction evidence. A plain string is a
 * repository-root-relative path the gate verifies exists; an object is the
 * same path plus the `because` that narrows what the file witnesses — and a
 * qualified entry answers no duty.
 */
export type InteractionEvidenceEntry = string | { path: string; because?: string };

/**
 * The `interaction` claim `packages/<tier>/<name>/a11y.json` carries beside
 * its `role` claim — the second axis in the same sidecar, not a second file,
 * the reservation at the top of this file kept. Same doctrine as the role
 * claim: declared, cited where the evidence exists, and excepted with a
 * reason where it does not, so the contract lands truthfully and shrinks as
 * the harness-spec tranche lands.
 */
export interface InteractionContract {
  /** The claimed interaction class, from {@link INTERACTION_CLASSES}. */
  class: InteractionClass;
  /** The fact the class claim rests on — what a reviewer checks. */
  basis: string;
  /** Evidence that exists today, by tier. Paths are repository-root-relative. */
  evidence: Partial<Record<InteractionEvidenceTier, readonly InteractionEvidenceEntry[]>>;
  /** Matrix duties this component does not answer yet, each with its reason. */
  exceptions?: readonly { requirement: InteractionRequirementId; because: string }[];
}
