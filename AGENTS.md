# Agent Guidance

This file is read by Claude Code (through a one-line `CLAUDE.md` that imports it), by
Codex and by opencode. Put guidance here, never in `CLAUDE.md` — content added there
reaches one host out of three.

Loom is one package: an accessibility-first Vue 3 component library and design-token
system, documented by a VitePress site that is built out of the library itself.

**[CONTRIBUTING.md](CONTRIBUTING.md) is the contract, and it is not repeated here.** The
commit format, the three test tiers, the Semgrep rules, the accessibility bar and how a
pull request lands are all defined there — read it, follow it, and change it there rather
than restating it. What follows is only what that document does not say, and what reading
any one file will not tell you.

## What lives where

| Path                        | What it holds                                                                   |
| --------------------------- | ------------------------------------------------------------------------------- |
| `packages/primitives/`      | Generic controls, one directory per component                                   |
| `packages/blocks/`          | Compositions of primitives, same shape                                          |
| `packages/core/`            | `cn`, props merging, motion — the shared helpers components are built from      |
| `packages/theme-core/`      | `theme.css` — **the token source of truth** — plus `global.css` and `fonts.css` |
| `packages/loom/src/a11y.ts` | `WCAG_TAGS`, the tag set the library holds itself to                            |
| `docs/`                     | The VitePress site, which imports the library rather than describing it         |
| `e2e/`                      | Playwright, driving the _built_ site                                            |
| `tools/`                    | Repository scripts, run from `package.json` and from CI                         |
| `.github/semgrep/`          | This repository's own analysis rules, with their fixtures beside them           |
| `playwright/`               | The component E2E harness — mounts one demo via Vite, no VitePress build        |
| `playwright/profiles.ts`    | The browser profiles, single-sourced to the two Playwright configs              |

`packages/loom/src/index.ts` is the complete public surface and says so in its own docblock,
including the two things that deliberately are not in it.

## Five artifacts per component, and a script that says so

A component is not done when it renders. `packages/<tier>/<name>/` must carry
`src/<Name>.vue` and `tests/<Name>.test.ts`, with its demo in `docs/demos/` and a
`docs/components/<name>.md` (or `docs/blocks/`) page carrying an `<!-- @api <Name> -->`
marker; and `packages/loom/src/index.ts` must export it.

`node tools/check-component-artifacts.ts` runs inside `pnpm lint` and fails naming each
missing file. Every one of those failures is otherwise silent — a component nobody
exported still compiles and still passes its own tests — which is why the pairing is
asserted rather than left to a reviewer remembering all five.

Adding one: the `add-component` skill in `.claude/skills/` walks the whole sequence.

## The documentation site is the dogfood, not a description

`docs/.vitepress/theme/` imports the real components, so a page rendering one is a live
demonstration of it. Two consequences that catch people out:

- **Generated, never transcribed.** Token tables come from
  `packages/theme-core/src/theme.css` via `docs/.vitepress/plugins/design-tokens.ts`,
  and API tables from the component's own `defineProps` via
  `docs/.vitepress/plugins/component-api.ts`. A value copied into a
  markdown page is right on the day it is written and wrong afterwards, with nothing to
  warn you — prose cannot be type-checked.
- **Those generated tables are raw HTML**, which markdown-it passes through as an
  `html_block`. Its renderer rules never run on them, so anything VitePress adds to a
  table it renders itself — `tabindex="0"` among it — has to be emitted there by hand.
  This is a real defect class rather than a hypothetical: it shipped a site-wide WCAG
  2.1.1 failure once already.

`pnpm docs:dev` is a long-running server. Start it only when a task needs runtime
evidence, and stop it afterwards.

## Two browser suites, one matrix

Component evidence and the site-wide quality sweeps run through two different
Playwright configs that share `playwright/profiles.ts`:

- **Root** (`playwright.config.ts`) — the cross-cutting suite (`e2e/`: axe,
  contrast, target-size, keyboard, focus-not-obscured, responsive) against the
  **built** site. `pnpm e2e` is this, and it is what a prose change still needs.
- **Harness** (`playwright/harness/`) — mounts `docs/demos/<X>Demo.vue` via a
  Vite dev server in seconds. A component's `e2e/*.e2e.ts` runs here, so its
  browser evidence never pays for VitePress.

Which legs run on a pull request is decided by `tools/e2e-plan.ts` (a pure
function of the changed file set plus moon's affected answer), consumed by the
`e2e-discover` → `e2e-build-docs` → `e2e-run` jobs in
`.github/workflows/ci.yml`. The scenarios it classifies are documented at the
top of that tool; the short version is that a component change runs only the
affected components' own specs at `smoke` (a component without own specs still
has its demo swept by the harness axe gate, so a Badge.vue edit costs one
chromium leg, not the whole-repo sweep), a docs, theme or dependency-bump
change runs the root sweep (built once, shared to every leg through the
actions cache), an infra change runs everything, and nothing relevant runs
nothing. Harness legs group every affected component into one Playwright run
per browser, sharding only past a bounded threshold — the job count is bounded
by browsers × shard cap, never by the component count. The root sweep is cut
the same way from the other side: its shard count is derived from the number of
documentation pages the suite iterates, so a leg carries roughly one fixed
workload as the site grows rather than lengthening until it hits the job
timeout — bounded by a cap, with the sizing evidence in the tool. The full matrix
(`PW_PROFILE=full`, all five browser projects) stays available for a change
that edits `playwright/` itself, the harness, or the root config — and is what
`pnpm e2e:full` runs. The browser profiles themselves have one home,
`playwright/profiles.ts`, read by both Playwright configs and by the plan.

The unit-test side gets the same boundary from moon itself: `moon ci` runs the
directly-affected tasks, and CI then replays `moon query projects --affected
--downstream deep` as explicit `<id>:test` targets — moon's runner does not
walk the graph downstream on its own (measured on 2.4.6), so the query's
answer is fed back to `moon run`, cached tasks deduplicating the overlap.

Moon owns the affected-boundary of this: package graphs are real moon `deps:`
(see `tools/sync-moon-deps.ts`, with `# preserved` for hand-declared edges that
`package.json` cannot express), so `moon :e2e --affected` and `moon ci --base`
walk the true dependency closure rather than a flat list. The lockfile is a
declared input of every test and lint task, because a dependency bump changes
what a test exercises without touching any project's own files.

## Two architecture readers, and the tag set that feeds one of them

The layer order (`core -> labels -> primitives -> composition -> layouts ->
blocks -> facade`) is enforced twice, and the split is the point.
`tools/check-architecture.ts` matches specifier _text_ under each package's
`src/`; `archkeep check` reads the Moon project graph, resolves each specifier
through `tsconfig.base.json`, and judges the _resolved target_ against
`module-boundaries.config.mjs`. Neither subsumes the other — the table in
`docs/architecture/contract.md` records which invariant each one owns, and the
three that Archkeep structurally cannot see are pinned in
`tools/check-archkeep-mutations.ts` — two as expect-nothing rows, one expecting
the wrong rule — so that a fix upstream turns them red.

Three things about this that reading one file will not tell you:

- **Every Moon project carries a `layer-*` tag, and the constraint table keys on
  it.** Removing or mistyping one does not weaken the rule quietly — it drops
  the project out of every row, which Archkeep reports as
  `projectWithoutTagsCannotHaveDependencies`. Moon rejects a colon in a tag, so
  the dash form is not a style choice. The `e2e` tag is a separate axis and
  still means "owns browser evidence"; the two coexist on one line.
- **`tsconfig.base.json` is load-bearing at one of exactly two names.**
  Archkeep's Moon provider reads the first of `tsconfig.base.json`, then
  `tsconfig.json`, that the root carries — closing ecoma-io/archkeep#266 — and
  still offers no way to name any other file. This repository's
  `tsconfig.json` extends the base file but carries no `paths` of its own, so
  with the base file out of reach every internal specifier resolves to nothing
  and the run exits 1 reporting each as an undeclared npm package.
- **`pnpm archkeep:mutations` is the gate on the gate.** A constraint row whose
  tag no project carries approves everything while reading as enforced. Run it
  after touching the boundary config or a project's tags.

## One accessibility tag set, two readers

`WCAG_TAGS` in `packages/loom/src/a11y.ts` is imported by the `axe` gate in
`e2e/accessibility.e2e.ts`
**and** by the documentation site's accessibility page. The gate and the published claim
are the same array by construction; widening or narrowing it moves both, which is the
point and the reason it is a literal in neither.

That suite carries **no excludes**, and the comment where two of them used to be explains
why each was wrong. An exclusion is not justified by naming a cause — it is justified by
that cause being outside this repository's reach. Find the code that emits the failing
element first.

Some of this is observable in only one engine. Chromium makes a scroll container
keyboard-focusable on its own, so a focusability check passes there with the defect fully
present; WebKit is the browser that test speaks for. Keep every project in
`playwright.config.ts` — narrowing the suite to Chromium silently retires checks.

## Release and deploy

`main` is the only long-lived branch. Release Please opens a Release PR; merging it is the
decision to ship, and it is what tags, publishes, and — since the deploy is a job in
`release.yml` — deploys the documentation site. Nothing publishes or deploys from an
ordinary push to `main`.

Credentials live in the `ecoma-io` organisation, under an `ECOMA_` prefix, and are
readable by every repository in it. A workflow reads them by that prefixed name and maps
them to an unprefixed input where one is needed — a name that does not exist interpolates
to the empty string rather than failing, so the mismatch surfaces as an authentication
error at deploy time rather than as a missing-secret error at the start.

Three credential facts bound what can be automated from here:

- **The registry token is a bootstrap, and is meant to be deleted.** npm's trusted
  publishing cannot publish a package's first version — the trusted publisher is
  configured on a package settings page that does not exist until the package does
  ([npm/cli#8544](https://github.com/npm/cli/issues/8544), still open). So the first
  release authenticates with `ECOMA_NPM_ACCESS_TOKEN` and passes `--provenance`
  explicitly, which the flag being implied by a trusted publisher would otherwise cover.
  Once `0.1.0` exists on the registry, configure the trusted publisher and revert the
  publish step to a bare `npm publish` with no `NODE_AUTH_TOKEN`.
- **After that bootstrap, publishing is trusted publishing over OIDC.** Do not reintroduce
  a registry token once it has been removed.
- **The Cloudflare API token is operator-supplied.** Cloudflare offers no OIDC path for
  Wrangler and no way to mint a scoped token from CI, so `ECOMA_CLOUDFLARE_API_TOKEN` is a
  stored secret and no agent or workflow can create it.

## Skills, and how to run what they name

`.claude/skills/` and `.agents/skills/` hold the same skills, because no single directory
reaches every host — measured 2026-08-23, and the reason is in the `README.md` in either
directory:

| host                | `.claude/skills/` | `.agents/skills/` |
| ------------------- | ----------------- | ----------------- |
| Claude Code 2.1.241 | reads             | does not read     |
| Codex 0.149.0       | does not read     | reads             |
| opencode 1.18.21    | reads             | reads             |

| skill           | reach for it when                                                  |
| --------------- | ------------------------------------------------------------------ |
| `add-component` | adding a component — it walks all five artifacts and the export    |
| `arch-context`  | before editing, to learn which constraint row governs the package  |
| `arch-change`   | making a change that crosses or approaches a layer boundary        |
| `arch-check`    | after a change, for the authoritative fail-closed boundary verdict |
| `arch-review`   | reviewing a diff or pull request for architecture consequences     |
| `arch-migrate`  | bringing something not yet governed under the boundary law         |

`arch-*` is vendored from `@ecoma-io/archkeep` and held byte-identical to the pinned
release; `add-component` is this repository's own. Change either with `pnpm sync-skills`
and never by editing a file in those directories — `pnpm check-skills`, which runs inside
`pnpm lint`, rejects a hand-edit, a drifted mirror, and a dependency bump that was never
re-synced.

**The skills write `archkeep <command>` bare, and it is not on `PATH`.** It is a dev
dependency of this repository, so every one of them is `pnpm exec archkeep <command>`
here — or `pnpm archkeep:check`, which is the same gate CI runs. Two commands the skills
name do not apply yet: `archkeep drift` and `archkeep reconcile` both exit 3 asking for a
tracked `architecture-intent.json`, which this repository has deliberately not adopted,
and `archkeep debt` and `archkeep history` want a snapshot directory it does not keep.
Everything else — `check`, `graph`, `discover`, `context`, `impact`, `waivers`,
`fitness`, `provenance`, `adr`, `report`, `health` — answers against the Moon project
graph and `module-boundaries.config.mjs`.

## Working here

- `pnpm` only. The lockfile is committed and CI installs `--frozen-lockfile`.
- `.claude/hooks/` formats and lints each file as it is written, so a problem surfaces
  while the edit is still in context. It does not replace running the full command list in
  CONTRIBUTING.md before pushing.
- **Match the file you are editing.** This repository comments the _why_ — a decision, a
  constraint, a defect that was actually observed — and never the _what_. A comment
  restating the line below it is noise; one recording why that line is not the obvious one
  is why the file is still readable a year later.
- Nothing here may reference a repository outside `ecoma-io`, with one deliberate
  exception: the Contributor Covenant's required attribution in `CODE_OF_CONDUCT.md`.
