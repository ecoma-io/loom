import { appendFileSync } from "node:fs";

import { test } from "@playwright/test";

/**
 * Env-gated phase timing for the E2E suites (ecoma-io/loom#363).
 *
 * When `LOOM_E2E_TIMINGS` names a file, every `timed()` call appends one JSONL
 * line — `{ts, spec, test, project, phase, durMs, ok}` — measuring the awaited
 * body. When the variable is unset (the default, in CI and locally) `timed()`
 * is a transparent pass-through: no file I/O, no observable change to a test's
 * semantics, output or duration beyond one boolean check per call. The
 * suite-level records that complement these per-phase lines come from the
 * sibling custom reporter, `timings-reporter.ts`.
 *
 * Lines are written synchronously with `O_APPEND` semantics: a sharded run
 * fans out across worker processes, and one `write()` per line is the only
 * cross-process-safe form. A write failure is swallowed — diagnostics must
 * never fail a test that would otherwise pass.
 */
const OUT = process.env.LOOM_E2E_TIMINGS;

export async function timed<T>(phase: string, fn: () => Promise<T>): Promise<T> {
  if (!OUT) return fn();
  const info = test.info();
  const t0 = performance.now();
  let ok = true;
  try {
    return await fn();
  } catch (err) {
    ok = false;
    throw err;
  } finally {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      spec: info.file.split("/").pop() ?? "?",
      test: info.title,
      project: info.project.name,
      phase,
      durMs: Math.round(performance.now() - t0),
      ok,
    });
    try {
      appendFileSync(OUT, line + "\n");
    } catch {
      // Diagnostics must never fail a test that would otherwise pass.
    }
  }
}
