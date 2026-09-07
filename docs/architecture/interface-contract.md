# Interface Contract

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
- One public npm package — `@ecoma-io/loom`; internal packages are private, declare no consumer exports.
- The consumer boundary — templates and the docs site reach only the facade and the stylesheets; the E2E suites additionally reach the compositions through the disclosed conformance route (the `layer-e2e` row).
- The five-artifact pairing — a component ships with its source, test, demo, docs page and facade export, or a gate names the missing file: `pnpm lint` for all but the demo, the docs build for the demo each page's own import performs.
- Theme-core is not a JS dependency — its CSS ships by copy, never by import.

## Accessibility

**Quality contract.** Artifacts preserve the semantic and accessibility
behaviour appropriate to their role: accessible names, keyboard operability,
visible focus, focus restoration, state not conveyed by colour alone,
`prefers-reduced-motion` honoured. The library holds itself to `WCAG_TAGS`
([`packages/loom/src/a11y.ts`](https://github.com/ecoma-io/loom/blob/main/packages/loom/src/a11y.ts)):
the axe gates import their rule partitions from that same module, and a
browserless test pins the partition to equal exactly the rules `WCAG_TAGS`
select — the gate and the published claim cannot drift apart. The site's
accessibility page quotes the array; the quote is transcribed today, which
the gap analysis records.

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
mechanisms: colors, spacing, radii, type and elevation come from
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
([contract](./contract.md#the-public-api)).

**New artifact duties:** the facade export, the docs page with its
`<!-- @api -->` marker, and the demo land in the same change as the
component — the gate enforces the pairing, the reviewer enforces the
deliberateness.

---

## Status of each contract

Preliminary statuses from the enforcement surfaces this repository already
runs; the audit (Phase 1) is the evidence-backed version and the gap
analysis carries the follow-ups.

| Contract                  | Category  | Status             | Primary evidence                                                                |
| ------------------------- | --------- | ------------------ | ------------------------------------------------------------------------------- |
| Dependency direction      | Invariant | ENFORCED           | Two readers + mutation suite ([contract](./contract.md))                        |
| Facade sink               | Invariant | ENFORCED           | `check-architecture.ts` check 2; subpath blind spot pinned by mutation rows     |
| One public package        | Invariant | ENFORCED           | Private internal manifests; artifact + template gates                           |
| Consumer boundary         | Invariant | ENFORCED           | Rows `layer-docs`/`layer-templates`; `layer-e2e` licenses the conformance route |
| Five-artifact pairing     | Invariant | ENFORCED           | `tools/check-component-artifacts.ts` in `pnpm lint`                             |
| No JS side effects        | Invariant | DOCUMENTED_ONLY    | `sideEffects` declared; review-held; no gate exists                             |
| Theme-core not a JS dep   | Invariant | ENFORCED           | `check-architecture.ts` check 5                                                 |
| Accessibility             | Quality   | PARTIALLY_ENFORCED | Zero-exclude sweeps + pinned contrast; per-component depth uneven               |
| Responsive                | Quality   | PARTIALLY_ENFORCED | Site + template gates; engine conformance route                                 |
| Composition               | Quality   | DOCUMENTED_ONLY    | Review-held; no gate                                                            |
| Theming                   | Quality   | PARTIALLY_ENFORCED | Contrast pins + dark gates; token-usage itself unlinted                         |
| Semantic interaction      | Quality   | PARTIALLY_ENFORCED | Suites + per-component specs; coverage varies                                   |
| Public API deliberateness | Quality   | PARTIALLY_ENFORCED | Pairing gate enforces the artifacts; deliberateness is review                   |
