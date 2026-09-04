# Loom SaaS shell

The first production Official Template: a runnable SaaS application shell —
sidebar navigation, a dashboard with metric cards and a sortable, filterable
customer table, and a settings form — consuming the published `@ecoma-io/loom`
package exactly as an external consumer would. Where the [starter](../starter/)
proves the contract is buildable, this template shows the composition a real
product copies: `AppShell` + `SidebarNav` + `PageHeader` around a two-page app,
with the loading / empty / sorted-table wiring around `DataGrid` that every
data surface needs.

## Run it

From the repository root:

```bash
pnpm install
pnpm exec moon run saas-shell:build
```

For the dev server, from this directory — the same script a copied template
runs:

```bash
pnpm dev
```

## What it demonstrates

- **The shell** — `AppShell` (`#sidebar` / `#header` / default) holding a
  `SidebarNav` whose items drive client-side page switching, a `Breadcrumb`
  and the theme toggle in the header. Both navigation landmarks carry
  explicit names (`sidebar-aria-label`, `aria-label`) so they never merge.
- **The dashboard** — four `MetricCard`s derived from the same rows the
  `DataGrid` shows (one `loading` flag drives the skeletons on both), a
  sortable grid whose ordering the host computes (`DataGrid` emits sort state
  and never reorders rows), and the `DataGrid` + `EmptyState` pairing for a
  filter that matches nothing — the grid has no empty-state slot by design.
- **The settings form** — `FormLayout` inside a native `<form>`, `FormSection`
  fieldsets with `Field`-wrapped controls (labels and hint/error wiring arrive
  through the Field, none of it repeated on the controls), a `Switch` row
  labelled by `aria-labelledby`, and `FormActions` with native form
  submission.
- **Accessibility** — `SkipLink` first in the DOM pointing at the `#main`
  destination (`tabindex="-1"`), one `h1` per page (the `PageHeader`s), an
  operable-by-keyboard nav, and both themes working through `useTheme`.

## What to change first

A copied template is a standalone project, and the same three pieces as the
starter exist only to keep it running inside this repository:

1. **The dependency.** `package.json` carries
   `"@ecoma-io/loom": "workspace:*"`. Replace it with the released range
   (`pnpm add @ecoma-io/loom`) and run a fresh install.
2. `vite.config.ts` **carries an alias block** resolving the published
   specifiers to the library's source. Delete it — a real project resolves the
   package from `node_modules`.
3. `src/styles.css` **carries an extra `@source` rule** registering the
   library's source tree with Tailwind. Delete it against the published
   package for the same reason as the starter.

Then replace the template's own fixtures: `src/App.vue` holds the customer
rows, the mock `load()` timeout and the two pages in one file so the whole
story reads in one place — split it into route components as your app grows.
