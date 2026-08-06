---
name: add-component
description: Add a primitive or a block to Loom — the five artifacts every component needs, in the order that keeps each one honest. Use when adding, renaming or removing anything under src/primitives/ or src/blocks/.
---

# Adding a component

`pnpm lint` fails until a component has all five of its artifacts, so this is the order
that gets there without a half-landed component in between.

## 0. Decide it belongs here at all

**Loom holds what is generic** — an affordance more than one product would reach for the
same way. One product's need belongs in that product. `CONTRIBUTING.md` states this rule
first because it settles most of these questions before any code is written.

Then pick the tier, which decides two directory names and nothing else:

- **Primitive** (`src/primitives/`, documented in `docs/components/`) — a control that is
  _configured_. It owns its own markup and behaviour.
- **Block** (`src/blocks/`, documented in `docs/blocks/`) — a composition that is
  _assembled_ from primitives. If you write it by importing three primitives, it is a
  block, however small.

## 1. Read a sibling first

Do not start from a blank file. Open the closest existing component in the same tier and
match it — `Badge` for a presentational primitive, `Checkbox` for one wrapping a reka-ui
control, `EmptyState` for a block. Conventions worth having in front of you:

- `src/lib/cn.ts` — every component routes its `class` through `cn()`, which is what lets
  a consumer override a utility without reaching for `!important`.
- `src/lib/props.ts` — `optional()`, and its docblock is required reading before you
  forward any optional prop into reka-ui. Coercing an absent `modelValue` to `false` turns
  an uncontrolled control into a permanently-off one, with no error and no warning.
- `class-variance-authority`, with `satisfies Record<<Name>Variant, string>` on the
  variant map. The `satisfies` is what turns a variant added to the type and forgotten in
  the map into a compile error.
- Styling reads tokens (`bg-primary`, `duration-fast`), never raw values. If the token you
  need does not exist, add it to `src/styles/theme.css` first — that is the source of
  truth the documentation tables are generated from.

## 2. Write the five artifacts

For `<Name>` in tier `<tier>` (`primitives` or `blocks`), `<name>` being its kebab-case form:

1. `src/<tier>/<Name>/<Name>.vue` — the component.
2. `src/<tier>/<Name>/<Name>.test.ts` — unit tier: every project-internal collaborator is
   stubbed, third-party libraries are not. `CONTRIBUTING.md` has the tier table.
3. `src/<tier>/<Name>/<Name>Demo.vue` — the demo the documentation page mounts. It is real
   source a reader will copy, so show the states that matter rather than one happy path.
4. `docs/<components|blocks>/<name>.md` — the page, ending in an `<!-- @api <Name> -->`
   marker. The signature table under that marker is generated from the SFC's own
   `defineProps`, slots and emits, so **never hand-write a prop table**. The marker
   resolves by component name across `src/`, so there is no path to keep in sync and a
   typo is a build error rather than a silently empty table.
5. `src/index.ts` — the export. A component that is not exported compiles, passes its own
   tests, and is unreachable.

The page's `<script setup>` imports the component from `@ecoma-io/loom` and the demo from
its relative path, plus a `?raw` copy for the `<Demo>` source panel. Copy the shape from
`docs/components/badge.md`.

## 3. Accessibility is part of the component, not a follow-up

The bar itself is in `CONTRIBUTING.md`. What it means while the file is still open:

- The keyboard path is designed now, not retrofitted. A group of related controls is one
  Tab stop with roving focus, not N Tab stops.
- Focus returns to the trigger when anything overlaid closes.
- No state is carried by colour alone.
- Motion collapses under `prefers-reduced-motion`. The global rule is in
  `src/styles/global.css`; a component that animates outside a CSS transition — `Skeleton`
  is the worked example — has to answer for itself.

`e2e/accessibility.e2e.ts` sweeps every documentation page with `axe` and carries **no
excludes**, so a new page that turns it red is a component to fix. Read the comment where
the old exclusions used to be before you consider adding one.

## 4. Run the gate

```bash
pnpm lint        # includes tools/check-component-artifacts.ts, which names any missing artifact
pnpm typecheck
pnpm test
pnpm docs:build
pnpm e2e
```

`pnpm e2e` builds the site and drives it in Chromium, Firefox and WebKit. It is the only
place a runtime-only regression can surface, and some of its checks are meaningful only
outside Chromium — see the root `CLAUDE.md`.

## Renaming or removing one

The artifact check reads the directory listing, so it will name most of what you missed.
Two things it cannot see:

- `src/index.ts` is matched on the **import path**, so a renamed directory with a stale
  export path fails the check — but a renamed _identifier_ does not. That one is a
  breaking change for consumers and needs a `BREAKING CHANGE:` footer.
- Nothing checks inbound links. Grep `docs/` for the old page name before deleting it.
