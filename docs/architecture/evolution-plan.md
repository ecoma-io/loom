# Evolution Plan

_Program tracking — the [documentation model](./README.md) maps every document's role._

The sequenced plan for the architecture-evolution program that
[the constitution](./constitution.md), [the artifact model](./artifact-model.md),
[the audit](./audit.md) and [the gap analysis](./gap-analysis.md) set up. Work
items, statuses and evidence live in [the ledger](./evolution-ledger.md); the
program's single external pointer is
[ecoma-io/loom#240](https://github.com/ecoma-io/loom/issues/240). Phase 0
(constitution, #237) and Phase 1 (audit, #239) are landed — this plan covers
everything after them.

Sequencing law: **the hierarchy is decided and enforced before coverage is
expanded.** Phase 2 makes the machine graph agree with the semantic model;
Phase 3 turns quality contracts into gates on top of that agreed hierarchy;
Phase 4 completes the layout engine's role as internal oracle; Phase 5
productises. A later phase does not start while an earlier phase carries an
open structural conflict, because every gate added on top of a wrong hierarchy
would have to be re-written. Phase labels inside the Phase 1 records (the
audit, gap analysis and artifact matrix) are the auditors' recommendations;
the sequencing here governs.

Each numbered item below lands as its own pull request — small enough to
review in one sitting, gated, and merged through the merge queue. The ledger
row is the item's status of record; this document only says why the order is
what it is.

## Phase 0.5 — constitution consistency pass

Documentation only, no architecture change. Reconciles the Phase 0 documents
with the Phase 1 evidence so no normative document contradicts the audit:

1. **Documentation model** — a map of which document plays which of the
   seven roles: normative law, normative classification, normative quality
   contracts, current-state contract, empirical record, program tracking, or
   history. The audit reports reality; it never overrides a normative
   document.
2. **Status synchronisation** — where the interface contract's preliminary
   status table and the audit disagree (one-public-package:
   ENFORCED vs PARTIALLY_ENFORCED pending #238 and the manifest gate), both
   read the same until Phase 2 closes the gap.
3. **Matrix-as-ledger** — the artifact matrix is the per-artifact
   classification ledger of record, updated by migrations, enumerable from
   the filesystem; never treated as an immutable snapshot.
4. **Foundation semantics** — Foundation is an ownership rank, not an
   obligation to import every Foundation package; `layout-engine` is
   Foundation while staying dependency-pure and unreached by render paths.
5. **Terminology status** — every contested name (`blocks`, Pattern,
   Component, `docs/patterns`) is labelled normative, legacy, documentation
   naming or migration state — nothing silently pretends the vocabulary is
   already unified.
6. **Stale-prose fixes** (gap C5, C6) — comments that assert stale facts
   (demo counts, test inventories, spec headers) are corrected; these are
   documentation inconsistencies and belong to this pass, not to Phase 2.

Exit: one coherent truth model; no normative status contradiction; no source
refactor.

## Phase 2 — architecture enforcement and taxonomy alignment

The decisive phase. Nothing in Phase 3+ starts before it completes.

- **2A/2B — taxonomy decisions and machine hierarchy** (one PR): record the
  reclassification decisions with evidence (DashboardGrid, DesktopAppShell,
  TitleBar), then make both architecture readers implement the model's order
  — Pattern below Layout, no Pattern→Layout edge, `layout-engine`'s rank
  stated identically by the rank table, the boundary rows and the canonical
  order sentence the docs cite.
- **2C — taxonomy migration** (one or more PRs, inventory-first): rename the
  `blocks` tier to `patterns`, reclassify the two outliers, and update every
  reference surface (Moon, Archkeep, gates, docs sections, docstrings, CI,
  aliases) with zero orphan aliases. Batched; each batch leaves the tree
  green.
- **2D — one-public-package hardening** (one PR): fix #238 and add the
  component-manifest privacy gate (with its own negative test) so the
  repository's one-public-package rule is machine-enforced.
- **2E — API boundary hardening** (one PR): decide the facade↔package-index
  trim question, wire `./theme` in the workspace, close the `@api`-marker
  gaps, add the exports↔entries↔declarations↔styles parity check, resolve
  the `@internationalized/date` externalisation question.
- **2F — consumer boundary hardening** (one PR): prune the dead VitePress
  aliases, derive the moon e2e spec list from the filesystem, hand-declare
  the missing tooling edges, extend the moon-deps sync to the fixed packages,
  give the template gate its CI step, resolve the demos' undeclared
  `@lucide/vue` dependency.
- **2G — enforcement quality** (one PR): widen the facade regex to the
  spellings it is blind to, make the zero-engine-bytes claim a standing
  check, extend import-time browser-code detection. Every new gate ships
  with the test that proves it can fail.
- **2H — documentation synchronisation** (one PR): after the migration,
  sweep terminology, land the "Application Interface System for Vue"
  positioning on the surfaces that own it (README, npm description, docs
  landing), pin the `WCAG_TAGS` transcription.

Exit: semantic taxonomy = machine taxonomy; no forbidden edge permitted;
internal manifests guaranteed private; public parity machine-checked;
templates and demos behave as consumers; gates proven able to fail.

## Phase 3 — interface contract enforcement

Turns the quality contracts into gates sized by artifact role, not coverage
for its own sake:

- **3A accessibility** — role-aware evidence model over `WCAG_TAGS` × ARIA
  role × artifact class; keyboard/focus/target-size/reduced-motion depth
  where the role warrants it; deterministic checks where possible.
- **3B responsive** — behavioural viewport evidence for every Layout, every
  Composition with layout semantics, and every Pattern whose responsive
  behaviour is contractual; semantic cases over snapshots.
- **3C composition contract** — a structural gate: every composition owns an
  engine adapter plus conformance cases, or a named recorded exception.
- **3D interaction evidence** — classify the 76 primitives
  (interactive / composite / container / visual-only) and require
  role-appropriate evidence, not a flat quota.
- **3E theming** — a token allowlist with deliberate exceptions; existing
  hardcoded values migrate only where the rule needs them to.
- **3F public API governance** — the package→facade→docs→declarations→exports
  chain as one deterministic parity surface.

Exit: meaningful evidence for every artifact class; exceptions explicit;
new artifacts cannot bypass the contract silently.

## Phase 4 — layout engine and semantic layout foundation

The engine stays internal, pure and outside the published API:

- **4A composition twins** — adapters where the semantics are honestly
  modelable (Sidebar, Grid, Split in risk order — the audited priority, gap
  P1); ScrollReel declared CSS-only in writing if that is the finding;
  unsupported semantics fail loudly.
- **4B engine contract** — property-based invariants plus shrunk regression
  fixtures for the constraint set; the modelled subset recorded beside the
  adapters that throw beyond it.
- **4C browser-as-oracle** — live comparisons with deterministic tolerances
  (DPR, fonts, rounding, nesting, exact breakpoints); no stale golden data.
- **4D conformance scalability** — registry-driven
  composition→adapter→cases enumeration replacing hand-maintained lists;
  reviewed exceptions the only way out.
- **4E boundary research** — a written investigation of percentage sizing,
  wrapping, intrinsic sizing and nested constraints, each gated by a real
  use case; no second CSS engine.

Exit: composition layout semantics classified; twins where honest; purity
intact; conformance trustworthy and registry-driven.

## Phase 5 — productization

- **5A canonical patterns** — the pattern layer curated to interface intent
  that a second product would reach for the same way; domain-specific
  patterns rejected at intake.
- **5B canonical layouts** — application-level structures (AppShell,
  Dashboard, Settings, FormLayout, MasterDetail, Reading, Centered,
  SplitLayout) with regions, responsive behaviour, accessibility obligations
  and composition model defined.
- **5C canonical templates** — realistic consumer-shaped pages across the
  canonical families, public-API-only, fixture-driven, gated in light and
  dark.
- **5D consumer escape rate** — measured and documented: how much custom
  CSS, layout, accessibility and interaction work a consumer still owns.
- **5E positioning** — README and product surfaces rewritten around
  "An Application Interface System for Vue" with the ownership split
  explicit.
- **5F governance** — the intake path (classification → ownership →
  validation → quality contract → implementation → consumer evidence →
  public API) written so a future agent can walk it unaided.

Exit: the completion criteria in the program's constitution hold — checked by
a fresh-agent read of the repository alone.
