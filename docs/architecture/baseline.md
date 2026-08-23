# Loom Architecture Baseline

This document records the repository state before the Moonrepo monorepo migration,
establishing the ground truth the migration must preserve.

## Repository Shape

Single-package repository. `pnpm-workspace.yaml` exists but has **no `packages:` key** —
it holds only pnpm settings (`allowBuilds`, `overrides`). No `.moon/` directory or
`moon.yml` exists yet.

```
loom/
├── src/
│   ├── primitives/       54 components — generic controls
│   ├── composition/       8 components — layout intent primitives
│   ├── blocks/           14 components — composed arrangements
│   ├── layouts/           8 components — responsive application shells
│   ├── lib/              12 internal modules (cn, props, labels, etc.)
│   ├── styles/            5 files (theme.css, global.css, fonts, + contrast test)
│   ├── a11y.ts            WCAG_TAGS narrow entry
│   └── index.ts           complete public surface
├── docs/                  VitePress documentation site
│   ├── .vitepress/        config, theme, plugins
│   ├── components/       54 pages (one per primitive)
│   ├── composition/       8 pages
│   ├── blocks/           14 pages
│   ├── layouts/           8 pages
│   ├── foundations/      12 pages
│   └── patterns/          1 page
├── e2e/                  10 Playwright test files
├── tools/                 2 scripts (check-component-artifacts, stage-docs)
├── .github/              CI workflows, Semgrep rules, issue/PR templates
└── .claude/              hooks, skills (add-component), settings
```

**Total components: 84** (54 primitives + 8 composition + 14 blocks + 8 layouts)

## Baseline CI Metrics (measured 2025-08-15)

| Metric                      | Time   |
| --------------------------- | ------ |
| `pnpm install` (cached)     | ~1.4s  |
| `pnpm build`                | ~6.4s  |
| `pnpm lint`                 | ~2.6s  |
| `pnpm typecheck`            | ~10.4s |
| `pnpm test` (with coverage) | ~3m25s |
| `pnpm docs:build`           | ~16.6s |

CI e2e: 3 browsers × 8 shards = 24 legs (PR), 1 browser × 8 shards = 8 legs (merge queue).

## Public API Surface

### `@ecoma-io/loom` (main entry — `src/index.ts`)

Exports:

- **Utilities**: `cn`, `applyLoomIconDefaults`
- **Theme**: `useTheme`, `themeScript`, `ThemePreference`, `ResolvedTheme`
- **Labels**: `provideLoomLabels`, `LabelOf`, `LabelOverrides`, `LoomLabelOverrides`, `LoomLabels`
- **Motion**: `listStaggerDelay`
- **Date labels**: `CALENDAR_PANEL_LABELS`, `DATE_SEGMENT_LABELS`, `RANGE_CELL_LABELS`, `TIME_SEGMENT_LABELS` + types
- **54 primitive components** + their variant maps and types
- **8 composition components** + types
- **8 layout components** + types
- **14 block components** + types

Two things deliberately not in the main entry:

1. **Styles** — imported as CSS: `@ecoma-io/loom/styles/global.css`, `@ecoma-io/loom/styles/theme.css`, `@ecoma-io/loom/styles/fonts.css`
2. **WCAG_TAGS** — in the narrow `@ecoma-io/loom/a11y` entry so non-Vue consumers can import it

### `@ecoma-io/loom/a11y`

Re-exports `WCAG_TAGS` from `src/lib/a11y-scope.ts`. Used by `e2e/accessibility.e2e.ts` and docs.

### `@ecoma-io/loom/theme`

Re-exports `useTheme`, `themeScript`, `ThemePreference`, `ResolvedTheme` from `src/lib/theme.ts`.

## Dependency Graph (Internal)

### `src/lib/` — Foundation layer

| Module              | Used by                             | Internal deps                            | External deps        |
| ------------------- | ----------------------------------- | ---------------------------------------- | -------------------- |
| `cn.ts`             | ~50 components                      | —                                        | clsx, tailwind-merge |
| `props.ts`          | labels, field-context, attrs        | —                                        | —                    |
| `attrs.ts`          | ~25 form/overlay primitives         | props.ts                                 | vue                  |
| `field-context`     | 18 form controls + Field/Fieldset   | props.ts                                 | vue                  |
| `ancestor-disabled` | 10 form controls                    | —                                        | vue                  |
| `labels.ts`         | ~20 labeled components              | props.ts, label-registry (type-only)     | vue                  |
| `label-registry`    | labels.ts (type-only circular)      | All label-bearing components (type-only) | —                    |
| `date-labels.ts`    | 5 date/time primitives              | @internationalized/date, labels.ts       | —                    |
| `count-labels.ts`   | TextField, Textarea                 | labels.ts                                | —                    |
| `motion.ts`         | 6 overlay/menu components           | —                                        | —                    |
| `theme.ts`          | consumers via @ecoma-io/loom/theme  | —                                        | vue                  |
| `icon-defaults.ts`  | consumers via applyLoomIconDefaults | —                                        | @lucide/vue          |

### Primitive → Primitive dependencies

| Consumer    | Depends on                         |
| ----------- | ---------------------------------- |
| AlertDialog | Button (buttonVariants)            |
| AvatarGroup | Avatar (types + component)         |
| Combobox    | Chip (component)                   |
| Editable    | Button (buttonVariants)            |
| Field       | InlineError (component)            |
| Fieldset    | InlineError (component)            |
| Pagination  | Button (buttonVariants)            |
| TagsInput   | Chip (component)                   |
| Toast       | ToastItem (internal sub-component) |

### Block → Primitive/Block dependencies

| Block           | Depends on                                                       |
| --------------- | ---------------------------------------------------------------- |
| DesktopAppShell | TitleBar (block), Menubar (type), WindowControls (type + labels) |
| FormSection     | Fieldset (component)                                             |
| LoadingState    | Spinner, Skeleton (components)                                   |
| SidebarNav      | Tooltip, Badge, Separator (components)                           |
| TitleBar        | Menubar, WindowControls (components + types)                     |
| ToastStack      | ToastItem (component + labels)                                   |

### Composition & Layout dependencies

All 8 compositions and all 8 layouts import **only `cn` from `lib/cn`**.
No composition imports another composition. No layout imports a primitive.

### External dependency usage

| Package                  | Components using it          |
| ------------------------ | ---------------------------- |
| reka-ui                  | 17 components + ToastStack   |
| @lucide/vue              | 23 components                |
| class-variance-authority | 16 components                |
| @internationalized/date  | 5 date/time + date-labels.ts |

### Dependency direction

```
lib ← primitives ← blocks
lib ← composition
lib ← layouts
```

The graph is **acyclic**. No upward dependencies exist. `label-registry.ts` has type-only
circular references with label-bearing components, but these are compile-time only.

## Test Inventory

### Unit tests: 104 files (24,871 lines)

Every component has at least `Name.test.ts`. Lib modules have co-located tests.
`docs/.vitepress/sidebar.test.ts` covers the sidebar ordering logic.

### Integration tests: 5 files (1,545 lines)

- `src/lib/labels.integration.test.ts`
- `src/primitives/Field/Field.integration.test.ts`
- `src/primitives/Fieldset/Fieldset.integration.test.ts`
- `src/primitives/Toast/Toast.integration.test.ts`
- `src/blocks/ToastStack/ToastStack.integration.test.ts`

### Contrast tests: 2 files (687 lines)

- `src/primitives/Button/Button.contrast.test.ts`
- `src/styles/theme.contrast.test.ts`

### E2E tests: 10 files (1,463 lines)

**Cross-cutting (span all pages):**

- `accessibility.e2e.ts` — axe-core per-page, both themes, zero excludes
- `contrast.e2e.ts` — WCAG 1.4.11 3:1 contrast, both themes
- `keyboard.e2e.ts` — Dialog focus trap, Tabs roving, radio/segmented arrows, `:focus-visible`, phone-width table focusability
- `target-size.e2e.ts` — WCAG 2.5.8 24×24px minimum per page

**Component-specific:**

- `drawer.e2e.ts` — swipe dismiss
- `menubar-keyboard.e2e.ts` — menubar keyboard navigation
- `stepper.e2e.ts` — stepper live region

**Feature-specific:**

- `focus-not-obscured.e2e.ts` — WCAG 2.4.11
- `layout-responsive.e2e.ts` — layout collapse/wrap at narrow/wide viewports

## Five-Artifact Contract

Every component must carry (enforced by `tools/check-component-artifacts.ts` in `pnpm lint`):

1. `src/<tier>/<Name>/<Name>.vue` — the component
2. `src/<tier>/<Name>/<Name>.test.ts` — unit tests
3. `src/<tier>/<Name>/<Name>Demo.vue` — demo for docs
4. `docs/<tier-section>/<name>.md` — docs page with `<!-- @api <Name> -->` marker
5. `src/index.ts` — export (matched by import path, not identifier)

## Documentation Architecture

### VitePress plugins (build-time generation)

1. **`component-api.ts`** — Expands `<!-- @api Name -->` markers. Indexes all `.vue` under `src/`, parses with `vue-docgen-api`, generates props/events/slots tables. Resolves by component name across `src/` — no path to sync. Typo = build error.

2. **`design-tokens.ts`** — Expands `<!-- @tokens group -->` markers. Parses `src/styles/theme.css`'s `@theme static { }` block. Renders color swatches, radius/shadow previews, text scale previews. Re-reads CSS on every expansion (no stale cache).

### Key invariant

Docs import components via `@ecoma-io/loom` alias (→ `src/index.ts`), not via relative
paths. Demos import directly from `src/<tier>/` with `?raw` for source display. The
alias ensures every code snippet on the site is copy-pasteable for a real consumer.

## Build Configuration

### Vite (library mode)

- Entry: `index.ts`, `a11y.ts`, `lib/theme.ts`
- Format: ES modules, preserveModules (one file per source module)
- Externals: vue, reka-ui, @lucide/vue, clsx, tailwind-merge, class-variance-authority
- No minification, sourcemaps on
- `copyStylesheets()` plugin copies `src/styles/` verbatim to `dist/styles/`

### Vitest

- jsdom environment, maxWorkers: 1 (deliberate — jsdom contention)
- Includes: `src/**/*.test.ts`, `docs/**/*.test.ts`
- Coverage: v8, enabled by default, thresholds 95L/93F/90B/94S
- Setup: pins fast-check seed to 42 in CI

### TypeScript

- Target ES2023, module ESNext, bundler resolution, strict
- `exactOptionalPropertyTypes` on (critical for `props.ts` / `field-context.ts`)
- Build config: declarations + declarationMap, emitDeclarationOnly, src/ only

## CI Architecture

### `ci.yml` (PR, merge queue, push to main)

- **verify**: lint + commitlint PR title + format check + typecheck + test + build + docs:check-route
- **e2e**: 3 browsers × 8 shards (PR), 1 browser × 8 shards (merge queue)
- **ci-gate**: single required check depending on verify + e2e
- Caching: ESLint per-entry (key: OS + node + lockfile + eslint config + sha), Playwright browsers per browser

### `release.yml` (push to main)

- Release Please opens release PRs
- On release_created: build, npm publish --provenance, attach artifacts to GitHub Release
- Verify-artifact: install from npm, audit signatures, check version
- Docs: calls `docs.yml` after verification

### `docs.yml` (workflow_call from release, or workflow_dispatch)

- Build docs, stage for Cloudflare, deploy via Wrangler
- Post-deploy reachability check (5 retries)

### `analysis.yml`

- CodeQL, Semgrep (custom rules + p/xss), OpenSSF Scorecard

## Release Please Configuration

- Single package at `.` — `@ecoma-io/loom`
- Release type: node, bump-minor-pre-major: true
- Scopeless PR titles (`chore: release ${version}`) — no `main` scope
- `.release-please-manifest.json`: `{ ".": "0.2.0" }`

## Constraints and Risks

1. **`exactOptionalPropertyTypes`** is not negotiable. `props.ts`, `field-context.ts`,
   `labels.ts` all depend on the distinction between "missing" and "undefined".
   Any migration path must preserve this TypeScript flag.

2. **The component-api plugin indexes `src/`** by walking the directory. Moving components
   to `packages/` will break the index unless the plugin is updated to search the new
   layout. The resolution is by component **name**, not path, so the plugin itself is
   agnostic to where the files live — it just needs to know where to look.

3. **The design-tokens plugin reads `src/styles/theme.css`** by hardcoded path. This
   becomes `packages/core/theme-core/` (or similar) and the path must be updated.

4. **Docs import demos via relative paths** from `src/`. When components move, every
   docs page's `<script setup>` imports need updating.

5. **`pnpm-workspace.yaml` currently has no `packages:` key**. Adding one makes this a
   workspace, which changes pnpm's hoisting and resolution behavior. The migration must
   account for this.

6. **The `@ecoma-io/loom` alias** in `docs/.vitepress/config.mts` currently points to
   `../../src/index.ts`. After migration it must point to the facade package.

7. **VitePress bundles its own Vite 5** while the library build uses Vite 8. This
   mismatch is handled with a type cast in `config.mts` and must not be disrupted.

8. **Coverage thresholds are set just under actual coverage** (measured: 96.65L / 94.94F /
   91.83B / 95.27S; thresholds: 95L / 93F / 90B / 94S). The gap is deliberate and
   small. Any migration that splits the test suite must ensure the per-package thresholds
   are at least as strict, or the gate becomes meaningless.
