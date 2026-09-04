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

## Status

The [template contract](/templates/contract) is defined, and the first
template proves it buildable: the [starter](https://github.com/ecoma-io/loom/blob/main/templates/starter/README.md)
— a runnable consumer of the published package, held to the contract's file
set, boundary and build. This page lists each template as it lands.
