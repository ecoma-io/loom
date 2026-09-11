import { appendFileSync } from "node:fs";

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

/**
 * Suite-level E2E timing reporter (ecoma-io/loom#363).
 *
 * Registered as an extra reporter by all three Playwright configs only when
 * `LOOM_E2E_TIMINGS` names a file; it writes nothing otherwise. The per-test
 * lines carry Playwright's own duration and outcome, so a run's wall time,
 * retry count and per-spec test counts need no spec edits — the in-test phase
 * splits (navigation vs axe vs page-side evaluation) come from the sibling
 * `timings.ts` helper, which appends to the same JSONL stream.
 */
const OUT = process.env.LOOM_E2E_TIMINGS;

export default class TimingsReporter implements Reporter {
  private t0 = 0;

  onBegin(_config: FullConfig, suite: Suite): void {
    this.t0 = Date.now();
    if (!OUT) return;
    this.line({
      kind: "begin",
      projects: suite.suites.map((s) => s.title),
      totalTests: suite.allTests().length,
    });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (!OUT) return;
    // `titlePath()` does not carry the project name in 1.62; the project is
    // found on the nearest ancestor suite that has one.
    let owner: Suite | undefined = test.parent;
    while (owner && !owner.project()) owner = owner.parent;
    this.line({
      kind: "test",
      spec: test.location.file.split("/").pop(),
      test: test.title,
      project: owner?.project()?.name ?? "",
      durMs: result.duration,
      status: result.status,
      retry: result.retry,
    });
  }

  onEnd(result: FullResult): void {
    if (!OUT) return;
    this.line({ kind: "end", wallMs: Date.now() - this.t0, status: result.status });
  }

  private line(obj: Record<string, unknown>): void {
    const out = OUT;
    if (!out) return;
    try {
      appendFileSync(out, JSON.stringify(obj) + "\n");
    } catch {
      // Diagnostics must never fail the run that produced them.
    }
  }
}
