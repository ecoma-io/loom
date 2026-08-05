## Description

<!-- What changes, and why. Link the issue this closes. -->

Closes #

## Type of change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New component / block
- [ ] Design token or theme change
- [ ] Accessibility fix
- [ ] Breaking change (a consumer must edit code to upgrade)
- [ ] Documentation
- [ ] Build, CI, or repository tooling

## Consumer impact

<!-- A design system exports its defects to every product at once. Say what a
consumer sees after upgrading — visually, in the API, in behaviour. Write "none"
if nothing changes for them, and say so explicitly rather than leaving it out. -->

- [ ] No public API change (props, events, slots, exported token names)
- [ ] Public API changed, and the change is described above

## Accessibility

<!-- Delete this section only if the change touches no rendered output. -->

- [ ] Every interactive element has an accessible name
- [ ] The change is operable by keyboard alone, and focus is visible throughout
- [ ] Focus is restored to the trigger when an overlay closes
- [ ] No state is conveyed by colour alone
- [ ] Motion respects `prefers-reduced-motion`

## How this was verified

<!-- What you actually ran and saw, not what should happen. -->

**Steps:**

1.
2.

- [ ] Unit tests added or updated (`pnpm test`)
- [ ] End-to-end tests added or updated (`pnpm e2e`)
- [ ] Checked manually in a browser, light and dark

## Screenshots

<!-- Before / after for any visual change. -->

## AI-assisted development

- [ ] This pull request is AI-assisted (drafted or substantially written by an AI coding agent)
- [ ] Each such commit carries its disclosure trailer: `Assisted-by: <tool>`, or `Generated-by: <tool>` where the tool produced substantially the whole commit

<!-- Name the tool and model, e.g. "Claude Code, opus". A description can be
edited later and no clone carries it — the commit trailer travels with the code. -->

## Checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm format:check` all pass locally
- [ ] I have self-reviewed this diff
- [ ] Documentation is updated in the same pass as the behaviour it describes
- [ ] No unrelated changes are included
- [ ] I have the right to contribute this work under the Apache License 2.0
