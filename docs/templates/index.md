# Templates

An Official Template is a copyable, prebuilt **page** — a starting point
composed from Loom components and patterns that a team takes into their
application and builds on: AI Chat, Chat, Dashboard, Music Player, Settings,
Analytics, Inbox. Where a [block](/blocks/app-header) is a component you
compose with and a [pattern](/patterns/forms) is a worked example explained in
prose, a template is a page you start from.

The sentence that keeps the layers apart:

> **Showcase = look what Loom components can do together. Template = take this
> page and build on it.** A [showcase](/showcase/) is read; a template is
> copied.

Templates consume the public `@ecoma-io/loom` package exactly as an external
consumer would. No internal imports, no source aliases, nothing the published
package does not have. If a template cannot build against the published
surface, that is a defect in the surface, and it is filed as one.

## What belongs here

- One page's composition — a real, complete page, not a single region (that is
  [Blocks](/blocks/app-header)) and not a page-scale shell component (that is
  [Layouts](/layouts/app-shell)).
- Fixture data with the swap points called out: where your API call goes, where
  your state lives. Everything a page needs to be real before the backend
  exists.
- Responsive behaviour, both themes and the keyboard path working end to end:
  a template is held to the same accessibility bar as the library, because
  every product started from it inherits whatever it ships.
- A short README — what the page is, how to run it, what to change first.

## What does not

- Application territory: routing, auth, a backend, a database, business logic,
  multi-page navigation. A template is one page; the application around it
  belongs to the consumer, and nothing here ships one.
- Anything the published package cannot express. A template is a consumer,
  never a fork of one.
- A composition whose purpose is to be read rather than started from — that is
  the [Showcase](/showcase/)'s job.

## The templates

### Analytics

An analytics page: `PageHeader`, four `MetricCard`s derived from the same rows
the `DataGrid` shows (one loading flag drives the card skeletons and the row
skeleton together), a sortable and filterable grid whose ordering the host
computes, and the `LoadingState` / `EmptyState` pairing around a filter that
matches nothing. The page a data-heavy product builds first.

[README](https://github.com/ecoma-io/loom/blob/main/templates/analytics/README.md)

## Status

The [template contract](/templates/contract) is defined. The starter proves it
buildable, and Analytics is the first production page template — the contract's
file set, boundary, build and browser gates, plus the page-scale composition
the starter deliberately omits. This page lists each template as it lands.
