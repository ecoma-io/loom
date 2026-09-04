# Templates

An Official Template is a complete, runnable application built on Loom and
maintained in this repository. Where a [block](/blocks/app-header) is a
component you compose with and a [pattern](/patterns/forms) is a worked
example explained in prose, a template is a starting point: a codebase a team
copies, deploys and grows — the way a project actually begins.

Templates consume the public `@ecoma-io/loom` package exactly as an external
consumer would. No internal imports, no source aliases, nothing the published
package does not have. If a template cannot build against the published
surface, that is a defect in the surface, and it is filed as one.

## What belongs here

- A whole application skeleton — shell, navigation, real pages — not a single
  region (that is [Blocks](/blocks/app-header)) and not a page-scale
  component (that is [Layouts](/layouts/app-shell)).
- Responsive behaviour, both themes and the keyboard path working end to end:
  a template is held to the same accessibility bar as the library, because
  every product started from it inherits whatever it ships.
- A short README — what the template is, how to run it, what to change first.

## What does not

- Anything the published package cannot express. A template is a consumer,
  never a fork of one.
- A composition whose purpose is to be read rather than started from — that
  is the [Showcase](/showcase/)'s job.

## The templates

### SaaS shell

A complete application shell for a SaaS product: `AppShell` + `SidebarNav`
navigation around a dashboard (derived metric cards, a sortable and filterable
customer `DataGrid` with its empty-state pairing) and a settings form
(`FormLayout`, `Field`-wrapped controls, native form submission). The
composition a data-heavy product copies first.

[README](https://github.com/ecoma-io/loom/blob/main/templates/saas-shell/README.md)

## Status

The [template contract](/templates/contract) is defined. The starter proves it
buildable, and the SaaS shell is the first production template — the contract's
file set, boundary and build, plus the page-scale composition the starter
deliberately omits. This page lists each template as it lands.
