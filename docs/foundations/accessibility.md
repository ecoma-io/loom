# Accessibility

`CONTRIBUTING.md` states the standard as a checklist every rendered change is
held to, not a follow-up pass: every interactive element has an accessible
name, the whole flow is operable by keyboard alone with focus visible
throughout, focus returns to the trigger when an overlay closes, no state is
conveyed by colour alone, and motion has a `prefers-reduced-motion` path. An
accessibility bug is filed and fixed as a bug, the same as any other.

## `WCAG_TAGS`

<!-- @wcag-tags -->

This is the exact scope Loom holds itself to when an automated tool (axe) is
run against it: the assistive-technology and keyboard rule sets, not axe's
broader SEO and document-structure best-practice checks — a component
library cannot know what document it will end up rendered into, so a rule
about the surrounding document is the consumer's to answer, not Loom's.
Wherever more than one process runs an axe scan against this library, this
one array is what both read, so neither can quietly drift into disagreeing
about what counts as a violation.

`wcag22aa` is present but `wcag22a` is not, because axe does not carry one:
WCAG 2.2 Level A introduces three new success criteria (2.4.11 Focus Not
Obscured, 2.4.13 Focus Appearance, 2.5.8 Target Size), but axe-core tags
all three under `wcag21a` since each is also a 2.1 A rule by inheritance.
Loom tests for those criteria separately — what axe does not yet automate:
target-size walks every documentation page, while focus-not-obscured holds
three hand-picked scenarios (content focus under the fixed header, a Dialog,
a Drawer), not every page.

## Why it ships from `@ecoma-io/loom/a11y`

```ts
// packages/loom/src/a11y.ts
export {
  WCAG_TAGS,
  BROWSERLESS_RULES,
  BROWSER_REQUIRED_RULES,
  // the role-aware evidence contract, below
  A11Y_EVIDENCE_TIERS,
  A11Y_EVIDENCE_REQUIREMENTS,
  A11Y_EVIDENCE_MATRIX,
  ARIA_ROLES,
  NON_ROLE_MEMBERS,
  A11Y_ROLES,
} from "@ecoma-io/loom-core";
export type {
  A11yContract,
  A11yRole,
  AriaRole,
  A11yEvidenceTier,
  A11yRequirementId,
} from "@ecoma-io/loom-core";
```

The package's main entry re-exports every component, which makes it
unresolvable for a tool that compiles no Vue single-file component at all —
a CI script, an end-to-end runner driving a built page. `@ecoma-io/loom/a11y`
is a second, narrow entry point: `WCAG_TAGS` and the browserless/browser
partition — `BROWSERLESS_RULES` and `BROWSER_REQUIRED_RULES`, the split over
which rules a jsdom-tier test can answer and which need a real browser — so a
consumer that needs only the WCAG scope, or that partition, can read them
without pulling in the rest of the library.

The same entry carries the role-aware evidence contract — what a component
OWES, not what the library asserts. `A11Y_EVIDENCE_TIERS` names the three
runtimes a claim must be answered in (`browserless`, `harness`, `sweep`);
`A11Y_EVIDENCE_REQUIREMENTS` names the obligations, one row per family of
WCAG-tagged rules; `A11Y_EVIDENCE_MATRIX` binds each role to the requirements
its claim has to satisfy. The role vocabulary is closed: `ARIA_ROLES` is the
real ARIA roles a component may claim, `NON_ROLE_MEMBERS` adds the two
non-roles (`none` and `visual-only`), and `A11Y_ROLES` is the union a
sidecar's `role` field is held to. The types name the same things —
`A11yRole`, `AriaRole`, `A11yEvidenceTier`, `A11yRequirementId` — and
`A11yContract` is the sidecar shape itself: the claimed role, the rendered
fact it rests on, the evidence that answers it, and every requirement not yet
answered with its reason. One piece of that evidence is an
`A11yEvidenceEntry`: a plain string when the repository-root-relative path
says everything, or that path plus the `because` a tier the role's matrix row
does not demand must carry. Writing a component's `a11y.json` is the only
time a consumer meets it.

## The interaction classes

Keyboard operability is not one claim. A button's keyboard story and a
skeleton's are opposites, and holding both to the same sentence would make
one of them a lie — so every sidecar's `interaction` claim names one class of
a closed four-word vocabulary, declared in `packages/core/src/a11y-contract.ts`
beside the role law: `interactive` (one operable target of its own),
`composite` (several parts managed as one), `container` (a surface whose own
act is passage or wiring around content it does not operate) and
`visual-only` (presents; nothing operates, focuses or reports). Each class
owes duties from the matrix below, generated from that file rather than
transcribed:

<!-- @interaction-classes -->

`keyboard-operate` is harness-tier on purpose: a keyboard contract is a
browser fact, so its citation must be the component's own Playwright spec
and must itself carry a keyboard gesture — the gate reads the cited file for
one, because a pointer-only spec citing itself as keyboard evidence is the
one lie about interaction a prose claim can tell. Where a duty is not yet
witnessed, the claim records a named exception with its `because` instead of
going quiet: `tools/check-interaction-evidence.ts` counts the exceptions and
fails on anything else, so the honest state of the library's interaction
evidence is a number that shrinks as specs land, not a row of green checks
that never moved.

## Focus rings are a promise

```css
/* packages/theme-core/src/global.css */
:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
```

That base rule covers plain elements; nearly every interactive primitive adds
`focus-visible:shadow-halo` on top of it — the primary-coloured haze documented
on the [Elevation](./elevation) page — layered around the outline rather than
instead of it. The outline is never removed without something at least as
visible replacing it, which is why the halo is additive: whatever suppresses
a box-shadow still leaves the crisp 2px outline underneath.

<Demo title="Tab into this row">
  <input
    class="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo"
    placeholder="Tab to me"
  />
</Demo>

## Forced colors

`theme.css` names the constraint directly in the comment beside
`--shadow-halo`: the halo is added **around** the crisp outline rather than
replacing it, specifically so the outline still shows under a forced-colors
mode, where a browser overrides most author colours (including a soft
box-shadow) but respects a real `outline`. Loom does not carry a dedicated
`forced-colors` stylesheet of its own — the halo's layering rule is what
keeps the ring itself intact under that mode, by construction, rather than by
a separate override rule reacting to it.
