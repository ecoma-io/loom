# E2E performance analysis: phase attribution, engine factors, and the 2-minute question

Status: instrumented measurement, commit b0e9f70 + instrumentation PR #364.
All numbers are labeled `local` (this workstation, same machine for every browser
comparison) or `CI` (GitHub Actions history — the 2026-09 baseline sample
described in [e2e-performance-baseline.md](./e2e-performance-baseline.md)).
Companion: [e2e-performance-baseline.md](./e2e-performance-baseline.md),
[e2e-browser-authority-matrix.md](./e2e-browser-authority-matrix.md).

## 1. Instrumentation, and its cost

`LOOM_E2E_TIMINGS=<file>` enables two layers, both inert when unset (the CI
default, and the local default):

- `e2e/*.e2e.ts` phase wrappers (`playwright/timings.ts`, `timed(phase, fn)`)
  append one JSONL record per awaited phase: goto (page navigation),
  wait-repaint (settled-frame wait), axe-analyze (axe-core run),
  evaluate (in-page contrast walk).
- A custom reporter (`playwright/timings-reporter.ts`) writes suite-level
  records (begin/test/end) into the same file, so per-phase lines can be joined
  to per-test durations.

**Measured overhead.** Delta ON/OFF run: `e2e/target-size.e2e.ts`, 144 tests,
chromium, same command, back-to-back, `PW_PREBUILT_DOCS=1`:

| run                         | wall | test avg         | note                                      |
| --------------------------- | ---- | ---------------- | ----------------------------------------- |
| OFF (instrumentation unset) | 4.2m | 1510ms           | from `ts-off-report.json` (identical leg) |
| ON (instrumentation set)    | 4.0m | phase sum 1530ms | goto p50 1329ms, evaluate p50 82ms        |

Δ +20ms/test (+1.3%) is below the run-to-run noise of this suite (goto p50
alone varies 1329–1551ms across runs; wall ON < wall OFF here). One
`appendFileSync(O_APPEND)` is ~0.1ms [inferred, syscall class]; two of them per
test cannot be resolved above noise. Unset, `timed()` is a single boolean
check, zero I/O.

## 2. Where the wall time goes (root sweep, local, workers=1/file-serial)

Playwright distributes by file; each spec runs serially in one worker, so
per-phase sums model per-shard wall directly (section 4 applies the CI factor).

| leg                                              | tests | wall   | goto             | axe/evaluate             | wait-repaint    |
| ------------------------------------------------ | ----- | ------ | ---------------- | ------------------------ | --------------- |
| `accessibility.e2e.ts` (chromium)                | 288   | 13.87m | 426s (p50 1.37s) | axe 345s (p50 1.01s)     | 30s (p50 0.09s) |
| contrast+keyboard+focus+layout+motion (chromium) | 452   | 12.88m | 640s (p50 1.34s) | evaluate 42s (p50 0.08s) | —               |
| target-size (chromium)                           | 144   | 3.7m   | 207s (p50 1.33s) | evaluate 13s (p50 0.08s) | —               |

Per-test attribution is 97%: joined test duration ≈ phase sum + 63ms p50 gap
(webServer warm-up and per-test fixture). There is no hidden per-test cost
beyond the measured phases.

**goto is the pole everywhere**: 1.34–1.48s per page, 62–78% of every leg's
phase time. axe-analyze (1.01s p50) is second only in the accessibility leg;
the contrast walk's evaluate is 0.08s p50 — see section 5 for why it is cheap.

## 3. Engine factors (local, same machine; measured per phase)

Firefox shard 1 (177 tests, `--shard=1/5`, `--workers=1`, `PW_PROFILE=standard`):
wall 18.46m; phase sum 964s = 87% of wall; goto 417s, axe 530s, repaint 17s.

| phase        | chromium  | firefox   | factor |
| ------------ | --------- | --------- | ------ |
| goto         | 1.48s avg | 2.36s avg | ×1.59  |
| axe-analyze  | 1.20s avg | 3.00s avg | ×2.50  |
| wait-repaint | 0.10s avg | 0.10s avg | ×0.97  |

These factors explain the CI pole ranking without hardware differences:
chromium-s1 P50 10.47m vs firefox-s1 P50 12.97m (ratio 1.24, consistent with a
shard whose time is ~40% goto + ~40% axe at those factors), webkit-s1 P50
9.08m.

## 4. Shard composition and CI overhead

- Equal split by count: shard 1 = 177 tests (884 / 5). The s1 ≫ s5 skew in CI
  wall (P50 12.97m vs ~7m) is page-complexity, not shard size: axe/goto per
  page ranges from 4.2s (`/components/badge`) to 18.9s (`/patterns/forms`) —
  the heaviest single page costs more than the lightest four.
- CI overhead factor: local serial chromium model for one shard ≈ 344s
  (884 tests × 1.48s avg goto + axe/evaluate mix, ÷ 5), CI chromium-s1 P50 is
  628s → **×1.83** on slower runners plus retry allowance. Do not project
  local numbers to CI without this factor.

## 5. Contrast walk: why evaluate is cheap (bench, local, warmed page)

`tools/bench-contrast-stages.ts` replicates `measureInPage` with per-stage
timers over 12 sampled doc pages (every 12th of `documentationPages()`):

| stage     | cost range (ms/page) | what it does                                                                                          |
| --------- | -------------------- | ----------------------------------------------------------------------------------------------------- |
| traverse  | 0–1.3                | DOM walk + `getComputedStyle` reads (22–776 reads/page)                                               |
| paints    | 0–0.1                | paint-record sampling                                                                                 |
| composite | 0–0.8                | target candidate computation                                                                          |
| ratio     | 0.1–0.2              | WCAG contrast math (0–21 evals/page; canvas conversions 0 — every color on these pages parses as rgb) |

Total ≤ 2.3ms/page; the ~90ms/page the suite measures for evaluate is browser
orchestration + cold style caches, not the walk. Two consequences:

- The contrast sweep is not a cost problem (42s of 12.88m in the leg) and
  needs no optimization.
- The walk is DOM-read-dominated, so it is _not_ browserless-able: the cost
  is `getComputedStyle`, which no DOM-less runner provides (this is the
  Lightpanda-candidate question the authority matrix answers with the same
  evidence).

## 6. Harness and template legs (local, chromium)

Harness component sweep (138 tests, `packages/**/e2e` + smoke/conformance):
2.39m wall. Harness axe against a Vite dev server with the 17
`BROWSER_REQUIRED_RULES`: goto 73ms, axe 390ms, mount/settle ~880ms unaccounted
→ ~1.3–1.75s per demo-test. Template suite (24 tests): 0.43m wall, axe
371ms/test (zero excludes). Harness and template legs are small; the root sweep
is 92% of E2E compute (baseline doc §compute).

## 7. The 2-minute question

Measured floors, chromium (fastest engine), shard 1 = 177 tests:

- goto alone: 177 × 1.48s = **262s = 4.4m** — before axe, before wait-repaint,
  before the ×1.83 CI factor. A shard under 2m CI wall would need ≤ 120s/1.83
  ≈ 66s of real test work, i.e. ≤ 44 pages at chromium goto speed: 884/44 ≈
  **20 shards** (against the current cap of 8), which raises E2E compute, not
  lowers it.
- The realistic full-suite floor per shard is chromium ≈ 10.5m and firefox ≈
  13m CI — exactly the measured P50s. Removing axe entirely (coverage loss,
  not an option under this PR's constraints) would still leave the goto floor
  at 4.4m plus CI factor.

**Verdict: CI wall P50 ≤ 2 minutes is not achievable for the root suite at the
current test count, page count, and engine speeds — by measurement, not by
opinion.** The gap is a factor of ~5 (2.47m Verify-job P50 explained in
baseline §3 vs 10.5m e2e job P50). The acceleration model
(`perf/e2e-acceleration-model.md`) quantifies what each lever buys; none
reaches 2m without either cutting coverage or multiplying shards past the
compute cap.

## 8. Acceleration levers, measured order of magnitude

| lever                               | measured basis                                                   | saved on e2e-s1 wall (chromium)              | reaches 2m?                           |
| ----------------------------------- | ---------------------------------------------------------------- | -------------------------------------------- | ------------------------------------- |
| drop firefox/webkit legs            | firefox axe ×2.50, goto ×1.59; webkit P50 9.08m                  | removes 2 of 3 root legs (≈22m compute/run)  | no (chromium floor ≈ 9–10.5m)         |
| harness-route the rendering rules   | harness axe 390ms vs root axe 1.01s p50 (Vite dev vs built docs) | −3.9m on the accessibility leg (345s → 112s) | no (goto floor dominates)             |
| VitePress prefetch / worker preload | goto p50 1.34–1.48s local, 78% of phase time                     | up to −60% of goto [projected, needs tryout] | no at 177 tests/shard                 |
| more shards > cap                   | ×1.83 CI factor                                                  | wall/leg at +shard count                     | only ≈ 20 shards, compute-prohibitive |

Nothing short of cutting the swept page set (coverage semantics change) closes
the measured gap; the report stays at "not achievable" with the floors above.

## 9. CI-measured validation, and the spec-group shard plan (issue #367)

The full-suite bench (workflow_dispatch, `e2e-bench.yml`, production container,
runs 34593135967 chromium / 34593707946 firefox, SHA a09a516) put the local
attribution to the test. Per-phase engine factors measured on CI runners are
smaller than the local ones — goto ×1.22 (p50 1878/1540 ms), axe-analyze ×1.35
(1454/1079 ms), evaluate ×0.21 — and the firefox/chromium _wall_ factor is
only ×1.12. The local ×1.59/×2.50 figures are this workstation's CPU
contention, not CI's; sections 2–7 keep them as local context only.

The same run confirmed the flat 5-shard split is a contiguous slice of the
alphabetized spec list: all 177 accessibility tests land in shard 1 (the pole,
10.20m chromium / 11.42m firefox of test wall) and the 144 cheapest
target-size tests in shard 5 (5.26/7.43m) — a ×1.94 / ×1.54 pole-to-tail skew.
`tools/e2e-plan.ts` now cuts the suite by spec group, each sharded by measured
cost (a11y/3, contrast/2, keyboard, target-size, small): projected pole
6.36m firefox / 5.67m chromium of test wall, 8 legs per browser instead of 5.

Live validation, PR #368's pw-infra run (34597507798, full profile, 40 root
legs, all green): the pole leg is `firefox-a11y-s2` at **10.2m of job wall**
(including per-leg setup) against ~14.8m for the equivalent flat-split pole —
a −31% critical-path cut, within the +3-legs setup tax the plan discloses.
Workers probes on the same SHA (runs 34595144010/51691/58798/65717, shard 1):
chromium w2 is a pure wall win (×1.98, compute ×1.0); firefox w2 buys ×1.44
wall for ×1.38 compute on a CPU-bound axe — documented, not adopted.
