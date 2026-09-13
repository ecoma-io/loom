# Loom CI E2E performance contract

This is the standing contract the E2E performance program closed on, 2026-09-12.
It records the architecture that ships, the measured baseline, the invariants no
future change may trade, the triggers that legitimately reopen optimization work,
and the methodology any such work must follow. The evidence lives beside it:
[e2e-performance-analysis.md](./e2e-performance-analysis.md),
[e2e-acceleration-model.md](./e2e-acceleration-model.md),
[e2e-performance-baseline.md](./e2e-performance-baseline.md), and
[e2e-browser-authority-matrix.md](./e2e-browser-authority-matrix.md).

Every number in this file is labeled **MEASURED** (taken from a recorded CI or
bench run), **DERIVED** (arithmetic on measured values, with the assumption
stated), or **PROJECTED** (a model, not evidence — this contract carries none
that is standing; projections appear only inside refuted scenarios in the model
doc).

## 1. The architecture that ships

Three browser suites share one profile source (`playwright/profiles.ts`):

- **Root sweep** (`playwright.config.ts`, `e2e/`) — the cross-cutting quality
  gates against the **built** site. The four per-page gates (effective WCAG
  rule set, rendered-SVG contrast, target-size, phone-width keyboard
  reachability) run as steps of one test per documentation page in
  `e2e/page-sweep.e2e.ts`: one navigation on desktop pages (was four), two on
  the mobile rows (the sub-1280px `reachDark` fallback pays a second, dark
  navigation — designed, not a defect). The check bodies are single-sourced in
  `e2e/checks.ts`; the dark pass runs under a byte-identity premise gate on the
  DOM between themes. Every colour verdict — light and dark, sweep and bench —
  reads settled pixels: `e2e/motion-settle.ts` holds each scan until the page's
  finite animations are past their `endTime` (entrance animations carry elements
  from `opacity: 0`, and a scan landing mid-flight measures a transitional
  foreground — the #396 race, where one SHA read pass, flaky and failed). The
  wait is bounded at 2000 ms ≈ 3× the motion vocabulary's worst legal end
  (480 ms duration + 180 ms stagger), polls per animation frame, fails closed
  naming what stuck, and exempts only what cannot tick: infinite iterations
  (loaders) and pending play on an element that is not being rendered (the
  Firefox `hidden="until-found"` interop the first run caught). Its price is
  already inside every post-#398 wall in this file's tables (MEASURED, e.g. the
  2026-09-13 chromium-mobile ledger arms); isolating the settle's own
  milliseconds would compare different SHAs and is not claimed.
- **Harness** (`playwright/harness/`) — component `e2e/*.e2e.ts` against a
  Vite-mounted demo; never pays for a VitePress build.
- **Template** (`playwright/template/`) — every directory under `templates/`
  held to smoke, axe (light+dark, zero excludes), keyboard, responsive.

What runs on a pull request is a pure function of the changed file set plus
moon's affected answer (`tools/e2e-plan.ts`), consumed by the
`e2e-discover → e2e-build-docs → e2e-run` jobs. The built site is built once
and shared to every root leg through the actions cache.

Root-suite sizing (the shape on main since #383): one `page-sweep` group at **6
shards** plus an auto-computed `small` catch-all (1 shard) — 7 root legs per
standard browser, 21 across the three. Workers: **2** on chromium and firefox
page-sweep rows, **1** on webkit and the mobile rows. The sizing is re-derived
from data, never projected from a per-page constant: it was measured at 144
pages, and the plan's own docblock pins the re-cut trigger (§4 below).

The measurement instrument ships and is dispatchable:
`.github/workflows/e2e-bench.yml` takes `project`, `workers`, `only_shard`,
`profile`, `group` (`page-sweep` or `b2` or `small`), and `b2_variant`
(`off`/`a`/`b`/`c`), and emits per-phase `timings` JSONL plus joined result
payloads. `e2e/checks.ts` being the same module the production spec imports is
what makes a bench variant's evidence admissible for a production change.

## 2. The baseline

### Measured (the numbers the contract stands on)

Primary source: the **merge-queue run on `main` after #383 landed**
([34687783284](https://github.com/ecoma-io/loom/actions/runs/34687783284),
merge commit 94e6205, 2026-09-12) — 42 jobs green (38 e2e legs + 4 infra),
the production implementation measured in production.

| quantity                                      | value                                                              | source                                           |
| --------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| page-sweep job wall, chromium desktop, w2     | 127–142 s per shard                                                | merge run 34687783284                            |
| page-sweep job wall, firefox desktop, w2      | 140–160 s per shard                                                | same run                                         |
| page-sweep job wall, webkit desktop, w1       | 129–196 s per shard                                                | same run                                         |
| page-sweep mobile rows (chromium, webkit; w1) | 118–191 s per shard                                                | same run                                         |
| pole leg                                      | 196 s ≈ 3.3 m (webkit desktop s2)                                  | same run                                         |
| full root matrix, quiet window                | 429 s ≈ 7.2 m, 42 jobs                                             | same run                                         |
| per-job setup floor                           | ≈ 55 s (52–67 s)                                                   | bench unselected-shard jobs, batch of 2026-09-12 |
| navigation wall, merged vs four-nav           | chromium 56.5 → 14.3 s, firefox 54.1 → 16.7 s, webkit 16.2 → 5.8 s | bench runs 34677213048…34677631967               |
| workers A/B on merged shape                   | playwright wall ≈ 112 s w1 vs ≈ 75 s w2 (÷ ≈ 1.5)                  | bench run 34679994636                            |
| B5 reuse A/B, per shard                       | −9…−50 % phase wall at unchanged coverage                          | analysis §11, run 34647896802 among recorded     |
| pole, re-measured twice on the PR             | 188 s and ≈ 3.0 m (chromium-mobile-s2 / ≈3.0 m)                    | acceptance runs 34679559408, 34683137600         |
| pre-merge comparison point                    | 10.5–13.0 m per-leg P50, run wall 15.2–17.5 m                      | baseline doc §1 + the burst                      |

### Runner-dependent (recorded as such, never averaged into the table above)

**Full-pipeline wall is compute ÷ supply, and org supply varies with the
hour.** The verified-quiet burst of 2026-09-12 morning measured peak
concurrency 6, never above 8, across every org repository; the merge run of
the same day observed twelve legs starting in the same second in a quieter
window. Both are MEASURED; neither generalizes. The same commit's total wall
varies with whatever else the org is running: the 2026-09-12 acceptance run
walled 9 m for the whole matrix while contended with six bench dispatches,
the merge run walled 7.2 m in its quiet window, and the pre-optimization
17.1–17.5 m walls were the same arithmetic at the same supply. Queue delay
under contention is observed, not scheduled. Any statement about total
pipeline wall must name the contention it was taken under.

### Projected

None standing. Every projection this program priced (B1 harness routing, B2
prefetch, B4 shard-count scaling, C1/C2 class rerouting, D coverage cuts) is
either refuted by measurement or retired by verdict in
[e2e-acceleration-model.md](./e2e-acceleration-model.md) §2–§5; none is live
guidance. **The ≤ 2-minute full-pipeline target is retired, not deferred** —
see §5.

## 3. Performance invariants

No performance change may trade any of these. A proposal that does is not an
optimization; it is a coverage or authority change and is judged as such.

1. **The WCAG AA bar is inviolable.** The swept rule set, the page set, and
   the zero-excludes policy of the accessibility suite are not levers. An
   exclusion needs a named WCAG criterion and a cause outside this
   repository's reach — never a wall-time justification.
2. **The swept artifact is the built site.** The generated token/API tables
   render only there. Harness-routed or browserless substitutes do not
   replace a root verdict on them (both routes were priced and refuted, model
   §2–§3).
3. **Equivalence is measured before adoption.** A structural change to the
   suites adopts only with byte-identical result-payload joins across every
   engine (the B6 standard: 288/288, then 144/144 under the shipped order),
   and its state-leak diff must show no check input changed.
4. **What the bench asserts is what ships.** Bench variants import the same
   `e2e/checks.ts` bodies the production spec asserts; a variant cannot pass
   on weaker evidence than the gate it replaces.
5. **WebKit keeps speaking for keyboard and scroll-container focusability.**
   Every browser project in `playwright.config.ts` stays; narrowing the
   matrix silently retires checks.
6. **Browser tests run in CI only.** Local gates are lint, typecheck, build,
   archkeep. Machine-resource protection, standing decree.

## 4. Re-optimization triggers

These are the conditions that legitimately reopen optimization work, each
derived from the measured baseline and each naming its instrument. Absent one
of these, "make CI faster" is not a task.

| trigger                         | threshold                                                                                                         | instrument                                                                                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The page set grew               | `documentationPages()` passes ~250 (sizing was measured at 144)                                                   | re-run the bench across the current group map, re-cut `ROOT_SHARD_PLAN` from the new data                                                                                                                             |
| A new heavy gate landed         | any spec whose per-page phase cost rivals the axe-dominated sweep                                                 | same                                                                                                                                                                                                                  |
| The pole regressed              | pole leg sustained > 2× its measured band (≈ 190–200 s) across ≥ 3 consecutive main runs at verified-quiet supply | job walls + the `seconds=` step-summary figures of those runs (Actions API, no new instrumentation); attribution via a bench dispatch with `LOOM_E2E_TIMINGS` (where the JSONL instrument exists); re-optimize per §6 |
| Supply changed                  | org concurrency persistently outside 6–8, or runner topology changes                                              | repeat the verified-quiet burst methodology (analysis §11)                                                                                                                                                            |
| An adopted lever stopped paying | a re-run of its recorded A/B no longer reproduces the recorded saving                                             | that lever's bench group and variant pair                                                                                                                                                                             |

Explicitly **not** triggers: elapsed time since the last optimization; a new
tooling announcement; another repository's CI shape; a wall taken under
unrecorded contention (go re-measure it under named contention first).

## 5. The retired target

**The "full E2E pipeline in ≤ 2 minutes" goal is retired.** The measured
floor arithmetic: a 177-test shard's goto time alone was 262 s before the
merges, already 2.2× over a 2-minute budget before the ×1.83 CI factor
(model §2); after B5+B6 the per-leg walls are the 100–188 s band above —
**at or near** 2 minutes for the pole of the _sweep alone_, with the
full-pipeline wall set by compute ÷ supply (§2, runner-dependent), which no
leg re-cut moves. Reaching ≤ 2 m on total pipeline wall would require
breaching the shard cap at 2.5× E2E compute or deleting coverage (model §5,
scenarios B4/D) — both rejected as costs, not adopted as speeds. The
defensible outcomes were adopted instead: compute cuts (B5, then B6) that
move the supply-bound wall, and an operator-side supply question that is
recorded and out of this repository's reach.

## 6. Methodology required for any future change

The program's method, in the order it was actually practiced. A future change
follows the same sequence and records each step; a step skipped is how a
defect ships as an optimization.

1. **Baseline.** Measure the thing as it ships, under named contention
   (`timings` JSONL; CI job walls with run ids).
2. **Hypothesis.** State which measured phase the change attacks and by how
   much; label the projection PROJECTED.
3. **Controlled experiment.** One variable at a time, through
   `e2e-bench.yml`'s variant/group selectors — the off-variant is the
   control.
4. **Equivalence validation.** Byte-identical result-payload joins across
   every engine, plus the state-leak diff on `stateBefore` fingerprints. A
   changed check input voids the experiment.
5. **Measurement on the production shape.** CI acceptance on the real plan —
   measured twice before adoption (the second run exists because the first
   acceptance preceded a lifecycle reorder; acceptance does not transfer
   across orders).
6. **Regression analysis.** What could the change have weakened that the
   green run cannot show? (B6's answer: failure granularity — filed as
   #384, not hidden.)
7. **Adopt or reject, with the record.** The verdict, the numbers with their
   labels, and the rejected alternatives land in `perf/` the same PR as the
   change.

## 7. Evolution story

1. **Initial state (Scenario A).** Four per-page root specs, 24 legs per
   full matrix: per-leg P50 10.5–13.0 m, whole-run wall 15.2–17.5 m, E2E at
   92 % of CI compute (MEASURED, baseline doc + burst arithmetic).
2. **B5 — theme reuse** (PR #368, adopted in ci.yml): light+dark pairs
   collapse to one navigation per page under a byte-identity premise gate;
   −9…−50 % phase wall per shard at unchanged coverage (MEASURED).
3. **Supply priced.** The verified-quiet burst measured org supply at 6–8
   with ≈ 6.5 effective concurrency: the 17.1 m wall was supply-bound; the
   `max-parallel` cap and every leg re-cut are refuted as wall levers
   (MEASURED + DERIVED).
4. **B6 — the shared-page merge** (PRs #382 instrument + #383
   implementation, adopted): all four per-page gates on one loaded page;
   navigations 4→1 desktop / 4→2 mobile; equivalence 288/288 then 144/144
   joins byte-identical across the orders, with the premise gate catching —
   and the fix landing at the cause of — a real scroll-state leak
   (MEASURED). Plan re-cut to page-sweep 6 shards; `LOOM_E2E_REUSE_THEME`
   retires (the collapsed shape is the suite, not a mode).
5. **Pole at ≈ 3.0–3.3 m** (188 s and ≈ 3.0 m on the PR; 196 s on the
   merge run), against 10.5–13.0 m per-leg
   P50s at the start (MEASURED). The four-topology experiment (#380) closed
   superseded: its arms name retired shapes and its question is answered by
   the burst.
6. **Program closed 2026-09-12.** The instrument ships
   (`e2e-bench.yml`), the baseline and its categories are this document,
   and re-opened work goes through §4 and §6.

## 8. Archaeology

What the program leaves behind, classified. Nothing is deleted: rejected and
superseded work stays as the record of why the current shape is the answer.

| artifact                                                                                                         | class                                        | note                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/page-sweep.e2e.ts` + `e2e/checks.ts`                                                                        | PRODUCTION                                   | the merged sweep; single-sourced check bodies                                                                                                |
| `tools/e2e-plan.ts` group map (page-sweep ×6 + small)                                                            | PRODUCTION                                   | sizing measured at 144 pages, re-cut trigger in its docblock                                                                                 |
| `e2e/b2-shared-page.e2e.ts` + `e2e-bench.yml`                                                                    | PRODUCTION (instrument)                      | the dispatchable bench; variants `off`/`a`/`b`/`c`                                                                                           |
| `playwright/timings.ts` + timings reporter                                                                       | PRODUCTION (instrument)                      | per-phase JSONL every root spec emits                                                                                                        |
| `e2e-topology-bench.archived.yml` (in `perf/`)                                                                   | ARCHIVED                                     | measured #367 queueing (runs 34597507798/34606614010 + the burst); its four arms name deleted specs 66× — kept as evidence, not dispatchable |
| `LOOM_E2E_REUSE_THEME`                                                                                           | SUPERSEDED                                   | B5's opt-in mode; B6 made the collapsed shape the suite, so the mode retired                                                                 |
| `accessibility/contrast/target-size/keyboard.e2e.ts` per-page loops                                              | SUPERSEDED                                   | replaced by the sweep; `keyboard.e2e.ts` keeps its two cross-cutting tests                                                                   |
| B1 harness-routing, B2 prefetch, B4 shard scaling, C1 geometry engine, C2 browserless axe split, D coverage cuts | REJECTED                                     | priced and refuted in the model doc, each by measurement or floor arithmetic                                                                 |
| flat-5 / reduced-6 / capped-16 topology arms                                                                     | SUPERSEDED                                   | #380 closed: supply 6–8 measured, arms name retired shapes                                                                                   |
| the ≤ 2-minute full-pipeline target                                                                              | RETIRED                                      | §5 above; model §5 verdict                                                                                                                   |
| Lightpanda                                                                                                       | REJECTED for shipped gates; future candidate | gated on the capability contract clearing (browser-capability-contract.md)                                                                   |
