# Artifact Model

_Normative classification — the [documentation model](./README.md) maps every document's role._

The canonical kinds of artifact Loom recognises, what each may own, what it
must never own, what it may depend on, and how it is tested. The
[constitution](./constitution.md) §5 holds the hierarchy; this document holds
the semantics. Where a kind's name collides with existing repository
vocabulary, the collision is recorded here — not silently resolved by a
rename ([constitution](./constitution.md) §10).

This document classifies; it does not move anything. Where a name does not
match the thing it names (`docs/patterns/` is the standing example — the
Pattern tier's reference pages share the directory with the two
worked-example pages, so one name says two things), the mismatch is recorded
in the [mapping](#mapping-what-exists-today-to-the-canonical-kinds) and
changes only through a decided, sequenced migration.

```
Foundation
    ↓
Primitive
    ↓
Composition
    ↓
Pattern
    ↓
Layout
    ↓
Template
    ↓
Consumer Application
```

Dependency direction ([constitution](./constitution.md) §6): implementation
dependencies flow downward. Each kind below names its expected dependencies in
terms of these kinds.

---

## Foundation

Infrastructure every artifact is built from and that is built from nothing
higher: design tokens, the theme mechanism, accessibility infrastructure, and
low-level shared mechanisms.

- **Purpose.** Make the reusable decisions that everything above consumes without re-deciding: the token source of truth, the theme contract, the accessibility tag set the library holds itself to, the localisation seam, shared DOM/attribute/motion helpers, and the platform-independent layout semantics.
- **May own.** Tokens and their relationships; theme application (`useTheme`, the theme script); accessibility infrastructure (`WCAG_TAGS`, the label seam, `useAncestorDisabled`, `provideFieldContext`); generic helpers (`cn`, `optional`, `useSplitAttrs`, `listStaggerDelay`); layout semantics as data.
- **Must not own.** Interaction semantics of any control; visual styling beyond token definition; domain anything; imports from any higher kind.
- **Expected dependencies.** None, or downward within the kind (the label seam may build on core helpers; nothing may reach Primitives or above). The layout engine imports nothing.
- **Examples.** `packages/theme-core` (tokens — the source of truth), `packages/core` (helpers, `WCAG_TAGS`, theme), `packages/labels` (localisation and field context), `packages/layout-engine` (see [The layout engine](#the-layout-engine)).
- **Testing expectations.** Unit tests for every helper; pinned invariants where a regression would be invisible per-component — the contrast pairs are pinned browserlessly by theme-core tests, and the layout engine is held equal to its rendered output by the conformance harness.

**Foundation is an ownership rank, not an import obligation.** Nothing above
the rank is required to import every Foundation package — an artifact
depends on Foundation where the semantics it owns need it, and no further.
The clearest case is the layout engine: Foundation by kind and by ownership
(layout semantics as data), yet deliberately dependency-pure and unreached
by any component render path. Being foundational does not mean being
depended on; the rank decides who _may_ depend on whom, it never obliges
anyone to.

### The layout engine

`packages/layout-engine` is the platform-independent layout core: pure
geometry and layout semantics as data, importing nothing. It exists as the
computable twin of the layout CSS each composition renders — the oracle a
geometry test and a hypothetical non-web backend could both read. Its
current consumers are the composition adapters (`src/layout.ts`, beside
eight of the nine compositions — the recorded absence is the by-design
exception, [ADR-002](./decisions/0002-scroll-reel-css-only-by-design.md))
and the conformance harness that holds the twins equal.

The engine's scope is data, not prose: `packages/layout-engine/src/modelled-subset.ts`
carries `MODELLED_SUBSET` — the capabilities the single-line IR models and
every behaviour it deliberately does not, each absence with its reason,
owner and reopen condition. This document cites that record and never
restates it; the composition adapters re-export the constant beside their
`layout` edge, and a refusal in an adapter names the absence entry it
refuses on.

Constitutional facts and limits, until a decision changes them:

- It is a **Foundation** artifact by kind, and dependency-pure by design.
- **No consumer import path reaches it.** No component render path imports it, the facade re-exports none of it, and the published build carries zero engine bytes — proven, not left to tree-shaking ([contract](./contract.md)).
- **It makes no product promises yet.** It is not a public cross-platform API, not a styling system, and not a rendering engine. The cross-platform capability it hints at is a design constraint ([constitution](./constitution.md) §1), not a commitment; any promise beyond "internal oracle for layout semantics" is a future, amending decision.

## Primitive

A generic reusable interactive or visual control an application consumes
directly.

- **Purpose.** Be the decided control: interaction, accessibility, visual states and token usage standardised once so no product re-decides them.
- **May own.** Interaction semantics (keyboard, pointer, focus); accessibility behaviour and naming (via the label seam); visual states and variants; token usage; interface state (open/closed, focus, selection-in-view).
- **Must not own.** Business or domain behaviour: no domain prop shapes, no business callbacks, no data fetching, no persistence.
- **Expected dependencies.** Foundation (core and labels in the JS graph; theme-core for its stylesheets only — a JS import of it violates the current-state contract); other Primitives at the same rank (e.g. `combobox → chip`); never Composition or above.
- **Examples.** Button, TextField, Dialog, Select, Combobox, Checkbox, Tabs, Table, Tooltip, Toast.
- **Testing expectations.** Unit tests beside the source; integration tests where a real collaborator is the behaviour; component-owned browser evidence (the harness) when the interaction warrants it — keyboard and focus behaviour in particular.

## Composition

Generic spatial/interface composition with no domain meaning.

- **Purpose.** Own spatial relationships and responsive composition: how things are arranged when the arrangement itself is the decision.
- **May own.** Spatial relationships (stacking, splitting, gridding, inlining); intrinsic responsive collapse; container behaviour; layout semantics rendered as CSS and declared as data (the `src/layout.ts` adapter over the layout engine, where one exists — eight of nine compositions own one today; the census lives in the [artifact matrix](./artifact-matrix.md#compositions-9), and the one absence is the recorded by-design exception, [ADR-002](./decisions/0002-scroll-reel-css-only-by-design.md)).
- **Must not own.** Domain meaning; content semantics; interaction semantics beyond arrangement (a Split has no opinion about what is split); imports from Pattern or above.
- **Expected dependencies.** Foundation; the layout engine through its adapter where one exists; Primitives where an arrangement embeds controls. Never Pattern, Layout or above.
- **Examples.** Stack, Inline, Grid, Split, Sidebar, Center, Frame, ScrollReel, DashboardGrid.
- **Testing expectations.** Geometry tests against the engine (the conformance route, where an adapter exists); responsive gates; browser evidence for the container behaviour itself.

## Pattern

A reusable interface intent formed from primitives and compositions:
recurring interface semantics that stop short of domain.

- **Purpose.** Standardise a recognisable interface region so products do not reinvent its semantics — what an empty state must offer, how a form section groups and annotates, how row actions are revealed.
- **May own.** Composed interaction semantics of the region; region structure and arrangement; token usage; the accessibility decisions the region implies.
- **Must not own.** Business logic; domain models or domain field semantics; data access; persistence; application state.
- **Expected dependencies.** Primitives, Compositions, Foundation. Never Layout or above.
- **Examples.** Empty state, error state, form section, form actions, page header, row actions, metric card, toast stack, sidebar nav.
- **Testing expectations.** Unit + integration beside the source; the region's composed interaction and accessibility held by the component browser harness where warranted.

**Naming conflict, recorded:** the landed consumer vocabulary (#216/#218)
uses "Pattern" for the worked-example pages in `docs/patterns/`. Under this
model the shipped kind is Pattern and the docs pages are
[documentation](#documentation-artifacts), not a shipped kind. The kind's own
name is settled: the directories carried the legacy name `blocks` until the
decided `blocks → patterns` rename landed in Phase 2C
([terminology status](#terminology-status) records the retired name), and the
rank order agrees with this model — both architecture readers place Pattern
**below Layout**, matching the hierarchy here.

## Layout

Reusable application-level interface structure.

- **Purpose.** Own application interface geometry and responsive structure at the scale of a screen: the shells products start from.
- **May own.** Application-scale arrangement (shell regions, master/detail split, dashboard geometry, settings structure); responsive structure across viewports; composition of Patterns, Compositions and Primitives into that geometry.
- **Must not own.** Routing; authentication; data access; persistence; application lifecycle; business logic. A Layout arranges regions; it has no opinion about what a region contains.
- **Expected dependencies.** Pattern, Composition, Primitive, Foundation — everything below, nothing above: templates and consumers reach this tier through the facade, never the reverse.
- **Examples.** AppShell, Dashboard, MasterDetail, Settings, Reading, Centered, FormLayout, SplitLayout, DesktopAppShell.
- **Testing expectations.** Responsive gates; the conformance route for its layout semantics; browser evidence for shell behaviour (region collapse, keyboard traversal).

## Template

A complete interface starting point composed from Loom artifacts —
consumer-shaped, and therefore **not part of Loom's dependency graph**.

- **Purpose.** Give a consumer a copyable, prebuilt **page** to start one real screen from, consuming Loom exactly as they would.
- **May own.** One page's composition of public Loom artifacts; fixture data with the swap points marked; page-level styling via token references.
- **Must not own.** Business logic; backend integration; authentication; domain-specific persistence; routing or multi-page navigation; hidden dependencies on Loom internals. The template stops where an application begins ([Template contract](../templates/contract.md)).
- **Expected dependencies.** The facade (`@ecoma-io/loom`) and the published stylesheets only. In-repo, published specifiers alias to source — the vessel proves the page builds against the published surface.
- **Examples.** `templates/starter`, `templates/analytics`, `templates/workspace-settings`.
- **Testing expectations.** The template contract's gates: the artifact gate (file set, manifest shape, Moon edge), the build against the published package, axe in light and dark with zero excludes, the keyboard gate, the responsive gate.

## Consumer Application

Everything a consumer builds around Loom's artifacts: the product itself.

- **Purpose.** Own the product decisions: business logic, domain models, data, auth, routing, persistence, lifecycle, workflows.
- **May own.** Anything — this is the layer the boundary exists to protect.
- **Must not own.** Nothing constrains it — but it **must not become a dependency of Loom**. Nothing in the library may import, configure itself around, or special-case a specific application.
- **Expected dependencies.** The facade, the stylesheets, and its own choices.
- **Examples.** Outside this repository. Inside it, only _proxies_ exist — see below.
- **Testing expectations.** Not Loom's to test; Loom's consumer-shaped proxies are tested as proof the boundary holds.

### Consumer-shaped artifacts (in-repo proxies)

These behave as consumers for the sake of the boundary; they are not shipped
kinds and not part of the dependency graph's stack:

| Artifact                           | Behaviour                                                                          | Gate                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------- |
| Documentation site (`docs/`)       | External consumer: imports the facade and stylesheets, renders the real components | Its build, route check, and the root browser sweep |
| E2E suites (`e2e/`, `playwright/`) | External consumer driving the built site and the harness                           | The three Playwright configs and their profiles    |
| Showcase (`docs/showcase/`)        | A demonstration of what the parts produce when they compose — read, never copied   | The site's own gates                               |
| Official Templates (`templates/`)  | The closest thing to a real external consumer in the repository                    | The [Template contract](../templates/contract.md)  |

### Documentation artifacts

`docs/patterns/` — the Pattern tier's reference pages, with the two
worked-example pages living beside them — and the rest of the docs tree are
**documentation**, not a shipped artifact kind. They classify,
teach and demonstrate; they carry no runtime semantics and impose no
dependency edges beyond the site's own consumer boundary. The word "Pattern"
in that directory's name is the recorded collision with the shipped Pattern
kind above.

## Terminology status

Every contested name carries exactly one status here, so no reader has to
guess whether a term is law, legacy, or documentation naming. Renames are
decided migrations ([constitution](./constitution.md) §10), not editorial
acts — `blocks` rode the Phase 2 migration, nothing renames quietly.

| Term                                                                                | Status                                                                                                           | Where it appears                                                                                                                                                                                                                                                                                    | Reading                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation, Primitive, Composition, Pattern, Layout, Template, Consumer Application | **Normative** — the seven canonical kinds (this document)                                                        | The seven-kind model and every surface it governs                                                                                                                                                                                                                                                   | The vocabulary classification is judged against.                                                                                                                                                                                      |
| `blocks`                                                                            | **Legacy, retired** — the Pattern kind's former name, renamed end to end in Phase 2C; no live surface carries it | Historical records only — not exhaustive: the Phase 1 audit, the gap analysis' resolved rows, ADR-001, the changelog, the evolution plan and ledger, the artifact matrix's rename notes, the `renamed from layer-blocks` comment in `module-boundaries.config.mjs`, the check-claims rotted fixture | The rename covered every surface the pending state listed — directory, Moon tag, gate tier noun, docs sections, commitlint scope, docstrings (gap T1). A `blocks` mention that narrates the current tree is a defect, not vocabulary. |
| Pattern (worked-example pages)                                                      | **Documentation naming** — `docs/patterns/`                                                                      | `docs/patterns/`, under the tier section's sidebar entry                                                                                                                                                                                                                                            | Documentation, not a shipped kind; collides with the shipped Pattern kind. The directory is not part of the taxonomy.                                                                                                                 |
| Component                                                                           | **Consumer vocabulary** — the #216/#218 umbrella for Primitive + Composition                                     | `docs/` section names, the facade docblock, consumer-facing prose                                                                                                                                                                                                                                   | A useful umbrella, not a kind — the kinds it collapses are what dependency ceilings are judged against.                                                                                                                               |
| Component (docs section)                                                            | **Documentation naming** — the docs section for the Primitive tier                                               | `docs/components/`                                                                                                                                                                                                                                                                                  | A docs organisation choice, not a kind claim; keyed to the Primitive tier.                                                                                                                                                            |
| Compositions/Patterns/Layouts (docs sections)                                       | **Documentation naming** — docs sections keyed to tiers                                                          | `docs/composition/`, `docs/patterns/`, `docs/layouts/`                                                                                                                                                                                                                                              | Keyed 1:1 to tiers; `docs/patterns/` also carries the two worked-example pages, the collision recorded above.                                                                                                                         |
| `layer-*` tags                                                                      | **Machine vocabulary** — Moon layer tags                                                                         | every `moon.yml`, `module-boundaries.config.mjs`                                                                                                                                                                                                                                                    | Machine-only vocabulary; after Phase 2 the tags map onto the semantic kinds one to one.                                                                                                                                               |
| Showcase, Application                                                               | **Consumer vocabulary** — from #216/#218, naming the Consumer Application kind                                   | docs landing, contract.md's artifact table                                                                                                                                                                                                                                                          | Prose names for the seventh kind, not kinds of their own; consumer prose keeps them where unambiguous (per the usage rule).                                                                                                           |

---

## Mapping: what exists today to the canonical kinds

Classified by evidence (directory is not evidence by itself — each row names
what the thing is and where that is recorded). **Status** distinguishes
alignment from the recorded mismatches; nothing here renames or moves
anything.

| Today                                                                               | Canonical kind                  | Status               | Evidence and notes                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------- | ------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core`, `packages/labels`, `packages/theme-core`, `packages/layout-engine` | Foundation                      | Aligned              | Helpers, label seam, token source of truth, engine — each matches the Foundation definition; the engine's limits are pinned [above](#the-layout-engine).                                                                                                                                                                                                                                          |
| `packages/primitives/*` (76 components)                                             | Primitive                       | Aligned              | Generic controls, one directory per component; facade re-exports each ([index.ts](https://github.com/ecoma-io/loom/blob/main/packages/loom/src/index.ts)).                                                                                                                                                                                                                                        |
| `packages/composition/*` (9 components)                                             | Composition                     | Aligned              | Spatial arrangement only; layout-engine adapters live beside four of them (stack, inline, frame, center). DashboardGrid joined the tier from the Blocks family per ADR-001.                                                                                                                                                                                                                       |
| `packages/patterns/*` (13 components)                                               | Pattern                         | Aligned              | The Blocks family renamed end to end in Phase 2C (gap T1): directory, Moon tag, gate tier noun and docs pages now say `patterns`. ADR-001 moved the two members that were never Pattern — DashboardGrid to Composition, DesktopAppShell to Layout — leaving region intents (EmptyState, FormSection, RowActions…) plus TitleBar, whose window-chrome reading ADR-001 judges a defensible Pattern. |
| `packages/layouts/*` (9 components)                                                 | Layout                          | Aligned              | Application shells; rank position already between composition and the consumer edge. DesktopAppShell joined the tier from the Blocks family per ADR-001.                                                                                                                                                                                                                                          |
| `templates/*` (3 templates)                                                         | Template                        | Aligned              | The template contract's gates hold them to the consumer boundary.                                                                                                                                                                                                                                                                                                                                 |
| `docs/patterns/`                                                                    | Documentation artifact          | **Naming collision** | "Pattern" here means worked-example pages, colliding with the shipped Pattern kind. Keep meaning distinct until a rename decision.                                                                                                                                                                                                                                                                |
| `docs/showcase/`                                                                    | Consumer-shaped (demonstration) | Aligned              | Read, never copied; lives in the site.                                                                                                                                                                                                                                                                                                                                                            |
| `docs/` (site), `e2e/`, `playwright/`                                               | Consumer-shaped proxies         | Aligned              | Facade-and-stylesheet-only imports, judged by the boundary table.                                                                                                                                                                                                                                                                                                                                 |
| The consumer's application                                                          | Consumer Application            | Out of repo          | Loom owns no applications.                                                                                                                                                                                                                                                                                                                                                                        |

## Relationship to the landed five-concept model (#216 / #218)

Issue [#216](https://github.com/ecoma-io/loom/issues/216) (via PR #218)
aligned the repository's consumer-facing vocabulary to five concepts:
Component, Pattern, Showcase, Template, Application. That work stands; this
model generalises it, and where the two differ the difference is explicit:

| #216/#218 concept                                 | This model                      | Note                                                                                                                                                                  |
| ------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component                                         | Primitive and Composition       | The umbrella splits into the two kinds that actually have different ownership rules and dependency ceilings.                                                          |
| Pattern (worked-example page in `docs/patterns/`) | Documentation artifact          | The shipped kind named Pattern (region intents, `packages/patterns/` since the 2C rename) is new vocabulary; the collision is recorded above and in the gap analysis. |
| Showcase                                          | Consumer-shaped (demonstration) | Unchanged; not a dependency-graph tier in either model.                                                                                                               |
| Template                                          | Template                        | Unchanged — the one-page law carries over.                                                                                                                            |
| Application                                       | Consumer Application            | Unchanged; outside Loom's scope in both.                                                                                                                              |

Usage rule: consumer-facing prose may keep the five-concept vocabulary where
it is unambiguous. Where precision matters — classifying an artifact,
deciding a dependency, judging a boundary — this document is the source of
truth. Renaming anything is a future, decided migration
([constitution](./constitution.md) §10), with the artifact matrix (Phase 1)
as the per-artifact ledger.
