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

| Artifact        | Browser evidence                           | Gap                 | Action                |
| --------------- | ------------------------------------------ | ------------------- | --------------------- |
| AppShell        | root responsive suite (320/1024/ultrawide) | None                | —                     |
| MasterDetail    | root responsive suite                      | None                | —                     |
| Centered        | root responsive suite                      | None                | —                     |
| Reading         | root responsive suite                      | None                | —                     |
| SplitLayout     | root responsive suite                      | None                | —                     |
| Dashboard       | none                                       | Responsive gate gap | Phase 2 viewport spec |
| FormLayout      | none                                       | Responsive gate gap | Phase 2 viewport spec |
| Settings        | none                                       | Responsive gate gap | Phase 2 viewport spec |
| DesktopAppShell | none                                       | Responsive gate gap | Phase 2 viewport spec |

## Primitives (76)

| Family                                                         | Current layer      | Intended type | Public?                                                       | Evidence                                    | Gap                                                                  | Action                                                              |
| -------------------------------------------------------------- | ------------------ | ------------- | ------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/primitives/*` (76 directories, each facade-exported) | `layer-primitives` | Primitive     | All 107 component re-exports verified 1:1 against facade deps | `check-component-artifacts.ts` pairing gate | 44/76 own no harness spec; `tree-view` manifest defect filed as #238 | Phase 2: interaction-spec floor for role-bearing controls; fix #238 |

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
