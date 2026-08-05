/**
 * Test-process setup, loaded once per worker before any test file.
 *
 * It pins fast-check's seed when `CI` is set. A property test runs a bounded
 * search whose seed varies per run — which is the point on a dev machine,
 * where every run explores input space no previous run reached, and exactly
 * wrong in CI, where a red has to be attributable to the change that caused it
 * rather than to an unlucky seed landing on an unrelated pull request. So CI
 * pins it and dev runs keep exploring; whichever seed a run used is printed in
 * the failure message, so any counterexample can be replayed.
 *
 * The value itself is arbitrary. Any constant yields a valid fixed sample, and
 * there is nothing to derive one from without reintroducing the randomness
 * this file exists to remove. When a property test does find a counterexample,
 * the fix is a committed regression case pinning that input — not a new seed.
 */
import fc from "fast-check";

if (process.env.CI) {
  fc.configureGlobal({ seed: 42 });
}
