# Artifact Matrix (Phase 1)

_Empirical record — the [documentation model](./README.md) maps every document's role._

Every shipped artifact classified against the seven-kind model in
[artifact-model](./artifact-model.md). Columns follow the audit plan: current Moon
layer tag, intended type under the model, whether the facade exports it, evidence,
gap, and the recorded action. "Unknown" appears where the classification needs a
decision the audit deliberately does not take. Counts were generated, not recalled:
76 primitives, 9 compositions, 13 patterns, 9 layouts, 3 templates.

This document is the **classification ledger of record**: migrations that
reclassify artifacts update it in the same PR, and the [terminology status
table](./artifact-model.md#terminology-status) plus the [mapping](./artifact-model.md#mapping-what-exists-today-to-the-canonical-kinds)
carry the vocabulary its rows assume. A ledger, not a snapshot — when a row
goes stale, the change that made it stale updates it here. The counts are
enumerable from the index, not recalled — `tools/check-doc-claims.ts` recounts
the sentence against the tracked directories on every lint and CI run:

```bash
git ls-tree HEAD --name-only packages/primitives/ | wc -l   # 76 primitives
git ls-tree HEAD --name-only packages/composition/ | wc -l  # 9 compositions
git ls-tree HEAD --name-only packages/patterns/ | wc -l     # 13 patterns (the Blocks family, renamed in 2C)
git ls-tree HEAD --name-only packages/layouts/ | wc -l      # 9 layouts
git ls-tree HEAD --name-only templates/ | wc -l             # 3 templates
```

Tracked, not on-disk: the ledger of record is the repository, and a working
tree can carry residue a fresh checkout does not have — an `ls` of this
machine's `packages/blocks` still lists what 2C deleted from the index. The
gate's recount and the command block above are not the same count: the gate
counts `040000 tree` lines from `git ls-tree HEAD`, the block counts
`--name-only` entries, and the two agree only while every entry under each
path is itself a tracked directory — the shape a tier keeps.

## Foundations

| Artifact      | Location                 | Current layer         | Intended type                     | Public?                                                                  | Evidence                                                                        | Gap                                        | Recommended action                                                                                                                                                                                                                                      |
| ------------- | ------------------------ | --------------------- | --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core          | `packages/core`          | `layer-core`          | Foundation                        | Facade re-exports utilities; `WCAG_TAGS` via `./a11y`                    | `packages/loom/src/index.ts` core section                                       | None                                       | —                                                                                                                                                                                                                                                       |
| Labels        | `packages/labels`        | `layer-labels`        | Foundation                        | Facade re-exports; 12 value / 16 type exports                            | facade labels section                                                           | None                                       | —                                                                                                                                                                                                                                                       |
| Theme core    | `packages/theme-core`    | `layer-theme-core`    | Foundation                        | Stylesheets via `./styles/*`; no JS import path                          | zero JS imports from any tier (audit grep)                                      | None                                       | —                                                                                                                                                                                                                                                       |
| Layout engine | `packages/layout-engine` | `layer-layout-engine` | Foundation (platform-independent) | **No** — reaches no import path, carried by no published byte path today | purity enforced by empty archkeep allow-list; facade has zero engine references | Reader divergence on rank (audit §Readers) | **Closed** — 2G removed the rank judgment: rule 8 of `check-architecture.ts` judges the engine by consumer set (the engine itself, plus each composition adapter's exact `src/layout.ts`), leaving no engine rank for the readers to diverge on (D3/M1) |

## Compositions (9)

All `layer-composition`, all facade-exported. Adapters exist for exactly four.

| Artifact      | Adapter (`src/layout.ts`) | Conformance evidence                          | Intended type | Gap                                               | Action                                           |
| ------------- | ------------------------- | --------------------------------------------- | ------------- | ------------------------------------------------- | ------------------------------------------------ |
| Stack         | yes                       | engine-vs-DOM conformance + browserless floor | Composition   | None                                              | —                                                |
| Inline        | yes                       | conformance (wrap/baseline throw loudly)      | Composition   | None                                              | —                                                |
| Frame         | yes                       | conformance                                   | Composition   | None                                              | —                                                |
| Center        | yes                       | conformance                                   | Composition   | None                                              | —                                                |
| Grid          | no                        | jsdom class pins only                         | Composition   | No computable twin; no browser geometry evidence  | Phase 2 adapter                                  |
| Sidebar       | no                        | jsdom class pins only                         | Composition   | As Grid                                           | Phase 2 adapter (auditors' first-priority order) |
| Split         | no                        | one behavioural e2e, no adapter               | Composition   | Percent-length boundary blocks the twin           | Phase 2 adapter after boundary decision          |
| ScrollReel    | no                        | jsdom class pins only                         | Composition   | Scroll-snap may be CSS-only by design — undecided | Declare in writing either way                    |
| DashboardGrid | no                        | jsdom class pins only                         | Composition   | No computable twin; no browser geometry evidence  | Phase 2 adapter                                  |

## Patterns (13) — the Blocks family after 2C's rename

The two rows this table carried for DesktopAppShell and DashboardGrid now sit
in the Layouts and Compositions sections. ADR-001 decided that
reclassification and 2C executed it on the directories; the rows move here in
the same correction that added the recount gate (`tools/check-doc-claims.ts`),
because 2C itself left this Phase-1 table untouched.

| Artifact     | Intended type under the model                             | Evidence                                 | Gap                                                                                                           | Action        |
| ------------ | --------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------- |
| AppHeader    | Pattern                                                   | region semantics, `AppHeader.vue:14-16`  | Name only                                                                                                     | Renamed in 2C |
| EmptyState   | Pattern                                                   | region intent                            | Name only                                                                                                     | Renamed in 2C |
| ErrorState   | Pattern                                                   | region intent                            | Name only                                                                                                     | Renamed in 2C |
| ErrorSummary | Pattern                                                   | region intent                            | Name only                                                                                                     | Renamed in 2C |
| FormActions  | Pattern                                                   | region intent                            | Name only                                                                                                     | Renamed in 2C |
| FormSection  | Pattern                                                   | region intent                            | Name only                                                                                                     | Renamed in 2C |
| LoadingState | Pattern                                                   | region intent                            | Name only                                                                                                     | Renamed in 2C |
| MetricCard   | Pattern                                                   | region intent                            | Name only                                                                                                     | Renamed in 2C |
| PageHeader   | Pattern                                                   | region intent                            | Name only                                                                                                     | Renamed in 2C |
| RowActions   | Pattern                                                   | region intent                            | Name only                                                                                                     | Renamed in 2C |
| SidebarNav   | Pattern                                                   | region semantics, `SidebarNav.vue:30-31` | Name only                                                                                                     | Renamed in 2C |
| ToastStack   | Pattern                                                   | composed region, `ToastStack.vue:17-23`  | Name only                                                                                                     | Renamed in 2C |
| TitleBar     | Pattern (borderline but defensible: window-chrome region) | `TitleBar.vue:12-15`                     | Settled by ADR-001 — the borderline-but-defensible Pattern judgement, renamed into `packages/patterns/` in 2C | Renamed in 2C |

## Layouts (9)

All `layer-layouts`, all facade-exported, all shell-geometry by exports.

| Artifact        | Browser evidence                                                                   | Gap  | Action                                                          |
| --------------- | ---------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------- |
| AppShell        | root responsive suite (320/1024/ultrawide)                                         | None | —                                                               |
| MasterDetail    | root responsive suite                                                              | None | —                                                               |
| Centered        | root responsive suite                                                              | None | —                                                               |
| Reading         | root responsive suite                                                              | None | —                                                               |
| SplitLayout     | root responsive suite                                                              | None | —                                                               |
| Dashboard       | root responsive suite (320/1024) + harness spec (collapse, grid reflow, 2xl aside) | None | **Closed** — Phase 3B (#277): `responsive` claim in `a11y.json` |
| FormLayout      | root responsive suite (ultrawide cap) + harness spec                               | None | **Closed** — Phase 3B (#277): `responsive` claim in `a11y.json` |
| Settings        | root responsive suite + harness spec                                               | None | **Closed** — Phase 3B (#277): `responsive` claim in `a11y.json` |
| DesktopAppShell | root responsive suite (`md` media query) + harness spec (rail width)               | None | **Closed** — Phase 3B (#277): `responsive` claim in `a11y.json` |

## Primitives (76)

| Family                                                         | Current layer      | Intended type | Public?                                                       | Evidence                                                                                                                                                                     | Gap                                                                                                                             | Action                                                                            |
| -------------------------------------------------------------- | ------------------ | ------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/primitives/*` (76 directories, each facade-exported) | `layer-primitives` | Primitive     | All 107 component re-exports verified 1:1 against facade deps | `check-component-artifacts.ts` pairing gate; per-component `a11y.json` role claims held to `packages/core/src/a11y-contract.ts` by `tools/check-a11y-evidence.ts` (Phase 3A) | 29/76 role claims carry a named keyboard exception (no component-owned harness spec); `tree-view` manifest defect filed as #238 | Phase 3B/3D: the interaction-spec floor the exception records name, per component |

## The accessibility claims (107) — Phase 3A

Every tiered component now carries a sixth artifact beside its source:
`packages/<tier>/<name>/a11y.json`, the declared role claim
`tools/check-a11y-evidence.ts` holds to the role → requirement matrix in
`packages/core/src/a11y-contract.ts`. The claim is declared, not derived —
reka-ui injects ARIA roles at runtime, so no reader can derive one from the
source with confidence — and the gate counts the requirements nothing answers
yet instead of failing, which turns the two standing browser-evidence gaps into
enumerable numbers. Recounted in #273 (2026-09-09), directly from the gate's
own output rather than this prose: **85 named exceptions across 55 components**
— **32 keyboard** (29 primitives, plus `composition/scroll-reel`,
`patterns/form-section` and `patterns/toast-stack` — no component-owned
harness spec witnesses the traversal) and **53 focus-not-obscured** (49
primitives, 4 composition/patterns). The focus-not-obscured answer is a tree
fact, not a sidecar's word: the 2.4.11 suite sweeps three pages today — button,
dialog, drawer — and a component answers by its page sitting in the suite's
`page.goto` population, which is why button and drawer carry a keyboard
exception and no focus-not-obscured one. The section is a dated recount, not
the ledger itself: drift after #273 lands on
[issue #272](https://github.com/ecoma-io/loom/issues/272), this phase's ledger,
and the gate's output is always the number of record. Every exception names its
reason in the sidecar, so 3B/3D's work list is that output, not an audit
opinion.

## The responsive claims (31) — Phase 3B

Phase 3A's sidecar grew a second axis: each tiered component's `a11y.json` may
carry a `responsive` claim — either `{ contract: "none", basis }` or the
behaviours its layout answers from the closed vocabulary in
`packages/core/src/responsive-contract.ts`, with the harness and sweep specs
that witness them. `tools/check-responsive-evidence.ts` (the second axis of the
Phase 3A gate) reads the claims as data and fails any behaviour left without
evidence or a named exception. Recounted 2026-09-09, from the gate's own
summary line: all 31 tiered components carry a claim, and **one named exception
stands** — `patterns/row-actions`' coarse-pointer reveal, which Playwright
cannot witness (`emulateMedia` carries no pointer feature), an engine-scoped
gap the sidecar records in place of a spec that would be a lie. Two gaps are
deliberate and written where they sit: #275 (the width a wrapped panel keeps)
is open, so no spec pins a wrapped panel's width; and `patterns/form-actions`
claims `none` today — #276 decided wrap, and the landing of that fix retargets
the claim. Drift after this recount lands on
[issue #277](https://github.com/ecoma-io/loom/issues/277), this phase's ledger;
the gate's summary is always the number of record.

## Templates (3)

| Artifact                              | Current layer     | Intended type              | Public?                  | Evidence                                                                                                         | Gap                                                                            | Action                                                   |
| ------------------------------------- | ----------------- | -------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Starter, Analytics, WorkspaceSettings | `layer-templates` | Template (consumer-shaped) | No — consumers copy them | imports exactly `{@ecoma-io/loom, vue}`; vite aliases only published specifiers; build fails on internal imports | Artifact gate was lint-only, unwired in CI when audited (see the gap analysis) | **Closed** — 2F added the dedicated CI verify step (M11) |

## Documentation and consumer-shaped proxies

| Artifact                                            | Location                                                                                 | Current layer   | Intended type                                                                                                                                                      | Public?   | Evidence                                    | Gap                                                                                          | Action                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Worked-example pattern pages                        | `docs/patterns/` (`forms.md`, `menus.md`, beside the 13 Pattern pages)                   | `layer-docs`    | Documentation artifact (name collides with the shipped Pattern kind)                                                                                               | Site only | recorded in artifact-model §Relationship    | Naming collision, decided as recorded                                                        | Rides the rename decision                        |
| Showcase                                            | `docs/showcase/` (3 pages)                                                               | `layer-docs`    | Consumer-shaped demonstration                                                                                                                                      | Site only | facade-only imports                         | None                                                                                         | —                                                |
| Component/Composition/Pattern/Layouts docs sections | `docs/components` (76), `docs/composition` (9), `docs/patterns` (15), `docs/layouts` (9) | `layer-docs`    | Documentation artifacts keyed 1:1 to tiers, except `docs/patterns` — its 15 pages are the 13 Pattern pages plus the two worked-example pages the row above carries | Site only | `check-component-artifacts.ts` tier→dir map | `docs/blocks` became `docs/patterns` in 2C; the mapping table previously left these rows out | Renamed in 2C; rows added by this matrix         |
| Demos                                               | `docs/demos/` (109)                                                                      | `layer-docs`    | Documentation artifacts (site-rendered)                                                                                                                            | Site only | demos-a11y sweep imports them               | `@lucide/vue` dependency declared nowhere consumer-visible                                   | Phase 2: declare or document                     |
| E2E suites                                          | `e2e/`, `playwright/`                                                                    | `layer-e2e`     | Consumer-shaped proxies + conformance route (disclosed)                                                                                                            | No        | `layer-e2e` row licenses composition reach  | Moon task lists 6/7 root specs                                                               | Phase 2: derive spec list from the filesystem    |
| Tools                                               | `tools/`                                                                                 | `layer-tooling` | Repository tooling                                                                                                                                                 | No        | boundary row licenses e2e/docs reads        | 3 real cross-project reads absent from the moon affected graph                               | Phase 2: `# preserved` edges in `tools/moon.yml` |
