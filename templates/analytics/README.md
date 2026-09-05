# Loom Analytics template

An analytics page: `PageHeader`, four `MetricCard`s derived from the same rows
the `DataGrid` shows, a sortable and filterable customer grid whose ordering
the host computes, and the `LoadingState` / `EmptyState` pairing around a
filter that matches nothing. It consumes the published `@ecoma-io/loom`
package exactly as an external consumer would. Where the
[starter](../starter/) proves the contract is buildable, this template is the
composition a data-heavy product builds first — one page, ready to take into
your application and wire to your API.

## Run it

From the repository root:

```bash
pnpm install
pnpm exec moon run analytics:build
```

For the dev server, from this directory — the same script a copied template
runs:

```bash
pnpm dev
```

## What it demonstrates

- **Metric cards and the grid share one source of truth** — the four
  `MetricCard`s derive from the same fixture the `DataGrid` renders, and one
  `loading` flag drives the skeletons on both, so they resolve together.
- **A sortable, filterable grid the host owns** — `DataGrid` cycles and emits
  sort state but never reorders rows; the sorting and the status filter are
  computed here, where your API call will live.
- **The empty-state pairing** — `DataGrid` has no empty-state slot by design;
  when the filter matches nothing the grid makes way for an `EmptyState`, and
  the filter's undo lives in its action.
- **The accessibility bar** — every control named through its visible label
  (`Field`), one `h1` (the `PageHeader`), a landmark `<main>`, keyboard
  operation end to end, and both themes working through token references —
  the same gates the repository's template browser suite runs on this page.

## What is deliberately not here

The template owns one page. Sidebar navigation, breadcrumbs, a header with a
theme toggle, routing between pages, auth and a backend are application
territory — your application provides them, and this page is where it starts.
If you came looking for a demonstration to read rather than a page to take,
that is the Showcase's job.

## What to change first

A copied template lives inside your project, and the same three pieces as the
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

Then replace the page's fixtures: `src/App.vue` holds the customer rows and
the mock `load()` timeout in one file so the whole story reads in one place —
the comment above `load()` marks where your API call goes.
