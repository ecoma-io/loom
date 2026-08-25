# Skills — generated, do not edit

Two directories hold the same skills because no single directory reaches every
host this repository is worked in:

| host        | `.claude/skills/` | `.agents/skills/` |
| ----------- | ----------------- | ----------------- |
| Claude Code | reads             | does not read     |
| Codex       | does not read     | reads             |
| opencode    | reads             | reads             |

`arch-*` is vendored from `@ecoma-io/archkeep` and held byte-identical to the pinned
release. Everything else is this repository's own, authored in
`.claude/skills/` and mirrored here.

Change either population with `pnpm sync-skills`, never by editing a file in
this directory. `pnpm check-skills` rejects a hand-edit, a drifted mirror, and
a dependency bump that was never re-synced.
