<p align="center">
  <a href="https://github.com/ecoma-io/loom/actions/workflows/ci.yml"><img src="https://github.com/ecoma-io/loom/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/ecoma-io/loom/actions/workflows/analysis.yml"><img src="https://github.com/ecoma-io/loom/actions/workflows/analysis.yml/badge.svg" alt="Analysis" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ecoma-io/loom"><img src="https://api.scorecard.dev/projects/github.com/ecoma-io/loom/badge" alt="OpenSSF Scorecard" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License: Apache 2.0" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg" alt="Node >= 24" />
  <img src="https://img.shields.io/badge/pnpm-11-f69220.svg" alt="pnpm 11" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6.svg" alt="TypeScript strict" />
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-7C3AED.svg" alt="Pull requests welcome" /></a>
</p>

<p align="center">
  <img src=".github/assets/banner.png" alt="Loom — the open-source design system and Vue 3 component library of the Ecoma ecosystem" width="100%" />
</p>

<h1 align="center">Loom</h1>

<p align="center">
  <strong>Design system &amp; components for the Ecoma ecosystem.</strong><br />
  An open-source, accessibility-first component library and design-token system —
  Vue 3, TypeScript and Tailwind CSS — powering every human and AI-agent surface
  Ecoma ships.<br />
  <em>Build the interface once. Ship it everywhere. Never re-decide what a button is.</em>
</p>

<p align="center">
  <a href="https://ecoma.io/docs/contribute/design-system"><strong>Website&nbsp;→</strong></a>
</p>

---

## Every product rewrites its buttons. That is the tax Loom exists to stop paying.

A design system is not a folder of components. It is a decision, made once, that
every screen inherits — how far apart two things sit, how a dialog gives focus
back, what "destructive" looks like at 3am on a low-contrast monitor. Hand that
decision to each product and it is not made once. It is made again, slightly
differently, every sprint, by whoever is closest to the deadline.

**Loom is where that decision lives.** One vocabulary of design tokens, one set
of accessible UI primitives, one motion language — consumed by every Ecoma
surface, owned by none of them. Open source under Apache-2.0, so you can take it
into your own product on the same terms.

## Built for Ecoma — a labor operating system for humans and AI agents

Loom is the interface layer of [**Ecoma**](https://ecoma.io), the self-hostable,
fair-code **labor operating system** where people, AI agents and rules are the
same kind of resource: a role, and whoever fills it. Workflows are co-designed by
humans and AI inside the engine, every output crosses a checkpoint calibrated on
each tenant's own data, and human attention is treated as a budget to be measured
rather than a well to be drained — from a one-person company to an enterprise.

That premise is unusually demanding on a UI. Most component libraries assume a
person is behind every action. Ecoma's screens have to show work a person did,
work an agent proposed, and the seam between the two — confidence, provenance,
the moment a human has to decide — without the interface picking a side.

**Loom is that vocabulary, extracted and made reusable.** If you are building
anything where automation and people share a workspace — an internal tool, an
agent console, a human-in-the-loop review queue, a workflow or BPM product — the
problems it solves are already yours.

## The idea in one picture

The name is the architecture:

- **Warp — the human thread.** Everything a person reaches for directly: the
  controls, the affordances, the feedback that says an action landed.
- **Weft — the agent thread.** Everything the machine contributes: proposals,
  confidence, provenance, the state of work nobody is watching.
- **The seam.** Where the two cross is the only place the system raises its
  voice — a checkpoint, a hand-off, a decision that needs a human. Everywhere
  else it stays quiet on purpose.

Light-first, enterprise-toned, and dark from the same tokens rather than as a
second theme bolted on afterwards.

## What Loom gives you

|                              |                                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design tokens**            | Colour, spacing, radius, elevation, typography and motion — one source that light mode and dark mode both read from, so a rebrand is an edit rather than an audit.      |
| **UI primitives**            | The generic controls every product needs and no product should own: buttons, inputs, selects, dialogs, menus, toasts, tooltips, skeletons, switches, progress.          |
| **Blocks**                   | Compositions worth standardising once — empty states, confirmations, forms, review queues — assembled from primitives, never from scratch.                              |
| **Accessibility, built in**  | Keyboard paths, focus restoration, accessible names and reduced-motion behaviour ship inside the component. WCAG is the acceptance bar, not a checklist run afterwards. |
| **Theming that survives**    | Every visual decision is a token reference, so white-labelling a tenant is configuration rather than a fork.                                                            |
| **Typed and tree-shakeable** | Ships ES modules with TypeScript types. Consumers bundle what they import and nothing more.                                                                             |

## Who this is for

- **Teams building on Ecoma** — this is the interface layer; consume it rather
  than re-deriving it.
- **Anyone shipping human-in-the-loop or AI-agent products** — the hard part is
  showing machine work to a person honestly, and that is what these components
  were shaped around.
- **Design-system maintainers** — the token model, the artifact-per-primitive
  convention and the accessibility bar are all readable in the open, Apache-2.0,
  and free to borrow.

## Getting started

Requirements: **Node ≥ 24** and **pnpm 11** (pinned in `package.json`, so
Corepack fetches the right one for you).

```bash
git clone https://github.com/ecoma-io/loom.git
cd loom
pnpm install
```

`pnpm install` also installs the Git hooks, so formatting, linting and commit
message checks run before anything reaches a branch.

```bash
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest
pnpm e2e         # Playwright
pnpm format      # Prettier, in place
```

The component surface is landing in the open, one primitive at a time —
`src/index.ts` is always the complete export list. Follow along or ask for
something specific in [the issues](https://github.com/ecoma-io/loom/issues).

## Contributing

Loom holds what is **generic** — an affordance more than one product reaches for
the same way. That single rule decides most questions about what belongs here,
and [CONTRIBUTING.md](CONTRIBUTING.md) covers the rest: the commit format, the
tiers of tests, and what a reviewer will look for.

Read the wider design-system programme on the
[**website**](https://ecoma.io/docs/contribute/design-system).

Everyone taking part is held to the [Code of Conduct](CODE_OF_CONDUCT.md).
Security issues go through [SECURITY.md](SECURITY.md) — never a public issue.

## Frequently asked

**Can I use Loom outside Ecoma?**
Yes. It is Apache-2.0, has no runtime dependency on the Ecoma platform, and is
designed to be consumed as an ordinary npm package.

**Why Apache-2.0 and not MIT?**
Apache-2.0 carries an explicit patent grant. For a component library that ends
up embedded in commercial products, that is the difference between "probably
fine" and "written down".

**Which framework does it target?**
Vue 3 with TypeScript, styled through Tailwind CSS. The design tokens themselves
are framework-neutral CSS custom properties, so they are usable anywhere.

**Does it support dark mode?**
Dark is derived from the same token set as light rather than maintained as a
second theme, which is why the two cannot drift apart.

**How is accessibility verified?**
Keyboard operation, focus restoration and accessible naming are pinned by tests
and reviewed on every pull request — see the accessibility section of
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

[Apache License 2.0](LICENSE) © Ecoma.

Use it, ship it, fork it, sell what you build with it.

---

<p align="center">
  <img src=".github/assets/logo.png" alt="" width="56" /><br />
  <sub>
    Part of the <a href="https://ecoma.io">Ecoma</a> ecosystem ·
    <a href="https://ecoma.io">Website</a> ·
    <a href="https://github.com/ecoma-io">Organisation</a> ·
    <a href="https://ecoma.io/docs/contribute/design-system">Contribute</a>
  </sub>
</p>
