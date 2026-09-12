# Workers A/B plan: the page-sweep rows still at workers=1 (ref #374)

`workers: 2` ships on exactly two page-sweep rows — chromium and firefox desktop —
on their own measured A/B. The other three rows (webkit desktop, chromium-mobile,
webkit-mobile) still run `workers: 1`, and no bench of their own existed. This file
is the experiment record the [contract](./ci-performance-contract.md) §6
methodology requires before that changes: the question, the bar a measurement has
to clear, and the dispatch ledger pre-written so the A/B runs the same way whoever
executes it. The ledger ran 2026-09-12: the cells are filled from their run ids
and the verdicts stand under the tables — no row adopted; chromium-mobile's
question is held open by gate flake #396, not by this record.

Labels follow the contract's §0: **MEASURED** (a recorded run, cited by id),
**DERIVED** (arithmetic on measured values, assumption stated), **PROJECTED** (a
model, not evidence). This file carries one class of standing numbers — the
MEASURED w1 baseline — and empty cells.

## 1. The question and the acceptance bar

### The question

Can the three page-sweep rows that still run `workers: 1` — webkit desktop,
chromium-mobile, webkit-mobile — take `workers: 2` the way the measured chromium
and firefox rows do?

### Why it is open, not assumed

The only measured w2 ratios on this suite were cut on chromium and firefox:
wall ÷ 1.55–1.59 for summed CPU-work × 1.25–1.28 on the a11y legs (MEASURED, runs
34603189852…34603200180), revalidated on the merged shape at ÷ ≈ 1.5 (MEASURED,
bench run 34679994636, chromium s1). The flat-shard probes that priced a larger
win did not survive production shard size once already; nothing says these rows
survive the transfer at all, for three measured reasons:

- **The phase mix is not the adopted rows'.** A w2 win is a statement about which
  phases dominate a row's wall, and that answer differs per engine before the
  experiment runs — the same B6 merge that cut chromium's navigation wall
  56.5 → 14.3 s cut webkit's 16.2 → 5.8 s (MEASURED, runs
  34677213048…34677631967), so the share w2 parallelizes is not the same share on
  each row.
- **The mobile rows pay a second dark navigation** (`reachDark`'s designed
  fallback below 1280 px — contract §1), the one reuse cost the desktop rows do
  not pay, on top of a device emulation the desktop arms never ran.
- **w2 buys wall with CPU-work.** Fleet wall ≈ compute ÷ supply (MEASURED, the
  2026-09-12 burst, analysis §11), and w2 raises the compute term × 1.25–1.28. On
  a saturated org, a row whose wall is not the binding pole can lose fleet-level
  wall while winning its own — which is why w2 stayed on the pole-binding rows,
  and why each remaining row is measured rather than interpolated between its
  neighbors.

### The acceptance bar

A row adopts `workers: 2` only when its A/B clears every clause. The bar is
committed here, before any arm runs, so the verdict is not argued out of the
numbers afterwards.

| clause                | standard                                                                                                                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pole improvement      | wall ÷ ≥ 1.4 on the row's pole shard (s2 on all three MEASURED baselines below), both arms on the six-shard production shape                                                                                                                                                                      |
| Clean run             | zero failures and zero retries in every leg of both arms. CI runs `retries: 2` (`playwright.config.ts`), and a retried leg both inflates its wall and hides the instability the number was meant to price. A red or retried leg voids its arm's dispatch; the dispatch is repeated, not averaged. |
| Stable across repeats | each arm runs twice and **both repeats** clear the pole bar — the contract's acceptance-measured-twice rule (§6 step 5). A ratio that holds once and fails once is not a measurement.                                                                                                             |
| Production shape      | six shards, the full 144-page set, both arms from one SHA of `main`. Possible only after the instrument fixes below land.                                                                                                                                                                         |
| Recorded              | the verdict, the labeled numbers, and the rejected alternative land in `perf/` in the same PR as the change (§6 step 7).                                                                                                                                                                          |

The ÷ 1.4 threshold is a pre-committed decision rule, not a projection; its
provenance is the measured neighborhood the adopted rows landed in (÷ 1.5–1.59),
cited to locate the bar, not to predict these rows.

### What adoption edits — one place, and only if the bar is met

`ROOT_WORKERS` in `tools/e2e-plan.ts` (line 457), the one mapping that decides the
worker count of every page-sweep leg, plus the self-check pin that guards it — the
"carries the measured worker count" assertion (lines 805–810, its ternary at line 807) — widened in the same commit, because the pin fails a plan that disagrees
with itself and must move with the value it asserts. Nothing else: the bench
workflow's `workers` input already accepts 2, and ci.yml reads the plan's
`MatrixRow.workers`. The change lands as its own PR carrying the measured verdict;
this file's PR carries no behavior change.

### The instrument gate

No arm in §2 dispatches until all three instrument fixes are on `main`. They gate
the dispatch, not the adoption:

- **#389 — the bench matrix runs five shards while the page-sweep plan cuts six.**
  Today `only_shard=all` measures shards 1–5: 120 of the 144 pages, so no
  production-shape arm exists to record.
- **#390 — the bench `project` input offers no mobile ids.** Both mobile arms fail
  input validation as shipped.
- **#391 — setup runs on shards a dispatch cannot select.** Ledger economy only —
  the contract's ≈ 55 s setup floor per dead job (MEASURED) — but it burns the
  org's supply slots, the thing every wall in this experiment is measured under.

## 2. The dispatch ledger

Twelve dispatches: three projects × two arms × two repeats, pre-written so the A/B
is one mechanical pass and the arms cannot drift apart in shape. It needs zero
code changes — the existing `e2e-bench.yml` inputs carry it — which is what makes
it a measurement and not a change.

```bash
# One dispatch at a time, in this order, after #389/#390/#391 are on main.
# The ABBA interleave spreads each arm across the dispatch window so a slow
# drift in org supply inflates neither arm systematically. Two repeats of one
# arm share the workflow's concurrency key (project + workers + group +
# profile + only_shard, cancel-in-progress), so an overlapped repeat cancels
# its predecessor rather than running beside it.

gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=webkit -f profile=full -f group=page-sweep -f workers=1 -f only_shard=all
gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=webkit -f profile=full -f group=page-sweep -f workers=2 -f only_shard=all
gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=webkit -f profile=full -f group=page-sweep -f workers=2 -f only_shard=all
gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=webkit -f profile=full -f group=page-sweep -f workers=1 -f only_shard=all

gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=chromium-mobile -f profile=full -f group=page-sweep -f workers=1 -f only_shard=all
gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=chromium-mobile -f profile=full -f group=page-sweep -f workers=2 -f only_shard=all
gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=chromium-mobile -f profile=full -f group=page-sweep -f workers=2 -f only_shard=all
gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=chromium-mobile -f profile=full -f group=page-sweep -f workers=1 -f only_shard=all

gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=webkit-mobile -f profile=full -f group=page-sweep -f workers=1 -f only_shard=all
gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=webkit-mobile -f profile=full -f group=page-sweep -f workers=2 -f only_shard=all
gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=webkit-mobile -f profile=full -f group=page-sweep -f workers=2 -f only_shard=all
gh workflow run e2e-bench.yml -R ecoma-io/loom --ref main -f project=webkit-mobile -f profile=full -f group=page-sweep -f workers=1 -f only_shard=all
```

Why each input is what it is:

- `profile=full` — required for the two mobile projects, whose ids exist only in
  the full profile set (`playwright/profiles.ts`; #390). Shape-neutral for webkit
  desktop: the profile selects which projects the config registers, while
  `--project` pins what runs.
- `group=page-sweep` — the group all three rows live in; its `GROUP_SHARDS: 6`
  mirrors the plan's six shards.
- `only_shard=all` — the six-shard production shape, viable only after #389.
- `--ref main` — the SHA class the MEASURED baseline was taken on, and the shape
  production runs. A PR ref would fork the instrument from the history its
  numbers must stay comparable with.

Dispatch discipline:

- **Serially — never two dispatches in flight.** Same-key repeats cancel their
  predecessor; different-key arms would run beside each other and share org
  supply, and a wall statement that does not name its contention is not
  admissible (contract §2). One dispatch's own six shards are concurrent by
  design — they are the production legs.
- **One SHA, all twelve dispatches.** Sides of one comparison are benched from
  one SHA (the A/B discipline of analysis §11).
- **Supply context recorded at dispatch.** The org-wide in-flight run count
  beside each run id — the verified-quiet methodology of analysis §11 — for
  example `gh api "orgs/ecoma-io/actions/runs?status=in_progress&per_page=100" --jq '.total_count'`.
  An arm whose two repeats, or a pair whose arms, were dispatched under
  materially different recorded supply is re-dispatched, not averaged.

### The MEASURED w1 baseline

CI job walls per shard, from the merge-queue run on `main` after #383 landed
([34687783284](https://github.com/ecoma-io/loom/actions/runs/34687783284), merge
commit 94e6205, 2026-09-12; 42 jobs green). Written here so the ledger can be
read against it without re-deriving anything. All values seconds.

| row (workers=1) | s1  | s2 (pole) | s3  | s4  | s5  | s6  |
| --------------- | --- | --------- | --- | --- | --- | --- |
| webkit desktop  | 168 | 196       | 142 | 151 | 173 | 129 |
| chromium-mobile | 164 | 181       | 175 | 171 | 170 | 150 |
| webkit-mobile   | 165 | 191       | 157 | 168 | 144 | 118 |

These are full CI job walls — checkout, install, cache restore and the Playwright
step together. A bench leg's `seconds=` summary line is the Playwright step alone;
the contract's ≈ 55 s per-job setup floor (MEASURED) is the difference between the
two numbers. That makes them the cross-check, not interchangeable: a w1 bench leg
should land ≈ 55 s under its merge-run job wall for the same shard, and one that
lands far off that band ran a different shape — which voids the comparison rather
than confirming it.

### Results — filled only from run ids

Each cell takes the per-shard `seconds=` from the dispatch's step summary
(`e2e-bench <project> group=page-sweep shard=<k>/6 workers=<W> … seconds=<n>`),
with the run id and the recorded supply count written beside its table. The ratio
a verdict is drawn from is w1 ÷ w2 on the pole shard, bench against bench — never
a bench `seconds=` against the CI job wall above.

Two recording deviations, both observed while filling these tables, 2026-09-12:

- **Cells hold bench job walls, not `seconds=` figures.** The Actions API does not
  expose step summaries, and the runs above are the only retrievable per-shard
  figure. Each bench shard job runs the same setup steps as its sibling in the
  other arm, so the comparison basis is uniform arm to arm, and it is the same
  basis (job wall) the MEASURED baseline table above carries.
- **Supply counts are repo-level in-progress counts.** The org-wide query in the
  discipline block returns 404 for the token the dispatches ran under; the
  repo-level count is recorded instead, and it includes sibling bench runs of
  this same ledger.

**webkit desktop** — w1 r1 = run [34700755420](https://github.com/ecoma-io/loom/actions/runs/34700755420) (supply 1) · w1 r2 = run [34701582726](https://github.com/ecoma-io/loom/actions/runs/34701582726) (supply 0) · w2 r1 = run [34701033298](https://github.com/ecoma-io/loom/actions/runs/34701033298) (supply 1) · w2 r2 = run [34702695051](https://github.com/ecoma-io/loom/actions/runs/34702695051) (supply 0), a re-dispatch under the supply clause replacing run [34701240468](https://github.com/ecoma-io/loom/actions/runs/34701240468), which ran overlapped with twelve sibling bench jobs (supply 2–3) and is voided for it:

| shard     | w1 repeat 1 (s) | w1 repeat 2 (s) | w2 repeat 1 (s) | w2 repeat 2 (s) | failures / retries |
| --------- | --------------- | --------------- | --------------- | --------------- | ------------------ |
| s1        | 141             | 183             | 146             | 151             | 0 / 0              |
| s2 (pole) | 204             | 183             | 135             | 142             | 0 / 0              |
| s3        | 171             | 168             | 144             | 143             | 0 / 0              |
| s4        | 184             | 173             | 155             | 123             | 0 / 0              |
| s5        | 148             | 171             | 141             | 141             | 0 / 0              |
| s6        | 175             | 177             | 138             | 141             | 0 / 0              |

**chromium-mobile** — no admissible arm. Both w1 repeats ran red on s6 and are
voided by the clean-run clause; no w2 dispatch happened. Repeat 1 = run
[34700968946](https://github.com/ecoma-io/loom/actions/runs/34700968946) (dark
contrast gate failed after retries on `/patterns/empty-state`, flaky-recovered on
`/showcase/invite-teammates`); repeat 2 = run
[34701204872](https://github.com/ecoma-io/loom/actions/runs/34701204872) (dark
contrast gate failed hard on `/showcase/invite-teammates`). Same SHA as every
other dispatch here. The failure is a property of the gate, not of the arm —
[#396](https://github.com/ecoma-io/loom/issues/396) — so the cells below stay
empty until that issue closes and the row's A/B runs clean:

| shard     | w1 repeat 1 (s) | w1 repeat 2 (s) | w2 repeat 1 (s) | w2 repeat 2 (s) | failures / retries |
| --------- | --------------- | --------------- | --------------- | --------------- | ------------------ |
| s1        |                 |                 |                 |                 | voided — #396      |
| s2 (pole) |                 |                 |                 |                 | voided — #396      |
| s3        |                 |                 |                 |                 | voided — #396      |
| s4        |                 |                 |                 |                 | voided — #396      |
| s5        |                 |                 |                 |                 | voided — #396      |
| s6        |                 |                 |                 |                 | voided — #396      |

**webkit-mobile** — w1 r1 = run [34701216854](https://github.com/ecoma-io/loom/actions/runs/34701216854) (supply 1) · w1 r2 = run [34702041814](https://github.com/ecoma-io/loom/actions/runs/34702041814) (supply 0) · w2 r1 = run [34701623471](https://github.com/ecoma-io/loom/actions/runs/34701623471) (supply 1) · w2 r2 = run [34701828346](https://github.com/ecoma-io/loom/actions/runs/34701828346) (supply 0):

| shard     | w1 repeat 1 (s) | w1 repeat 2 (s) | w2 repeat 1 (s) | w2 repeat 2 (s) | failures / retries |
| --------- | --------------- | --------------- | --------------- | --------------- | ------------------ |
| s1        | 164             | 165             | 132             | 130             | 0 / 0              |
| s2 (pole) | 182             | 167             | 143             | 152             | 0 / 0              |
| s3        | 173             | 161             | 134             | 124             | 0 / 0              |
| s4        | 178             | 170             | 130             | 125             | 0 / 0              |
| s5        | 148             | 148             | 112             | 135             | 0 / 0              |
| s6        | 158             | 163             | 127             | 123             | 0 / 0              |

### Verdicts — 2026-09-12, against the §1 bar

All dispatches ran from one SHA of `main` (`7d01b311`, the instrument-fix merge).
Ratios are DERIVED — w1 ÷ w2 on the pole shard, bench wall against bench wall of
the runs cited in each table:

- **webkit desktop — bar not met.** Repeat 1 clears: 204 ÷ 135 = **1.51** ≥ 1.4.
  Repeat 2 does not: 183 ÷ 142 = **1.29** < 1.4 (the replacement arm's clean
  supply confirmed the miss; the contaminated 151 it replaced would have missed
  at 1.21). The stable-across-repeats clause fails the row.
- **webkit-mobile — bar not met.** Repeat 1: 182 ÷ 143 = **1.27** < 1.4. Repeat 2:
  167 ÷ 152 = **1.10** < 1.4. Both repeats measured, both clean, both miss.
- **chromium-mobile — not measured.** Both w1 arms voided by the clean-run clause
  (#396); the row's question stays open until that gate flake is fixed and the
  ledger re-runs.

No row adopts: `ROOT_WORKERS` stays `chromium: 2, firefox: 2` and the three rows
stay `workers: 1`. The rejected alternative is recorded by the numbers above —
a blanket w2 over the page-sweep would have bought ÷ 1.1–1.3 walls on rows whose
CPU-work price still applies, and the adopted rows' ÷ 1.55–1.59 neighborhood
does not transfer to these engines.

## 3. Evidence hygiene

- **Labels never mix** (contract §0). MEASURED cites a run id; DERIVED states its
  arithmetic and assumption; PROJECTED appears only as a hypothesis. A filled cell
  is MEASURED with its run id in the same cell; a prose number without a label and
  a source does not belong in `perf/`, and a projected number presented as a
  result voids the record it sits in.
- **A w2 leg is one runner job.** A hosted runner bills a job by its wall clock,
  not by the CPU-work summed inside it: a workers=2 leg occupies one supply slot
  for the w2 wall and does × 1.25–1.28 the summed test-work inside that slot
  (both MEASURED on the adopted rows). Wall answers the adoption question;
  CPU-work is the price the answer pays, recorded as such. The two currencies are
  neither added, nor averaged, nor swapped for each other.
- **The prior "slot-minutes × 1.25" phrasing is not slot occupancy** (analysis
  §11's corollary on this issue): its × 1.25 is summed CPU-work, not slot-minutes
  — a leg's slot-minutes are its wall, which w2 reduces by the measured ratio.
  Quote that sentence only with this correction, because cited as occupancy it
  reverses the measured sign — and a reversed sign is how a rejected lever
  re-enters the record as an adopted one.
- **No projected numbers as results.** The empty cells stay empty until a run id
  exists; an unfilled cell states the experiment has not run, and is never
  estimated over. The ÷ 1.4 bar is a decision rule fixed in advance, not an
  expectation — nothing in this file predicts which rows clear it.
- **Every wall names its contention.** Supply counts are recorded arm by arm at
  dispatch; a comparison taken across materially different supply is re-run
  rather than cited (the standing rule of contract §2's runner-dependent section).
