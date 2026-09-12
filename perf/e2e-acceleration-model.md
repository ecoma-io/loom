# E2E acceleration model

Scenario-by-scenario wall-time model built entirely on measured numbers from
[e2e-performance-analysis.md](./e2e-performance-analysis.md) and
[e2e-browser-authority-matrix.md](./e2e-browser-authority-matrix.md).
Every value is either `measured` (this study) or `projected` (arithmetic on
measured values with the stated assumption). The question this model answers:
which scenario gets CI E2E wall P50 to ≤ 2 minutes, and at what cost?

## 0. The measured substrate

Per-test phase costs (chromium, local, serial per file):

| phase                           | p50        | where it dominates                        |
| ------------------------------- | ---------- | ----------------------------------------- |
| goto (built docs page)          | 1.34–1.48s | every root spec — 62–78% of phase time    |
| axe-analyze (68 rules, root)    | 1.01s      | accessibility leg (345s across 288 pages) |
| axe-analyze (17 rules, harness) | 0.39s      | harness axe legs (Vite dev host)          |
| evaluate (contrast walk)        | 0.08s      | contrast leg — negligible                 |
| wait-repaint                    | 0.09s      | accessibility leg — negligible            |

Engine factors (firefox/chromium, same machine): goto ×1.59, axe ×2.50,
repaint ×0.97. CI overhead factor vs local serial model: ×1.83 (chromium s1
628s CI vs 344s model).

Root suite: 884 tests / 5 shards ≈ 177 tests per shard; page-complexity spread
4.2s–18.9s per page-goto+axe.

## 1. Scenario A — status quo (measured)

- chromium s1: P50 10.47m CI; firefox s1: P50 12.97m (pole); webkit s1: P50
  9.08m. Whole-run P50 ≈ 15.2m (legged). E2E = 92% of CI compute
  (6841/7420 runner-minutes).
- **≤ 2m: no** (measured gap ×5.2 on the pole leg).

## 2. Scenario B — routing optimizations (projected, no coverage change)

| lever                                                                                                     | arithmetic                                                         | saving                                   | ≤ 2m?                                                                           |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------- |
| B1. Harness-route the root accessibility gate (17 rendering rules on Vite dev instead of built docs)      | 345s → 288 × 0.39s = 112s on the accessibility leg                 | −3.9m on the leg; −~15% of pole-leg wall | no — goto floor 262s + CI factor                                                |
| B2. Preload/prefetch the docs shell (goto is 1.34–1.48s/page; assume −50% goto serving from memory cache) | −0.7s × 177 tests ≈ −2.1m per shard [projected, needs a tryout PR] | −2.1m per leg                            | no — axe + remaining goto still 3× over budget                                  |
| B3. Cut the browser matrix (drop firefox/webkit)                                                          | removes legs; pole becomes chromium 10.47m → B1+B2 → ≈ 6–8m        | ~−8m on whole run                        | no                                                                              |
| B4. Shard beyond the cap of 8 (884/20 ≈ 44 tests/shard)                                                   | 44 × 1.48s = 65s real work; ×1.83 → ~2m wall                       | wall/leg                                 | only at 20+ shards: compute 2.5× current — policy change, not a performance win |

Strictly measured floor: goto alone for a 177-test shard = 262s = 4.4m,
already 2.2× over the 2m budget, before CI factor. **No combination of B1–B3
reaches 2m.** B4 reaches ~2m only at a compute multiple the org has capped.
B1's host factor cannot be booked as wall saving regardless of its
arithmetic: the swept artifact is the built site — the generated token/API
tables render only there — so an axe pass against harness demos measures a
different artifact, not the same one faster. (The per-rule measurement under
C2 also breaks the per-test extrapolation it was priced from.) Its ≤ 2m
verdict is unchanged either way.

B5. Navigation reuse — collapse each page's light+dark pair into one goto
(implemented behind `LOOM_E2E_REUSE_THEME=1`, `e2e/theme.ts`; PR #368).

- accessibility light+dark and contrast light+dark each collapse to one
  navigation per page; dark is reached through VitePress's own appearance
  toggle under a byte-identity gate on the DOM between themes, so the
  collapse cannot silently weaken the dark pass. ≈ −4.5m of goto wall per
  standard project, projected from §0's goto attribution (868 → 434 gotos).
- **Adopted on the root legs** (ci.yml since 606b79c): the off/on A/B
  measures phase wall −9…−50% per shard at unchanged coverage (the table
  and the three gate-caught mechanisms in analysis §11; contrast firefox
  297/286s → 147/148s at zero fallbacks, run 34647896802).

B6. Shared-page check merge — the next reuse step beyond B5: one loaded
page per docs page carries all four per-page check groups (accessibility,
contrast, target-size, keyboard's phone-width table check) instead of one
navigation per group (`e2e/b2-shared-page.e2e.ts`, issue #381, PR #382).
The bench runs today's four-navigation shape (`off`) against three merged
variants — a11y+contrast (`a`), + target-size (`b`), + keyboard at 375px
(`c`) — with the checks imported from `e2e/checks.ts`, the same
single-sourced bodies the production specs assert, so a variant cannot pass
on weaker evidence than the gate it is meant to replace.

- **Measured** on the bench subset (8 representative pages, workers=1,
  built site, standard profile, runs 34677213048…34677631967, 2026-09-12):
  navigations 4 → 1 per page on every engine; navigation wall chromium
  56.5 → 14.3s, firefox 54.1 → 16.7s, webkit 16.2 → 5.8s (−75% / −69% /
  −64%); subset run wall chromium 87.8 → 36.9s, firefox 89.8 → 36.1–46.5s,
  webkit 56.5 → 36.0s (−58% / −48…−60% / −36%).
- **Equivalence (measured)**: every check's result payload joined on
  (page, check) is byte-identical between the baseline and the merged
  variant — 288 of 288 joins across the three engines, including keyboard's
  table verdicts on WebKit, the engine that check speaks for, run dark at
  375px off a 1280px resize instead of on a fresh light page.
- **State-leak evidence (measured)**: the only `stateBefore` fingerprint
  keys that ever differ are VitePress's prefetch-link injection timing (a
  time marker none of the checks read) and keyboard's designed theme delta
  (shared dark page vs fresh light page) — no scroll, focus, storage, or
  theme leakage reached any light check, and payloads stayed identical
  despite the delta.
- **Verdict B2-STRONG**, and **adopted** (PR #383, stacked on the bench PR
  #382): `e2e/page-sweep.e2e.ts` replaces the three per-page specs —
  keyboard keeps its two cross-cutting tests — the plan re-cuts to one
  page-sweep group at 6 shards (7 root legs per browser instead of 8) with
  the a11y legs' measured 2 workers on chromium/firefox, and
  `LOOM_E2E_REUSE_THEME` retires: the collapsed shape is the suite, not a
  mode. **Acceptance (run 34679559408, 2026-09-12, the PR's own CI, all 41
  jobs green)**: page-sweep job walls 118–138s per shard on chromium
  (workers 2), 144–181s on firefox (workers 2), 145–182s on webkit
  (workers 1) — the root matrix's pole leg ≈ 3.0m against the ~2m test +
  ~1m setup the 6-shard sizing modelled, and against §1's 10.5–13.0m
  per-leg P50s.
- **Workers A/B on the merged shape** (bench run 34679994636, chromium
  shard 1 of 6): the bench's unselected-shard jobs pin the per-job setup
  floor at ≈ 55s, so playwright wall ≈ 112s at workers 1 against the CI
  leg's 130s − ≈55s ≈ 75s at workers 2 — wall ÷ ≈1.5 for zero extra
  runners, matching the ÷1.55 the 2-worker rule was cut from on the a11y
  legs. The inheritance holds on the merged unit.

## 3. Scenario C — coverage-class rerouting (projected, changes semantics)

C1. Per-class authority (matrix §2): geometry-only assertions
(target-size, focus-not-obscured, layout-responsive, contrast walk) are
style-engine-classifiable _in principle_. The Lightpanda PoC (matrix §4)
measured the current requirement: no stylesheet cascade, no layout, axe
crashes — so no such engine exists on this machine today. If one arrives with
a working cascade, these legs could drop the full browser host.

- target-size: 144 tests × (1.48 + 0.08)s = 3.7m serial chromium today. A
  geometry-only runner at even 10× browser speed = ~0.4m.
- Combined geometry class ≈ 6m of the 13m chromium accessibility-time budget.
- **≤ 2m: no** — goto/axe on the remaining 68-rule sweep still dominates.

C2. Split the axe pass: run BROWSERLESS_RULES browserlessly (already gated
there — the root re-run duplicates it) and BROWSER_REQUIRED_RULES in browser.
**Refuted by measurement** (2026-09-12, the benched legs' timings JSONL —
runs 34593135967 / 34593707946): cost is not linear in rule count. The dark
pass already runs `color-contrast` alone, and that single rule is ≈ 60% of
the light pass's 68-rule axe wall on both benched engines (p50 1378ms light
vs 850ms dark on chromium, 1777 vs 1073ms on firefox), so the 51 browserless
rules' browser-side share is at most the remaining ≈ 40% — ≈ 1.5m on the a11y
leg, not the linear projection's −4.3m. And the sweep's authority argues
against taking even that: the root sweep is the only check that casts
verdicts on the generated token/API tables, which render only on the built
pages it exists to sweep (analysis §11).

- **≤ 2m: no** — goto floor, and the saving does not exist at the projected
  size.

## 4. Scenario D — coverage reduction (out of scope, for completeness)

Halving the swept page set (goto floor halves) still lands at ≈ 4.5–5.5m
per leg ×1.83 → >2m. Eliminating all but one browser × halving pages:
≈ 2.5–3m. **Only a 70–80% coverage cut reaches 2m** — that is deleting the
sweep's purpose, not an optimization. Recorded to name the boundary, not as a
proposal.

## 5. Verdict

| scenario        | wall P50 (projected)  | ≤ 2m?                         | cost                          |
| --------------- | --------------------- | ----------------------------- | ----------------------------- |
| A status quo    | 10.5–13.0m (measured) | no                            | —                             |
| B1+B2+B3        | ~6–8m                 | no                            | none (B2 needs a tryout)      |
| B4 20 shards    | ~2m                   | barely, at compute cap breach | 2.5× E2E compute              |
| C1 (C2 refuted) | ~10m                  | no                            | future engine, coverage moves |
| D coverage cut  | ~2.5–3m               | no                            | deletes the gate's purpose    |

**CI wall P50 ≤ 2 minutes is not reachable without either breaching the shard
cap (B4) or deleting coverage (D).** The measured, defensible goals, in
adoption order: navigation reuse (B5, adopted: −9…−50% per shard at
unchanged coverage — the one lever that moves the supply-bound fleet wall,
because it cuts compute), then operator-side supply — B2's compute cut has
since been adopted too (B6 above); the queueing/topology candidates are
**refuted by the 2026-09-12 burst**
(analysis §11): the org's measured supply is ≈6–8 runners, so the
17.1m wall was supply-bound, `max-parallel: 16` never binds, and no leg
re-cut moves wall ≈ compute ÷ supply. Lightpanda remains a future
cost-reduction candidate for geometry-class specs
**only after it clears the capability contract**
(`perf/browser-capability-contract.md`) — never for the shipped gates,
whose verdicts this study does not change. B1 and C2, the two
harness-routing levers this model projected, are refuted (C2 above; B1 loses
the generated tables' authority, and C2's per-rule measurement breaks the
per-test extrapolation B1 was priced from).
