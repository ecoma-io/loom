# Browser capability contract

What any CDP-speaking engine must prove about itself before Loom browser
evidence could even consider it, and the measurement tool that asks —
`tools/browser-capability-probe.ts`. This is a **measurement contract, not a
gate**: no production workflow routes through it, and
[e2e-acceleration-model.md §5](./e2e-acceleration-model.md) keeps every shipped
gate on a real browser regardless. It exists so the next candidate engine is
judged in minutes with evidence, the way the Lightpanda proof-of-concept was
judged in §4 of the [authority matrix](./e2e-browser-authority-matrix.md) —
only repeatable.

## The capability boundary

The 17 `BROWSER_REQUIRED_RULES` ([authority matrix §1](./e2e-browser-authority-matrix.md))
need different things from an engine, so the probe grants capability classes,
never a blanket verdict. Every class is a conjunctive gate over PASS-only
cases — a DEGRADED or ERROR case grants nothing, which is what stops an engine
that mounts but cannot paint from reading as "mostly works":

| class                        | granted by (all PASS)                                                                                                   | rules it would host                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `dom`                        | `dom-mount`                                                                                                             | — (DOM truth alone hosts none of the 17)                     |
| `dom+hit-testing`            | `dom-mount` + `hit-testing`                                                                                             | `aria-hidden-focus`, `bypass`                                |
| `cascade+layout` (class B)   | `dom-mount`, `css-loading`, `css-cascade`, `computed-style`, `theme-switch`, `layout-flex`, `geometry`, `media-queries` | the 12 cascade+layout rules (color-contrast, target-size, …) |
| `axe`                        | `axe-injection`                                                                                                         | the full 17-rule browser axe gate, in page                   |
| _(no class — informational)_ | `focus`                                                                                                                 | — evidence for the focus-not-obscured reroute only           |

The 3 canvas/iframe/media rules (`label-content-name-mismatch`,
`frame-focusable-content`, `no-autoplay-audio`) have no probe case by design:
no synthetic page can prove canvas or iframe-content inspection. They stay
full-browser-only under every outcome.

Each case fails closed: `PASS` (measured and matched the reference), `FAIL`
(measured and contradicted it), `DEGRADED` (partial — never grants), `ERROR`
(could not measure — throw, or the per-case watchdog). The rule lists are
restated inside the probe (the tooling layer may not import the library it
measures); `tools/browser-capability-probe.test.ts` pins them against
`packages/core/src/a11y-scope.ts` source text so the two cannot drift.

## Running it

Three terminals — build once, then serve, engine, probe. This is the documented
first execution; the probe connects to whatever CDP endpoint you point it at
and names no vendor:

```sh
# 1. the served site the cases drive
pnpm docs:build && pnpm docs:preview          # http://localhost:4173/docs/contribute/design-system/

# 2. the engine under test, its CDP endpoint on 9222 — the PoC's Lightpanda:
docker run --rm -p 9222:9222 lightpanda/browser:1.0.0-nightly.9356 serve --port 9222

# 3. the probe
node --experimental-strip-types tools/browser-capability-probe.ts \
  --engine lightpanda-1.0.0-nightly.9356 --out perf/browser-capability-<engine>.json
```

`--report-only` forces exit 0 for humans; without it the probe exits 0 only
when every case PASSED. `--self-test` exercises the probe's own logic with no
engine and no network (the same function the vitest tier holds). One JSON
object lands on stdout; progress goes to stderr.

## The report

```jsonc
{
  "engine": "<--engine label>",
  "baseUrl": "<--base>",
  "timestamp": "<ISO-8601>",
  "cases": [
    {
      "id": "css-loading",
      "capability": "cascade",
      "verdict": "FAIL",
      "detail": "…measured numbers…",
    },
  ],
  "summary": { "pass": 0, "degraded": 0, "fail": 0, "error": 1, "total": 1 },
  "hostedClasses": [],
  "verdict": "no capability verified — …",
}
```

A connection-level failure still emits this shape — a single `connect` ERROR
case carrying the reason — so `--out` files stay comparable across engines and
runs. Every `cases[].detail` carries the measured numbers; that is the diff a
future engine version is judged by.

## The eleven cases

| id               | capability  | PASS means                                                                             |
| ---------------- | ----------- | -------------------------------------------------------------------------------------- |
| `dom-mount`      | dom         | button page mounts: title + h1 match, first demo figure holds 6 buttons                |
| `css-loading`    | cascade     | stylesheets present and the body background equals `--color-background`'s light value  |
| `css-cascade`    | cascade     | the authored token value is readable back out of the CSSOM                             |
| `computed-style` | computed    | a primary button resolves `display: inline-flex` and white text (property, not string) |
| `layout-flex`    | layout      | app-shell sidebar and content flex-wrap side by side, then stack at 360px              |
| `geometry`       | layout      | getBoundingClientRect returns a non-degenerate button box that tracks resize           |
| `media-queries`  | media       | `matchMedia("(min-width: 960px)")` flips with the emulated viewport                    |
| `theme-switch`   | cascade     | data-theme flips light→dark and the body repaints (the shipped suite's own thresholds) |
| `focus`          | interaction | activeElement tracks focus(); scrollIntoView brings the target into view               |
| `hit-testing`    | hit-testing | elementsFromPoint at a button's center resolves to that button                         |
| `axe-injection`  | axe         | injected axe-core runs all 17 browser-required rules and reports buckets               |

Cases run in that order on one page each; `theme-switch` cleans up its
localStorage key, and `axe-injection` runs last because it is the one case that
has crashed an engine.

## Baseline: Lightpanda 1.0.0-nightly.9356, 2026-09-11

The numbers come from the authority matrix's PoC (§4) — same engine version,
same day, same built-site method — mapped onto the probe's case ids. The probe
has not yet been executed against an engine; its first execution is the recipe
above, and until it runs these rows are the PoC's, not the probe's. Chromium,
same cases, is the control group everything passes.

| case             | Lightpanda result                                                                | verdict against the contract               |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| `dom-mount`      | pass — identical DOM + Vue mount, same title/h1                                  | PASS                                       |
| `css-loading`    | `styleSheets: 0`, default UA background                                          | FAIL                                       |
| `css-cascade`    | token absent from the cascade (default UA values read back)                      | FAIL                                       |
| `computed-style` | `rgba(0,0,0,0)` / `block` / `rgb(0,0,0)` / empty font family                     | FAIL                                       |
| `layout-flex`    | degenerate boxes — 5×5 at y≈8935                                                 | FAIL                                       |
| `geometry`       | degenerate — no layout engine                                                    | FAIL                                       |
| `media-queries`  | not measured at this granularity (the PoC measured 360px layout, not matchMedia) | not measured                               |
| `theme-switch`   | not measured — a repaint needs the cascade this engine does not have             | not measured (projected FAIL; projection)  |
| `focus`          | page target closed before this case ran                                          | not measured (page closed after the crash) |
| `hit-testing`    | not measured — page target closed after the axe crash                            | not measured                               |
| `axe-injection`  | **page target closed** on `addScriptTag`                                         | ERROR — the crash signature                |

Read through the boundary: the engine hosts `dom` and nothing else. Its
compute was also not faster on this workload (~1.3s/page vs chromium's
0.1–1.4s), so the measured verdict in [§4](./e2e-browser-authority-matrix.md)
stands on both axes: **not a candidate for any current E2E class.**

## What would change this (projection, not measurement)

A candidate engine clears the contract by shipping, in probe order: a real
CSS cascade (`css-loading` → `theme-switch`), then geometry (`layout-flex`,
`geometry`, `media-queries`) — which together grant class B and would make the
12 cascade+layout rules routable — then a surviving `axe-injection`. Nothing
here routes until a probe run, committed beside this file, shows those PASSes
on a released engine version. The acceleration model
([§5](./e2e-acceleration-model.md)) is written for the engines of today and
routes nothing to a candidate that fails this contract; that statement is the
reason this file can stay a measurement.
