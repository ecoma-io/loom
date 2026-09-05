# Loom Workspace settings template

A workspace settings page: a native `<form>` wrapping a `FormLayout`, two
`FormSection` fieldsets (`Field`-wrapped `TextField`s and a `Select`, plus a
`Switch` row labelled through `aria-labelledby`), and `FormActions` pairing a
real reset with a submit whose handler is the marked swap point for your API
call. It consumes the published `@ecoma-io/loom` package exactly as an
external consumer would. Where [analytics](../analytics/) is the data-surface
page a product builds first, this is the form-surface half — one page, ready
to take into your application and wire to your API.

## Run it

From the repository root:

```bash
pnpm install
pnpm exec moon run workspace-settings:build
```

For the dev server, from this directory — the same script a copied template
runs:

```bash
pnpm dev
```

## What it demonstrates

- **A native form, not a fetch-on-click** — Save renders inside the
  `<form>`, so submission is the platform's own path; `@submit.prevent`
  keeps the page from reloading, and the handler above `save()` is where
  your API call goes.
- **Fieldsets that mean it** — each `FormSection` renders a real
  `<fieldset>` with a `<legend>`, so grouping and `disabled` propagation
  behave the way the platform teaches rather than as styled divs.
- **Labels that cannot fall out of sync** — every text and select control is
  named through its visible `Field` label, and the `Switch` row through the
  visible span via `aria-labelledby`; no control carries a duplicated
  `aria-label` to drift away from what is rendered.
- **The accessibility bar** — one `h1` (the `PageHeader`), a landmark
  `<main>`, keyboard operation end to end, and both themes working through
  token references — the same gates the repository's template browser suite
  runs on this page.

## What is deliberately not here

The template owns one page. Sidebar navigation, breadcrumbs, a header with a
theme toggle, routing between pages, auth and a backend are application
territory — your application provides them, and this page is where it starts.
There is no save confirmation either: what "saved" means is your backend's
answer, not the template's. If you came looking for a demonstration to read
rather than a page to take, that is the Showcase's job.

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

Then replace the page's fixtures: `src/App.vue` holds the initial field
values in one file so the whole story reads in one place — the comment above
`save()` marks where your API call goes, and `resetForm()` restores the
initial values.
