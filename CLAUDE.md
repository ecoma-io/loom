# Agent Guidance

Loom is one package: an accessibility-first Vue 3 component library and design-token
system, documented by a VitePress site that is built out of the library itself.

**[CONTRIBUTING.md](CONTRIBUTING.md) is the contract, and it is not repeated here.** The
commit format, the three test tiers, the Semgrep rules, the accessibility bar and how a
pull request lands are all defined there — read it, follow it, and change it there rather
than restating it. What follows is only what that document does not say, and what reading
any one file will not tell you.

## What lives where

| Path                   | What it holds                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `src/primitives/`      | Generic controls, one directory per component                                                      |
| `src/blocks/`          | Compositions of primitives, same shape                                                             |
| `src/lib/`             | Internal helpers, not part of the public surface                                                   |
| `src/styles/theme.css` | **The token source of truth** — every colour, radius, elevation and duration is declared once here |
| `src/a11y.ts`          | `WCAG_TAGS`, the tag set the library holds itself to                                               |
| `docs/`                | The VitePress site, which imports the library rather than describing it                            |
| `e2e/`                 | Playwright, driving the _built_ site                                                               |
| `tools/`               | Repository scripts, run from `package.json` and from CI                                            |
| `.github/semgrep/`     | This repository's own analysis rules, with their fixtures beside them                              |

`src/index.ts` is the complete public surface and says so in its own docblock, including
the two things that deliberately are not in it.

## Five artifacts per component, and a script that says so

A component is not done when it renders. `src/<tier>/<Name>/` must carry `<Name>.vue`,
`<Name>.test.ts` and `<Name>Demo.vue`; `docs/components/<name>.md` (or `docs/blocks/`)
must exist and carry an `<!-- @api <Name> -->` marker; and `src/index.ts` must export it.

`node tools/check-component-artifacts.ts` runs inside `pnpm lint` and fails naming each
missing file. Every one of those failures is otherwise silent — a component nobody
exported still compiles and still passes its own tests — which is why the pairing is
asserted rather than left to a reviewer remembering all five.

Adding one: the `add-component` skill in `.claude/skills/` walks the whole sequence.

## The documentation site is the dogfood, not a description

`docs/.vitepress/theme/` imports the real components, so a page rendering one is a live
demonstration of it. Two consequences that catch people out:

- **Generated, never transcribed.** Token tables come from `src/styles/theme.css` via
  `docs/.vitepress/plugins/design-tokens.ts`, and API tables from the component's own
  `defineProps` via `docs/.vitepress/plugins/component-api.ts`. A value copied into a
  markdown page is right on the day it is written and wrong afterwards, with nothing to
  warn you — prose cannot be type-checked.
- **Those generated tables are raw HTML**, which markdown-it passes through as an
  `html_block`. Its renderer rules never run on them, so anything VitePress adds to a
  table it renders itself — `tabindex="0"` among it — has to be emitted there by hand.
  This is a real defect class rather than a hypothetical: it shipped a site-wide WCAG
  2.1.1 failure once already.

`pnpm docs:dev` is a long-running server. Start it only when a task needs runtime
evidence, and stop it afterwards.

## One accessibility tag set, two readers

`WCAG_TAGS` in `src/a11y.ts` is imported by the `axe` gate in `e2e/accessibility.e2e.ts`
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
