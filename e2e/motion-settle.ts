import type { Page } from "@playwright/test";

/**
 * The browser-state contract every colour verdict in this suite reads: the
 * page's finite motion has finished before a scan samples it (#396).
 *
 * The defect this closes is a race the suite could not see on fast legs: an
 * entrance animation (`animate-fade-rise` and its staggered per-element
 * `animation-delay`) carries its element from `opacity: 0` toward 1, and
 * `color-contrast` blends that in-flight opacity into its ratio — so a scan
 * that lands mid-flight measures a transitional foreground the page will
 * never settle at. The same commit read pass, flaky or failed depending only
 * on where in that window the scan landed (runs 34700968946 / 34701204872,
 * both dark-pass failures on the mobile page sweep's entrance-staggered
 * pages). The invariant restored here: the verdict must not depend on an
 * incidental animation frame.
 *
 * The contract is animation-state, not style-based. A computed-style resting
 * predicate cannot work: `disabled:opacity-50` proves an opacity under 1 is a
 * legitimate *resting* state on this site, so "opacity reaches some value"
 * cannot distinguish a mid-fade element from a deliberately translucent one.
 * Animation state can — an animation is either past its end or it is not.
 *
 * What the wait gates on, exactly:
 *
 * - **Finite animations only.** The motion library's own law (`global.css`)
 *   is that nothing loops for decoration except the loaders, so an infinite
 *   iteration count never gates this wait — a page may carry a spinning
 *   loader forever without holding the sweep. That exclusion is by iteration
 *   count, not by guessing at names, so a future looping decoration is
 *   exempt the same way the loaders are.
 * - **Everything else must be past its `endTime`** — delay, active duration
 *   and end delay together — which covers entrance *delays* too: a
 *   `both`-filled element sitting invisibly inside its stagger delay is
 *   in flight exactly like one mid-keyframe. An entrance *delay* is not
 *   the same as pending play: a delayed animation's start time is
 *   resolved and its clock counts through the delay, so it gates as
 *   travelled distance, not as "not started yet".
 * - **Pending play on an unrendered element never gates.** An animation
 *   that is `running` with an unresolved start time has never ticked.
 *   That alone is not enough to exempt it: a just-created animation on a
 *   rendered element is pending for the gap before its first frame and
 *   *will* tick, so it gates like any other in-flight animation. What is
 *   exempt is pending play whose target is not being rendered — such an
 *   animation produces no frames and cannot advance until something
 *   renders it. That is permanently the closed Collapse region Reka
 *   conceals with `hidden="until-found"` (mounted on purpose), which
 *   Firefox leaves pending forever while Chromium resolves the same
 *   situation without leaving the animation in the list (run 34720387853,
 *   firefox page-sweep s2, `collapse` 140ms `running` at localTime 0
 *   across all three retries). Gating on it would make the verdict depend
 *   on an interop artifact — this defect class from the mirror side.
 *   Rendered-ness is asked of the element itself via `checkVisibility()`
 *   (baseline in every engine this suite runs), which is false for a
 *   `display: none` subtree or any hidden ancestor. A *paused* animation
 *   is deliberately outside every exemption here: paused can be holding a
 *   mid-flight frame at its paused progress, which is exactly the state a
 *   colour verdict must not sample.
 * - **Theme transitions included.** `getAnimations()` returns CSS transitions
 *   as well, so the dark pass also waits out the colour transitions the
 *   appearance flip starts — the same race one step earlier.
 *
 * Why a polled predicate and not `Promise.all(animations.map(a =>
 * a.finished))`: `finished` never resolves for an infinite animation (the
 * deadlock this suite's history warns about), and it *rejects* when an
 * animation is cancelled — the ordinary teardown path — which would force a
 * swallowed-failure catch into the middle of an accessibility pipeline. A
 * cancelled animation simply leaves `getAnimations()`; the predicate needs no
 * catch at all, so nothing here can convert a real synchronization failure
 * into a green verdict.
 *
 * Bounded and fail-closed. The bound is derived from the repository's own
 * motion vocabulary, not chosen: the longest duration token is
 * `--duration-slower` 480ms and the deepest stagger is the empty-state
 * family's third stage at 180ms (`packages/core/src/motion.ts`), so no
 * animation this site ships can legitimately end later than 660ms after it
 * starts — 2000ms is ~3× that ceiling. The wait is not a sleep: it polls per
 * animation frame and exits on the first settled one, so a page without
 * in-flight motion pays a single frame. A finite animation still running at
 * the bound is a page the contract does not cover — that fails the gate by
 * name rather than scanning a transient, because a green verdict read
 * mid-flight is exactly the defect this module exists to remove.
 */

/** ~3× the motion vocabulary's worst legal end (480ms + 180ms stagger). */
export const SETTLE_BOUND_MS = 2_000;

/**
 * True when no finite animation is still to finish. Runs inside the page, so
 * it must stay a self-contained function body.
 */
const finiteMotionSettled = () =>
  document.getAnimations().every((animation) => {
    // Idle produces no effect at all; finished holds at most its last
    // keyframe — neither is still moving.
    if (animation.playState === "idle" || animation.playState === "finished") {
      return true;
    }
    const timing = animation.effect?.getComputedTiming();
    if (!timing) {
      return true;
    }
    // Loaders loop by design; an infinite iteration count has no endTime to
    // wait for and never gates this predicate.
    if (timing.iterations === Infinity) {
      return true;
    }
    // Pending play on an element that is not being rendered: it has never
    // ticked and cannot until something renders it — no frame, no
    // transient. Pending play on a *rendered* element is the gap before
    // its first frame and does gate; only the unrendered kind is exempt
    // (the Firefox `hidden="until-found"` Collapse shape — see the
    // contract block above). No target at all renders nothing either. The
    // effect is cast to KeyframeEffect because `target` lives there in
    // the DOM typings, not on the AnimationEffect base — and every
    // animation getAnimations() returns carries one, per spec.
    const target = (animation.effect as KeyframeEffect | null)?.target ?? null;
    if (
      animation.playState === "running" &&
      animation.startTime === null &&
      !(target?.checkVisibility() ?? false)
    ) {
      return true;
    }
    const now = animation.currentTime;
    return now !== null && Number(now) >= Number(timing.endTime ?? Infinity);
  });

/**
 * The count the regression spec samples: finite animations still to finish.
 * `settleMotion` is that count reaching zero, named separately so a test can
 * assert the transient exists before the settle and is gone after it.
 */
export const inFlightFiniteAnimations = () =>
  document.getAnimations().filter((animation) => {
    if (animation.playState === "idle" || animation.playState === "finished") {
      return false;
    }
    // Pending play on an unrendered element mirrors the predicate's
    // exemption — lockstep with `finiteMotionSettled`, which the contract
    // block above explains.
    const exemptTarget = (animation.effect as KeyframeEffect | null)?.target ?? null;
    if (
      animation.playState === "running" &&
      animation.startTime === null &&
      !(exemptTarget?.checkVisibility() ?? false)
    ) {
      return false;
    }
    const timing = animation.effect?.getComputedTiming();
    if (!timing || timing.iterations === Infinity) {
      return false;
    }
    const now = animation.currentTime;
    return now === null || Number(now) < Number(timing.endTime ?? Infinity);
  }).length;

/**
 * The animations still gating at the bound — the fail-closed message's
 * payload, so a red gate names what outgrew the contract instead of saying
 * only that two seconds passed. Filtered by the predicate's own exemptions
 * (a finished or pending-play animation is not the stall), and carrying
 * `startTime` because that one field separated the two stalls this file has
 * met: `null` with `running` is pending play on an unrendered element,
 * while a number mid-count is a duration genuinely outrunning the bound.
 */
const stuckMotionReport = () =>
  JSON.stringify(
    document
      .getAnimations()
      .filter((animation) => {
        if (animation.playState === "idle" || animation.playState === "finished") {
          return false;
        }
        // Same exemption as the predicate: pending play on an unrendered
        // element is not a stall, so it is not reported either.
        const reportTarget = (animation.effect as KeyframeEffect | null)?.target ?? null;
        if (
          animation.playState === "running" &&
          animation.startTime === null &&
          !(reportTarget?.checkVisibility() ?? false)
        ) {
          return false;
        }
        const timing = animation.effect?.getComputedTiming();
        if (!timing || timing.iterations === Infinity) {
          return false;
        }
        const now = animation.currentTime;
        return now === null || Number(now) < Number(timing.endTime ?? Infinity);
      })
      .map((animation) => ({
        name: animation instanceof CSSAnimation ? animation.animationName : "transition",
        state: animation.playState,
        startTime: animation.startTime,
        currentTime: animation.currentTime,
        rendered:
          ((animation.effect as KeyframeEffect | null)?.target ?? null)?.checkVisibility() ?? null,
        timing: animation.effect?.getComputedTiming(),
      })),
  );

/**
 * Wait until the page's finite motion has finished. Called at the seams where
 * a fresh navigation or a theme flip precedes a colour verdict —
 * `loadInLight`, both dark transports in `e2e/theme.ts`, and the bench's
 * `sweepInTheme` — so every colour scan reads settled pixels by construction
 * rather than by luck.
 */
export async function settleMotion(browserPage: Page): Promise<void> {
  try {
    await browserPage.waitForFunction(finiteMotionSettled, undefined, {
      timeout: SETTLE_BOUND_MS,
    });
  } catch {
    // Fail closed, with the evidence: which animations were still in flight
    // when the bound expired. Never fall through to the scan.
    const stuck = await browserPage.evaluate(stuckMotionReport).catch(() => "unavailable");
    throw new Error(
      `finite motion did not settle within ${String(SETTLE_BOUND_MS)}ms — a colour ` +
        `verdict read now would depend on an in-flight animation frame (#396). ` +
        `The motion vocabulary's longest legal end is 660ms (480ms --duration-slower ` +
        `+ 180ms deepest stagger), so an animation past this bound is a page the ` +
        `contract does not cover; give it a finite end or extend the vocabulary ` +
        `deliberately. Still in flight: ${stuck}`,
    );
  }
}
