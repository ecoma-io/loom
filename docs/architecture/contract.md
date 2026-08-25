# Loom Architecture Contract

This is the current-state contract: how the repository is allowed to be
structured, and how the checks keep it that way. It is the document a
contributor or coding agent reads before deciding where code belongs. The
pre-migration state of the repository is preserved separately in
[`baseline.md`](./baseline.md), which is history, not guidance.

## One public package, many internal ones

The npm public surface is exactly one package:

```
@ecoma-io/loom
```

Everything under `packages/<tier>/<name>/` exists to give ownership and
dependency boundaries a shape — it is an **implementation boundary, not an
npm package boundary**. Those internal packages are never published
independently. There is no `@ecoma-io/loom-button`, no `@ecoma-io/loom-dialog`,
and this contract is what stops that from happening: the moment an internal
package is published, its exports become product that needs versioning,
compatibility policy and deprecation, and the consumer's single-entrypoint
story is gone.

Why have internal packages at all, then?

- **Affected selection.** Moon's `--affected` walks the dependency graph.
  When `packages/core` changes, every component that imports it is re-tested.
  A single flat `src/` directory has no such graph — everything is "all".
- **Ownership.** A component's directory owns its source, tests, demo, docs
  page and `e2e/` specs. The five-artifact contract
  (`tools/check-component-artifacts.ts`) is checked against that shape.
- **The published boundary is testable.** Because the facade is the only
  thing that imports "everything", the check that nothing else does is a
  small, fast, deterministic rule — not a judgement call.

The source architecture and the package architecture are therefore different
things on purpose. Source layout optimises maintainability; the published
package optimises consumer ergonomics.

## The dependency direction

Layers, in the only direction dependencies may point (a package may depend
on anything at a rank `<=` its own, and only on its own rank or below):

```
core 0        shared utilities (cn, optional, attrs, motion, WCAG_TAGS, theme)
  ↓
labels 1      localisation seam, field context, date vocabularies, ancestor-disabled
  ↓
primitives 2  generic controls — one directory per component
  ↓
composition 3 layout-intent primitives (Stack, Split, Grid, …)
  ↓
layouts 4     responsive application shells
  ↓
blocks 5      composed arrangements of primitives
  ↓
facade 6      @ecoma-io/loom — the public surface (packages/loom)
```

Why this order, rather than any other? It is the dependency direction of
_complexity_: a primitive is a single generic control, a composition is
primitives arranged, a layout is an application shell, a block is a
recognisable arrangement of the layers beneath it. Code that composes other
code may import what it composes; the composed layer never imports the
composer back. That is the invariant that keeps the graph acyclic and the
affected-selection honest — a block importing a primitive is the direction
the graph already flows, a primitive importing a block would be reaching up
for something that should have been composed beneath it.

Rules:

1. **Downward and same-layer edges are allowed.** A primitive may import
   another primitive (`combobox → chip`), a block may import a primitive
   (`form-section → fieldset`), a primitive may import `labels` and `core`.
2. **Upward edges are forbidden.** A primitive may not import a block; a
   layout may not import a composition; a component may not import the
   facade.
3. **The facade is a sink, not a source.** Nothing below `packages/loom` may
   import `@ecoma-io/loom` — not even `import type`. The facade exists at
   the edge of the graph; a component reaching back through it creates a
   cycle and makes affected selection a lie.
4. **Cycles are forbidden.** The edge set must be a DAG. This is checked
   directly, not inferred.
5. **`theme-core` is not part of the JS graph.** It ships CSS that is copied
   verbatim into `dist/styles/`, never imported by a component's
   `.ts`/`.vue`. A JS import of `@ecoma-io/loom-theme-core` is a violation.

The exact edge set the checks enforce is derived from the filesystem — the
packages present under each tier — not from a hand-maintained list. Adding a
component directory adds it to the graph automatically; the checks then
verify its edges.

## The public API

`packages/loom/src/index.ts` **is** the public API. It is the single source
of truth for the published package, and its docblock says so. The export
list is deliberate:

- every component package's public surface (component + its variant maps +
  its label types), grouped by tier;
- the foundation utilities a consumer needs (`cn`, `useTheme`, the label
  seam, …).

The narrow subpaths exist only where the main entry is the wrong shape for a
consumer:

| Subpath                       | What it is                                          |
| ----------------------------- | --------------------------------------------------- |
| `@ecoma-io/loom/a11y`         | `WCAG_TAGS`, for consumers that do not compile SFCs |
| `@ecoma-io/loom/theme`        | the `useTheme` composable, with no component weight |
| `@ecoma-io/loom/styles/*.css` | the stylesheets, shipped as authored                |

Subpath exports must be declared in the root `package.json` `exports` map and
emitted by the build (an entry per subpath). A subpath documented anywhere in
`docs/` but absent from `exports` is a contract defect, not a doc bug — and
the reverse (an `exports` entry nothing documents) is equally suspicious.

Internal packages are private; they declare no `exports` for consumers. Their
`package.json` `dependencies` are their real, direct graph edges — the thing
`tools/sync-moon-deps.ts` mirrors into Moon so affected selection is honest.

## Side effects

Two kinds of side effects, treated differently:

- **CSS side effects are the product.** The stylesheets are imported for
  their cascade effect. `package.json` declares `sideEffects: ["**/*.css"]`
  so bundlers keep them. This is deliberate and must not be "fixed".
- **JavaScript module side effects are forbidden.** Importing any module —
  a barrel, a component, a foundation file — must not run code that touches
  `document`, `window`, `localStorage`, or registers anything globally at
  import time. All such work lives inside component lifecycle hooks
  (`onMounted`/`onBeforeUnmount`) or composable setup. This is what keeps the
  facade tree-shakeable: a consumer importing `Button` alone must not pull a
  dialog's focus trap in through a shared side-effecting chunk.

## The checks, and why each exists

The rules above are enforced by two readers, and the split is deliberate: one
reads the specifier a file wrote, the other resolves it and judges what it
landed on. Neither subsumes the other, and the section after this one records
exactly which invariant each owns.

### `tools/check-architecture.ts` — the specifier text

Runs in `pnpm lint` and in its own CI step. Seven rules, matched against the
`.ts`/`.vue` source under each package's `src/`, comments stripped:

1. **Moon `deps:` == `package.json` workspace deps.** Makes `--affected`
   honest; a component that imports `chip` must declare it, or a `chip`
   change will not re-test it.
2. **No component → facade imports.** The publishing boundary, including the
   facade's subpaths (`@ecoma-io/loom/theme`, `@ecoma-io/loom/a11y`) and
   backtick template-literal dynamic imports. Already described above.
3. **`e2e/` specs ⇒ `e2e`-tagged Moon project.** An orphan spec runs in
   nobody's graph.
4. **Every component directory is a Moon project.** No project stub, no
   `exports`, no graph entry.
5. **Layer direction.** An upward edge (component → higher layer) fails with
   the exact forbidden edge named.
6. **Cycle detection.** A DFS over the internal edge set; each cycle is
   reported.
7. **Imported deps are declared.** An internal spec a package's src imports
   must appear in its `package.json`, so Moon's `--affected` mirrors the edge.

The rules read `.ts`/`.vue` source with comments stripped, so a doc comment
that _shows_ a consumer how to import (`core/src/theme.ts`'s `@example` does)
is documentation, not an edge.

The checks are asserted, not advisory, and they are themselves tested — the
suite that exercises them proves a valid graph passes and each forbidden
edge fails.

### `archkeep check` — the resolved import

[Archkeep](https://github.com/ecoma-io/archkeep) (Lattice until its 0.13
release, renamed without changing a verdict) is an architecture-governance
engine that reads the Moon project graph, resolves every specifier through
`tsconfig.base.json` with TypeScript's own resolver, and judges the **resolved
target** against a constraint table. Loom runs it in `pnpm lint` and as its own
CI step, and the table lives in `module-boundaries.config.mjs` at the root —
one row per layer, each naming the layers it may import, which is the same
sentence the rank comparison above implements.

Why a second reader at all, when the layer order was already enforced? Because
`check-architecture.ts` is a regular expression over specifier text, and it says
so. That is exact for the spellings it was written for and blind to every other
one. Archkeep resolves instead of matching, so it reaches:

- **a relative path that climbs out of a package** — `check-architecture.ts`
  walks `src/` only, so a package's own `tests/` could reach across a boundary
  unseen. Thirteen test files were doing exactly that, reaching
  `packages/core/src/testing/attach-to-body` through four `../` segments; the
  helper now has a declared entry point (`@ecoma-io/loom-core/testing`).
- **the documentation site**, which no Loom check looked at. Every one of the
  86 demos imported a private component package (`@ecoma-io/loom-button`)
  rather than the published facade, and `Demo.vue` prints a demo's own source
  under each example — so the site's copy-paste sample named a package that is
  `private: true` and resolves to nothing on a consumer's machine. The demos
  import `@ecoma-io/loom` now, which is what the VitePress alias comment always
  said they did.
- **files no project owned.** `playwright/` — the component E2E harness and the
  browser-profile matrix both Playwright configs read — was in no Moon project,
  so `moon ci` never linted it and Archkeep skipped it silently. It is a Moon
  project now, and Archkeep names every remaining unowned file on each run;
  the ten this repository keeps (the root single-file configs, the agent-host
  hooks, the Semgrep fixtures) are recorded as accepted coverage holes in the
  table's `coverage.unowned` rather than left invisible.
- **an alias, a barrel re-export, a dynamic `import()`, a self-import through a
  package's own name, and a `paths` entry that has stopped resolving** — each
  pinned by the mutation suite below.

The constraint table also carries three accepted violations, each with the
argument for accepting it written into the row. Two are `tools/` and the
harness reaching sibling directories that are Moon projects but not npm
packages — there is no published name to import instead. The third is a
different shape: the conformance route's four case-file imports draw a
relative-spelling verdict whose edge the `layer-e2e` row states (compositions,
and nothing beneath them), so the suppression accepts the spelling only —
the row is where the edge is argued. A suppression removes
a verdict and never a check: the file is still fully analyzed, and Archkeep
refuses the run outright if a suppression stops covering anything.

### Proving the gate can fail

`pnpm archkeep:mutations` (`tools/check-archkeep-mutations.ts`) breaks the
architecture every way its rows name against the real tree — an upward import, a cycle, a
relative climb, a barrel re-export, a lazy `import()`, an aliased reach past an
entry point, a project that loses its tag, a `paths` alias left dangling — runs
`archkeep check` after each, asserts the violation that mutation was written to
produce, and restores every file byte for byte. It runs unconditionally in CI.

A constraint row whose tag no project carries selects nothing and approves
everything while reading as enforced, and `module-boundaries.config.mjs` is a
file a pull request can edit. This is the gate on the gate.

### What Archkeep does not see, and why both checks stay

Three invariants stay out of Archkeep's reach — two pinned by mutation rows
that expect it to report nothing, one by a row that expects the wrong rule —
and they are the reason `check-architecture.ts` is still wired into
`pnpm lint`:

| Invariant                                                           | Archkeep's answer                                                                                                                                                                                                                                                                    | Who enforces it                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| A component importing a facade **subpath** (`@ecoma-io/loom/theme`) | resolves the alias to `packages/core/src/theme.ts` and judges `primitives → core`, which is allowed. The subpath is the public surface; the file it lands on is not.                                                                                                                 | `check-architecture.ts` check 2                                                        |
| A JavaScript import of `theme-core`                                 | the package exports only stylesheets and has no `paths` entry, so the specifier is classified as an undeclared npm package rather than as the token package                                                                                                                          | `check-architecture.ts` check 5                                                        |
| A violation in a file no Moon project owns                          | analyzed by nothing and covered by no verdict. Since [archkeep#263](https://github.com/ecoma-io/archkeep/issues/263) the run names every such file, and this repository records the ten it keeps as accepted coverage holes — but recording a hole does not judge the file inside it | `check-architecture.ts` reads `packages/**/src` only; root files have no second reader |

Two blind spots the migration to Archkeep 0.14 closed, kept here because the
mutation rows that pinned them are gone and the history is worth one sentence
each: a `paths` alias onto a `.vue` file was judged as an external npm import
([archkeep#264](https://github.com/ecoma-io/archkeep/issues/264)), and a
hand-declared `moon.yml` `deps:` edge was never judged at all
([archkeep#262](https://github.com/ecoma-io/archkeep/issues/262)) — Archkeep
judges both now, and the `layer-tooling` row states the two reaches that
visibility turned up instead of suppressing them.

`tsconfig.base.json` exists at that name because Archkeep's Moon provider reads
`tsConfig` from a chain of exactly two names — `tsconfig.base.json`, then
`tsconfig.json` — and a Moon workspace still has no way to name any other file
([archkeep#266](https://github.com/ecoma-io/archkeep/issues/266), closed by the
chain).

## Deciding where new code belongs

A component is either a primitive, a composition, a layout, or a block. The
test is "what kind of thing is this":

- A single generic control a product would reach for as-is → **primitive**.
- A layout-intent container (arranges children, has no domain meaning) →
  **composition**.
- A responsive application shell → **layout**.
- A composition of Loom parts into a recognisable UI arrangement → **block**.

Shared non-visual logic that no component owns (utilities, the label seam,
the WCAG tag set, theme) lives in the foundation packages — `core` for
anything dependency-free, `labels` for the localisation/field-context
system. Before writing a shared helper, check `packages/core/src/index.ts`
and `packages/labels/src/index.ts`; graduate it there rather than
duplicating it beside a component.

Rules that do not bend:

- **No internal package may import the facade.** Depend on the concrete
  internal package that owns what you need.
- **No upward edges.** A block never imports a primitive's "higher"
  counterpart; the layers are the dependency order.
- **No JS module side effects.** CSS is the only declared side effect.
- **No new public subpackages.** If an overwhelming reason to publish a
  component independently ever appears, document that reason here and in the
  PR that introduces it — it is an architecture decision, not an incident.
