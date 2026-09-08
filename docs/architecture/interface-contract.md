# Interface Contract

_Normative quality contracts — the [documentation model](./README.md) maps every document's role._

The contracts Loom-wide: what every artifact is held to, regardless of kind.
The [constitution](./constitution.md) decides what Loom is; the
[artifact model](./artifact-model.md) decides what a thing is; this document
decides what a thing must honour once it exists.

## The three categories, defined once

Every statement below carries exactly one category. They are never blurred,
because they fail differently:

1. **Architecture invariant** — a structural rule about the dependency graph
   or the package boundary. Machine-checked today (or checkable in
   principle); a violation reddens a gate. Owned by the
   [current-state contract](./contract.md), which names the two readers and
   the mutation suite that enforce them. Listed here because consumers of
   _this_ document need to know which contracts are structural.
2. **Quality contract** — a promise about every artifact's behaviour or
   experience. Enforced by a gate where a gate exists; where none exists, the
   audit records the truth (`DOCUMENTED_ONLY`,
   `NOT_ENFORCED`) and the gap analysis carries the follow-up. A quality
   contract is not optional because its gate is missing — that is a missing
   gate, not a missing rule.
3. **Implementation guideline** — recommended practice, held at review
   level. Deviating is a conversation, not a red build.

---

## The invariants (category 1, summarised)

Enforced today; full mechanics in [the contract](./contract.md#the-checks-and-why-each-exists):

- Dependency direction — downward and same-layer edges only; no upward imports; the edge set is a DAG.
- The facade is a sink — nothing below `packages/loom` imports `@ecoma-io/loom` or its subpaths, not even `import type`.
- One public npm package — `@ecoma-io/loom`; internal packages are private and carry no publish metadata — enforced by `tools/check-manifest-privacy.ts`, which asserts every package manifest under `packages/` — the two-level component manifests and the one-level foundation/facade ones alike — is `private` with no `publishConfig`, closing #238. Internal packages still declare `exports` for internal imports; the "no consumer-facing exports" half of the invariant is held by the facade-sink rule (nothing reaches internal packages as a consumer) rather than by manifest shape.
- The consumer boundary — templates and the docs site reach only the facade and the stylesheets; the E2E suites additionally reach the compositions through the disclosed conformance route (the `layer-e2e` row).
- The five-artifact pairing — a component ships with its source, test, demo, docs page and facade export, or a gate names the missing file: the artifact gate for source, test, docs page and export; the docs build for the demo, which each docs page checks by importing its own component.
- No import-time browser code — gated: semgrep's leak rules catch leak-shaped
  module side effects, and `loom-browser-api-at-module-scope`
  (`.github/semgrep/memory-leaks.yml`) fails any module-scope read of `window`,
  `document`, `navigator`, `localStorage` or `matchMedia` outside a deferred
  body — a body invoked immediately is not a deferral — together with
  import-time construction of the observer and connection families, a bare
  `requestAnimationFrame`, and any static member initializer, which runs at
  class definition; `typeof` guards exempt, over `packages/**`, the library
  surface the contract binds. The claim carries two limits: the rule reads
  TypeScript modules only (semgrep has had no Vue parser since 1.93, so an
  SFC's `<script>` block stays review-held), and its read set names five
  globals, so a reach through `history`, `sessionStorage` or a `globalThis`
  indirection stays review-held too — as does a `static { … }` block, whose
  form semgrep cannot parse.
- Theme-core is not a JS dependency — its CSS ships by copy, never by import.

## Accessibility

**Quality contract.** Artifacts preserve the semantic and accessibility
behaviour appropriate to their role: accessible names, keyboard operability,
visible focus, focus restoration, state not conveyed by colour alone,
`prefers-reduced-motion` honoured. The library holds itself to `WCAG_TAGS`
([`packages/core/src/a11y-scope.ts`](https://github.com/ecoma-io/loom/blob/main/packages/core/src/a11y-scope.ts)):
the axe gates import their rule partitions from that same source —
re-exported through the narrow `@ecoma-io/loom/a11y` entry — and a
browserless test pins the partition to equal exactly the rules `WCAG_TAGS`
select — the gate and the published claim cannot drift apart. The site's
accessibility page renders the array from that constant too: its fence is
expanded out of `a11y-scope.ts` at build time, the same
generated-never-transcribed rule the token and API tables follow, so the
published claim has no hand-copied second to go stale.

Evidence today: the root sweep's axe gate runs with **no excludes** over the
built site; keyboard, focus-not-obscured, target-size, contrast and
reduced-motion suites run beside it; theme-core pins contrast pairs
browserlessly; components carry harness-level specs where interaction
warrants. The disabling split follows the platform (native `<fieldset
disabled>` versus `useAncestorDisabled()` for composite controls).

**New artifact duties:** name the role's semantics, exercise them in the
component's own specs, and never silence a gate rule — an exclusion needs a
cause outside this repository's reach.

## Responsive behaviour

**Quality contract.** Artifacts define meaningful behaviour across available
space and viewport changes: intrinsic collapse preferred over breakpoint
lists, no horizontal document overflow at the gated widths, and behaviour
that survives container placement (a component in a narrow region behaves
like a component on a narrow screen where the design says it should).

Evidence today: `e2e/layout-responsive.e2e.ts` over the built site; the
template gates hold every template page to 320px/768px; compositions declare
their collapse semantics twice on purpose — CSS the browser renders, engine
data the conformance harness holds equal ([contract](./contract.md)).

**New artifact duties:** state the collapse/behaviour story; if the artifact
has layout semantics, pair the CSS with the engine adapter and the
conformance case.

## Composition

**Quality contract.** Artifacts compose without forcing
application-specific structure: slots over configuration where the
configuration would encode domain; props that describe interface intent, not
product shape; no prop, slot or event contract that only one application
could fill.

Evidence today: this contract is held mostly by review and by the business
boundary law ([constitution](./constitution.md) §4) rather than by a gate —
the audit records its enforcement status honestly.

**New artifact duties:** ask "could a second product compose this the same
way?"; if the answer needs a domain noun, the design is wrong.

## Theming

**Quality contract.** Visual decisions flow through Loom's token and theme
mechanisms: colours, spacing, radii, type and elevation come from
`theme-core`'s tokens; dark mode parity is part of the artifact, not a
follow-up; consumer-facing stylesheets ship as authored
(`sideEffects: ["**/*.css"]` is deliberate).

Evidence today: `theme-core` tests pin contrast pairs browserlessly; the axe
and contrast suites re-check rendered output in light and dark; templates
are held to both themes.

**New artifact duties:** no hard-coded visual values in components; new
visual decisions enter as tokens first.

## Semantic interaction

**Quality contract.** Interactive components define — not merely exhibit —
keyboard, focus, dismissal, state and accessibility behaviour appropriate to
their role: what Tab does, what closes an overlay, where focus lands and
returns to, how state is announced (the live-region seam exists for this).

Evidence today: the keyboard and focus suites over the built site; the
per-component harness specs for interaction-heavy controls; the disabled
split (native vs `useAncestorDisabled()`). Per-component depth varies; the
audit quantifies where the contract outruns the evidence.

**New artifact duties:** the role's interaction story is written into specs,
not left to the default behaviour of the elements involved.

## Public API

**Quality contract resting on invariants.** Consumer-facing artifacts have a
deliberate public API exposure: exported through the facade, grouped by tier,
with variant maps and label types alongside; documented through the
generated API tables, never transcribed; subpaths only where the main entry
is the wrong shape. Accidental surface is a defect: an export nothing
documents, a documented export nothing ships, or an internal package with
consumer-facing exports all fail the contract.

Evidence today: `packages/loom/src/index.ts` is the single source of truth
for the published surface; the five-artifact gate pairs export with docs
page and test (the demo through the docs build each page's own import
performs); the exports map and the build must agree for every subpath
([contract](./contract.md#the-public-api)). `tools/check-api-parity.ts` (in
`pnpm lint` and CI) now enforces that agreement mechanically — the exports
map, the vite `lib.entry` set, the emitted declarations, the `./styles/*.css`
sources and the docs' own `@ecoma-io/loom/<subpath>` references must all name
one surface. The internal-helper trims (the sibling indexes' `COPY_REVERT_MS`,
`buttonVariantClasses`, `TableRowState`, `headAlignClass`, `nextSort`) are a
recorded decision in `packages/loom/src/index.ts`, not an accident.

**New artifact duties:** the facade export, the docs page with its
`<!-- @api -->` marker, and the demo land in the same change as the
component — the gate enforces the pairing, the reviewer enforces the
deliberateness.

---

## Status of each contract

Preliminary statuses from the enforcement surfaces this repository already
runs; the audit (Phase 1) is the evidence-backed version and the gap
analysis carries the follow-ups. Where this table and the audit disagree,
the audit row governs as of its audit date — statuses are synchronised by
Phase 0.5 and kept synchronised: a status here that the audit's evidence
does not back is a defect in this table, fixed by updating this table,
never by softening the audit. The one way a row moves past the audit is a
merged PR that changes enforcement: the audit's text stays frozen at its
date and this table updates in that same PR, while the evolution ledger
records the supersession when its next docs pass lands — the order 2D, 2E
and 2F each followed.

| Contract                  | Category  | Status             | Primary evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------- | --------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency direction      | Invariant | ENFORCED           | Two readers + mutation suite ([contract](./contract.md))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Facade sink               | Invariant | ENFORCED           | `check-architecture.ts` check 2 — 2G closed the subpath spellings (dashed subpaths, bare side-effect imports) its regex was blind to; the archkeep mutation rows still pin what only the text reader can see                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| One public package        | Invariant | ENFORCED           | `tools/check-manifest-privacy.ts` (in `pnpm lint`) asserts every package manifest under `packages/` — the two-level component manifests and the one-level foundation/facade ones alike — is `private` and carries no `publishConfig`; the root `@ecoma-io/loom` manifest is the only public package (#238 closed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Consumer boundary         | Invariant | ENFORCED           | Rows `layer-docs`/`layer-templates`; `layer-e2e` licenses the conformance route                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Five-artifact pairing     | Invariant | ENFORCED           | `tools/check-component-artifacts.ts` in `pnpm lint` and its Verify step                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| No JS side effects        | Invariant | ENFORCED           | `sideEffects` declared; semgrep leak rules + `loom-browser-api-at-module-scope` (module-scope browser reads, import-time browser construction — the observer and connection families and `requestAnimationFrame`, assigned or not — and static member initializers fail over `packages/**`, `typeof` guards exempt, fixtures under `semgrep --test`) — scoped to TypeScript modules (semgrep has had no Vue parser since 1.93, so SFC `<script>` blocks stay review-held), to the five named globals (`history`, `sessionStorage` and `globalThis` indirection stay review-held), and to the `static { … }` block form, which the parser cannot read; supersedes the audit's PARTIALLY_ENFORCED row as of its audit date, with the ledger row to record the supersession at its next docs pass |
| Theme-core not a JS dep   | Invariant | ENFORCED           | `check-architecture.ts` check 5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Accessibility             | Quality   | PARTIALLY_ENFORCED | Zero-exclude sweeps + pinned contrast; per-component depth uneven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Responsive                | Quality   | PARTIALLY_ENFORCED | Site + template gates; engine conformance route                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Composition               | Quality   | PARTIALLY_ENFORCED | Conformance route holds the four adapter-bearing compositions; rest is review                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Theming                   | Quality   | PARTIALLY_ENFORCED | Contrast pins + dark gates; token-usage itself unlinted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Semantic interaction      | Quality   | PARTIALLY_ENFORCED | Suites + per-component specs; coverage varies                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Public API deliberateness | Quality   | PARTIALLY_ENFORCED | `check-api-parity.ts` enforces exports↔build↔declarations↔styles↔docs agreement; the internal-helper trims are stated in `packages/loom/src/index.ts`; the per-component deliberateness of each new export stays review                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
