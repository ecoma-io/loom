# ADR-003: The engine's boundary is the modelled subset — no expansion without a real use case, and no second CSS engine

Status: **Accepted**

## Context

Phase 4B landed the engine's scope as data:
[`MODELLED_SUBSET`](../../../packages/layout-engine/src/modelled-subset.ts)
carries the capabilities the single-line IR models and every behaviour it
deliberately does not, each absence with its reason, owner and reopen
condition; the adapters re-export the record beside their `layout` edge, a
refusal names the entry it refuses on, and the
[artifact model](../artifact-model.md) cites the file instead of restating
the list. What the record deliberately does not carry is the reasoning this
document adds: for each candidate expansion — what CSS does, what the engine
does instead, what a real use case would look like, and why today's answer
is "not yet". Phase 4E's [ledger row](../evolution-ledger.md) asks for
exactly that investigation and binds it twice: each expansion is gated by a
real use case, and the program does not build a second CSS engine — no
runtime reimplementation of CSS layout in JavaScript.

The [documentation model](../README.md) defines no research-document role,
and an unfiled investigation is how a boundary decays back into tribal
memory; durable decisions land in this directory and are indexed in the
ledger's "Decisions of record" table. So Phase 4E is one ADR, not a report.
It cites the record's entries by key and never restates them — a restated
entry is right on the day it is written; the cited one cannot drift. Every
figure below is re-derivable from the files cited beside it.

## The four investigations

### 1. Percentage sizing — resolved adapter-side; that is the law, not a stopgap

CSS resolves a percentage length against its containing block at used-value
time. The engine's `Length` is a px number by design
([style.ts](../../../packages/layout-engine/src/style.ts)), and
`MODELLED_SUBSET.absences.PERCENT` records where the percentages this slice
needs go instead: Sidebar's `contentMin` becomes `percentToFraction(…)` ×
`availableWidth` ([sidebar's
adapter](../../../packages/composition/sidebar/src/layout.ts)), Split's
`min-width: 50%` becomes `CONTENT_MIN_FRACTION × availableWidth`
([split's adapter](../../../packages/composition/split/src/layout.ts)), and
`rem` resolves at the conformance route's pinned 16px root — all
adapter-side, all against the content box the
[route measured](../../../playwright/harness/conformance.ts)
(`contentBoxWidth(section)`). Everything else — `em`, `ch`, a percent track
floor — is refused loudly by the adapters' unit grammars (grid,
dashboard-grid, split) rather than guessed. [ecoma-io/loom#300](https://github.com/ecoma-io/loom/issues/300)
closed Split's original percentage exactly this way.

The resolution is exact rather than approximate, and the reason is the
law's hinge: the browser resolves these percentages against the same
measured content box the route hands the adapter — split's adapter states
it as "the engine's input and the oracle's quantity stay the same by
construction". The adapter computes the quantity the engine is given; the
engine never sees a percent at all.

**Decision.** The engine stays px-only, and adapter-side resolution is
ratified as the law of this boundary: a percentage is not modelled, it is
resolved before the IR exists. What reopens it is a use case where the
percentage's CSS base is _not_ the measured content box — a percentage
against an indefinite containing block (a component sized by max-content,
fit-content or shrink-to-fit, where the base is itself being computed and
the resolution is cyclic with the container's own width). There,
measure-then-multiply either diverges from CSS or cannot be evaluated, and
percent enters the IR as the additive `Length` union member the record's
reopen condition names. No such component exists in the tree today.

### 2. Wrapping — ratified-absent until a composition needs its wrapped geometry asserted

CSS's `flex-wrap` breaks one line into many, then lays each out: line
collection, per-line free-space distribution, per-line justification. The
IR is one line (`MODELLED_SUBSET.modelled.SINGLE_LINE`), and five recorded
absences are faces of that one fact — `WRAP`, `SIDEBAR_WRAPPED_PANEL`,
`GRID_ROW_BANDING`, `DASHBOARD_ROW_AUTO_PLACEMENT`,
`DASHBOARD_IMPLICIT_TRACKS`. Nothing approximates a wrapped arrangement
today: the regimes that would wrap are guarded by an adapter-side predicate
(`sidebarCollapses`, `staysOnOneLine`), projected and declined (grid
returns the first row's projection and the case's `knownDivergence` declines
the comparison), answered with the empty line outside a case's declared
width (dashboard-grid's route adapter), or refused at the prop level
(inline's wrap throw).

What wrapping would demand is the engine's largest expansion: a multi-line
IR — collecting children into lines, distributing within each, justifying
each — and a `ComputedNode` that can say "line", which is `layout.ts`'s own
stated condition for anything this IR takes on (`WRAP`'s reopen condition).
When that day comes, one property 4B landed future-proofs it: the suite
pins that the output's id sequence equals the input's preorder —
"distribution never reorders a line"
([invariants.test.ts](../../../packages/layout-engine/src/invariants.test.ts))
— and line collection consumes children in document order, so a wrapped
engine inherits the pinned property instead of re-litigating it.

The use-case bar: a composition whose real DOM wraps and whose wrapped
geometry somebody needs _asserted_ — a conformance comparison across a
collapse boundary, the far side sidebar and split currently guard as
never-compared. The concrete candidate already has a name:
[ecoma-io/loom#275](https://github.com/ecoma-io/loom/issues/275), the
wrapped side panel's width, open since the sidebar twin landed
(`SIDEBAR_WRAPPED_PANEL`'s reopen condition cites it). Until a case needs
the engine's answer there, the browser renders the arrangement and no
evidence is missing.

**Decision.** Ratified-absent. No line-collection design lands here —
designing the engine's largest expansion before its first consumer is the
second-CSS-engine failure mode with extra steps. The bar is written above;
the expansion opens when a conformance need meets it, behind the design
record's gates the record's owner field names.

### 3. Intrinsic sizing — ratified-absent; the only honest path back is a measurement supplied from outside the engine

CSS gives a flex item with visible overflow a content-based automatic
minimum (`min-width: auto`): shrink cannot compress it below its content's
min-content width. The engine's floor is exactly the declared `minWidth`,
on the main axis, and 0 where nothing is declared
([layout.ts](../../../packages/layout-engine/src/layout.ts), `clampAlong`)
— `AUTOMATIC_MINIMUM_SIZE` records the divergence, and `TEXT_METRICS`
records why the engine cannot close it: no min-content width, no ch/em
resolution, no baseline.

The observed instance is
[ecoma-io/loom#283](https://github.com/ecoma-io/loom/issues/283): with a
reel's shrink lock lost, eight `w-40` cards in a `gap="md"` reel compress
to ~86px each at an 800px viewport and the row fits exactly; at 360px it is
the browser's min-content floor — nothing the engine models — that stops
the compression. Both figures are that issue's measurements. The
containment that keeps the divergence out of every comparison is the
fixtures' construction — text-free fixed boxes, where the two floors agree
exactly — which is also why sidebar's adapter keeps a populated side panel
out of its modelled tree.

**Decision.** Ratified-absent: text metrics stay out of scope, and the
engine never measures text — a min-content width estimated in JavaScript
is the no-second-CSS-engine clause's exact face. The only path that reopens
intrinsic sizing without breaking that clause is the one percent took,
pointed the other way: a use-case-gated measurement hook _supplied by the
adapter_ — a max-content or min-content width measured where measurement
lives (the browser, or design time) and handed to the engine as the number
it already speaks. The gate: a modelled component with text-bearing
children whose content floor participates in geometry a case must compare.
No such case exists; the fixtures' text-free construction is the
containment until one does.

### 4. Nested constraints — one level per adapter, ratified as the discipline

CSS makes nesting free: an outer box's resolved content box is the inner
box's containing block, recursively, and the inner layout never sees the
outer's problem. Two facts state what this repository does today, and the
distinction between them is the substance of this investigation.

The IR itself nests. `compute` recurses, and a parent writes each child's
resolved box back as the child's style and definite offer
([layout.ts](../../../packages/layout-engine/src/layout.ts)), so a nested
style tree is judged in one `layout()` call, and the invariants suite walks
generated trees several levels deep. Nothing in the record declines a
nested tree. The adapter discipline, not the engine, is one level deep:
each adapter maps one component's props against the context the route
measured (`LayoutContext { viewportWidth, availableWidth }`) and returns
one line; no adapter calls another, and the route conforms each composition
in isolation at its own measured section.

The composed surface, meanwhile, already exists in the product:
`templates/analytics/src/App.vue` nests a `Grid` inside a `Stack` inside a
`Stack`. The browser resolves that
nesting at runtime and nothing asserts the composed geometry — each
composition is conformed alone. A real nested use case is a conformance
case for the composed artifact, and what it would demand is constraint
propagation across adapter calls: the outer adapter's resolved content box
becoming the inner adapter's `availableWidth`, the viewport still shared, a
defined measurement order. That is route-and-adapter composition work; the
engine needs nothing, because it already recurses.

**Decision.** The one-level-per-adapter discipline is ratified as the law:
each adapter resolves its component against a measured container and never
consumes another adapter's output. Composed-geometry assertions wait for a
use case that needs one, and the expansion they bring is composition-side —
never an engine change.

## The remaining dispositions

One decision sentence each. The record carries every reopen condition; this
ADR adds none and removes none.

- **Reverse (direction) — ratified-absent, beside wrap.** Axes are physical
  and Loom's layout components are entirely physical, so a reverse has no
  consumer; its natural home is with line collection, since reversing is
  order-mirroring on the line structure wrap builds
  (`MODELLED_SUBSET.absences.DIRECTION`).
- **Baseline and text metrics — ratified-absent, the no-second-CSS-engine
  clause's strongest case.** A baseline is decided by font metrics a
  text-free geometry engine does not have; the adapters refuse it loudly
  (inline's `align: "baseline"` throw, center's `prose` throw) rather than
  fall back to a different alignment (`BASELINE`, `TEXT_METRICS`). A
  baseline computed in JavaScript would be the reimplementation the plan
  forbids.
- **Scroll — decided; ADR-002 stands.** ScrollReel is CSS-only by design —
  no adapter, no conformance cases, no coverage floor
  ([ADR-002](./0002-scroll-reel-css-only-by-design.md)). This ADR cites it
  and reopens nothing.
- **The aspectRatio both-definite fence — ratified as the modelled
  contract.** When both axes resolve without the ratio, the ratio is not
  re-applied: the contract [style.ts](../../../packages/layout-engine/src/style.ts)'s
  `aspectRatio` docblock states, the finding-5 fixture pins as an assertion
  ([invariants.test.ts](../../../packages/layout-engine/src/invariants.test.ts)),
  and no adapter reaches — the conformance route's height offer is always
  max-content, so one axis always arrives unresolved. CSS's own answer
  there is genuinely ambiguous, and the fence holds the engine to the one
  unambiguous contract until a real consumer forces the semantic question.
  The fixture's analysis comment already carries this reasoning and carries
  it correctly; this ADR changes nothing in it.
- **The padding-larger-than-box pathology — ratified as
  recorded-not-modelled.** When padding exceeds the box, the engine
  collapses the children's space to zero and places them at the content
  origin where CSS keeps them at the padding edge ([layout.ts](../../../packages/layout-engine/src/layout.ts));
  unreachable through the slice's 16–32px gutters, a padding-semantics
  decision rather than a defect (`PADDING_LARGER_THAN_BOX`).

## Consequences

- **Nothing is implemented.** Zero engine, adapter, harness or gate changes
  ride this ADR; every decision above is a decision not to build, or a
  ratification of what [Phase 4A](https://github.com/ecoma-io/loom/issues/311)
  and [Phase 4B](https://github.com/ecoma-io/loom/issues/319) already
  landed. The record's entries are unchanged — where this investigation
  sharpens one's framing (nested constraints is an adapter-and-route
  discipline, not an engine limitation), the sharpening lives here, not in
  the record.
- The boundary now has both of its halves: the machine-readable record,
  keyed for gates and refusals to cite, and this written half, which is
  what a reviewer argues from. Neither restates the other.
- Every reopening condition written above is a use case, never a capability
  appetite: percent reopens on an indefinite percentage base, wrapping on a
  composition needing wrapped geometry asserted, intrinsic sizing on a
  text-bearing comparison (fed by an adapter-supplied measurement, never an
  engine-side estimator), nesting on a composed-geometry assertion. An
  expansion that opens without its use case violates this ADR, and the
  Phase 4 adversarial gate can hold the tree to that by re-reading it.
- The [ledger](../evolution-ledger.md)'s 4E row ("Written investigation;
  each expansion gated by a real use case; no second CSS engine") is
  satisfied by this document; the row's flip lands in a follow-up PR, as
  4A's and 4B's did, and the "Decisions of record" index row lands in the
  same PR as this file — the index entry initially missed for ADR-002 is
  not missed again.
