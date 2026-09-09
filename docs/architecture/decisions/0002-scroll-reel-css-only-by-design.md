# ADR-002: ScrollReel is CSS-only by design — no layout-engine adapter

Status: **Accepted**

## Context

Phase 4A resolves the question scroll-reel's [composition-conformance exception
row](../../../tools/composition-conformance.exceptions.ts) has carried since
3C: whether an honest engine mapping exists for the scroll-snap arrangement, or
the arrangement is CSS-only by design. The [evolution
plan](./../evolution-plan.md) phrases the fork exactly — adapters where the
semantics are honestly modelable (Sidebar, Grid, Split, with dashboard-grid
named beside them), and "ScrollReel declared CSS-only in writing if that is the
finding". This ADR is that written declaration; the row's own removal note
names it as one of its two ways out.

What ScrollReel renders is a single element: a `div` carrying
`flex flex-row overflow-x-auto`, a responsive gap scale (`gap-2 sm:gap-3`,
`gap-3 sm:gap-4`, `gap-4 sm:gap-6`), and — when snapping is on —
`snap-x snap-mandatory`. The per-child `scroll-snap-align` is the consumer's
class, as the shipped demo's items show (`shrink-0 … snap-start`); the
component itself applies no shrink control and no alignment class to its
children. Arrow-key and Home/End navigation are JavaScript (`onKeydown`
scrolling to the next snap-aligned child) — interaction, not geometry.

The engine's modelled subset ([style.ts](../../../packages/layout-engine/src/style.ts))
is a single-line flexbox IR in px: axis, gap, cross-axis alignment, justify,
padding, fixed sizes, grow/shrink/basis, aspect ratio. A scroll container is
not in it — no overflow, no scroll offset, no snap points.

## The deciding evidence

1. **The arrangement's essence has no static-geometry footprint.** The snap
   properties position the scroll viewport, never a box: the same rendered
   geometry arises with `snap-x snap-mandatory` on or off, and
   `overflow-x-auto` decides whether the strip scrolls, not where anything
   sits. In the IR's vocabulary there is nothing for them to map onto. An
   adapter could only ever restate the substrate — a one-line row, a banded
   gap, the CSS-default cross-axis stretch — which is the part of ScrollReel
   that is every flex row, not the part that is a reel.
2. **The substrate is already held, twice over.** The jsdom tier pins the
   classes themselves (`flex-row`, `overflow-x-auto`, every gap step and its
   below-`sm` partner, in `ScrollReel.test.ts`), and Stack's conformance cases
   hold the same `gap-*` utilities equal to the browser at the same 16px root
   and the same `sm` breakpoint. The one browser-only geometric fact the
   classes cannot carry — that the strip overflows instead of wrapping, and
   the gap really steps down below `sm` — is what the 3B behavioural e2e
   (`scroll-reel.e2e.ts`) asserts against the live page. An adapter would add
   a third, weaker holder for facts that already have named ones.
3. **The reel's operating point is unreachable by the comparator.** The
   conformance route mounts every case's children as fixed-px boxes carrying
   CSS-default `flex-shrink: 1` ([conformance.ts](../../../playwright/harness/conformance.ts)),
   so every mountable case shrinks to fit: `scrollWidth` equals
   `clientWidth`, nothing overflows, no case can render the overflowing strip
   the component exists for. Declaring `flexShrink: 0` adapter-side — the
   slide reading — fails both ways at once: it contradicts the component's
   real DOM, which ships the CSS default (the engine's own stated law,
   style.ts), and it diverges from the very fixtures mounted beside it the
   moment a case overflows; sized so every case fits, the declaration is never
   exercised. Evidence that is contradicted or inert is not conformance.
4. **Nothing about this finding is a gap in evidence.** The arrangement is
   held by the behavioural route the engine route was never meant to replace:
   one line, overflow into scroll, and the gap step-down, all at every band.

## Decision

ScrollReel is CSS-only by design. It takes no `src/layout.ts` adapter, no
conformance cases, no layout-conformance spec and no coverage floor; the
conformance route does not gain a fifth module for it. The arrangement stands
on the evidence it already has — the jsdom class pins, the behavioural e2e's
overflow and step-down assertions, and the shared gap-scale conformance Stack
already carries — and the exception row records this ADR as its reason instead
of the undecided question it replaced.

This is a decision about the engine's reach, not a defect in either side: the
engine models static geometry, and ScrollReel's defining behaviour is scroll,
which is not static geometry. Recording that boundary in one place is the
honest outcome; forcing an adapter would trade a truthful exception for a
green census that implies a twin which does not exist.

## What would reopen the question

- The engine's modelled subset admitting scroll containers or snap points as
  modelled quantities — an engine boundary decision of the kind Phase 4E
  exists to investigate, which no phase currently owns.
- The component growing a static-geometry fact a plain row does not carry — a
  component-applied shrink on slides, padding, or a justify step — anything
  that would make an honest adapter tree differ from a bare one-line row.

## Consequences

- The exception row stays, rewritten from "undecided" to this declaration.
  The gate holds a composition to exactly two states — the evidence set or a
  recorded exception — and cannot read an ADR, so the row is the
  declaration's gate-side face; deleting the row without the evidence set
  fails the gate by design, and landing the evidence set would contradict the
  finding.
- The census stays "4 of 9 compositions own the full evidence set; 5 named
  exception(s)". The gate's census line reads "expire as Phase 4A lands the
  twins", wording written when every row was debt; this row is a decision, not
  debt, and reconciling that shared wording is a later, separate change — not
  this ADR's, and not this repository's compositions'.
- The modelled-subset record itself — what the engine does and does not model,
  beside the adapters that throw beyond it — remains Phase 4B's
  ([evolution plan](./../evolution-plan.md), 4B). This ADR only records
  scroll-reel's finding against that boundary; it does not write the record.
- The other four 4A twins are unaffected: their semantics resolve
  adapter-side into the subset, and their rows expire as their evidence lands.
