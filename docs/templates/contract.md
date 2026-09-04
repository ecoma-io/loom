# Template contract

An Official Template is a runnable application consuming the public
`@ecoma-io/loom` package exactly as an external consumer would. The [landing
page](/templates/) states the quality bar in prose; this page states it as
law — the file set, the commands and the boundaries a template pull request is
held to, asserted by the repository's gates rather than by a reviewer's
memory.

## Why a contract

A template that is missing its entrypoint, its build or its README is silent
in every other gate — nothing in a normal build has an opinion about a file
that was never written, and "runnable" that no command can run is only a
claim. The contract exists so that what a template promises is what the tree
can prove. Two mechanisms carry it:

- [`tools/check-template-artifacts.ts`](https://github.com/ecoma-io/loom/blob/main/tools/check-template-artifacts.ts) —
  asserts the file set, the manifest shape and the hand-declared Moon edge for
  every directory under `templates/`, inside `pnpm lint`.
- the `layer-templates` row of the module-boundary table — judges every
  import a template makes against its resolved target, so an import a
  consumer cannot write reddens as `onlyTagsConstraintViolation` on `pnpm
lint`.

## The file set

Every directory under `templates/` carries all of these, or `pnpm lint` fails
naming each missing file:

| File             | What it is                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`   | The consumer manifest. `private: true`; named `@ecoma-io/loom-template-<name>`; declares `@ecoma-io/loom` as `"workspace:*"` while it lives here. |
| `moon.yml`       | `tags: ["layer-templates"]`, a `build` task, and the hand-declared `deps: ["loom"]` edge.                                                         |
| `index.html`     | The entry page.                                                                                                                                   |
| `vite.config.ts` | Dev/build wiring. In-repo it aliases the published specifiers to source; a copied template deletes the alias block.                               |
| `src/main.ts`    | The application entry.                                                                                                                            |
| `src/App.vue`    | The root composition.                                                                                                                             |
| `src/styles.css` | One `@import` of the published stylesheet entry.                                                                                                  |
| `README.md`      | What the template is, how to run it, what to change first.                                                                                        |

The gate also asserts the manifest shape — `private`, the
`@ecoma-io/loom-template-<name>` spelling, the declared dependency on the
published package — because those are the facts "consumer, not fork" rests on,
and no other gate reads a template's manifest.

## Public package consumption

A template imports the published specifiers and nothing else:

```ts
import { AppShell, Button, Card, Stack, useTheme } from "@ecoma-io/loom";
```

No `packages/*/src` imports, no internal `@ecoma-io/loom-*` package
specifiers, no aliases past the public surface. Inside the repository the
published specifiers resolve to source — `vite.config.ts` aliases them there,
the way the docs site and the E2E harness already resolve the library — and
the alias map deliberately names **only** the published specifiers, so an
internal import fails to resolve and fails the build in the template itself.

One spelling is chosen over another for a reason the resolution table can
see: `useTheme` is imported from the root specifier even though the `/theme`
subpath is published too, because in-tree the subpath's alias lands on the
core package — a project the `layer-templates` row does not name — and the
row judges the resolved project, not the specifier a consumer writes. An
external consumer hits none of this: both spellings resolve into the
installed package.

## Commands

| Command                    | What it proves                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `moon run starter:build`   | The template builds as an application (Vite build).                                                             |
| `moon run <template>:lint` | The template's sources pass ESLint.                                                                             |
| `pnpm typecheck`           | `templates/**/*` is in the root `tsconfig.json` include, so the root program type-checks every template source. |
| `moon run <template>:test` | Reserved: the shared test task runs with `--passWithNoTests` until the E2E leg lands (see below).               |

## Theme, responsive, accessibility

- **Both themes** work: the starter toggles with `useTheme`, which manages
  the `data-theme` attribute the tokens read.
- **Responsive** is composed, not written: the `AppShell` layout collapses
  intrinsically when the content cannot hold its half of the container — no
  media query in the template's own CSS.
- **The accessibility bar is the library's bar.** Every interactive element
  has an accessible name, the page is operable by keyboard alone with focus
  visible, and no state is conveyed by colour alone.
- Browser-level evidence (axe over the rendered app, keyboard walk, responsive
  sweep) arrives with the template quality-gate PR; the contract states the
  bar now, the gate enforces it then.

## Adding a template

1. Create `templates/<kebab-name>/` with the full file set above.
2. Register nothing: `templates/*` is already a Moon project glob and a pnpm
   workspace glob, so the template is discovered from the tree. (Exception:
   `docs/templates/<name>.md` when the template earns its own page.)
3. Run `pnpm install` — the new manifest needs its lockfile importer, and CI
   installs with `--frozen-lockfile`.
4. Run `pnpm lint` — the artifact gate names anything missing, and archkeep
   judges every import.
5. Run `moon run <name>:build` — the template must build as an application.
6. Open the PR against the issue naming the template; the contract page is
   the review bar.

## Status

Enforced today: the file set, manifest shape and Moon edge (the artifact
gate), the import boundary (the `layer-templates` row, with a mutation row
proving the verdict fires), the build (the Moon `build` task, `runInCI:
affected`), and type-checking (the root `tsconfig.json` include).

Coming with the quality-gate PR: browser-level evidence — axe over the
rendered app, a keyboard walk and a responsive sweep, the same bar the
library's own components are held to. The contract states the bar now so the
gate lands into an existing promise rather than inventing one.
