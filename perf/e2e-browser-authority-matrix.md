# E2E browser authority matrix

Which E2E checks can leave a real browser, and what they need instead. Written
for issue #363 as the evidence base for the acceleration model
([e2e-performance-analysis.md](./e2e-performance-analysis.md)). Classification
labels: **A** real-browser required (layout + paint + media + input engine),
**B** style-engine candidate (needs resolved computed styles and/or geometry;
Lightpanda-compatible in principle, verdict per case from the PoC in section
4), **C** browserless-able (jsdom tier).

## 1. The rule partition that decides most of it

`packages/core/src/a11y-scope.ts` divides axe-core's 70 WCAG-tagged rules. The
split line is exactly the authority line:

- **51 `BROWSERLESS_RULES`** — checks read the DOM and ARIA semantics only
  (names, roles, attributes, structure). No geometry, no computed styles, no
  media. The browserless demo tier (`docs/demos-a11y.test.ts`) already gates
  them; the root sweep re-runs them per page as part of the same axe pass.
- **17 `BROWSER_REQUIRED_RULES`** — each fails or false-passes without a
  rendering engine, measured per rule in the file's comments:
  - geometry/hit-test: `aria-hidden-focus`, `bypass` (elementsFromPoint);
    `avoid-inline-spacing`, `link-in-text-block`, `object-alt`,
    `scrollable-region-focusable`, `target-size` (getClientRects);
    `marquee` (rects); `td-headers-attr`, `th-has-data-cells`,
    `table-fake-caption`, `td-has-header` (border geometry via
    offsetWidth/clientHeight)
  - computed color pipeline: `color-contrast`
  - frame/media load: `frame-focusable-content`, `no-autoplay-audio`
  - font metrics: `p-as-heading`, `label-content-name-mismatch` (plus canvas
    for icon-ligature detection)

Only `color-contrast` strictly needs a _style engine paying the color
pipeline_; the rest are geometry and element loading, which any real layout
engine supplies. Lightpanda's style engine is therefore the whole question for
axe, and it is per-rule testable without that rule's own infrastructure.

## 2. Spec-by-spec classification (root suite)

| spec                        | tests | what it asserts                                                | authority                                                                                                                                    | evidence                                                                                                                           |
| --------------------------- | ----- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `accessibility.e2e.ts`      | 288   | axe 68 rules × every doc page, 2 themes                        | 51 rules: C (already gated browserlessly); 17 rules: A today, B-candidate for the geometry subset                                            | a11y-scope.ts comments; harness axe (17 rules) 390ms vs root 1.01s p50 — same rules, different host cost                           |
| `contrast.e2e.ts`           | 288   | SVG paint-to-background contrast ≥ 3:1 on every page, 2 themes | **B** — walk is getComputedStyle reads + opacity arithmetic + canvas-free color math (canvas only for oklab, 0 conversions on sampled pages) | bench: 22–776 computedReads/page, 0–21 ratioEvals, canvasConversions 0; no rAF/paint/hit-test in walk (stage table in analysis §5) |
| `target-size.e2e.ts`        | 144   | WCAG 2.5.8 — target bounding boxes with spacing enforcement    | **B** — getBoundingClientRect + geometry math only                                                                                           | spec source: rects and offset computations, no paint/media                                                                         |
| `keyboard.e2e.ts`           | ~146  | keyboard navigation, focus order, overlay traps, aria states   | A (input pipeline) / B-candidate for the focus/state subset                                                                                  | spec source: real key dispatches + focus assertions; no geometry beyond focusability                                               |
| `focus-not-obscured.e2e.ts` | 3     | focus + scrollIntoView below fixed header                      | **B** — focus, scroll-into-view, getBoundingClientRect                                                                                       | spec source: rect math against header height, no paint                                                                             |
| `layout-responsive.e2e.ts`  | 10    | flex-wrap collapse, max-width bound, media-query direction     | **B** — real layout engine of the flex/media variety                                                                                         | spec source: viewport emulation + geometry assertions                                                                              |
| `reduced-motion.e2e.ts`     | 5     | animationDuration computed, real animationend un-mount         | A — needs an animation engine (and its timing)                                                                                               | spec source: computed duration + animationend assertion                                                                            |

## 3. Harness and template legs

| spec                           | what it asserts                                       | authority                                                                                                                        |
| ------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `harness/accessibility.e2e.ts` | axe 17 `BROWSER_REQUIRED_RULES` × each demo, 2 themes | same split as root: geometry subset B-candidate, `color-contrast` needs style engine; measured goto 73ms + axe 390ms on Vite dev |

## 4. Lightpanda PoC (measured 2026-09-11, version 1.0.0-nightly.9356)

Run: official `lightpanda/browser` image, `serve --port 9222` (CDP over
WebSocket), driven by the repo's Playwright 1.62.1 `connectOverCDP`, against
the built docs site on `vitepress preview`. Chromium control group, same
script, same cases. Site: `components/button`, `components/dialog`,
`components/tooltip`, `layouts/app-shell`, `patterns/forms`.

| case class                                                                               | chromium                      | lightpanda                                                           | verdict                                                       |
| ---------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| doc-ready (title/h1/DOM, 36 buttons)                                                     | pass                          | **pass** — identical DOM + Vue mount, same title/h1                  | JS + DOM engine works                                         |
| external CSS application (2 stylesheets, body bg `rgb(242,245,247)`, `data-theme=light`) | pass                          | **fails** — `styleSheets:0`, `cssResources:0`, default UA values     | does not fetch/apply stylesheets                              |
| getComputedStyle (opacity, background-color, display, color, font-family)                | pass                          | **wrong values** — `rgba(0,0,0,0)`/`block`/`rgb(0,0,0)`/empty family | no cascade ⇒ cannot judge Loom tokens                         |
| getBoundingClientRect (button box)                                                       | pass (40×40 at y=414)         | **degenerate** — 5×5 at y=8935                                       | no layout engine                                              |
| flex-wrap + media layout (`layouts/app-shell` at 360px)                                  | pass (stacked at y≈1088)      | **degenerate** — boxes at y≈9615, width 10                           | no layout; `stacked:true` is an artifact of zero-height boxes |
| axe-core run (6 DOM-only rules via injected axe 4.13.0)                                  | pass (5 pass, 1 inapplicable) | **page target closed** — crash on `addScriptTag`                     | cannot run axe at this version                                |
| focus + scrollIntoView                                                                   | pass (focused, top=64)        | page closed (after axe crash)                                        | unreachable in this run                                       |

**Conclusion.** Lightpanda's JS + DOM engine mounts Vue demos and reports
DOM-truthful content, but its compute is not faster here (~1.3s/page vs
chromium's 0.1–1.4s), it applies no stylesheet cascade, performs no layout,
and crashes on axe injection. It is **not a candidate for any current E2E
class**: not geometry (no layout), not computed styles (no cascade), not axe
(crash). The matrix's B (style-engine candidate) rows stand as the _future_
classification for geometry/style reads, with the measured requirement of a
working cascade before any of them could move.

The authority conclusion stands: **no E2E leg can leave the browser _today_** —
the 51 browserless rules already have a browserless gate, and the 17 required
rules need at least a working style engine plus layout, which no candidate
engine on this machine provides. The acceleration model
([e2e-acceleration-model.md](./e2e-acceleration-model.md)) therefore does not
route any shipped gate to a different engine.

## 5. The repeatable instrument (2026-09-12)

§4's PoC was a one-off script; `tools/browser-capability-probe.ts` and
[browser-capability-contract.md](./browser-capability-contract.md) turn its
method into a re-runnable measurement: 11 fail-closed cases (DOM, cascade,
computed style, layout, media queries, theme switch, focus, hit-testing, axe
injection) derive an engine's capability classes conjunctively — `dom`,
`dom+hit-testing`, `cascade+layout` (class B: the 12 cascade+layout rules),
`axe` — and three rules (`label-content-name-mismatch`,
`frame-focusable-content`, `no-autoplay-audio`) stay full-browser-only under
every outcome because no synthetic case can prove canvas, iframe-content or
media inspection. The contract's baseline maps §4's Lightpanda numbers onto
the case ids (the engine hosts `dom`, and nothing else); no production
workflow routes through any of this, and the conclusion is unchanged — a
future candidate engine is judged by a committed probe report against the
contract before anything reroutes.
