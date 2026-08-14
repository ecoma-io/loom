# Accessibility

`CONTRIBUTING.md` states the standard as a checklist every rendered change is
held to, not a follow-up pass: every interactive element has an accessible
name, the whole flow is operable by keyboard alone with focus visible
throughout, focus returns to the trigger when an overlay closes, no state is
conveyed by colour alone, and motion has a `prefers-reduced-motion` path. An
accessibility bug is filed and fixed as a bug, the same as any other.

## `WCAG_TAGS`

```ts
// src/lib/a11y-scope.ts
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;
```

This is the exact scope Loom holds itself to when an automated tool (axe) is
run against it: the assistive-technology and keyboard rule sets, not axe's
broader SEO and document-structure best-practice checks — a component
library cannot know what document it will end up rendered into, so a rule
about the surrounding document is the consumer's to answer, not Loom's.
Wherever more than one process runs an axe scan against this library, this
one array is what both read, so neither can quietly drift into disagreeing
about what counts as a violation.

`wcag22aa` is present but `wcag22a` is not, because axe does not carry one:
WCAG 2.2 Level A introduces three new success criteria (2.4.11 Focus Not
Obscured, 2.4.13 Focus Appearance, 2.5.8 Target Size), but axe-core tags
all three under `wcag21a` since each is also a 2.1 A rule by inheritance.
Loom tests for those criteria separately — the target-size and
focus-not-obscured e2e tests cover what axe does not yet automate.

## Why it ships from `@ecoma-io/loom/a11y`

```ts
// src/a11y.ts — the complete file
export { WCAG_TAGS } from "./lib/a11y-scope";
```

The package's main entry re-exports every component, which makes it
unresolvable for a tool that compiles no Vue single-file component at all —
a CI script, an end-to-end runner driving a built page. `@ecoma-io/loom/a11y`
is a second, narrow entry point that exports nothing but this array, so a
consumer that needs only the WCAG scope can read it without pulling in the
rest of the library.

## Focus rings are a promise

```css
/* src/styles/global.css */
:focus-visible {
  outline: 2px solid var(--color-ring);
  outline-offset: 2px;
}
```

That base rule covers plain elements; nearly every interactive primitive adds
`focus-visible:shadow-halo` on top of it — the primary-coloured haze documented
on the [Elevation](./elevation) page — layered around the outline rather than
instead of it. The outline is never removed without something at least as
visible replacing it, which is why the halo is additive: whatever suppresses
a box-shadow still leaves the crisp 2px outline underneath.

<Demo title="Tab into this row">
  <input
    class="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:shadow-halo"
    placeholder="Tab to me"
  />
</Demo>

## Forced colors

`theme.css` names the constraint directly in the comment beside
`--shadow-halo`: the halo is added **around** the crisp outline rather than
replacing it, specifically so the outline still shows under a forced-colors
mode, where a browser overrides most author colours (including a soft
box-shadow) but respects a real `outline`. Loom does not carry a dedicated
`forced-colors` stylesheet of its own — the halo's layering rule is what
keeps the ring itself intact under that mode, by construction, rather than by
a separate override rule reacting to it.
