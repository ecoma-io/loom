# Loom Constitution

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

## Amendment rule

A change to §§1–8 is a constitutional amendment: it requires its own PR with
the rationale written into the document, and it is reviewed as an
architecture decision. Changes to §9–10 follow the same path when they alter
a principle, not merely its wording.
