# Contributing to Loom

Thank you for being here. This document is the short version of everything a
pull request is judged on, so nothing about the process is a surprise.

By contributing you agree that your work is licensed under the
[Apache License 2.0](LICENSE), and that you have the right to grant that
license — see [Ownership of what you contribute](#ownership-of-what-you-contribute).

## The one rule that decides most questions

**Loom holds what is generic.** An affordance belongs here when more than one
product would reach for it the same way. Something only one product needs
belongs in that product.

Two consequences, one in each direction:

- **Consume before you hand-roll.** Before writing a generic control in a
  product, read `packages/loom/src/index.ts` — it is the complete export list.
- **Graduate upstream.** A generic affordance drafted inside a product is in the
  wrong package. Build it here, then consume it there.

The "who else would use this?" question on the feature request form is that rule
being asked directly. Answering "only me, for now" is a perfectly good answer —
it usually means the code belongs in your product.

## Setting up

Requirements: **Node ≥ 24** (`.node-version` pins the major) and **pnpm 11**
(pinned via `packageManager`, so Corepack fetches the right one).

```bash
git clone https://github.com/ecoma-io/loom.git
cd loom
pnpm install
```

`pnpm install` runs `lefthook install`, which is what puts the Git hooks in
place. If you have ever wondered why a repository's hooks did not run for you:
it is because that step was skipped. Do not skip it.

**TypeScript stays on 5.x on purpose.** TypeScript 7 is the native rewrite, and
`typescript-eslint` refuses to load against it — `pnpm lint` fails on every file
at once, not gradually. Renovate is configured to hold the pin, so if you find
yourself bumping it by hand, that is the reason not to.

## The commands

| Command             | What it does                                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`         | ESLint, with type information, zero warnings tolerated                                                                                                            |
| `pnpm typecheck`    | `vue-tsc --noEmit` — checks SFCs too (tsc alone cannot parse them); also the only place a type error is caught since the build strips types without checking them |
| `pnpm test`         | Vitest, unit and integration — the **whole repository**. CI runs it on pushes to `main`; the merge queue runs every project through `moon run :test` instead      |
| `pnpm test:full`    | Alias of `pnpm test` — the full suite with coverage thresholds, the way `pnpm e2e:full` is the full browser spread                                                |
| `pnpm e2e`          | Playwright, in a real browser — default `standard` profile (Chromium, Firefox, WebKit) against the built site                                                     |
| `pnpm e2e:full`     | The whole browser matrix — all five projects (desktop + mobile engines) — for when the wide evidence is needed                                                    |
| `pnpm format`       | Prettier, in place                                                                                                                                                |
| `pnpm format:check` | Prettier, read-only — what CI runs                                                                                                                                |

`pnpm lint` is three checks in a trench coat, and the third is the one worth
knowing about. After ESLint it runs `tools/check-component-artifacts.ts` (the
five-artifacts-per-component gate), `tools/check-architecture.ts` (the layer
order, matched against specifier text) and `archkeep check` (the same layer
order, judged against what each specifier _resolves to_). Two commands expose
the last one on its own:

| Command                   | What it does                                                                                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm archkeep:check`     | The module-boundary verdict alone, about two seconds. Reads `module-boundaries.config.mjs` and the Moon project graph                                                              |
| `pnpm archkeep:mutations` | Breaks the architecture seventeen ways and asserts each one is caught, restoring every file afterwards. Run it after editing `module-boundaries.config.mjs` or any `moon.yml` tags |

Exit 1 from `archkeep check` is a boundary crossed; exit **3** is a checker that
could not reach a verdict, and both fail. Do not paper over the second — a
checker that could not look must never read as one that looked and found
nothing. `docs/architecture/contract.md` explains which invariant each of the
two architecture readers owns, and why neither replaces the other.

### Affected workflows

Loom's CI runs whatever a change affects, not everything on every pull request.
Moon owns the per-package test and component-E2E tasks; the boundary between a
small closed change and a repository-wide investigation is the dependency graph.

- `moon :test --affected` — the unit + integration tests of the projects this
  branch directly touches. The base is picked by `MOON_BASE`, the same env `moon
ci --base` uses.
- `moon query projects --affected --downstream deep` — the same set closed over
  the dependency graph: the projects above plus the transitive dependents a
  shared change reaches (a `core` edit re-runs every consumer, however many
  edges down). Moon's _runner_ selects only tasks whose own inputs changed, so
  CI feeds this query's answer back as explicit `<id>:test` targets — the query
  is the closure, moon is still the graph, and there is no second dependency
  engine anywhere.
- `moon :e2e --affected` — same, for the projects that own browser evidence
  (`tags: [e2e]`).
- `pnpm exec moon ci --base <ref>` — the affected pipeline CI's verify job
  runs: lint, the real builds and tests, cached per project and keyed by the
  graph (browser tasks are `runInCI: skip` — the e2e matrix owns them). On the
  test side it runs the directly-changed projects; the dependents are covered
  by the closure query above.

The full guarantees above are still enforced — just only when the whole
repository is the appropriate object. The merge queue runs `moon run :test`,
which selects every project and, against the task cache CI carries between
runs, executes exactly the ones the queued batch invalidated. The uncached
`pnpm test` runs on every push to `main` — the commit that ships — because
that is where the cache boundary `.moon/tasks/test.yml` documents needs a
backstop, and where the repository-wide coverage thresholds are enforced.
`pnpm e2e:full` stays on demand, on the nightly/release path, or before merging
a change that edits browser-shared infrastructure (`playwright/`, the harness,
or the root config).

Before you push, run all of them. A shorter local run just moves the red to the
pull request.

`pnpm lint` reads type information, not just syntax — which is what lets it
report a floating promise, an `await` on something that is not a thenable, or a
condition that can never be false. The rule set is `strictTypeChecked`
deliberately: inside a single-file component ESLint is the only analyser that
reads the `<script>` block at all, so a milder setting here is not a milder
check, it is no check. The one thing to know: every `.ts` file has to be inside
`tsconfig.json`'s `include`, or the parser has no program to consult. If you add
a top-level script, add it there too.

## What the hooks do

- **pre-commit** — Prettier formats the staged files and re-stages what it
  rewrote, then ESLint runs over them. The commit contains formatted bytes
  rather than a follow-up fixup.
- **commit-msg** — commitlint checks the message shape.
- **pre-push** — `typecheck` and `test`, once per push.

If you are working with an AI coding agent, `.claude/` configures the same two
steps to run the moment a file is written, so problems surface while the edit is
still in context rather than at commit time. [AGENTS.md](AGENTS.md) is what such
an agent reads first: it points back here for everything this document defines,
and adds only the repository mechanics that no single file reveals.

Bypassing a hook with `--no-verify` is occasionally the right call during a
rebase. It is never the right way to land a change.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), enforced by
commitlint.

```
<type>(<scope>): <subject>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore`, `revert`.

**Scope is optional** — this is a single package, so a scope carries no routing
information the type does not already give. When you do use one, it must be from
this list: `primitives`, `composition`, `blocks`, `layouts`, `brand`, `lib`, `a11y`, `styles`,
`docs`, `e2e`, `workspace`, `deps`, `ci`.

`deps` and `ci` are on that list because Renovate writes them: it opens
`chore(deps):` and `chore(ci):` pull requests, and a scope list without them
would fail commitlint on every dependency update.

```
feat(primitives): add Dialog with focus restoration
fix(a11y): give IconButton an accessible name when only an icon is passed
chore(deps): update dependency vite to v8.1.6
```

A breaking change is marked with `!` after the type or scope, and explained in a
`BREAKING CHANGE:` footer. In a design system a breaking change reaches every
consumer at once, so say plainly what they must edit.

Which type you choose decides the version, and before `1.0.0` it does so on
purpose rather than by the usual rules. A `feat` moves the minor digit, a
breaking change moves the minor digit too rather than the major one, and
everything else moves the patch digit. So `0.1.0` → `0.2.0` reads "the API
moved — it grew, or it broke, and the CHANGELOG says which", and `0.1.0` →
`0.1.1` reads "it did not". A pre-1.0 version has two digits to say anything
with; spending one of them on "a release happened" would leave nothing to say
the surface changed.

### If your commit was AI-assisted

Add a trailer naming the tool: `Assisted-by: <tool>`, or `Generated-by: <tool>`
where the tool produced substantially the whole commit. A pull request
description can be edited later and no clone carries it; the commit trailer
travels with the code.

**One trailer per pull request, on the last commit** — not one per commit.
Squashing concatenates the full message of every commit on the branch into the
body of the single commit that lands, trailers and all, so a trailer repeated
across five commits arrives in history five times. The trailer is a fact about
the change that lands, and exactly one commit lands.

## Tests

Two tiers live beside the source, distinguished by filename, and one lives apart:

| Tier            | File                                                      | What it may touch                                                                                                                 |
| --------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**        | `packages/**/<Name>.test.ts`                              | The unit alone. Every project-internal collaborator is stubbed; third-party libraries are not.                                    |
| **Integration** | `packages/**/<Name>.integration.test.ts`                  | Real collaborators — justified only when that interaction _is_ the behaviour being pinned. "Isolating it was annoying" never is.  |
| **End-to-end**  | `e2e/**/<name>.e2e.ts` or `packages/**/e2e/<name>.e2e.ts` | A real browser, through Playwright. Root owns cross-cutting documentation checks; a component owns its specific browser evidence. |

### The two browser configurations

Component-owned E2E never pays for VitePress. Two Playwright configs share the
browser profiles:

- **Root** (`playwright.config.ts`) runs the cross-cutting suite — accessibility,
  contrast, target-size, keyboard, focus-not-obscured, responsive — against the
  **built** documentation site. `pnpm e2e` drives this.
- **Harness** (`playwright/harness/playwright.config.ts`) mounts one demo per
  component through a Vite dev server in seconds. A component's `e2e/*.e2e.ts`
  runs against this when its `moon.yml` carries `tags: [e2e]`, so a small
  component change gets browser evidence without a full docs build.

Two things a reviewer will check:

- **A test pins intent, not just current output.** If the logic that matters
  could change without failing your test, the test is not doing its job.
- **A test is titled by the behaviour it pins**, never by the phase of work that
  added it. `restores focus to the trigger on close`, not `dialog fix round 2`.

Never commit a focused or skipped test. `it.only` silences the rest of the suite
while still reporting green; `it.skip` reports green for something nobody ran.
An unimplemented case is `it.todo`, which is visible.

`pnpm e2e` runs the root suite at the desktop `standard` profile (Chromium,
Firefox and WebKit). The harness defaults to Chromium-only `smoke`; a component
that needs wider engine evidence raises `PW_PROFILE` in its own moon `e2e` task.
Use `PW_PROFILE=mobile` for the two phone engines or `PW_PROFILE=full` for every
configured browser — `pnpm e2e:full` is that last one, and it is the command to
reach for when a change edits the browsers or the harness themselves.

## The rules Semgrep enforces

`.github/semgrep/` holds this repository's own analysis rules, and the CI Analysis
workflow fails on any of them. They cover the two defect classes a component
library exports to every consumer at once:

- **XSS sinks** (`.github/semgrep/xss.yml`) — `v-html`, `innerHTML`, `insertAdjacentHTML`,
  `document.write`, `eval`, unsafe `setAttribute` names, `javascript:` URLs, and
  `message` listeners that never check `origin`. Each rule accepts a
  `DOMPurify.sanitize()` result and nothing else, because in a library the value
  reaching the sink arrived as a prop — the consumer decides whether it is safe,
  which means we have to assume it is not.
- **Teardown-shaped memory leaks** (`.github/semgrep/memory-leaks.yml`) — a listener
  registered with an inline function nothing can later remove, a `setInterval`
  whose handle is discarded, an observer or socket created without keeping the
  reference that closes it, a reactive effect created outside any scope that
  disposes it.

Every rule has fixtures beside it — `xss.ts`, `memory-leaks.ts` — where each line
is marked `ruleid:` (must be reported) or `ok:` (must not be). That suite is what
stops a rule from being quietly widened or narrowed, and CI runs it before it
runs the scan.

Semgrep is a Python tool rather than an npm one, so it is not in
`package.json`. To run it locally:

```bash
# the rules' own tests
uvx semgrep --test --config .github/semgrep .github/semgrep

# what CI enforces
uvx semgrep scan --config .github/semgrep --exclude .github/semgrep
```

One limitation worth knowing before you rely on it: Semgrep removed its Vue
parser in 1.93.0, so the `<script>` block of a single-file component is **not**
scanned — only the `v-html` rule reaches `.vue` files, via a text match. Inside
an SFC, ESLint is the analyser that sees your code.

## Accessibility is not a follow-up

Every rendered change is held to the same bar, because a defect here is copied
into every consuming product at once:

- every interactive element has an accessible name;
- the whole flow is operable by keyboard alone, with focus visible throughout;
- focus returns to the trigger when an overlay closes;
- no state is conveyed by colour alone;
- motion has a `prefers-reduced-motion` path.

Disabling follows the platform's own split, and which half applies is decided
by what a control is built on. A control whose root is a native form element
(`input`, `button`, `select`, `textarea`) is disabled by an enclosing
`<fieldset disabled>` for free and must not duplicate that; a composite built
on `role=` elements feels nothing native and calls `useAncestorDisabled()` to
read the same attribute off the DOM. Reach for the composable when your
control is composite, and trust the fieldset when it is not — the docblock on
`useAncestorDisabled` carries the measured reasoning.

An accessibility bug is a bug, and it is filed and fixed as one.

## Opening a pull request

1. Branch from `main`.
2. Make the change, with tests, and run the full command list above.
3. Fill in the pull request template honestly — especially **Consumer impact**.
   Writing "none" is fine when it is true; leaving it blank is not.
4. Keep it focused. Unrelated cleanup found along the way is welcome as its own
   pull request — mixed into this one it makes the real change unreviewable.

Reviews come from a maintainer and from [cubic](https://cubic.dev), which reads
the diff for correctness and accessibility defects. cubic is advisory: it cannot
approve, and it cannot stand in for a required check.

### How a pull request lands

**Squash, always.** Merge commits and rebase merges are switched off in
repository settings and refused by the branch rules, so "Squash and merge" is
the only button. Three things follow, and the first is the reason for a check
you will see in CI:

- **The pull request title becomes the subject of the commit on `main`**, so the
  title itself must be a valid Conventional Commit. CI checks it with the same
  commitlint configuration the `commit-msg` hook uses, so a valid message has
  one definition rather than two. Your own commit messages are kept — they land
  in the body of the squash commit — but only the title reaches the first line,
  and the first line is what release tooling and `git log --oneline` read.
- **One release-worthy change per pull request.** A pull request holding a
  `feat:` and an unrelated `fix:` gets one subject line, so it announces one of
  them. If you have two, send two. That is what "keep it focused" above asks for
  anyway, arrived at from the other direction.
- **You do not need to sign your commits.** `main` requires signatures, and
  GitHub signs the squash commit it creates — the commits on your branch are
  never the ones that land, so no key, no setup, nothing to configure. (This is
  also why rebase merging is off rather than merely unfashionable: GitHub cannot
  sign a rebase, so a rebase merge into `main` is refused outright.)

## Reporting problems

- **Bugs and proposals** — use the issue forms. The questions they ask are the
  ones that decide whether something is actionable.
- **Security vulnerabilities** — never a public issue. Follow
  [SECURITY.md](SECURITY.md).

## Ownership of what you contribute

You keep the copyright in your contribution and license it to the project under
Apache-2.0, which includes the patent grant that license carries.

Please only send work you have the right to send. If you are employed as a
developer, your employment agreement may assign what you write to your employer
even on your own time and your own hardware — in which case you need their
permission before contributing, not after. Anything you did not write yourself,
including substantial output from an AI tool, must be disclosed as described
above.

## Code of Conduct

Everyone taking part is held to the [Code of Conduct](CODE_OF_CONDUCT.md).
Reports go to john.itvn@gmail.com.
