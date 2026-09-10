# Consumer escape rate

Taking an Official Template into an application is a sequence of decisions.
Most of them are answers Loom has already made — every visual value on the
page comes from the published tokens, every control is named through the
published components, every state a real API would drive is already wired.
Some are not. The **consumer escape rate** counts the ones that are not: the
interface decisions a consumer still makes, measured against the templates
themselves.

[Phase 5D](../architecture/evolution-plan.md) of the architecture-evolution
program asks for exactly this — "how much custom CSS, layout, accessibility
and interaction work a consumer still owns" — measured, and re-derivable from
the tree. The templates are the measurement surface because they are the
repository's only real consumers: pages that import the published
`@ecoma-io/loom` package and nothing else, held to the same bar a copied
template is ([the contract](/templates/contract)).

## The method

[`tools/measure-escape-rate.ts`](https://github.com/ecoma-io/loom/blob/main/tools/measure-escape-rate.ts)
reads every directory under `templates/` and counts escape points per template
and per category, from the templates' own sources. It adds no markers to
template code, touches no network, and prints one deterministic line:

```
Escape-rate baseline: 3 template(s), 10 escape point(s) across 3 categories.
  analytics: 6 (custom-css 0, manual-a11y 0, behaviour 6)
  starter: 2 (custom-css 0, manual-a11y 1, behaviour 1)
  workspace-settings: 2 (custom-css 0, manual-a11y 0, behaviour 2)
  by category: custom-css 0, manual-a11y 1, behaviour 9
```

Run `pnpm escape-rate` to re-derive it against the current tree. This is a
measurement, deliberately not a gate: the tool runs in no lint chain and no CI
leg, and compares no number against a threshold. A ceiling would police
template work instead of documenting the ownership split, and a measurement
that could fail a build would be a rule about templates rather than a fact
about them. What keeps the number honest is that it is re-derivable — the
command above is its whole provenance.

## What counts, and what does not

Three categories. Each signal carries its in/out line, because a count
without a definition is a number nobody can check.

### Custom CSS

Visual decisions the published scale cannot express.

| Signal            | Counts                                                                                                                                                                                                                | Does not count                                                                                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arbitrary values  | Every `[...]` inside a `class` / `:class` value (`w-[9rem]`) — the one spelling for a value outside the published utility scale.                                                                                      | Stock utilities (`flex`, `py-8`, `text-sm`) — the composition idiom Loom itself documents; component props carrying sizes (`min-col-width="14rem"`) — published API, not CSS the consumer writes. |
| Inline styles     | Every `style` / `:style` attribute in the page's markup.                                                                                                                                                              |                                                                                                                                                                                                   |
| Style blocks      | Every `<style>` block in the template's `App.vue`.                                                                                                                                                                    |                                                                                                                                                                                                   |
| Stylesheet blocks | Every CSS block in `src/styles.css` beyond the declared `@import` and `@source` at-rules — the two declarations the contract's file set and the README already name as in-repo scaffolding a copied template deletes. | The `@import` and `@source` declarations themselves.                                                                                                                                              |

### Manual accessibility

Naming the consumer's own semantics.

**Counts:** `aria-*`, `:aria-*`, `role` and `:role` written on a plain
(non-Loom) element — `<nav aria-label="Starter">`, a `role` a page needs and
no component supplies.

**Does not count:** the same attributes on a Loom component.
`sidebar-aria-label` on `AppShell` is that component's own prop; a `Switch`
named through `aria-labelledby` from the visible span beside it is
composition — the published contract working, the exact work the library
exists to carry. Accessible names arriving through component props
(`Field label="…"`, `PageHeader title="…"`) are likewise the published
surface, not escape.

The line is stated this way on purpose. Naming a plain `<nav>` is work no
library can carry — the landmark belongs to the consumer's application — and
it is counted because it is real accessibility writing a consumer still does,
not because it is a defect. The reading below says what each non-zero means.

### Behaviour

What happens next.

| Signal           | Counts                                                                                                                                                                                        | Does not count                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Event bindings   | Every `@event` / `v-on:event` in markup — the seam where the consumer's behaviour takes over, and where the contract's [swap points](/templates/contract) sit.                                | `v-model` / `v-model:prop` — the published controlled-state contract.  |
| Sortable columns | Every `sortable: true` in the template's own column configuration — `DataGrid` cycles the sort state and never reorders the rows, so each sortable column is one reorder the host implements. | Columns without `sortable` — rendering a cell is the component's work. |
| Focus work       | Every `tabindex` attribute and programmatic `.focus()` call.                                                                                                                                  | Focus visibility and ring behaviour — carried by the published styles. |

Arrangement written with stock layout utilities is deliberately absent from
the behaviour category, and that is the honest reading of the plan's "layout
work": composing `Stack`, `Grid` and utilities is how a Loom page is written —
Loom's own documentation composes the same way. Layout escape would be layout
the published scale cannot express, and that is an arbitrary value or a
stylesheet block, counted under custom CSS.

## The baseline

Measured against the three-template census of [Phase 5C](../architecture/evolution-plan.md)
— Analytics, Starter, Workspace settings:

| Template                                                                                                | Custom CSS | Manual accessibility | Behaviour | Total  |
| ------------------------------------------------------------------------------------------------------- | ---------- | -------------------- | --------- | ------ |
| [Analytics](https://github.com/ecoma-io/loom/blob/main/templates/analytics/README.md)                   | 0          | 0                    | 6         | 6      |
| [Starter](https://github.com/ecoma-io/loom/blob/main/templates/starter/README.md)                       | 0          | 1                    | 1         | 2      |
| [Workspace settings](https://github.com/ecoma-io/loom/blob/main/templates/workspace-settings/README.md) | 0          | 0                    | 2         | 2      |
| **All templates**                                                                                       | **0**      | **1**                | **9**     | **10** |

Reading the numbers:

- **Custom CSS is zero on every template.** Every visual value on all three
  pages flows through the published utilities and tokens — no arbitrary value,
  no inline style, no stylesheet of the template's own. This is the
  strongest statement the metric makes: the theming contract holds end to end.
- **Analytics carries the largest share (6), and all of it is the data
  surface.** Four sortable columns — the host-side comparator `DataGrid`
  delegates by design — and two event seams: `load()`, the API swap point the
  contract names, and the empty state's clear-filter action. The status
  filter itself is composition (`v-model` on `Select`); the row-derivation it
  drives is the same host obligation the sortable count stands for, so it is
  not counted a second time.
- **Starter's 2 are the page's own territory:** naming its `<nav>` landmark,
  and wiring the theme toggle to the published `useTheme` composable.
- **Workspace settings' 2 are the form's seams:** the native form's
  `@submit.prevent="save"` — the API swap point — and the reset handler.

Zero is not "nothing to do". A consumer always owns their data, their routing
and their backend; the contract reserves those for the application on
purpose. What the zero says is narrower and more useful: nothing on these
pages asks the consumer to re-create a decision Loom could have carried.

## Why the numbers are committed next to the tool

The site's token tables are rendered from `theme.css` at build time, and the
obvious question is why these numbers are not. Rendering them that way needs
the counting logic inside a docs plugin, and the only way to get there from
the tool is a second, twin implementation — the tooling/docs boundary the
architecture readers judge has both sides keeping their own parser in step
[by hand](https://github.com/ecoma-io/loom/blob/main/tools/check-layout-obligations.ts),
with a comment for a leash. Doubling the parser buys build-time freshness for
a measurement that is deliberately not enforced at build time. A committed
baseline plus the tool that re-derives it keeps every figure re-derivable —
which is the law this repository actually holds — at one parser and one
place to read the definitions from.
