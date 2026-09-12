# E2E performance baseline — CI wall time, measured from history

Collected 2026-09-11. Issue: ecoma-io/loom#363. Branch: `johnitvn/ci-e2e-perf-attribution`.

Everything in this document is **measured** from the GitHub Actions API unless a
line says **inferred** or **projected**. No single run is a baseline: the
distributions below are computed over 100 successful `CI` workflow runs
(2026-09-05 → 2026-09-10) plus a 20-run comparison window (2026-08-26 →
2026-08-30). Job wall time is the Jobs API's `completed_at − started_at`, at
GitHub's own granularity (one artifact of that: a skipped job reports
`−0.02 m`).

Method, reproducible from the raw aggregate:

```
gh api repos/ecoma-io/loom/actions/workflows/ci.yml/runs?per_page=100&status=success   # runs
gh api repos/ecoma-io/loom/actions/runs/<id>/jobs?per_page=100                          # jobs per run
```

The trimmed per-run job durations and every aggregate quoted here were
collected during the study from `gh run list` / `gh api` over the 100
successful `ci-gate` runs of 2026-09-05 → 09-10 (plus the 20-run late-August
comparison), into `perf/data/baseline-2026-09.json`. The file is not kept
in-tree — 6.5k lines of point-in-time GitHub API output, past the review
action's 5,000-line refusal threshold — and every aggregate it fed is
reproduced in the tables below.

## Headline: where the wall clock is

The required check is `ci-gate`, which waits for `verify` **and** the whole
`e2e-*` pipeline — the two run in parallel, so the wall is `max(verify, e2e)`.

| Metric (minutes)                                       | pull_request (n=51) | merge_group (n=26) | push (n=23)   |
| ------------------------------------------------------ | ------------------- | ------------------ | ------------- |
| **Whole CI run wall (P50 / P95)**                      | 6.83 / 23.10        | 13.53 / 19.72      | 15.32 / 19.73 |
| **Verify job (P50 / P95)**                             | 2.47 / 3.85         | 2.92 / 10.07       | 8.05 / 18.23  |
| **E2E pipeline wall, discover → last leg (P50 / P95)** | 15.23 / 22.42       | 15.03 / 21.05      | 15.38 / 23.67 |
| **Slowest single E2E leg per run (P50 / P95)**         | 12.32 / 13.73       | 12.97 / 13.90      | 12.80 / 13.93 |

Legged runs: 62 of 100 (25/51 PR, 19/26 queue, 18/23 push). The other 38 ran
zero browser legs (`noop`/spec-less component policy) — their wall is the
Verify job alone, P50 ≈ 2.5–3 m.
That 62 decomposes as 44 `docs` + 7 `component` + 5 `pw-infra` + 3 `deps` +
3 `template` scenario runs.

**Finding 1 (measured): Verify-the-job is not the long pole, and the number
in `ci.yml` is wrong.** The workflow's `timeout-minutes: 25` comment says
"recent Verify runs are p50 ≈ 10 min and 13.4 min at the slowest green".
Measured: Verify-the-job is p50 2.78 m in the late-August window and 2.47 m
now; its slowest green in the current window is 13.42 m (a dependency-bump PR
of 2026-09-05, and its merge-queue re-run — the max half of the comment is
right). The ≈ 10 m figure matches the _whole-run wall_ — which E2E, not
Verify, decides. Inferred: the comment conflated the run wall with the job,
and the 25-minute timeout is sized against a number Verify itself never
reaches (max 18.5 m on push, which adds the full uncached unit suite).

**Finding 2 (measured): the E2E pipeline is the critical path at every event
type.** Its wall is P50 ≈ 15.2 m whether the run is a PR, a queue batch, or a
push — because every legged run pays the same shape: ~0.5 m discovery →
~1.0 m docs build (parallel with nothing) → the slowest browser shard.

**Finding 3 (measured): the critical path inside E2E is one leg —
`firefox …-s1`.** Per-shard root-sweep legs, per browser (all events):

| Root leg    | n   | P50         | P95     | max     |
| ----------- | --- | ----------- | ------- | ------- |
| firefox-s1  | 52  | **12.97 m** | 13.90 m | 14.08 m |
| firefox-s2  | 52  | 10.68 m     | 11.17 m | 11.38 m |
| chromium-s1 | 60  | 10.47 m     | 11.35 m | 11.75 m |
| webkit-s1   | 52  | 9.08 m      | 10.22 m | 10.30 m |
| firefox-s5  | 52  | 8.30 m      | 8.75 m  | 8.83 m  |

Firefox is the slowest engine and shard 1 the heaviest shard on every engine
(chromium-s1 10.5 m vs chromium-s4 6.7 m; webkit-s1 9.1 m vs webkit-s4 4.9 m).
The s1 ≫ s5 skew is measured; **its cause is unknown until the in-suite
instrumentation lands** (shards are cut by Playwright's file-order split over
the alphabetically sorted page list in `e2e/docs-pages.ts` — inferred: the
early-alphabet pages carry a disproportionate share of the suite's cost, or
the per-shard page counts are uneven). Today `documentationPages()` returns
144 pages → 5 shards of ~29 pages (`tools/e2e-plan.ts`, `PAGES_PER_ROOT_SHARD
= 30`).

**Finding 4 (measured): the two smaller suites are not the problem.**
Component-harness legs: P50 3.22 m, P95 4.02 m (n=36). Template legs: P50
1.90 m (n=15). Even zeroed out entirely, they cannot move the 15 m wall; the
root sweep's slowest shard is the whole story.

**Finding 5 (measured): E2E is 92% of CI compute.** Across the 100 runs:
7,420 runner-minutes total, of which 6,841 are E2E leg minutes. A legged run
spends P50 ≈ 118 browser-minutes on the root sweep alone (15 legs at
`standard`, 25 legs at `full`). Wall clock is decided by the slowest leg;
cost is decided by the sum.

## Fixed taxes (measured, per run)

| Job                | P50     | Note                                                                                                                                                     |
| ------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2E discovery      | 0.52 m  | checkout (full history) + pnpm install + `moon query`; inferred: install dominates (moon query is 1.4–4.1 s per `tools/e2e-plan.ts`'s own measurement)   |
| Build docs for E2E | ~1.0 m  | only when `has-root` (push P50 1.00 m, queue 0.97 m); skipped in >50% of PR runs — the `PW_PREBUILT_DOCS` seam already de-duplicated the per-leg rebuild |
| ci-gate            | seconds | —                                                                                                                                                        |

Docs builds are **not** a duplication today: one build per run, cached per
commit, legs restore it with `fail-on-cache-miss`. Inside Verify, `moon ci`
builds docs only when docs/library inputs changed (moon task cache: 25.8 s
cold, 1.2 s replay, measured in `ci.yml`'s own comment).

## What this baseline cannot answer

Job-level history cannot see inside a leg: how much of firefox-s1's 12.97 m
is navigation vs axe execution vs contrast scans vs browser startup, or why
s1 is the heavy shard. That attribution is the instrumented phase
(`e2e-performance-analysis.md`) and the authority classification
(`e2e-browser-authority-matrix.md`).

## prior art already banked (do not re-do)

Recorded here so no future pass re-proposes them: `PW_PREBUILT_DOCS` build
seam (~75 s × legs saved), docs-dist cache per commit, moon task + toolchain
caches, Playwright container image (no per-leg browser install — the apt
starvation of 2026-08), dynamic scenario matrix in `tools/e2e-plan.ts`, the
#122 WCAG gate split (Firefox shard median 7.2 → 5.9 m), spec-less component
PRs running zero browser legs, shard sizing by pages with a bounded cap —
superseded on this branch by the measured spec-group plan
(`e2e-performance-analysis.md` §9, `tools/e2e-plan.ts`): same
new-gates-join-automatically property, cost-based groups instead of page
count.
