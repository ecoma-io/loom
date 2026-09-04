# Loom starter

The minimal Official Template: a runnable Vue 3 + Vite + Tailwind v4
application that consumes the published `@ecoma-io/loom` package exactly as an
external consumer would. It exists to prove the Template Contract is buildable
— it is not the first production template, and it is deliberately small.

## Run it

From the repository root:

```bash
pnpm install
pnpm exec moon run starter:build
```

For the dev server, from this directory — the same script a copied template
runs:

```bash
pnpm dev
```

## What to change first

A copied template is a standalone project, and three pieces of this one exist
only to keep it running inside this repository:

1. **The dependency.** `package.json` carries
   `"@ecoma-io/loom": "workspace:*"`. Replace it with the released range
   (`pnpm add @ecoma-io/loom`) and run a fresh install.
2. `vite.config.ts` **carries an alias block** resolving the published
   specifiers to the library's source. Delete it — a real project resolves the
   package from `node_modules`, which is the fidelity the aliases substitute
   for.
3. `src/styles.css` **carries an extra `@source` rule** registering the
   library's source tree with Tailwind. Delete it for the same reason: against
   the published package, `global.css`'s own `@source "../"` scans the built
   output, which is all a real project needs.

Everything else is the contract's file set, which
`tools/check-template-artifacts.ts` asserts for every directory under
`templates/`.
