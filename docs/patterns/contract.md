# Pattern contract

A Pattern is a reusable interface intent formed from primitives and
compositions — recurring interface semantics that stop short of domain. The
[artifact model](/architecture/artifact-model) owns that taxonomy and what
the kind may own; this page states the law a pattern entry is held to before
it ships: the second-product intake rule, and the canonical record every
entry carries. They are asserted by the repository's gates rather than by a
reviewer's memory, in the same spirit as the [template
contract](/templates/contract).

## Why a contract

Both failure modes this page exists for are silent. A pattern that names one
product's region instead of an arrangement still compiles, still passes its
tests, still renders in the docs — the only symptom is a layer that drifts
domainward one convenient entry at a time, until a second product reaches for
the pattern layer and finds nothing written for it. A pattern page with no
record fails just as quietly: prose that narrates a component reads like
documentation while stating neither the intent the pattern standardises nor
the evidence tier it carries. Nothing in a normal build has an opinion about
a claim that was never written, so the pairing is asserted here rather than
left to whoever reviews the pull request remembering to ask.

## The second-product intake rule

**An entry is canonical iff the intent it standardises is stated in
arrangement vocabulary — and it is rejected at intake if the intent needs
domain vocabulary.** Arrangement vocabulary describes the structure and
behaviour of a region: what it is made of, how it responds, what it must
never do. Domain vocabulary names the product, market or document type the
region first appeared in: its workflow, its industry, its window model. A
region whose intent can only be told in domain words is one product's region,
however useful it was to the product that inspired it — usefulness to one
product was never the test. Usefulness to the second one is.

Three questions apply the rule to a candidate entry:

1. **Subject swap.** Rewrite the intent with the region's contents replaced
   by any other product's. If it still names the same arrangement, the intent
   is arrangement vocabulary; if it collapses into nonsense, the entry was
   named for its subject matter.
2. **Second shipper.** Could a second product ship this region, under the
   same name and the same stated intent, without translating either? A
   rename at adoption time is the intake rejection telling you the name was
   the domain all along.
3. **Ownership check.** Does the entry own anything the artifact model's
   Pattern row forbids — business logic, domain models or field semantics,
   data access, application state? Ownership of domain meaning is rejection,
   whatever the name says.

Worked examples of the rule, one of each kind:

- **Passes.** EmptyState: "a region with nothing to show — icon, title,
  optional description, at most one call to action, centered." Every word is
  arrangement. Swap the empty region's subject from a document list to a
  search result to a message thread and the intent survives untouched, which
  is why any product reaches for it the same way.
- **Fails.** A `CheckoutSummary`: "the region a commerce product renders
  before payment — order lines, tax, totals." Every noun after "region" is
  commerce vocabulary; a second product in any other domain has no checkout
  to summarise. The arrangement hiding inside it — a titled list of line
  items beside a computed total — may be canonical someday, but it would
  enter under an arrangement name after the subject swap, not as this entry.
  Rejection at intake is not a judgement of the code; it is where the entry
  is told to come back with a different name.

## The canonical record

Every shipped pattern documents two facts on its page, each single-sourced:

| Fact          | Authored where                                            | Rendered by                                  |
| ------------- | --------------------------------------------------------- | -------------------------------------------- |
| Intent        | the page's frontmatter, `intent:` — one sentence          | the `<!-- @pattern-record <Name> -->` marker |
| Evidence tier | the component's `a11y.json` — the claim the gates enforce | the same marker, at build time               |

The split is deliberate. The intent is a judgement — nothing in the tree
derives it — so it is authored exactly once, in the one place both a reader
and a gate look, and the page body never restates it as law. The evidence
tier is the opposite case: it is data, the a11y evidence claim
`tools/check-a11y-evidence.ts` already holds every component to, and quoting
it in prose would be a copy that drifts — the published record and the
enforced claim would agree only until one of them was edited. So the record
renders the sidecar's tiers, one row per contract tier with absences shown as
absences, its qualified entries with their scope, and the named exceptions
the gate counts. Generated, never transcribed.

Two mechanisms carry the record:

- `tools/check-pattern-records.ts` — runs inside `pnpm lint`, and fails
  naming each pattern whose page lost its `intent:`, lost its marker, carries
  the marker twice, points the marker at another pattern, or picked up a
  marker that pairs with nothing shipped.
- the `loom:pattern-record` docs plugin — a marker it cannot render is a
  build error naming the page, never a silently empty section: an unknown
  pattern, a missing or malformed intent, an unreadable sidecar and an
  evidence tier the contract does not name all stop the build.

## What a pattern is not

- **Not a domain region.** The intake rule above; this is the one that
  rejects entries.
- **Not a layout.** Application-scale geometry — shells, master/detail
  splits, dashboard structure — is the [Layout](/layouts/app-shell) tier's.
  A pattern owns one region; a layout owns the screen the regions sit in.
- **Not a primitive or a composition.** A pattern owns the composed
  interaction semantics of a region — the accessibility decisions and the
  arrangement agreed once so call sites cannot drift. Where no semantics are
  composed, the arrangement belongs to the [composition](/composition/stack)
  tier.
- **Not a worked example.** The Forms and Menus pages share this directory
  and explain how the tier composes; they are documentation, not shipped
  kinds, and the naming collision they carry is recorded in the artifact
  model. They carry no record and answer no intake.

## Adding a pattern

1. **Write the intent first**, in the frontmatter, in arrangement
   vocabulary. If it takes domain vocabulary, it is not a pattern yet — file
   the arrangement it might standardise instead of shipping the region.
2. Walk the `add-component` skill for the six artifacts; the pattern tier is
   enumerated like the others, and nothing registers by hand.
3. Run `pnpm lint` — the record gate names anything missing, beside the
   artifact, a11y and responsive gates the component is already held to.
4. Run `pnpm docs:build` — the record must render, not merely exist.
5. Open the pull request against this page: the intake rule is the review
   bar the entry was written to.

## Status

Enforced today: the record's presence and shape across every shipped pattern
(the record gate), the record's rendering being the sidecar rather than a
copy of it (the docs plugin, fail-closed at build time), and everything the
six-artifact, a11y and responsive gates already held the tier to. Not
enforced: the intake judgement itself — whether a stated intent is truly
arrangement vocabulary is applied in review against the rule above. A gate
that keyword-matched domain words would read as enforced while judging
nothing; the honest state is a stated rule, a checked record, and a reviewer
who applies the first to the second.
