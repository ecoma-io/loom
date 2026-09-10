<!-- The README's structure is ten sections, in this order: what Loom is, install,
     your first component, tokens and theming, the accessibility bar, evidence
     tiers, templates, module boundaries, governance and contributing,
     compatibility and requirements. A section exists because a consumer must
     learn that thing to use Loom — prose that answers none of the ten questions
     does not earn a section, however fond of it we are. The checklist, with the
     referent each section must cite, lives in the governing issue
     (ecoma-io/loom#338). -->

<p align="center">
  <a href="https://github.com/ecoma-io/loom/actions/workflows/ci.yml"><img src="https://github.com/ecoma-io/loom/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/ecoma-io/loom/actions/workflows/analysis.yml"><img src="https://img.shields.io/badge/analysis-semgrep-purple.svg" alt="Analysis" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ecoma-io/loom"><img src="https://api.scorecard.dev/projects/github.com/ecoma-io/loom/badge" alt="OpenSSF Scorecard" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache 2.0" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg" alt="Node >= 24" />
  <img src="https://img.shields.io/badge/pnpm-11-f69220.svg" alt="pnpm 11" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6.svg" alt="TypeScript strict" />
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-7C3AED.svg" alt="Pull requests welcome" /></a>
</p>

<p align="center">
  <img src=".github/assets/banner.png" alt="Loom — an Application Interface System for Vue" width="100%" />
</p>

<h1 align="center">Loom</h1>

<p align="center">
  <strong>An Application Interface System for Vue.</strong><br />
  An open-source, accessibility-first component library and design-token system —
  Vue&nbsp;3, TypeScript and Tailwind&nbsp;CSS.<br />
  <em>Build the interface once. Never re-decide what a button is.</em>
</p>

<p align="center">
  <a href="https://ecoma.io/docs/contribute/design-system/"><strong>Documentation&nbsp;→</strong></a>
</p>

---

## What Loom is

A design system is not a folder of components. It is a decision, made once, that
every screen inherits — how far apart two things sit, how a dialog gives focus
back, what "destructive" looks like at 3am on a low-contrast monitor. Hand that
decision to each product and it is not made once. It is made again, slightly
differently, every sprint, by whoever is closest to the deadline.

**Loom is where that decision lives.** One vocabulary of design tokens, one set
of accessible UI primitives, one motion language — consumed by every surface,
owned by none of them.

**Loom owns interface decisions, not application decisions.** What it standardises
is the reusable layer — visual language, accessibility, interaction semantics,
responsive behaviour, composition, patterns, templates. What requires knowing
what your product _is_ belongs to your product. That split is the one rule that
decides most questions about what belongs here.

|                              |                                                                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design tokens**            | Colour, spacing, radius, elevation, typography and motion — one source that light mode and dark mode both read from, so a rebrand is an edit rather than an audit.            |
| **UI primitives**            | The generic controls every product needs and no product should own: buttons, inputs, selects, dialogs, menus, toasts, tooltips, skeletons, switches, progress.                |
| **Composition primitives**   | Layout building blocks — Stack, Grid, Split, Center, Sidebar — that express spatial intent and adapt to viewport without the host writing breakpoint queries.                 |
| **Patterns**                 | Compositions worth standardising once — empty states, page headers, title bars, sidebar navigation — assembled from primitives, never from scratch.                           |
| **Showcase**                 | Demonstrations, in this documentation site, of what the parts produce when they compose — for discovery and teaching. A showcase is read; it is not a starting point to copy. |
| **Templates**                | Copyable prebuilt pages — Starter, Analytics, Workspace settings — to take into an application and build on. One page each; routing, auth and backend stay with the consumer. |
| **Accessibility, built in**  | Keyboard paths, focus restoration, accessible names and reduced-motion behaviour ship inside the component. WCAG is the acceptance bar, not a checklist run afterwards.       |
| **Theming that survives**    | Every visual decision is a token reference, so white-labelling a tenant is configuration rather than a fork.                                                                  |
| **Typed and tree-shakeable** | Ships ES modules with TypeScript types. Consumers bundle what they import and nothing more.                                                                                   |

It is for teams building Vue applications who want the interface layer decided:
design-system maintainers who want the token model, the artifact conventions and
the accessibility bar readable in the open, and anyone tired of re-deciding what
a button is — ship the defaults, override the tokens that don't fit, leave the
rest alone. Loom originated within the [Ecoma](https://ecoma.io) ecosystem and is
developed as an independent open-source UI system.

## Install

Loom ships as one npm package — the components, the theme composable and the
stylesheet entry behind a single install:

```bash
pnpm add @ecoma-io/loom
```

One import is the whole styling surface a normal host needs — tokens, the
self-hosted fonts, base element styling and the motion library ride along:

```css
@import "@ecoma-io/loom/styles/global.css";
```

It needs Vue 3.5 or newer as a peer and Tailwind CSS 4 in your build; the
[compatibility table](#compatibility-and-requirements) has the full list. The
[documentation site](https://ecoma.io/docs/contribute/design-system/) walks an
empty Vue application to a rendered, themed component.

## Your first component

```vue
<script setup lang="ts">
import { Button } from "@ecoma-io/loom";
</script>

<template>
  <Button variant="primary" @click="save">Save</Button>
</template>
```

Everything importable lives behind the one package: [packages/loom/src/index.ts](packages/loom/src/index.ts)
is the complete export list, and says so in its own docblock. The generic controls
sit beside composition primitives that adapt to viewport and container — a
sidebar collapses at the right width, a master-detail panel stacks on mobile,
and on an ultrawide monitor content is bounded at readable widths, the extra
viewport going to intentional whitespace rather than stretching.

A `class` you pass merges with the component's own instead of replacing it —
`cn` ships from the same package and is Tailwind-aware, so your `px-4` resolves
against the component's `px-6` rather than both shipping and stylesheet order
deciding the winner.

Each component's page on the documentation site carries an API table generated
from the component's own `defineProps`, so the documented surface cannot drift
from the shipped one.

## Tokens and theming

Every visual decision is a token reference, and the tokens have one home:
[packages/theme-core/src/theme.css](packages/theme-core/src/theme.css) is the
source of truth. Light mode and dark mode both derive from that one set — dark
is not a second theme anyone maintains, which is why the two cannot drift apart.
A `useTheme` composable switches between light, dark and system preference.

Because a token is a CSS custom property rather than a Tailwind class, the token
layer is framework-neutral and usable anywhere; the components that consume it
are Vue. Rebranding is editing tokens; white-labelling a tenant is configuration,
not a fork.

## The accessibility bar

Accessibility ships inside the component, not as a follow-up: keyboard operation
with visible focus, focus restored to the trigger when an overlay closes,
accessible names, no state conveyed by colour alone, and a
`prefers-reduced-motion` path through the motion library.

The bar is defined, not aspirational. `WCAG_TAGS` in
[packages/core/src/a11y-scope.ts](packages/core/src/a11y-scope.ts) is the closed
rule set the library holds itself to — the axe rules mapping to a WCAG Level A
or AA success criterion — and the browser gate that enforces it carries no
excludes. Every component also declares an `a11y.json` claim beside its source,
held by a gate against the role → requirement matrix in
[packages/core/src/a11y-contract.ts](packages/core/src/a11y-contract.ts), so a
requirement nothing answers yet is recorded as a named exception rather than
silently missing. An accessibility bug is a bug, and it is filed and fixed as one.

## Evidence tiers

The claims above are pinned at three runtimes — the same three the
accessibility contract names (`browserless`, `harness`, `sweep`):

- **browserless** — the jsdom sweep mounts every demo and holds it to its
  component's accessibility claim, no browser required.
- **harness** — a Vite dev server mounts one demo at a time, so a component's
  browser specs run in seconds without paying for a site build.
- **sweep** — the site-wide suite over the built documentation site: axe,
  contrast, target size, keyboard, focus-not-obscured, motion, responsive.

Beside them, unit and integration tests live next to each component's source and
the browser tier lives apart; [CONTRIBUTING.md](CONTRIBUTING.md) holds the
contract for all of it. The documentation is held to the same honesty: token
tables are generated from `theme.css` and API tables from the components
themselves — generated, never transcribed, so a page cannot quietly disagree
with the code it describes.

## Templates

An Official Template is a copyable prebuilt **page** — a starting point composed
from Loom components and patterns, taken into an application and built on:
Starter, Analytics, Workspace settings. Where a pattern is a component you
compose with and the showcase is a demonstration you read, a template is a page
you start from. Routing, auth and backend stay with the consumer.

Templates consume the public `@ecoma-io/loom` package exactly as an external
consumer would — no internal imports, nothing the published package does not
have — because if a template cannot build against the published surface, that is
a defect in the surface. [docs/templates/contract.md](docs/templates/contract.md)
states the artifact kind's law, and the template suite holds every template to
smoke, axe in light and dark, keyboard and responsive gates.

## Module boundaries

Loom is layered, and the direction is one way: core → labels → primitives →
composition → patterns → layouts → facade. The facade — the `@ecoma-io/loom`
package you install — is the only import surface: its exports map offers the
components, the `./a11y` and `./theme` entries, and the stylesheet files, and
nothing inside the monorepo is public API.

The boundary is enforced twice, by two readers that see different things:
[tools/check-architecture.ts](tools/check-architecture.ts) matches the import
specifier text, and [archkeep](https://github.com/ecoma-io/archkeep) resolves
each specifier through the TypeScript config and judges the resolved target
against [module-boundaries.config.mjs](module-boundaries.config.mjs). The
[architecture contract](docs/architecture/contract.md) records which invariant
each reader owns.

## Governance and contributing

What Loom takes is decided by the one rule: Loom holds what is **generic** — an
affordance more than one product reaches for the same way. Everything else about
working here is the contract, and the contract is
[CONTRIBUTING.md](CONTRIBUTING.md): the commit format, the test tiers, the
Semgrep rules, the accessibility bar, and how a pull request lands.

To work on Loom itself:

```bash
git clone https://github.com/ecoma-io/loom.git
cd loom
pnpm install
```

`pnpm install` also installs the Git hooks, so formatting, linting and commit
message checks run before anything reaches a branch. The component surface is
landing in the open, one artifact at a time — follow along or ask for something
specific in [the issues](https://github.com/ecoma-io/loom/issues).

Everyone taking part is held to the [Code of Conduct](CODE_OF_CONDUCT.md).
Security issues go through [SECURITY.md](SECURITY.md) — never a public issue.

Loom is [Apache-2.0](LICENSE) — an explicit patent grant, which for a component
library that ends up embedded in commercial products is the difference between
"probably fine" and "written down" — with no runtime dependency on any Ecoma
platform, so consuming it as an ordinary npm package includes consuming it
outside Ecoma. Use it, ship it, fork it, sell what you build with it.

## Compatibility and requirements

| Requirement  | Version                                        |
| ------------ | ---------------------------------------------- |
| Node         | ≥ 24 (`engines` in `package.json`)             |
| pnpm         | 11 — pinned, so Corepack fetches the right one |
| Vue          | ≥ 3.5, as a peer dependency                    |
| Tailwind CSS | 4, in your build (`@tailwindcss/vite`)         |

Types ship strict, and the package ships ES modules that tree-shake: consumers
bundle what they import and nothing more.

Cross-platform is a design constraint, not the product category. Loom's
interface decisions are made so they can survive a change of rendering target —
a browser tab, an installed PWA, an Electron or Tauri desktop shell, a mobile
webview — and the platform-specific parts stay at the boundary, passed in by the
host rather than sniffed at runtime: window chrome, safe-area insets, PWA
overlays. Loom today is a Vue-facing interface system, not a cross-platform
framework.

---

<p align="center">
  <img src=".github/assets/logo.png" alt="" width="56" /><br />
  <sub>
    An <a href="https://ecoma.io">Ecoma</a> open-source project ·
    <a href="https://ecoma.io/docs/contribute/design-system/">Documentation</a> ·
    <a href="https://github.com/ecoma-io">Organisation</a> ·
    <a href="CONTRIBUTING.md">Contribute</a>
  </sub>
</p>
