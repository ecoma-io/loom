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

All `layer-composition`, all facade-exported. Eight own an adapter with the
full evidence set, registered in the conformance harness; the conformance gate
(`tools/check-composition-conformance.ts`, Phase 3C) reads the census from the
tree. ScrollReel is the one exception row remaining in
`tools/composition-conformance.exceptions.ts` — a by-design declaration
([ADR-002](./decisions/0002-scroll-reel-css-only-by-design.md)), not debt: 4A
landed the other twins (#313–#317) and its row's
question was resolved in writing.

| Artifact      | Adapter (`src/layout.ts`) | Conformance evidence                                                       | Intended type | Gap                                                                                        | Action                                                                              |
| ------------- | ------------------------- | -------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Stack         | yes                       | engine-vs-DOM conformance + browserless floor                              | Composition   | None                                                                                       | —                                                                                   |
| Inline        | yes                       | conformance (wrap/baseline throw loudly)                                   | Composition   | None                                                                                       | —                                                                                   |
| Frame         | yes                       | conformance                                                                | Composition   | None                                                                                       | —                                                                                   |
| Center        | yes                       | conformance                                                                | Composition   | None                                                                                       | —                                                                                   |
| Grid          | yes                       | engine-vs-DOM conformance (#317): reflow boundaries pinned as equality     | Composition   | Row banding outside the single-line IR — counted `knownDivergence`, owner Phase 4B         | Landed (4A)                                                                         |
| Sidebar       | yes                       | engine-vs-DOM conformance (#314): collapse regime + percent adapter-side   | Composition   | The wrapped panel's unpinned width — recorded `SIDEBAR_UNMODELLED`, owner Phase 4B         | Landed (4A); relates to #275, which stays open                                      |
| Split         | yes                       | engine-vs-DOM conformance (#316): min-side percent + gap adapter-side      | Composition   | The collapse outside the single-line IR — recorded `SPLIT_UNMODELLED`, owner Phase 4B      | Landed (4A); fixed #300's stale collapse comments                                   |
| ScrollReel    | no — by design            | behavioural e2e (3B) + jsdom pins; ADR-002 is the record                   | Composition   | None — the arrangement's essence (scroll container, snap) has no static-geometry footprint | Declared CSS-only in writing (ADR-002, #313); reopens only where the engine changes |
| DashboardGrid | yes                       | engine-vs-DOM conformance (#315): span resolves adapter-side to area width | Composition   | Row auto-placement / implicit tracks outside the IR — counted absence, owner Phase 4B      | Landed (4A)                                                                         |

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
[issue #308](https://github.com/ecoma-io/loom/issues/308), the registers' live
tracker since #272 closed with 3A,
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
summary line: all 31 tiered components carry a claim, and **four named
exceptions stand** — `patterns/row-actions`' coarse-pointer reveal, which
Playwright cannot witness (`emulateMedia` carries no pointer feature), an
engine-scoped gap the sidecar records in place of a spec that would be a lie;
and the three state patterns — `empty-state`, `error-state`, `loading-state` —
whose `py-10 sm:py-14` step is a band-scale fact the vocabulary names, while
their content-driven columns leave a browser leg no pattern-owned geometry to
witness. The same recount refiled two claims the first pass had misread:
`patterns/app-header`'s two-row search drop is a literal `sm:` media query
(`device-media`), not a content-fit wrap threshold, and the state patterns
declare `band-scale` rather than `none` — a declared step is not the absence
of behaviour. One gap is deliberate and written where it sits: #275 (the width
a wrapped panel keeps) is open, so no spec pins a wrapped panel's width — #278
landing #276's wrap decision does not change that, and `patterns/form-actions`,
which now claims wrap-threshold and band-scale off that landed row, asserts
the wrap itself and the gap band, never the width a wrapped action keeps.
Drift after this recount lands on
[issue #277](https://github.com/ecoma-io/loom/issues/277), this
phase's ledger; the gate's summary is always the number of record.

## The component token surface — Phase 3E

The law `theme.css` states — "everything a consumer can theme lives here and
nowhere else" — is held to components the way 3A holds the accessibility
claims, over the surface a literal read can see:
`tools/check-token-allowlist.ts` judges the bracket spellings a component
writes — arbitrary values on the style-bearing utilities, bare arbitrary
properties on theme-owned CSS properties, class strings wherever the literal
sits (template attribute, cva table, `cn()` map, a multi-line binding),
inline motion declarations and template colour literals — and fails any that
is not token-anchored. What it does not judge is stated beside what it does:
the named utility spellings (`duration-100`, `z-50`, `opacity-50`, a
default-palette `bg-red-500`) and the computed half of script-side styling
are the gate's blind spots, recorded as such in the interface contract's
Theming row (PARTIALLY_ENFORCED) rather than passed over silently. The law
lives as data in `packages/core/src/theme-contract.ts`
(the allowed value shapes plus the exception register), the gate parses it
rather than importing it, and the gate's own fixtures prove every register
entry fires by removing it over the real tree one entry at a time. Recounted
(2026-09-09), directly from the gate's output rather than this prose:

```text
Token allowlist clean: 118 .vue file(s) scanned, 69 style-bearing value(s) judged, 116 token(s) in the source; 27 recorded exception(s) across 14 file(s) shrink as tokens land.
```

The 27 exceptions are the overlay size scales (Dialog, Drawer, Toast,
ToastStack, AlertDialog), the per-surface menu and popover floors (Popover,
Tooltip, ContextMenu, DropdownMenu, Menubar, NavigationMenu, Command),
TitleBar's macOS chrome constants and Switch's anisotropic press pair — each
carrying the reason it stands rather than a token, in one register a review
reads whole. The register is the shrinking end of the law: an entry the tree
no longer produces is itself a failure, so it can only shrink deliberately.
As with 3A's recount, this section is dated, not living: after this PR, the
gate's output is the number of record.

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
