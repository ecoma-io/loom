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

**Postscript, 2026-09-11 — the sample's blind spot.** The zero above held for
the 12-page sample and not for the site. The full CI sweep's canvas tripwire
(asserted strict zero) fired on run 34623804250: VitePress chrome's
`color-mix(in oklab, currentcolor 50%, transparent)` — the soft-surface
backgrounds, 18 `color-mix(in oklab, …)` declarations in the built CSS —
resolves to `oklab(0.508735 -0.00840174 -0.0288461 / 0.5)`, a form the fast
path did not parse, so those ratios had been resting on the canvas's 8-bit
round-trip. The walk now parses oklab exactly (Ottosson's closed form,
`e2e/contrast.e2e.ts`), cross-checks every parsed value against the engine's
own resolution of the same string within the canvas's quantization slack
(alpha-scaled for premultiplied storage — a WebKit observation, 2026-09-12),
and keeps the tripwire at strict zero for anything else: a format the fast
path still cannot parse turns the gate red naming the strings, as it did
here. The measurement lesson is the sampling one — every 12th page of 144
never landed on the mixed chrome, so "every color parses as rgb" was true of
the sample and false of the site.

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

## 10. The PR run put the plan on the clock: queueing, not the pole, set the wall

PR #368's pw-infra run (34597507798, 40 root legs, all green) is the first
end-to-end measurement of the spec-group topology, and it splits the question
in two: the per-leg cut is real, the per-run result is not, yet.

- Pole legs, measured: firefox-a11y-s2 10.25m of job wall (chromium 7.75m,
  webkit 6.85m) — −21/−26/−25% against the flat-split leg P50s
  (12.97/10.47/9.08m, n=52 per leg).
- Run wall, measured: 17.1m (run created 12:09:47Z, last leg ended
  12:26:51Z) against the 15.23m E2E P50 the flat topology posted. The pole
  win drowned in queueing: leg starts spread 12:11:07Z→12:19:54Z (8.8m, two
  waves) because 40 legs contend for an org runner supply that spread prices
  at ≈20 concurrent slots (an inference from this run's timeline — §11's
  burst measures the supply directly at 6–8). The run's root legs cost
  244.3 runner-minutes.
- The topology arithmetic behind the queueing: a docs PR now emits 24 root
  legs (3 browsers × 8); theme and deps emit 24 in their common shape (the
  root sweep alone — the planner appends 3 harness legs only when the same
  diff also touches a demo-bearing component, `tools/e2e-plan.ts`); pw-infra
  emits 43–46 plus the 4 non-matrix jobs — every routine change class now
  overflows the ≈20-slot supply, and `e2e-run` carries no `max-parallel`.

Two §9 statements this run corrects. The a11y spec is 288 tests (144 pages ×
light+dark), not 177 — 177 is the flat shard size, and flat shard 1 is the
first 177 of the alphabetized suite (all light + 33 dark). And the profile
penalty is nil: the group legs below ran 3.78s/test at `full` against the
flat bench's 3.89 at `standard`; the ×1.35 earlier read as a profile cost was
a derivation artifact (job wall minus a wrong setup constant).

### Workers on the production legs (bench, full profile, zero failures and retries)

Group-leg benches (runs 34603189852/34603193137 firefox,
34603196536/34603200180 chromium; a11y shards of 96 tests; test wall from the
timings `end` records):

| legs          | w1 walls (s1/s2/s3)       | w2 walls                  | wall ÷ | work w1→w2 | compute × |
| ------------- | ------------------------- | ------------------------- | ------ | ---------- | --------- |
| firefox a11y  | 7.02/6.64/4.49 (Σ 18.15m) | 4.42/3.38/3.90 (Σ 11.70m) | 1.55   | 18.0→23.1m | 1.28      |
| chromium a11y | 5.59/5.33/4.97 (Σ 15.89m) | 3.55/3.34/3.12 (Σ 10.01m) | 1.59   | 15.8→19.8m | 1.25      |

The flat-shard probes had priced chromium w2 as a free win (×1.98 wall,
×1.0 compute at 177 tests, `standard`); at the production shard size of 96
tests that no longer holds — both engines land at wall ÷1.55–1.59 for
compute ×1.25–1.28. The probes remain the A/B method; the group-leg numbers
are the ones a production change may cite. The revision accordingly adopts
`workers: 2` for the a11y rows of chromium and firefox only (the pole drops,
projected, 10.25m → ≈7.8m of job wall for +~25% compute on the heaviest
group); webkit and every other group stay at 1 until their own bench exists.

### What is left, in measured order

1. Leg count vs the ≈20-slot supply: re-cutting groups (or a `max-parallel`)
   is the lever on the queueing that set this run's wall — it needs its own
   dispatch-level bench before any cut lands.
2. Navigation reuse: the docs sweep does 6 gotos per page per project (868
   per standard project); accessibility light+dark and contrast light+dark
   each collapse to one goto with an in-place theme toggle — the DOM is
   measured byte-identical between themes except the theme markers
   (`e2e/accessibility.e2e.ts`'s own claim) — ≈ −4.5m of goto wall per
   project, semantics-preserving.
3. The axe rule partition: 51 of the 68 rules the light pass enforces are
   already authoritatively gated browserless on demos (`a11y-scope.ts`
   partition); the irreducible browser set is the 17 `BROWSER_REQUIRED_RULES`.
   Re-scoping the page sweep is a coverage-policy decision, not a
   measurement gap (the acceleration model prices it at −75% axe wall).
4. webkit and the remaining groups' worker benches — same dispatch
   instrument, no new plumbing.

## 11. The verification-architecture pass (PR #368)

What the second half of issue #367 added on top of the numbers above, in the
order §10 left the levers standing:

- **Planner hardened before anything leaned on it further.** Two
  `GITHUB_EVENT_NAME` environment leaks in `tools/e2e-plan.ts` are fixed (the
  self-check could see a caller's variable; the delete-when-unset toggle did
  not restore), the planner carries 35 vitest tests — including a
  bench↔plan consistency guard that fails if `e2e-bench.yml`'s static group
  map drifts from `ROOT_SHARD_PLAN` — and the Case-4 route (affected set with
  neither specs nor demos → full root sweep at smoke) is pinned by test.
- **Navigation reuse is implemented — and adopted on the root legs.**
  `e2e/theme.ts` collapses accessibility's and contrast's light+dark pairs
  into one navigation per page under `LOOM_E2E_REUSE_THEME=1` — the exact
  literal; unset stays the local default and keeps the two-goto shape.
  ci.yml's root legs set it since 606b79c, on the A/B below. The collapse's
  premise — that reaching dark changes no DOM byte outside the known theme
  markers — is asserted on every collapsed page by `reachDark` (VitePress's
  own appearance toggle, then a marker-normalized `page.content()` diff), so
  the measured premise became a continuous gate rather than a one-off.

  The A/B: phase-sum wall per shard from the timings JSONL, each group's
  sides benched from one SHA with the shard page-sets verified identical
  before comparing (a11y and contrast-chromium at 618ab89, dispatched as the
  18:20Z batch, runs 34632717902…34632739784; contrast-firefox re-benched
  at 94b3911 after the two transport fixes recorded below — its off side is
  byte-identical across those SHAs). Standard profile, production worker
  counts.

  | spec     | engine   | workers | shard | off  | on   | Δ    |
  | -------- | -------- | ------- | ----- | ---- | ---- | ---- |
  | a11y     | chromium | 2       | 1     | 401s | 285s | −29% |
  | a11y     | chromium | 2       | 2     | 390s | 255s | −35% |
  | a11y     | chromium | 2       | 3     | 290s | 235s | −19% |
  | a11y     | firefox  | 2       | 1     | 379s | 346s | −9%  |
  | a11y     | firefox  | 2       | 2     | 464s | 239s | −49% |
  | a11y     | firefox  | 2       | 3     | 433s | 289s | −33% |
  | contrast | chromium | 1       | 1     | 277s | 146s | −47% |
  | contrast | chromium | 1       | 2     | 275s | 140s | −49% |
  | contrast | firefox  | 1       | 1     | 297s | 147s | −50% |
  | contrast | firefox  | 1       | 2     | 286s | 148s | −48% |

  Gotos halve exactly wherever the toggle path runs — 96→48 (a11y) and
  144→72 (contrast) per shard — and every dark pass keeps its full check
  set: the JSONL still records one axe-analyze or evaluate per theme per
  page, so the coverage per page is unchanged and only the duplicate
  navigation is gone. The chromium contrast numbers include 6/4 fallback
  navigations paid before the mount race below was fixed, which makes them
  an upper bound on the settled shape; the firefox re-bench is the settled
  shape itself — 72 gotos for 72 pages on both shards, zero fallbacks (run
  34647896802).

  The gate earned its keep three times during the A/B, each failure a real
  VitePress or browser mechanism rather than a flake, each fixed by naming
  the mechanism in `e2e/theme.ts`: VitePress injects route
  `<link rel="prefetch">` tags as a function of dwell time, and the
  contrast spec's fast light pass captured them mid-injection (normalized —
  run 34632743958); the appearance switch renders inside `<ClientOnly>`, so
  an instantaneous visibility check raced Vue's mount and sent most firefox
  pages to the fallback transport (bounded wait — 66–69 of 72 shard-1 pages
  on run 34636309729); and `VPSidebarGroup` holds `no-transition` for its
  first 300ms after mount, so a fast light pass captured `before`
  mid-transient and the gate read the timer's expiry across the click as a
  premise break (waited out — run 34644775869, with the gate message
  carrying the first differing byte window since fa97555 so the next
  premise break is diagnosable from CI logs alone).

  The a11y group keeps its three shards for now: reuse halves its goto wall
  but the per-shard pole is axe-bound, so re-cutting to two shards trades a
  bigger pole leg for one fewer leg — the leg-count-versus-pole trade the
  topology bench below prices; the decision rides on those numbers.

- **Queueing gets its own instrument — and the supply it measured is 6–8
  runners, not the ≈20 §10 estimated.**
  `perf/e2e-topology-bench.archived.yml` (archived from
  `.github/workflows/e2e-topology-bench.yml` after B6 deleted the specs its
  four dispatch-only topologies name — see the header there) priced this with
  the grouped-8, grouped-8-capped, flat-5 and reduced-6 arms,
  each leg byte-faithful to ci.yml's `e2e-run` — but GitHub registers
  `workflow_dispatch` only for workflows on the default branch, so the
  instrument could not be dispatched from this branch. The production shape
  was measured instead by bursting all 24 grouped-8 legs through
  `e2e-bench.yml` at one moment (24 dispatches, 22:58:09–22:59:02Z at
  d80364d, org verified quiet, all 24 success):

  - **Peak concurrency of the shard jobs: 6, never above 8.** The org's
    runner supply for this workload is ≈6–8, not ≈20 — the §10 estimate was
    inferred from one CI run's timeline, and the burst measures it directly.
  - **Shard-job start delays: 76s–669s.** The first-dispatched legs start in
    ~1–2m; the last-dispatched wait 9–11m for a slot. The 24 per-run docs
    builds (≈1m each) consume the slots first, then the shard jobs drain
    through the same 6–8-wide pipe.
  - **Burst wall 17.5m**, set by the pole leg (firefox target-size: 9.6m
    slot wait + 6.1m run = 15.6m after dispatch). The arithmetic closes:
    ≈114 slot-minutes of fleet work ÷ 17.5m ≈ 6.5 effective concurrency —
    the measured supply.

  Three consequences, each a refutation the candidate topologies could not
  have survived:

  - **The §10 17.1m wall was supply-bound, not topology-bound.** flat-5's
    15 legs walled 17.1m in §10's CI run; grouped-8's 24 legs wall 17.5m in
    this burst — two different cuts, same wall, because wall ≈ fleet compute
    ÷ supply and the cuts change neither term.
  - **grouped-8-capped is refuted as a wall lever**: its `max-parallel: 16`
    never binds on a 6–8-wide supply. It would only reorder who waits. The
    cap remains adoptable as org-courtesy under contention, which is a
    policy choice, not a measured wall win.
  - **The a11y group keeps its three shards**, and no re-cut happens at all:
    fewer legs do not cut compute, so they cannot move a supply-bound wall;
    they only raise the pole (a11y s2 firefox 239s → ≈6m at 72 pages).

  The lever that does move this wall is the one already landed: cutting
  compute. The reuse mode's −9…−50% per leg is a proportional cut to the
  fleet's compute term, hence to the supply-bound wall. Two corollaries land
  with it: #374's workers=2 proposal inverts on a saturated org (per-leg
  wall ÷1.55 but slot-minutes ×1.25 — at fleet level the wall goes up where
  the pole is not binding, which is why w2 stays on the a11y legs, whose
  poles bind); and the remaining levers are operator-side (raise the org's
  runner ceiling) or compute-side (B2's shared-page tryout), not
  leg-topology-side.

  Bench-leg caveat: an `e2e-bench.yml` run carries its own docs build
  (≈1m); ci.yml's e2e legs share one build through the actions cache, so
  the absolute walls above overstate ci legs. The supply measurement and
  the compute÷supply arithmetic do not depend on that term.

  Follow-up: #380 holds the byte-faithful four-topology confirmation runs
  once this PR's instrument reaches `main`.

- **The axe partition (§10 item 3) closes as a policy answer, not a bench.**
  The harness-routing projections (B1/C2 in
  [e2e-acceleration-model.md](./e2e-acceleration-model.md)) assume axe cost
  scales linearly in rule count; the benched legs' timings JSONL measures it
  otherwise. The dark pass runs `color-contrast` alone, and that single rule
  is ≈ 60% of the light pass's 68-rule axe wall on both benched engines
  (p50 1378ms light / 850ms dark on chromium, 1777 / 1073ms on firefox —
  runs 34593135967 / 34593707946), so dropping the 51 already-browserless-gated
  rules from the root sweep buys at most the remaining ≈ 40% of light axe —
  ≈ 1.5m on the a11y leg, not the projected −4.3m. The authority argument
  closes it: the root sweep is the only check that casts verdicts on the
  generated token/API tables, which render only on the built site. The honest
  reductions are the navigation reuse and queueing work above.
- **Candidate engines get a repeatable instrument instead of a one-off PoC.**
  `tools/browser-capability-probe.ts` and
  [browser-capability-contract.md](./browser-capability-contract.md) turn
  §4 of the authority matrix into a re-runnable, fail-closed measurement
  (pointer in authority-matrix §5). Measurement-only — no production workflow
  routes through it, and nothing reroutes on its answer.
