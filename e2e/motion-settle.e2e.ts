import { test, expect } from "@playwright/test";
import { loadInLight, scanColorContrast } from "./checks";
import { SETTLE_BOUND_MS, inFlightFiniteAnimations, settleMotion } from "./motion-settle";
import { reachDark } from "./theme";

// The regression spec for the motion-settle contract (#396): a colour
// verdict must not depend on the animation frame it happened to sample.
// Each test pins one clause of the contract in `e2e/motion-settle.ts`, using
// injected animations rather than page-load timing — a test that raced a
// real entrance would re-import the flake it exists to retire. The probes
// are injected after an initial settle so the only animation in flight is
// the one the test put there, deterministically.
//
// The contract under test, clause by clause:
//
// 1. a finite animation in flight gates the settle, and the settle exits
//    only past it (the transient a raw navigation exposes is captured and
//    waited out);
// 2. an infinite animation never gates it — a loader may loop forever
//    without holding the sweep (the deadlock the wait must not have);
// 3. a finite animation that outruns the bound fails the gate by name
//    rather than scanning a transient (fail-closed, never silent);
// 4. the settled scan still fails a genuinely violating colour pair —
//    determinism was not bought by weakening the verdict;
// 5. the production seams — `loadInLight` and `reachDark` — return with
//    zero finite animations still in flight, on the very page whose stagger
//    produced #396.

test("settle waits out a finite animation still in flight", async ({ page }) => {
  await loadInLight(page, "patterns/empty-state");
  await settleMotion(page);

  // A delayed entrance, the shape of #396's element: `fill: both` holds the
  // probe below its resting opacity for the whole delay, so any colour read
  // before the settle reads a transitional foreground.
  await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.id = "settle-probe";
    probe.textContent = "a probe still travelling toward its resting opacity";
    document.body.appendChild(probe);
    probe.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: 250, fill: "both" });
  });

  expect(await page.evaluate(inFlightFiniteAnimations)).toBeGreaterThanOrEqual(1);
  await settleMotion(page);
  expect(await page.evaluate(inFlightFiniteAnimations)).toBe(0);
});

test("an infinite animation never gates the settle", async ({ page }) => {
  await loadInLight(page, "patterns/empty-state");
  await settleMotion(page);

  await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.id = "settle-loop-probe";
    probe.textContent = "a loader-shaped probe, looping forever";
    document.body.appendChild(probe);
    probe.animate([{ opacity: 1 }, { opacity: 0.5 }, { opacity: 1 }], {
      duration: 1_000,
      iterations: Infinity,
    });
  });
  expect(await page.evaluate(inFlightFiniteAnimations)).toBe(0);

  const started = Date.now();
  await settleMotion(page);
  // The wait must have returned on a polling frame, not at any bound: the
  // loop is still running, and a wait that gated on it would still be
  // waiting. Well under the bound, and the loop is provably unresolved.
  expect(Date.now() - started).toBeLessThan(SETTLE_BOUND_MS);
  expect(
    await page.evaluate(() =>
      document
        .getAnimations()
        .some(
          (animation) =>
            animation.playState === "running" &&
            (animation.effect?.getComputedTiming().iterations ?? 1) === Infinity,
        ),
    ),
  ).toBe(true);
});

test("a finite animation past the bound fails closed, named", async ({ page }) => {
  await loadInLight(page, "patterns/empty-state");
  await settleMotion(page);

  await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.id = "settle-stuck-probe";
    probe.textContent = "a probe whose animation outruns the motion vocabulary";
    document.body.appendChild(probe);
    probe.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 5_000, fill: "both" });
  });

  // Not a pass-through: a page the contract does not cover fails the gate
  // with the animation's own timing in the message, so the next reader knows
  // what outgrew the vocabulary.
  await expect(settleMotion(page)).rejects.toThrow(/did not settle[\s\S]*5000/);
});

test("a genuine contrast violation still fails after the settle", async ({ page }) => {
  await loadInLight(page, "patterns/empty-state");
  await reachDark(page, "patterns/empty-state", "/patterns/empty-state");

  // A text pair that is genuinely below the floor in the settled dark state
  // — gray-600 on the dark background is ≈2.5:1 against the 4.5:1 floor.
  // This is the no-masking clause: determinism must come from reading
  // settled pixels, never from a verdict that stopped looking.
  await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.id = "contrast-violation-probe";
    probe.style.color = "#4b5563";
    probe.textContent = "a colour pair the settled scan must still reject";
    document.body.appendChild(probe);
  });

  const { violations } = await scanColorContrast(page);
  expect(violations.map((violation) => violation.id)).toContain("color-contrast");
});

test("the production seams return settled", async ({ page }) => {
  await loadInLight(page, "patterns/empty-state");
  expect(await page.evaluate(inFlightFiniteAnimations)).toBe(0);

  await reachDark(page, "patterns/empty-state", "/patterns/empty-state");
  expect(await page.evaluate(inFlightFiniteAnimations)).toBe(0);
});
