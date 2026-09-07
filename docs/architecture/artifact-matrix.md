# Artifact Matrix (Phase 1)

_Empirical record — the [documentation model](./README.md) maps every document's role._

Every shipped artifact classified against the seven-kind model in
[artifact-model](./artifact-model.md). Columns follow the audit plan: current Moon
layer tag, intended type under the model, whether the facade exports it, evidence,
gap, and the recorded action. "Unknown" appears where the classification needs a
decision the audit deliberately does not take. Counts were generated, not recalled:
76 primitives, 8 compositions, 15 blocks, 8 layouts, 3 templates.

This document is the **classification ledger of record**: migrations that
reclassify artifacts update it in the same PR, and the [terminology status
table](./artifact-model.md#terminology-status) plus the [mapping](./artifact-model.md#mapping-what-exists-today-to-the-canonical-kinds)
carry the vocabulary its rows assume. A ledger, not a snapshot — when a row
goes stale, the change that made it stale updates it here. The counts are
enumerable from the filesystem, not recalled:

```bash
ls -d packages/primitives/*/ | wc -l    # 76 primitives
ls -d packages/composition/*/ | wc -l   # 8 compositions
ls -d packages/blocks/*/ | wc -l        # 15 blocks (the Pattern kind, pre-migration name)
ls -d packages/layouts/*/ | wc -l       # 8 layouts
ls -d templates/*/ | wc -l              # 3 templates
```

## Foundations

| Artifact      | Location                 | Current layer         | Intended type                     | Public?                                                                  | Evidence                                                                        | Gap                                        | Recommended action                                             |
| ------------- | ------------------------ | --------------------- | --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Core          | `packages/core`          | `layer-core`          | Foundation                        | Facade re-exports utilities; `WCAG_TAGS` via `./a11y`                    | `packages/loom/src/index.ts` core section                                       | None                                       | —                                                              |
| Labels        | `packages/labels`        | `layer-labels`        | Foundation                        | Facade re-exports; 12 value / 16 type exports                            | facade labels section                                                           | None                                       | —                                                              |
| Theme core    | `packages/theme-core`    | `layer-theme-core`    | Foundation                        | Stylesheets via `./styles/*`; no JS import path                          | zero JS imports from any tier (audit grep)                                      | None                                       | —                                                              |
| Layout engine | `packages/layout-engine` | `layer-layout-engine` | Foundation (platform-independent) | **No** — reaches no import path, carried by no published byte path today | purity enforced by empty archkeep allow-list; facade has zero engine references | Reader divergence on rank (audit §Readers) | Phase 2: align `check-architecture.ts` rank text with the rows |

## Compositions (8)

All `layer-composition`, all facade-exported. Adapters exist for exactly four.

| Artifact   | Adapter (`src/layout.ts`) | Conformance evidence                          | Intended type | Gap                                               | Action                                           |
| ---------- | ------------------------- | --------------------------------------------- | ------------- | ------------------------------------------------- | ------------------------------------------------ |
| Stack      | yes                       | engine-vs-DOM conformance + browserless floor | Composition   | None                                              | —                                                |
| Inline     | yes                       | conformance (wrap/baseline throw loudly)      | Composition   | None                                              | —                                                |
| Frame      | yes                       | conformance                                   | Composition   | None                                              | —                                                |
| Center     | yes                       | conformance                                   | Composition   | None                                              | —                                                |
| Grid       | no                        | jsdom class pins only                         | Composition   | No computable twin; no browser geometry evidence  | Phase 2 adapter                                  |
| Sidebar    | no                        | jsdom class pins only                         | Composition   | As Grid                                           | Phase 2 adapter (auditors' first-priority order) |
| Split      | no                        | one behavioural e2e, no adapter               | Composition   | Percent-length boundary blocks the twin           | Phase 2 adapter after boundary decision          |
| ScrollReel | no                        | jsdom class pins only                         | Composition   | Scroll-snap may be CSS-only by design — undecided | Declare in writing either way                    |

## Blocks (15) — the family under the recorded terminology + rank conflict

| Artifact        | Intended type under the model                             | Evidence                                                                                         | Gap                                                                                   | Action                                            |
| --------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------- |
| AppHeader       | Pattern                                                   | region semantics, `AppHeader.vue:14-16`                                                          | Name only                                                                             | Rides the recorded rename                         |
| EmptyState      | Pattern                                                   | region intent                                                                                    | Name only                                                                             | Rides the rename                                  |
| ErrorState      | Pattern                                                   | region intent                                                                                    | Name only                                                                             | Rides the rename                                  |
| ErrorSummary    | Pattern                                                   | region intent                                                                                    | Name only                                                                             | Rides the rename                                  |
| FormActions     | Pattern                                                   | region intent                                                                                    | Name only                                                                             | Rides the rename                                  |
| FormSection     | Pattern                                                   | region intent                                                                                    | Name only                                                                             | Rides the rename                                  |
| LoadingState    | Pattern                                                   | region intent                                                                                    | Name only                                                                             | Rides the rename                                  |
| MetricCard      | Pattern                                                   | region intent                                                                                    | Name only                                                                             | Rides the rename                                  |
| PageHeader      | Pattern                                                   | region intent                                                                                    | Name only                                                                             | Rides the rename                                  |
| RowActions      | Pattern                                                   | region intent                                                                                    | Name only                                                                             | Rides the rename                                  |
| SidebarNav      | Pattern                                                   | region semantics, `SidebarNav.vue:30-31`                                                         | Name only                                                                             | Rides the rename                                  |
| ToastStack      | Pattern                                                   | composed region, `ToastStack.vue:17-23`                                                          | Name only                                                                             | Rides the rename                                  |
| TitleBar        | Pattern (borderline but defensible: window-chrome region) | `TitleBar.vue:12-15`                                                                             | Borderline noted, no action without a decision                                        | Note in the rename decision                       |
| DesktopAppShell | **Layout**                                                | meets the Layout definition on all four clause groups; deps exactly Pattern+Primitive+Foundation | Structural: a Layout lives in the blocks tier; machine rank puts blocks above layouts | Phase 2: reclassify during the migration decision |
| DashboardGrid   | **Composition (by behaviour) — Unknown pending decision** | arrangement-only, container-driven, presentational (`DashboardGrid.vue:3-19`)                    | Unflagged in the model's mapping until PR 2; Composition-vs-Layout undecided          | Phase 2 decision, then reclassify                 |

## Layouts (8)

All `layer-layouts`, all facade-exported, all shell-geometry by exports.

| Artifact     | Browser evidence                           | Gap                 | Action                |
| ------------ | ------------------------------------------ | ------------------- | --------------------- |
| AppShell     | root responsive suite (320/1024/ultrawide) | None                | —                     |
| MasterDetail | root responsive suite                      | None                | —                     |
| Centered     | root responsive suite                      | None                | —                     |
| Reading      | root responsive suite                      | None                | —                     |
| SplitLayout  | root responsive suite                      | None                | —                     |
| Dashboard    | none                                       | Responsive gate gap | Phase 2 viewport spec |
| FormLayout   | none                                       | Responsive gate gap | Phase 2 viewport spec |
| Settings     | none                                       | Responsive gate gap | Phase 2 viewport spec |

## Primitives (76)

| Family                                                         | Current layer      | Intended type | Public?                                                       | Evidence                                    | Gap                                                                  | Action                                                              |
| -------------------------------------------------------------- | ------------------ | ------------- | ------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/primitives/*` (76 directories, each facade-exported) | `layer-primitives` | Primitive     | All 107 component re-exports verified 1:1 against facade deps | `check-component-artifacts.ts` pairing gate | 44/76 own no harness spec; `tree-view` manifest defect filed as #238 | Phase 2: interaction-spec floor for role-bearing controls; fix #238 |

## Templates (3)

| Artifact                              | Current layer     | Intended type              | Public?                  | Evidence                                                                                                         | Gap                                                                        | Action                     |
| ------------------------------------- | ----------------- | -------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------- |
| Starter, Analytics, WorkspaceSettings | `layer-templates` | Template (consumer-shaped) | No — consumers copy them | imports exactly `{@ecoma-io/loom, vue}`; vite aliases only published specifiers; build fails on internal imports | Artifact gate is lint-only, unwired in CI (verified; see the gap analysis) | Phase 2: dedicated CI step |

## Documentation and consumer-shaped proxies

| Artifact                                           | Location                                                                               | Current layer   | Intended type                                                        | Public?   | Evidence                                    | Gap                                                                                                                      | Action                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------- | --------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| Worked-example pattern pages                       | `docs/patterns/` (2 pages)                                                             | `layer-docs`    | Documentation artifact (name collides with the shipped Pattern kind) | Site only | recorded in artifact-model §Relationship    | Naming collision, decided as recorded                                                                                    | Rides the rename decision                        |
| Showcase                                           | `docs/showcase/` (3 pages)                                                             | `layer-docs`    | Consumer-shaped demonstration                                        | Site only | facade-only imports                         | None                                                                                                                     | —                                                |
| Component/Composition/Blocks/Layouts docs sections | `docs/components` (76), `docs/composition` (8), `docs/blocks` (15), `docs/layouts` (8) | `layer-docs`    | Documentation artifacts keyed 1:1 to tiers                           | Site only | `check-component-artifacts.ts` tier→dir map | `docs/blocks` documents Pattern-kind components under the retired name; the mapping table previously left these rows out | Rides the rename; rows added by this matrix      |
| Demos                                              | `docs/demos/` (109)                                                                    | `layer-docs`    | Documentation artifacts (site-rendered)                              | Site only | demos-a11y sweep imports them               | `@lucide/vue` dependency declared nowhere consumer-visible                                                               | Phase 2: declare or document                     |
| E2E suites                                         | `e2e/`, `playwright/`                                                                  | `layer-e2e`     | Consumer-shaped proxies + conformance route (disclosed)              | No        | `layer-e2e` row licenses composition reach  | Moon task lists 6/7 root specs                                                                                           | Phase 2: derive spec list from the filesystem    |
| Tools                                              | `tools/`                                                                               | `layer-tooling` | Repository tooling                                                   | No        | boundary row licenses e2e/docs reads        | 3 real cross-project reads absent from the moon affected graph                                                           | Phase 2: `# preserved` edges in `tools/moon.yml` |
