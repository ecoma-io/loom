# ADR-001: Reclassify DashboardGrid, DesktopAppShell and TitleBar

Status: **Accepted**

## Context

The Phase 1 audit ([audit](./../audit.md), gap
analysis [P1](./../gap-analysis.md#p1), artifact matrix) recorded three
packages currently living under `packages/blocks/` whose intended kind is
disputed: the audit's structural mismatch table marked DashboardGrid,
DesktopAppShell and TitleBar as "shipped under one kind for another". The
artifact model ([artifact-model](./../artifact-model.md#mapping-what-exists-today-to-the-canonical-kinds))
classifies directories by evidence, not by package location, and a name that
collides with existing vocabulary is resolved by a recorded migration, never
silently ([constitution](./../constitution.md) §10). This ADR records the
reclassification decision each package's evidence forces, so the Phase 2
migration ([ledger](./../evolution-ledger.md) 2A/2C) can move them without
re-litigating taxonomy.

## The deciding evidence

### DashboardGrid → **Composition**

`packages/blocks/dashboard-grid` declares **zero dependencies** (`moon.yml`
deps empty) and ships a single `DashboardGrid.vue` whose only behaviour is
arranging its children into a responsive grid. That is the definition of a
Composition: a layout-intent container that arranges children and carries no
domain meaning ([artifact-model](./../artifact-model.md#composition)). The
package is, in fact, a near-verbatim structural twin of the shipped
Composition `packages/composition/grid` (same arrangement-only intent, same
child-slot surface) — the name merely carries product flavour ("dashboard").
Grid-shaped arrangement is a first-class library capability, not a
product-specific pattern.

### DesktopAppShell → **Layout**

`packages/blocks/desktop-app-shell` composes a window-chrome arrangement:
TitleBar (window controls + menu), a region for application content, and the
collapse semantics of a responsive application shell. It depends on
`core`, `menubar`, `title-bar`, `window-controls` — exactly the Pattern +
Primitive + Foundation dependency set a Layout is entitled to
([artifact-model](./../artifact-model.md#layout)). A responsive application
shell with named regions is the Layout kind's canonical job: it structures an
application's chrome, not a single UI arrangement.

### TitleBar → **Pattern**

`packages/blocks/title-bar` is a window-chrome **region**: a horizontal band
holding menu + window controls, meant to be reused at the top of a desktop
app frame. It composes two primitives (`menubar`, `window-controls`) plus
`core`, installs them in a recognisable arrangement, and exposes no generic
control surface of its own. That is the Pattern kind's definition: a
composition of Loom parts into a recognisable UI arrangement that a product
reuses as a whole
([artifact-model](./../artifact-model.md#pattern)).

## Decision

| Package                             | Current home            | Decided kind    |
| ----------------------------------- | ----------------------- | --------------- |
| `packages/blocks/dashboard-grid`    | blocks (`layer-blocks`) | **Composition** |
| `packages/blocks/desktop-app-shell` | blocks (`layer-blocks`) | **Layout**      |
| `packages/blocks/title-bar`         | blocks (`layer-blocks`) | **Pattern**     |

The three packages migrate, in Phase 2C, to the tier named by their decided
kind (`packages/composition/`, `packages/layouts/`, and — after the
blocks→patterns rename — `packages/patterns/`). The two Architecture readers
and the Moon graph follow the migration; the public facade keeps exporting
the same names, so this is a **purely internal reclassification** — no
consumer-facing API changes.

## Consequences

- The migration must re-tag the three `moon.yml`s (`layer-blocks` →
  `layer-composition` / `layer-layouts` / `layer-patterns`), update each
  package's `package.json` `exports` and the facade imports that reference
  the old specifiers, and move the docstrings' tier noun.
- `DashboardGrid`'s near-twin `grid` become two packages of the same kind;
  Phase 3C (composition contract) will demand each carries an engine adapter
  and conformance cases — the decision here does not change that obligation,
  it makes it apply to DashboardGrid honestly.
- The naming question ("dashboard" is domain flavour) is deliberately parked:
  Phase 2C reclassifies by evidence; a rename to a kind-neutral name is a
  separate, later decision and would ride the same migration batch.
- Matters of taste are not part of this record. When two readings of the
  same field both satisfy the contracts, this ADR selects the reading the
  deciding evidence favours and says so.
