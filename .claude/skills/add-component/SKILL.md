---
name: add-component
description: Add a component to Loom — the five artifacts every component needs, in the order that keeps each one honest. Use when adding, renaming or removing anything under packages/primitives/, packages/composition/, packages/blocks/, packages/layouts/ (or the legacy src/ tree during migration).
---

# Adding a component

`pnpm lint` fails until a component has all five of its artifacts, so this is the order
that gets there without a half-landed component in between.

## 0. Decide it belongs here at all

**Loom holds what is generic** — an affordance more than one product would reach for the
same way. One product's need belongs in that product. `CONTRIBUTING.md` states this rule
first because it settles most of these questions before any code is written.

Then pick the tier, which decides two directory names and nothing else:

- **Primitive** (`packages/primitives/`, documented in `docs/components/`) — a control that is
  _configured_. It owns its own markup and behaviour.
- **Composition** (`packages/composition/`, documented in `docs/composition/`) — a layout
  primitive that answers "how are things arranged?" rather than "what does it look like?"
  or "what does it mean?"
- **Block** (`packages/blocks/`, documented in `docs/blocks/`) — a composition that is
  _assembled_ from primitives. If you write it by importing three primitives, it is a
  block, however small.
- **Layout** (`packages/layouts/`, documented in `docs/layouts/`) — a ready-made responsive
  application shell that composes composition primitives into a full-screen arrangement.

## 1. Read a sibling first

Do not start from a blank file. Open the closest existing component in the same tier and
match it — `Badge` for a presentational primitive, `Checkbox` for one wrapping a reka-ui
control, `EmptyState` for a block, `Stack` for a composition, `Dashboard` for a layout.
Conventions worth having in front of you:

- `@ecoma-io/loom-core` — every component routes its `class` through `cn()`, which is what
  lets a consumer override a utility without reaching for `!important`.
- `@ecoma-io/loom-core` — `optional()`, and its docblock is required reading before you
  forward any optional prop into reka-ui. Coercing an absent `modelValue` to `false` turns
  an uncontrolled control into a permanently-off one, with no error and no warning.
- `class-variance-authority`, with `satisfies Record<<Name>Variant, string>` on the
  variant map. The `satisfies` is what turns a variant added to the type and forgotten in
  the map into a compile error.
- Styling reads tokens (`bg-primary`, `duration-fast`), never raw values. If the token you
  need does not exist, add it to `packages/theme-core/src/theme.css` first — that is the
  source of truth the documentation tables are generated from.

## 2. Write the five artifacts

For `<Name>` in tier `<tier>` (`primitives`, `composition`, `blocks`, or `layouts`),
`<name>` being its kebab-case form:

1. **The component** — `packages/<tier>/<name>/src/<Name>.vue`

2. **The barrel** — `packages/<tier>/<name>/src/index.ts`, re-exporting the component and
   its types:

   ```ts
   export { default } from "./<Name>.vue";
   export type { <Name>Variant } from "./<Name>.vue";
   ```

3. **The test** — `packages/<tier>/<name>/tests/<Name>.test.ts` — unit tier: every
   project-internal collaborator is stubbed, third-party libraries are not.
   `CONTRIBUTING.md` has the tier table.

4. **The docs page** — `docs/<doctier>/<name>.md`, ending in an `<!-- @api <Name> -->`
   marker. The signature table under that marker is generated from the SFC's own
   `defineProps`, slots and emits, so **never hand-write a prop table**. The marker
   resolves by component name across the source tree, so there is no path to keep in
   sync and a typo is a build error rather than a silently empty table.

5. **The facade export** — `packages/loom/src/index.ts`, adding the re-export:
   ```ts
   export { default as <Name> } from "@ecoma-io/loom-<name>";
   export type { <Name>Variant } from "@ecoma-io/loom-<name>";
   ```

### Supporting files for a new component package

Each component is a Moon project. These three files are needed:

- `packages/<tier>/<name>/package.json` — private workspace package:

  ```json
  {
    "name": "@ecoma-io/loom-<name>",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "exports": {
      ".": {
        "types": "./src/index.ts",
        "default": "./src/index.ts"
      }
    },
    "dependencies": {
      "@ecoma-io/loom-core": "workspace:*"
    },
    "peerDependencies": {
      "vue": "^3.5.0"
    }
  }
  ```

  Add `@ecoma-io/loom-labels` to `dependencies` if the component uses labels, and
  `reka-ui` to `peerDependencies` if it wraps a reka-ui primitive.

- `packages/<tier>/<name>/moon.yml` — Moon project definition:

  ```yaml
  project:
    name: "<name>"
    description: "<Name> <tier> — <one-line summary>"
  tasks:
    # Inherit lint and test from .moon/tasks/*.yml.
  ```

  If the component's package.json lists any `@ecoma-io/loom-*` workspace
  dependencies, mirror them into the moon `deps:` block — the cross-component
  affected graph is driven by those edges, so a change to a dependency must mark
  this component's tests and (if it owns them) browser specs affected too. The
  mechanical sync for already-landed components is `node
tools/sync-moon-deps.ts --fix`; hand-add a `# preserved` line for an edge
  `package.json` cannot express (theme-core is the canonical one). If the
  component has interactive behaviour that only a browser can prove, add
  `tags: [e2e]` — that opts it into the shared e2e task, which runs through the
  lightweight harness, not VitePress.

- Add the path alias in `tsconfig.json` under `paths`:

  ```json
  "@ecoma-io/loom-<name>": ["./packages/<tier>/<name>/src/index.ts"]
  ```

- Add the Vite alias in `vite.config.ts` under `resolve.alias`:
  ```ts
  "@ecoma-io/loom-<name>": pkg("<tier>/<name>/src/index.ts"),
  ```

The page's `<script setup>` imports the component from `@ecoma-io/loom` and the demo
from its relative path, plus a `?raw` copy for the `<Demo>` source panel. Copy the
shape from `docs/components/badge.md`.

## 3. Accessibility is part of the component, not a follow-up

The bar itself is in `CONTRIBUTING.md`. What it means while the file is still open:

- The keyboard path is designed now, not retrofitted. A group of related controls is one
  Tab stop with roving focus, not N Tab stops.
- Focus returns to the trigger when anything overlaid closes.
- No state is carried by colour alone.
- Motion collapses under `prefers-reduced-motion`. The global rule is in
  `packages/theme-core/src/global.css`; a component that animates outside a CSS
  transition — `Skeleton` is the worked example — has to answer for itself.

`e2e/accessibility.e2e.ts` sweeps every documentation page with `axe` and carries **no
excludes**, so a new page that turns it red is a component to fix. Read the comment where
the old exclusions used to be before you consider adding one.

## 4. Run the gate

```bash
pnpm lint        # includes tools/check-component-artifacts.ts AND tools/check-architecture.ts
pnpm typecheck
pnpm docs:build
MOON_BASE=<base> pnpm exec moon run \
  $(MOON_BASE=<base> pnpm exec moon query projects --affected --downstream deep \
    | jq -r '[.projects[].id + ":test"] | join(" ")')
                 # your project's tests plus its dependents' — moon's own
                 # closure query fed back as targets, the same command CI runs
```

For interactive behaviour that owns browser evidence, the affected e2e is the
same shape:

```bash
pnpm exec moon :e2e --affected    # your component's specs, through the harness
```

`check-architecture.ts` in `pnpm lint` keeps three things mechanically true that
the five-artifact check cannot see: the moon `deps:` blocks equal the
package.json workspace deps, no `@ecoma-io/loom` facade import appears inside
`packages/*/src` (the one documented exception is `packages/labels`, type-only),
and every `packages/**/e2e/*.e2e.ts` lives in a project tagged `e2e`. A component
that imports a sibling needs its moon `deps:` edge first or that gate — and the
affected graph — will be wrong.

The full browser suite (`pnpm e2e`, the built docs site in Chromium, Firefox and
WebKit) is worth running before a risky merge, but the affected harness is the
fast loop: a component change proves its own spec in seconds without a
`docs:build`.

## Renaming or removing one

The artifact check reads the directory listing, so it will name most of what you missed.
Two things it cannot see:

- The export barrel (`src/index.ts` or `packages/loom/src/index.ts`) is matched on the
  **import path** (legacy) or the **package specifier** (modern), so a renamed directory
  with a stale export path fails the check — but a renamed _identifier_ does not. That
  one is a breaking change for consumers and needs a `BREAKING CHANGE:` footer.
- Nothing checks inbound links. Grep `docs/` for the old page name before deleting it.
