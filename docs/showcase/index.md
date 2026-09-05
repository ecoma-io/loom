# Showcase

> **Showcase = look what Loom components can do together. Template = take this
> page and build on it.**

A showcase is a demonstration, not an artifact to copy. It composes Loom's
components and patterns into one realistic screen or flow — real interaction,
real state, a layout that holds together from phone width to ultrawide — and
lives in this documentation site, rendered by the same components it
demonstrates. It exists for discovery and teaching: to show what the parts
produce when they are composed with care. If you want a starting point rather
than a demonstration, that is what [Templates](/templates/) are for.

## What belongs here

- Compositions that cross categories — navigation, header, content, forms,
  feedback on one surface. Rendering one component alone is the component
  page's job, and every component page already does it.
- Meaningful interaction and state: a dialog that opens, a form that
  validates, a list that empties. Not a static picture.
- Source that reads as the lesson: a developer building the same thing can
  trace every region back to the component, block or layout providing it, and
  follow a link to each one.

## What does not

- A gallery of isolated components — the [Primitives](/components/button)
  pages are that, already.
- A starting point to copy into a product. A showcase is read, not taken —
  that is a [template](/templates/)'s job.
- An implementation duplicated out of the library. A region worth
  standardising belongs in [Blocks](/blocks/app-header), and the showcase
  consumes it.
- An application. No routing, no auth, no backend, no deployment — a showcase
  runs where it is written, in this site.

## Showcases

- **[Invite your team](/showcase/invite-teammates)** — the first canonical
  demonstration: a member list that starts empty, an invite dialog over a
  validated form, a live region and a toast confirming the send, and the
  list growing — real interaction and state the reader drives. Source:
  [InviteTeammatesShowcaseDemo.vue](https://github.com/ecoma-io/loom/blob/main/docs/demos/InviteTeammatesShowcaseDemo.vue).

- **[Triage the inbox](/showcase/inbox-triage)** — the second canonical
  demonstration: a two-pane support inbox that starts loaded and shrinks as
  the reader works it — a filter that ends in an honest empty state, a
  reply drawer over a validated field, archive and delete behind row menus
  and a destructive confirmation, a live region and a toast answering every
  state change, and a host-assembled ⌘K palette over the inline command
  listbox. Source:
  [InboxTriageShowcaseDemo.vue](https://github.com/ecoma-io/loom/blob/main/docs/demos/InboxTriageShowcaseDemo.vue).
