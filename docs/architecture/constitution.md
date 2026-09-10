# Loom Constitution

_Normative law — the [documentation model](./README.md) maps every document's role._

This is the decision layer of Loom's architecture documentation: what Loom is,
what it is for, what it will not become, and the laws its artifacts obey. The
[current-state contract](./contract.md) is its enforcement counterpart — how
the repository is allowed to be structured today and which checks keep it that
way. The two are deliberately separate: identity changes rarely and on
purpose, while enforcement mechanics evolve with the tooling. When the two
disagree, the disagreement is documented, never silently resolved by changing
implementation — a conflict that cannot survive being written down is not a
decision, it is a pending one.

---

## 1. Identity

Loom is an **Application Interface System for Vue**.

> **Loom owns interface decisions, not application decisions.**

Loom standardises reusable decisions about:

- visual language
- accessibility
- interaction semantics
- responsive behaviour
- composition
- interface patterns
- application layout
- interface templates

"Cross-platform" is a design constraint, not the product category. Loom's
interface decisions are made so they can survive a change of rendering target
— the [layout engine](./artifact-model.md#the-layout-engine) exists because of
this — but Loom today is a Vue-facing interface system. It is not a
cross-platform framework. Surfaces that still name the category
cross-platform — the npm description, the README, the docs landing and its
cross-platform foundations page — are a recorded conflict for the gap
analysis to carry and their own changes to resolve, not a claim this
document makes.

## 2. Mission

Give Vue applications a decided interface layer — visual language,
accessibility, interaction semantics, responsive behaviour and composition —
so that a product team owns only what makes their product theirs. Everything
more than one product would reach for the same way lives here ([the one
rule](https://github.com/ecoma-io/loom/blob/main/CONTRIBUTING.md#the-one-rule-that-decides-most-questions));
everything that requires knowing what the product _is_ belongs to the product.

## 3. Non-goals

Loom is not, and must not drift toward becoming:

| Non-goal                                     | Why                                                                                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A business application framework             | Application decisions belong to the application (§4).                                                                                                                                  |
| A router                                     | Routing is application state, not interface semantics.                                                                                                                                 |
| A state-management framework                 | Application state is the consumer's; Loom owns only _interface_ state (open/closed, focus, selection-in-view).                                                                         |
| A data layer or API client                   | Data access is domain ownership by definition.                                                                                                                                         |
| An authentication or authorisation framework | Identity and permission are product decisions Loom must never make.                                                                                                                    |
| A backend framework                          | Out of the interface layer entirely.                                                                                                                                                   |
| A complete application starter               | Templates are pages, not projects — routing, auth, backend and deployment stay with the consumer ([Template contract](../templates/contract.md)).                                      |
| Merely a large generic component catalogue   | The catalogue exists to carry _decided relationships_ — tokens, semantics, composition — not to maximise component count. A control with undecided semantics does not belong here yet. |

## 4. The interface–application boundary

**Loom owns** (reusable interface decisions): visual language, accessibility,
interaction semantics, responsive behaviour, composition, interface patterns,
application layout, interface templates.

**The consumer application owns**: business logic; domain models; API and data
access; application state; authentication and authorisation; routing;
domain data persistence; application lifecycle; business-specific workflows.

The decision test: _if removing Loom would leave the decision unmade, it was
an interface decision; if making it requires knowing what the product is, it
belongs to the application._ A `Button` needs no knowledge of what is being
bought or submitted; a "CheckoutButton" is not a Loom artifact.
The first half of the test is necessary, not sufficient: the one rule's
"more than one product would reach for it the same way" remains the intake
bar — a generic affordance only one product reaches for today still belongs
to that product. And the split's two halves are not symmetrical about
_storage_: interface preferences Loom itself keeps (the theme preference
`useTheme` persists) are interface state; product data persistence never is.

**Business boundary law.** No Loom artifact acquires application or domain
ownership merely because doing so makes an example, a demo or a component
convenient. Convenience is the drift vector this constitution exists to close;
[CONTRIBUTING.md](https://github.com/ecoma-io/loom/blob/main/CONTRIBUTING.md)'s "who else would use this?" question
is this law's intake form.

## 5. Architectural hierarchy

```
Foundation
    ↓
Primitive
    ↓
Composition
    ↓
Pattern
    ↓
Layout
    ↓
Template
    ↓
Consumer Application
```

One sentence each; the full semantics — what each may own, must not own, may
depend on, and how it is tested — live in the [artifact model](./artifact-model.md):

- **Foundation** — tokens, theme, accessibility infrastructure, shared mechanisms.
- **Primitive** — a generic control an application consumes directly.
- **Composition** — spatial/interface composition with no domain meaning.
- **Pattern** — a reusable interface intent composed from primitives and compositions.
- **Layout** — reusable application-level interface structure.
- **Template** — a complete interface starting point; consumer-shaped, not part of the dependency graph.
- **Consumer Application** — owns product decisions; consumes Loom; is never a dependency of Loom.

Two readings of this pyramid are both true, and the constitution holds them
together deliberately:

**Architectural complexity may increase toward the application edge while
implementation dependencies flow toward foundations.** A Layout is a more
complex, more opinionated artifact than the Primitive it arranges — that is
the point of the edge. But complexity is not dependency licence: the higher
artifact depends on the lower one, never the reverse. Each step up composes
more and is depended on by more; each step down decides less and is depended
on by everything above it.

## 6. Dependency direction (law)

Implementation dependencies flow toward foundations. Stated as laws:

- **L1 — Downward only.** An artifact may depend on artifacts of a lower kind (and the same kind); implementation dependencies must never point upward.
- **L2 — No upward imports.** A lower layer must not import a higher one, for any reason, including types.
- **L3 — The facade is a dependency sink.** `@ecoma-io/loom` sits at the edge of the graph; nothing below the facade imports it — not even `import type`.
- **L4 — Consumer-shaped artifacts reach the facade only.** Templates, the documentation site and the E2E suites consume Loom exactly as an external consumer would — through the public API and the stylesheets. One disclosed exception: the E2E suites additionally reach the compositions through the conformance route, as licensed by the `layer-e2e` boundary row. Nothing in the library depends on them; they are the boundary's proof, not part of its graph.

Cycles are forbidden: the edge set is a DAG. The enforcement mechanics — two
readers (specifier text and resolved imports), the constraint table, and the
mutation suite that proves the gate can fail — are specified in
[the contract](./contract.md#the-checks-and-why-each-exists); the audit maps
each law to its current enforcement status.

## 7. Public package strategy

The npm public surface is exactly one package: **`@ecoma-io/loom`**.

Internal `packages/<tier>/<name>/` directories are architectural and ownership
boundaries, **not** npm package boundaries. They are never published
independently; there is no `@ecoma-io/loom-button`. Splitting Loom into
multiple public npm packages is out of scope for the current phase and is an
architecture decision that would amend this constitution, not a packaging
incident. The narrow subpaths (`/a11y`, `/theme`, `/styles/*`) exist only
where the main entry is the wrong shape for a consumer, per
[the contract's public API section](./contract.md#the-public-api).

## 8. Consumer and template boundary

Templates, examples, showcases and every consumer-shaped project in this
repository consume Loom through the public API wherever practical. Living
inside the monorepo grants no internal-path privilege: an import a consumer
cannot write is a defect here, not a convenience. A template must be usable
as if it were an external consumer of Loom, and the
[template contract](../templates/contract.md) holds each one to that with its
own gates. Templates contain no business logic, no backend integration, no
authentication, no domain-specific persistence and no hidden dependencies on
Loom internals.

## 9. Quality principles

The enforceable versions of these live in the [interface contract](./interface-contract.md);
the principles come first:

- **Accessibility is not a follow-up.** A defect here is exported to every consuming product at once.
- **Responsive behaviour is composed, not written per product.** Artifacts define meaningful behaviour across available space.
- **Theming flows through tokens.** Visual decisions ride Loom's token mechanisms or they are not Loom decisions.
- **Semantic interaction is decided per role.** Keyboard, focus, dismissal, state and accessibility behaviour are defined, not incidental.
- **Public API is deliberate.** Everything a consumer can import is there on purpose, documented, and paired with its artifacts.
- **Behaviour is preserved across refactors.** Restructuring never silently changes what a consumer experiences.

## 10. Evolution principles

- **Document before moving.** Classification precedes migration; a rename without a recorded decision is drift, not progress.
- **Document conflicts; never silently resolve them.** When the constitution and the current tree disagree, the disagreement gets a written record (audit, gap analysis) before any code moves.
- **Gates must be able to fail.** An enforcement rule without a demonstrated violation is a hope; the mutation suite is part of the law, not a luxury.
- **Terminology is architecture.** Renaming an artifact kind is an architecture decision with a rationale, weighed against the confusion it buys its way out of.
- **Migration is incremental and led by the ledger.** The artifact matrix (Phase 1) records intended types per artifact; refactors consume it one row at a time.
- **Scope changes amend this document first.** Identity, non-goals and laws change through a PR that argues the change here — implementation never leads identity.

## 11. The intake path

Every artifact this repository accepts walks the same seven steps, in this
order. Each step names the document that decides it and the gate that fails
the pull request when the step is skipped — the path cites its homes and owns
only the sequence, because a requirement restated here is a second copy
waiting to drift. The order is the law: each step decides what the next one
needs, and implementing before classifying is the drift §10's first principle
names.

1. **Classification — decide whether Loom holds it at all, and what it is.**
   Apply [the one
   rule](https://github.com/ecoma-io/loom/blob/main/CONTRIBUTING.md#the-one-rule-that-decides-most-questions)
   and the interface–application boundary (§4). A candidate whose intent can
   only be told in domain vocabulary is rejected at intake; the
   [pattern contract](../patterns/contract.md)'s second-product rule is that
   rejection worked into three questions. Then place the artifact in the
   hierarchy (§5) by [the artifact model](./artifact-model.md)'s kind
   semantics — may own, must not own, may depend on, testing expectations. A
   candidate that argues for two kinds is an architecture decision: the ADR
   lands in `docs/architecture/decisions/` and the evolution ledger's
   decisions-of-record table indexes it. The tier's dependency ceiling is the
   gate — an artifact landed in a tier whose edges it needs fails both
   architecture readers (`tools/check-architecture.ts`, `archkeep check`) —
   while the judgement itself is review-held, because no gate reads intent.

2. **Ownership — give the decision a place in the graph.** The
   [artifact matrix](./artifact-matrix.md) is the per-artifact classification
   ledger of record; a reclassification updates it in the same PR.
   Mechanically, ownership is the Moon project graph: a `moon.yml` per package
   carrying its `layer-*` tag, `deps:` edges mirrored from `package.json` by
   `tools/sync-moon-deps.ts` (a hand-declared `# preserved` line for an edge
   the manifest cannot express), and a boundary row per layer in
   `module-boundaries.config.mjs`. Naming a new fixed foundation package is a
   registry dance, and [the contract](./contract.md) is its checklist. The
   gates: `tools/check-architecture.ts` (declared deps equal the manifest's
   workspace deps; every component directory is a Moon project), archkeep (a
   project that loses its tag drops out of every constraint row and is
   reported for it), and `pnpm archkeep:mutations` in the same PR that touches
   the boundary config or any tag — the gate on the gate.

3. **Validation — run the standing order.** `pnpm lint` is the order the
   repository enforces: ESLint, then the artifact, record, census and evidence
   gates, then both architecture readers, then API parity, doc claims and the
   skills mirror. Local validation is lint, typecheck, build and archkeep; the
   browser suites run in CI, and the affected boundary is moon's to answer
   (`moon query projects --affected --downstream deep`, fed back as explicit
   `:test` targets). The chain is the gate — it exits non-zero naming the
   file, and archkeep's exit 3 means a checker could not reach a verdict,
   which is never read as a pass.

4. **Quality contracts — the promises the artifact inherits.** The
   [interface contract](./interface-contract.md) decides what every artifact
   honours regardless of kind, in its three categories, and states the
   new-artifact duties under each contract. The tiers add law beside it: the
   pattern contract's canonical record, the layout pages' four obligations,
   the [template contract](../templates/contract.md)'s file set and swap-point
   shape. The gates are those contracts' own tools —
   `check-a11y-evidence.ts`, `check-responsive-evidence.ts`,
   `check-interaction-evidence.ts`, `check-token-allowlist.ts`,
   `check-composition-conformance.ts` — each holding its claims to a closed
   vocabulary and counting named exceptions instead of failing on them.

5. **Implementation — write the artifacts in the order that keeps each
   honest.** A component is six artifacts, and the `add-component` skill
   (`.claude/skills/`, mirrored to `.agents/skills/` and synced by
   `pnpm sync-skills` — never hand-edited) walks them in the order that never
   leaves a half-landed component behind: source, barrel, test, docs page with
   its `<!-- @api <Name> -->` marker, facade export, `a11y.json` claim. The
   skill is read, not reinvented, and a sibling in the same tier is the shape
   to copy. A pattern or a template walks its own contract's adding section
   instead; a new artifact kind is not an implementation step at all but the
   classification decision of step 1. The gates:
   `tools/check-component-artifacts.ts` names every missing file, the docs
   build fails a page whose marker resolves to nothing, and
   `tools/check-api-parity.ts` holds marker and export together.

6. **Consumer evidence — prove it from where a consumer sits.** The claims
   are declared, not derived: the `a11y.json` sidecar names the role and the
   interaction class no reader can infer from source, cites the files that
   witness them, and records an exception with its reason for every
   requirement nothing answers yet. The tiers that witness behaviour are the
   three Playwright configs of `playwright/profiles.ts` — a component's own
   harness specs, the root sweep over the built site, the template suite — and
   they run in CI, not on a laptop. The composition conformance route holds
   each rendered layout twin to its engine twin; the consumer escape rate
   (`docs/templates/escape-rate.md`, re-derived by `pnpm escape-rate`)
   measures what a template's consumer still owns — a measurement,
   deliberately not a gate. The evidence gates
   (`check-a11y-evidence.ts`, `check-responsive-evidence.ts`) verify every
   cited file exists and count the named exceptions.

7. **Public API — the surface a consumer imports.**
   `packages/loom/src/index.ts` is the public API, its docblock says so, and a
   component's export lands in it in the same change as the component. A
   subpath exists only where the main entry is the wrong shape — declared in
   the root `exports` map, emitted by the build, documented. A deliberate
   withhold is a machine-parsed record in that same file, with its reason. The
   gate: `tools/check-api-parity.ts` — exports, build entries, declarations,
   stylesheets, docs markers and docs references held to one surface; any
   drift fails the PR.

A step's document owns its requirement; this section owns the sequence. What
has walked the path is a status, and statuses live in the audit and the
ledger, never here.

## 12. Program completion criteria

The evolution plan's exit is that these criteria hold, checked by a fresh
agent reading the repository alone — no external system, no memory of the
program, no claim taken from a document that merely asserts it. Each item
states the criterion and the check that re-derives it. Where a check names a
number, the number is a current value the command re-derives, recorded so a
drift is visible — the criterion is the statement, never the figure. A
criterion that stops holding is a regression to file; a check whose mechanics
moved is corrected by the PR that moved them, without a separate amendment
(see the amendment rule).

1. **The documentation model holds.** Every architecture document opens by
   naming its role through the model, and the model's role table maps every
   document there is. Check: `node --experimental-strip-types
tools/check-doc-claims.ts` (its second claim, inside `pnpm lint`); read
   `docs/architecture/README.md` against the directory listing.

2. **The ledger is complete against the plan.** Every work item the plan
   names is accounted for by a ledger row — a plan bullet may map to more
   than one row, or rows may combine bullets, the Phase column records the
   mapping — and every row's status is one of the ledger's own statuses. The
   ledger, not the plan, is the status of record. Check: read
   `docs/architecture/evolution-plan.md` against the Phase column of
   `docs/architecture/evolution-ledger.md`, and the status vocabulary at the
   ledger's head.

3. **The gates are healthy.** From a fresh checkout, local validation exits
   zero end to end. Check: `pnpm install --frozen-lockfile && pnpm lint &&
pnpm typecheck && pnpm build && pnpm docs:build` — the chain fails naming
   the file, so silence is the pass.

4. **The gates can fail.** The boundary constraint table still selects
   projects and still catches every violation it names. Check:
   `pnpm archkeep:mutations` — every mutation reported, every file restored.

5. **The classification ledger re-derives.** The artifact matrix's census
   sentence is recounted against the committed tree, and its command block
   reproduces the counts — 76 primitives, 9 compositions, 13 patterns,
   9 layouts and 3 templates at this writing. Check: the same gate's first
   claim, plus the `git ls-tree HEAD --name-only <tier> | wc -l` commands in
   the matrix preamble.

6. **The canonical layers are enumerated by their own gates.** Every shipped
   pattern's page carries its `intent:` and its record marker; every layout
   page states its four obligations under the census gate; every template
   directory carries the template contract's file set and manifest shape.
   Check: `tools/check-pattern-records.ts`,
   `tools/check-layout-obligations.ts` and `tools/check-template-artifacts.ts`,
   all inside `pnpm lint`.

7. **The template families are anchored, and membership re-derives.** Every
   family in the canonical families table names an anchor the layout tier
   ships, and the members on disk are the census the page states. Check: read
   the table in `docs/templates/contract.md` against `docs/layouts/`; `git
ls-tree HEAD --name-only templates/ | wc -l`.

8. **The escape-rate baseline re-derives.** What the tool prints is what the
   page commits. Check: `pnpm escape-rate`, compared line for line with the
   baseline in `docs/templates/escape-rate.md` — 3 templates, 10 escape
   points across 3 categories at this writing.

9. **The evidence claims are declared and counted.** Every component directory
   carries its `a11y.json` sidecar — the count equals the four component
   tiers summed, 107 at this writing — and the evidence gates pass with
   named, counted exceptions rather than silent absences. Check: `git
ls-files '*a11y.json' | wc -l`; `tools/check-a11y-evidence.ts`,
   `tools/check-responsive-evidence.ts` and
   `tools/check-interaction-evidence.ts` in `pnpm lint`, whose summaries
   print the exception counts they accept.

10. **The public surface is one package and parity-checked.** Every manifest
    under `packages/` is private and carries no publish metadata, and the
    exports chain — map, build entries, declarations, stylesheets, docs
    markers, docs references — agrees with itself. Check:
    `tools/check-manifest-privacy.ts` and `tools/check-api-parity.ts` in
    `pnpm lint`; read the docblock of `packages/loom/src/index.ts`, which
    claims the complete surface and is held to the claim.

11. **Positioning holds on the surfaces that own it.** The positioning phrase
    resolves on the four surfaces that carry it — the README, the npm
    description, the docs landing, the templates landing — and the README
    stands in its authored section structure, ten H2s at this writing. Check:
    `grep -l "An Application Interface System" README.md package.json
docs/index.md docs/templates/index.md`; `grep -c "^## " README.md`.

12. **Decisions are of record.** Every ADR under
    `docs/architecture/decisions/` is indexed in the ledger's
    decisions-of-record table, and every ADR the architecture documents cite
    resolves to a file. Check: `ls docs/architecture/decisions | wc -l`
    against the table's rows; resolve each cited path.

13. **The intake path is walkable.** §11 names, for each of the plan's seven
    steps, the document that decides it and the gate that fails it, and every
    file, command and document §11 names exists. Check: resolve each citation
    with `ls` and `grep` — the walk a fresh agent performs before trusting the
    path.

14. **The amendment rule stands.** This document ends in its amendment rule,
    with §§1–8 and §§11–12 changing through it and §9–10 through the
    principle test. Check: read the last section of this document.

## Amendment rule

A change to §§1–8 is a constitutional amendment: it requires its own PR with
the rationale written into the document, and it is reviewed as an
architecture decision. Changes to §9–10 follow the same path when they alter
a principle, not merely its wording. §§11–12 amend the same way — the intake
path and the completion criteria are program law. The one mechanical
exception: a §12 check whose command moved, or whose gate was renamed or
re-homed, is corrected by the PR that moved it, without a separate amendment.
That is enforcement mechanics following the tooling, the split this
document's preamble draws — not a change in what completion means.
