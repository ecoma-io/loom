# Template contract

An Official Template is a copyable, prebuilt page UI consuming the public
`@ecoma-io/loom` package exactly as an external consumer would. It lives in
this repository as a minimal consumer-shaped Vite app — the vessel that proves
the page builds against the published package; the page is the artifact, and
the app scaffolding around it is what a consumer replaces with their own
application. The [landing page](/templates/) states the quality bar in prose;
this page states it as law — the file set, the canonical families, the commands
and the boundaries a template pull request is held to, asserted by the
repository's gates rather than by a reviewer's memory.

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

## What a template is not

The template stops where an application begins, and the line is the definition,
not a judgement call. A template owns one page. It carries no router and no
navigation between pages, no authentication, no backend, no database and no
business logic — fixture data with the swap points marked is as far as it goes.
Application chrome the consumer's own shell provides (skip links, brand bars,
breadcrumbs, a theme toggle, nav across pages) stays out unless it is the page's
own content. Nothing here ships an application: the consumer's application owns
routing, auth, data and deployment, and the template is the page they start it
from.

## Canonical families

A template family is a page surface — the shape of page a product starts from
and takes into its application. Every family is anchored by the canonical
application layout whose structure that surface is (the layout tier's nine
pages, DesktopAppShell included per
[ADR-001](../architecture/decisions/0001-reclassify-dashboardgrid-desktopappshell-titlebar.md)),
and a family is created only with its anchor — a shipped layout, or a layout
the architecture plan's canonical census names — never from a page someone
wanted to write.

| Family (page surface)  | Anchored by              | Member today                                                                                                                                                                                                                        |
| ---------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry                  | `AppShell`               | [Starter](https://github.com/ecoma-io/loom/blob/main/templates/starter/README.md) — the minimal member, and the contract's buildability proof                                                                                       |
| Desktop application    | `DesktopAppShell`        | — none; here the chrome is the page's own content, and the member stops where the host's platform bridge begins                                                                                                                     |
| Analytics / monitoring | `Dashboard`              | [Analytics](https://github.com/ecoma-io/loom/blob/main/templates/analytics/README.md) — the data page: metric cards and a grid the host sorts and filters                                                                           |
| Settings / admin       | `Settings`, `FormLayout` | [Workspace settings](https://github.com/ecoma-io/loom/blob/main/templates/workspace-settings/README.md) — the form page; `FormLayout` is the structure it composes directly, `Settings` the section-nav variant of the same surface |
| Master-detail          | `MasterDetail`           | — none; the pick-from-a-list, read-the-detail page                                                                                                                                                                                  |
| Reading                | `Reading`                | — none; long-form content in one measured column                                                                                                                                                                                    |
| Centered               | `Centered`               | — none; one focused column — a launchpad, a confirmation                                                                                                                                                                            |
| Split                  | `SplitLayout`            | — none; two linked panes at a declared minimum                                                                                                                                                                                      |

The family set is closed — every family has an anchor — but membership is not
a quota. An uncovered family records the page shape its member would carry, so
the next template lands as a family member rather than an addition; and a
surface earns that member when a second product would reach for the page the
same way, not to fill a row.

## Fixtures and swap points

A template has no backend, so its data is a fixture — and the fixture is only
honest when the consumer can see exactly where their application takes over.
That seam is a **swap point**, and every fixture-carrying template marks its
swap points. The shape:

1. **One file holds the story.** `src/App.vue` carries the fixtures and every
   function a consumer replaces, so the whole story reads in one place and
   nothing a consumer must change hides in a helper module.
2. **Every swap point is marked at the seam, by name.** A comment directly
   above the replaced code names what the consumer wires there — the API call
   the fixture stands in for, the state the host owns (sorting, filtering,
   selection), what "saved" means — never a bare `TODO`.
3. **The states around the fixture are the real states.** Loading and empty
   render from the same flag and branch a real API call drives; swapping the
   fixture for the API changes no markup, so the page's accessibility and
   responsive evidence survive the swap.
4. **The README names them, in order.** "What to change first" lists the
   repo-fidelity pieces (the workspace dependency, the alias block, the extra
   `@source` rule) and then every swap point, so a consumer's first edits are
   enumerable from the README alone.

The shipped templates carry the practice this law records: Analytics' `load()`
and Workspace settings' `save()` mark the API seam, and the starter — which
carries no fixture by design — marks only the repo-fidelity pieces its README
lists.

## Public package consumption

A template imports the published specifiers and nothing else:

```ts
import { AppShell, Button, Card, Stack, useTheme } from "@ecoma-io/loom";
```

No `packages/*/src` imports, no internal `@ecoma-io/loom-*` package
specifiers, no aliases past the public surface. The clause is held by gates,
not by this page: the artifact gate's manifest assertion refuses an internal
`@ecoma-io/loom-*` dependency before a single import is written, the
`layer-templates` row of the module-boundary table judges every import's
**resolved** target on `pnpm lint` (a mutation row proves the verdict fires),
and the alias map is the in-tree resolution fence — `vite.config.ts` resolves
the published specifiers to source the way the docs site and the E2E harness
already do, and it deliberately names **only** those specifiers, so an
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
| `moon run starter:build`   | The page builds against the published package (Vite build).                                                     |
| `moon run <template>:lint` | The template's sources pass ESLint.                                                                             |
| `pnpm typecheck`           | `templates/**/*` is in the root `tsconfig.json` include, so the root program type-checks every template source. |
| `moon run <template>:test` | Reserved: the shared test task runs with `--passWithNoTests` until the E2E leg lands (see below).               |

## Theme, responsive, accessibility

- **Both themes** work: a template's styles are token references, so the page
  follows whatever `data-theme` the host application sets. The starter shows
  the `useTheme` composable managing that attribute.
- **Responsive** is composed, not written: Loom's layout components collapse
  intrinsically when the content cannot hold its half of the container — no
  media query in the template's own CSS.
- **The accessibility bar is the library's bar.** Every interactive element
  has an accessible name, the page is operable by keyboard alone with focus
  visible, and no state is conveyed by colour alone.
- **Browser-level evidence enforces the bar today**, through the template
  browser harness (`playwright/template/`): every template is served by its
  own dev server and held to a smoke check (loads, mounts, renders without JS
  errors), an axe gate over `BROWSER_REQUIRED_RULES` in light and dark with
  zero excludes, a keyboard gate (focus ring restores on Tab, horizontally
  scrollable regions are keyboard-focusable at 375px — the check WebKit
  witnesses), and a responsive gate (no horizontal document overflow at 320px
  and 768px). CI runs the suite at the `standard` profile on every
  `templates/**` change.

## Adding a template

1. Create `templates/<kebab-name>/` with the full file set above.
2. Name the family it joins in the PR — the [canonical families
   table](#canonical-families). A family with no member already records the
   page shape its member would carry; a brand-new family needs its anchor (a
   shipped layout, or one the plan's canonical census names), not just a page
   someone wanted to write.
3. Register nothing: `templates/*` is already a Moon project glob and a pnpm
   workspace glob, so the template is discovered from the tree. (Exception:
   `docs/templates/<name>.md` when the template earns its own page.)
4. Run `pnpm install` — the new manifest needs its lockfile importer, and CI
   installs with `--frozen-lockfile`.
5. Run `pnpm lint` — the artifact gate names anything missing, and archkeep
   judges every import.
6. Run `moon run <name>:build` — the page must build against the published package.
7. Open the PR against the issue naming the template; the contract page is
   the review bar.

## Status

Enforced today: the file set, manifest shape and Moon edge (the artifact
gate), the import boundary (the `layer-templates` row, with a mutation row
proving the verdict fires), the build (the Moon `build` task, `runInCI:
affected`), type-checking (the root `tsconfig.json` include), and the
browser-level bar — smoke, axe in light and dark, keyboard and responsive —
through the template browser harness on every `templates/**` change.

The canonical families and the swap-point shape are the part of this contract
no gate reads: they are the review bar every template pull request is held to,
and this page is that bar.
