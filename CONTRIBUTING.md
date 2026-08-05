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
  product, read `src/index.ts` — it is the complete export list.
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

| Command             | What it does                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`         | ESLint, with type information, zero warnings tolerated                                                          |
| `pnpm typecheck`    | `tsc --noEmit` — the build strips types without checking them, so this is the only place a type error is caught |
| `pnpm test`         | Vitest, unit and integration                                                                                    |
| `pnpm e2e`          | Playwright, in a real browser                                                                                   |
| `pnpm format`       | Prettier, in place                                                                                              |
| `pnpm format:check` | Prettier, read-only — what CI runs                                                                              |

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
still in context rather than at commit time.

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
this list: `primitives`, `blocks`, `brand`, `lib`, `a11y`, `styles`, `docs`,
`e2e`, `workspace`, `deps`, `ci`.

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

| Tier            | File                                | What it may touch                                                                                                                |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Unit**        | `src/**/<Name>.test.ts`             | The unit alone. Every project-internal collaborator is stubbed; third-party libraries are not.                                   |
| **Integration** | `src/**/<Name>.integration.test.ts` | Real collaborators — justified only when that interaction _is_ the behaviour being pinned. "Isolating it was annoying" never is. |
| **End-to-end**  | `e2e/**/<name>.e2e.ts`              | A real browser, through Playwright.                                                                                              |

Two things a reviewer will check:

- **A test pins intent, not just current output.** If the logic that matters
  could change without failing your test, the test is not doing its job.
- **A test is titled by the behaviour it pins**, never by the phase of work that
  added it. `restores focus to the trigger on close`, not `dialog fix round 2`.

Never commit a focused or skipped test. `it.only` silences the rest of the suite
while still reporting green; `it.skip` reports green for something nobody ran.
An unimplemented case is `it.todo`, which is visible.

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
